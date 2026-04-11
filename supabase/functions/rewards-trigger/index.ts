import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RewardDefinition {
  key: string;
  category: string;
  title: string;
  description: string;
  points_rule: {
    type: "fixed" | "percentage";
    value: number;
    base_field?: string;
    divisor?: number;
  };
  lock_policy: {
    available_when: "immediate" | "booking_completed" | "email_verified";
    delay_hours?: number;
  };
  caps: {
    monthly_max?: number;
    total_max?: number;
  };
  expiry_days?: number;
  awarding_mode: "AUTO_CLAIM" | "USER_CLAIM";
  approval_required: boolean;
}

interface TriggerPayload {
  event: "bookingPaid" | "bookingCompleted" | "bookingCancelled" | "bookingRefunded" | "profileCompleted" | "emailVerified" | "referralSignup" | "referralFirstBooking" | "instagramTag" | "participantPaid";
  userId: string;
  bookingId?: string;
  priceCents?: number;
  refundPercentage?: number;
  referredUserId?: string;
  shareFraction?: number; // For participant payments (e.g., 0.25 for 1/4 share)
  metadata?: Record<string, unknown>;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[rewards-trigger] ${step}`, details ? JSON.stringify(details) : "");
};

// Helper: Check if two ISO weeks are consecutive (e.g., "2025-W03" and "2025-W04")
const isConsecutiveWeek = (week1: string, week2: string): boolean => {
  const parseWeek = (weekStr: string): { year: number; week: number } => {
    const match = weekStr.match(/(\d{4})-W(\d{2})/);
    if (!match) return { year: 0, week: 0 };
    return { year: parseInt(match[1]), week: parseInt(match[2]) };
  };

  const w1 = parseWeek(week1);
  const w2 = parseWeek(week2);

  if (w1.year === w2.year) {
    return w2.week === w1.week + 1;
  } else if (w2.year === w1.year + 1 && w1.week >= 52 && w2.week === 1) {
    // Handle year transition (week 52/53 -> week 1)
    return true;
  }
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: only callable with service role key (server-to-server) or admin JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");

  // Allow service-role-key callers (stripe-webhook, scheduled functions, etc.)
  let isAuthorized = token === supabaseServiceKey;

  if (!isAuthorized) {
    // Fall back: verify as admin user JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const tempClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await tempClient.auth.getUser(token);

    if (!authError && user) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: adminRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      isAuthorized = !!adminRole;
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: TriggerPayload = await req.json();
    logStep("Received trigger", payload as unknown as Record<string, unknown>);

    const { event, userId, bookingId, priceCents, refundPercentage, referredUserId, metadata } = payload;

    // Helper: Get reward definition with new fields
    const getDefinition = async (key: string): Promise<RewardDefinition | null> => {
      const { data } = await supabaseAdmin
        .from("reward_definitions")
        .select("*")
        .eq("key", key)
        .eq("is_active", true)
        .single();
      return data;
    };

    // Helper: Check caps
    const checkCaps = async (userId: string, definitionKey: string, caps: RewardDefinition["caps"]): Promise<boolean> => {
      if (caps.total_max) {
        const { count } = await supabaseAdmin
          .from("reward_instances")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("definition_key", definitionKey)
          .neq("status", "REVERSED")
          .neq("status", "REJECTED");
        if ((count || 0) >= caps.total_max) {
          logStep("Cap reached (total)", { definitionKey, count, max: caps.total_max });
          return false;
        }
      }
      if (caps.monthly_max) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count } = await supabaseAdmin
          .from("reward_instances")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("definition_key", definitionKey)
          .neq("status", "REVERSED")
          .neq("status", "REJECTED")
          .gte("created_at", startOfMonth.toISOString());
        if ((count || 0) >= caps.monthly_max) {
          logStep("Cap reached (monthly)", { definitionKey, count, max: caps.monthly_max });
          return false;
        }
      }
      return true;
    };

    // Helper: Calculate points
    const calculatePoints = (def: RewardDefinition, baseCents?: number): number => {
      if (def.points_rule.type === "fixed") {
        return def.points_rule.value;
      }
      if (def.points_rule.type === "percentage" && baseCents) {
        const divisor = def.points_rule.divisor || 100;
        return Math.floor((baseCents * def.points_rule.value) / divisor / 100);
      }
      return 0;
    };

    // Helper: Auto-claim reward (credit immediately)
    const autoClaimReward = async (
      userId: string,
      definitionKey: string,
      points: number,
      sourceType: string,
      sourceId: string,
      instanceMetadata?: Record<string, unknown>
    ) => {
      const def = await getDefinition(definitionKey);
      if (!def) {
        logStep("Definition not found for auto-claim", { definitionKey });
        return null;
      }

      // Check caps
      const canCreate = await checkCaps(userId, definitionKey, def.caps);
      if (!canCreate) return null;

      // Check idempotency
      const { data: existing } = await supabaseAdmin
        .from("reward_instances")
        .select("id")
        .eq("definition_key", definitionKey)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .single();

      if (existing) {
        logStep("Reward already exists (idempotent)", { definitionKey, sourceId });
        return null;
      }

      const now = new Date();
      const expiresAt = def.expiry_days
        ? new Date(now.getTime() + def.expiry_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create as CLAIMED immediately
      const { data: instance, error } = await supabaseAdmin
        .from("reward_instances")
        .insert({
          user_id: userId,
          definition_key: definitionKey,
          status: "CLAIMED",
          points,
          source_type: sourceType,
          source_id: sourceId,
          available_at: now.toISOString(),
          claimed_at: now.toISOString(),
          expires_at: expiresAt,
          metadata: { ...instanceMetadata, auto_claimed: true },
        })
        .select()
        .single();

      if (error) {
        logStep("Failed to create auto-claim reward instance", { error: error.message });
        return null;
      }

      // Get current balance and create ledger entry
      const { data: currentLedger } = await supabaseAdmin
        .from("points_ledger")
        .select("delta_points")
        .eq("user_id", userId)
        .eq("credit_type", "REWARD");

      const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
      const newBalance = currentBalance + points;

      await supabaseAdmin.from("points_ledger").insert({
        user_id: userId,
        credit_type: "REWARD",
        delta_points: points,
        balance_after: newBalance,
        entry_type: "AUTO_CREDIT",
        description: def.title,
        source_type: sourceType,
        source_id: sourceId,
        reward_instance_id: instance.id,
      });

      // Update wallet
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("reward_credits, lifetime_credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        await supabaseAdmin
          .from("wallets")
          .update({
            reward_credits: (wallet.reward_credits || 0) + points,
            lifetime_credits: (wallet.lifetime_credits || 0) + points,
          })
          .eq("user_id", userId);
      }

      logStep("Auto-claimed reward", { id: instance.id, definitionKey, points });

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "REWARD_CREDITED",
        title: `${points} Credits gutgeschrieben!`,
        message: `${def.title} – automatisch gutgeschrieben.`,
        cta_url: "/dashboard/p2g-points",
        metadata: { reward_instance_id: instance.id, points },
      });

      return instance;
    };

    // Helper: Create reward instance (for non-auto-claim or approval-required)
    const createRewardInstance = async (
      userId: string,
      definitionKey: string,
      points: number,
      sourceType: string,
      sourceId: string,
      status: "PENDING" | "AVAILABLE" | "PENDING_APPROVAL",
      instanceMetadata?: Record<string, unknown>
    ) => {
      const def = await getDefinition(definitionKey);
      if (!def) {
        logStep("Definition not found", { definitionKey });
        return null;
      }

      // Check caps
      const canCreate = await checkCaps(userId, definitionKey, def.caps);
      if (!canCreate) return null;

      // Check idempotency
      const { data: existing } = await supabaseAdmin
        .from("reward_instances")
        .select("id")
        .eq("definition_key", definitionKey)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .single();

      if (existing) {
        logStep("Reward already exists (idempotent)", { definitionKey, sourceId });
        return null;
      }

      const now = new Date();
      const availableAt = status === "AVAILABLE" ? now.toISOString() : null;
      const expiresAt = def.expiry_days
        ? new Date(now.getTime() + def.expiry_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: instance, error } = await supabaseAdmin
        .from("reward_instances")
        .insert({
          user_id: userId,
          definition_key: definitionKey,
          status,
          points,
          source_type: sourceType,
          source_id: sourceId,
          available_at: availableAt,
          expires_at: expiresAt,
          metadata: instanceMetadata || {},
        })
        .select()
        .single();

      if (error) {
        logStep("Failed to create reward instance", { error: error.message });
        return null;
      }

      logStep("Created reward instance", { id: instance.id, definitionKey, points, status });

      // Create notification
      const notifMessage = status === "PENDING_APPROVAL"
        ? `${def.title} eingereicht – wird geprüft.`
        : status === "AVAILABLE"
        ? `${def.title} bereit zum Einlösen!`
        : `${def.title} – verfügbar nach Abschluss.`;

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: status === "PENDING_APPROVAL" ? "REWARD_PENDING_REVIEW" : status === "AVAILABLE" ? "REWARD_AVAILABLE" : "REWARD_EARNED",
        title: def.title,
        message: notifMessage,
        cta_url: "/dashboard/p2g-points",
        metadata: { reward_instance_id: instance.id, points },
      });

      return instance;
    };

    // Helper: Reverse rewards for a booking
    const reverseBookingRewards = async (bookingId: string, refundPct: number = 100) => {
      const { data: instances } = await supabaseAdmin
        .from("reward_instances")
        .select("*")
        .eq("source_type", "booking")
        .eq("source_id", bookingId)
        .neq("status", "REVERSED")
        .neq("status", "REJECTED");

      if (!instances || instances.length === 0) {
        logStep("No rewards to reverse for booking", { bookingId });
        return;
      }

      for (const instance of instances) {
        if (instance.status === "CLAIMED") {
          // Already claimed - need to deduct points from ledger
          const reversePoints = Math.floor((instance.points * refundPct) / 100);
          
          // Get current balance
          const { data: currentLedger } = await supabaseAdmin
            .from("points_ledger")
            .select("delta_points")
            .eq("user_id", instance.user_id)
            .eq("credit_type", "REWARD");

          const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
          const newBalance = currentBalance - reversePoints;

          // Insert reversal entry
          await supabaseAdmin.from("points_ledger").insert({
            user_id: instance.user_id,
            credit_type: "REWARD",
            reward_instance_id: instance.id,
            delta_points: -reversePoints,
            entry_type: "REVERSAL",
            balance_after: newBalance,
            description: `Stornierung: ${instance.definition_key}`,
          });

          // Update wallets table for sync
          await supabaseAdmin
            .from("wallets")
            .update({ reward_credits: Math.max(0, newBalance) })
            .eq("user_id", instance.user_id);

          logStep("Reversed claimed reward", { instanceId: instance.id, reversePoints });
        }

        // Mark as reversed
        await supabaseAdmin
          .from("reward_instances")
          .update({ status: "REVERSED", reversed_at: new Date().toISOString() })
          .eq("id", instance.id);

        // Create notification
        const def = await getDefinition(instance.definition_key);
        await supabaseAdmin.from("notifications").insert({
          user_id: instance.user_id,
          type: "REWARD_REVERSED",
          title: "Reward storniert",
          message: `${def?.title || instance.definition_key}: ${instance.points} Credits wurden abgezogen.`,
          cta_url: "/dashboard/p2g-points",
          metadata: { reward_instance_id: instance.id, points: -instance.points },
        });
      }
    };

    // Handle events
    switch (event) {
      case "bookingPaid": {
        if (!bookingId || !priceCents) {
          throw new Error("bookingId and priceCents required for bookingPaid");
        }

        // BOOKING_PAID - percentage of price - AUTO CLAIM
        const bookingDef = await getDefinition("BOOKING_PAID");
        if (bookingDef) {
          const points = calculatePoints(bookingDef, priceCents);
          if (points > 0) {
            if (bookingDef.awarding_mode === "AUTO_CLAIM") {
              await autoClaimReward(userId, "BOOKING_PAID", points, "booking", bookingId, { priceCents });
            } else {
              await createRewardInstance(userId, "BOOKING_PAID", points, "booking", bookingId, "AVAILABLE", { priceCents });
            }
          }
        }

        // FIRST_BOOKING_BONUS - check if first booking - AUTO CLAIM
        const { count: bookingCount } = await supabaseAdmin
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "confirmed");
        
        if ((bookingCount || 0) <= 1) {
          const firstDef = await getDefinition("FIRST_BOOKING_BONUS");
          if (firstDef) {
            if (firstDef.awarding_mode === "AUTO_CLAIM") {
              await autoClaimReward(userId, "FIRST_BOOKING_BONUS", firstDef.points_rule.value, "booking", bookingId);
            } else {
              await createRewardInstance(userId, "FIRST_BOOKING_BONUS", firstDef.points_rule.value, "booking", bookingId, "AVAILABLE");
            }
          }
        }

        // EARLY_BIRD - check if booked 7+ days in advance - AUTO CLAIM
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("start_time, created_at")
          .eq("id", bookingId)
          .single();

        if (booking) {
          const startTime = new Date(booking.start_time);
          const createdAt = new Date(booking.created_at);
          const daysInAdvance = (startTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysInAdvance >= 7) {
            const earlyDef = await getDefinition("EARLY_BIRD");
            if (earlyDef) {
              if (earlyDef.awarding_mode === "AUTO_CLAIM") {
                await autoClaimReward(userId, "EARLY_BIRD", earlyDef.points_rule.value, "booking", bookingId);
              } else {
                await createRewardInstance(userId, "EARLY_BIRD", earlyDef.points_rule.value, "booking", bookingId, "AVAILABLE");
              }
            }
          }

          // OFFPEAK_BONUS - check if off-peak (before 10am or after 8pm) - AUTO CLAIM
          const hour = startTime.getHours();
          if (hour < 10 || hour >= 20) {
            const offpeakDef = await getDefinition("OFFPEAK_BONUS");
            if (offpeakDef) {
              if (offpeakDef.awarding_mode === "AUTO_CLAIM") {
                await autoClaimReward(userId, "OFFPEAK_BONUS", offpeakDef.points_rule.value, "booking", bookingId);
              } else {
                await createRewardInstance(userId, "OFFPEAK_BONUS", offpeakDef.points_rule.value, "booking", bookingId, "AVAILABLE");
              }
            }
          }
        }

        // Check for referral first booking
        const { data: referral } = await supabaseAdmin
          .from("referral_attributions")
          .select("*")
          .eq("referred_user_id", userId)
          .is("first_booking_at", null)
          .single();

        if (referral) {
          // Update referral attribution
          await supabaseAdmin
            .from("referral_attributions")
            .update({ first_booking_at: new Date().toISOString() })
            .eq("id", referral.id);

          // Create reward for referrer - use awarding_mode
          const refBookingDef = await getDefinition("REFERRAL_FIRST_BOOKING");
          if (refBookingDef) {
            if (refBookingDef.awarding_mode === "AUTO_CLAIM") {
              await autoClaimReward(
                referral.referrer_user_id,
                "REFERRAL_FIRST_BOOKING",
                refBookingDef.points_rule.value,
                "referral",
                userId,
                { referred_user_id: userId, booking_id: bookingId }
              );
            } else {
              await createRewardInstance(
                referral.referrer_user_id,
                "REFERRAL_FIRST_BOOKING",
                refBookingDef.points_rule.value,
                "referral",
                userId,
                "AVAILABLE",
                { referred_user_id: userId, booking_id: bookingId }
              );
            }
          }
        }

        // STREAK TRACKING - Weekly booking streak
        const { data: streakBooking } = await supabaseAdmin
          .from("bookings")
          .select("start_time")
          .eq("id", bookingId)
          .single();

        if (streakBooking) {
          const bookingDate = new Date(streakBooking.start_time);
          // Get ISO week (YYYY-Www format)
          const getISOWeek = (date: Date): string => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
          };

          const currentWeek = getISOWeek(bookingDate);
          logStep("Checking streak", { userId, currentWeek });

          // Get or create user streak
          const { data: existingStreak } = await supabaseAdmin
            .from("user_streaks")
            .select("*")
            .eq("user_id", userId)
            .eq("streak_type", "WEEKLY_BOOKING")
            .maybeSingle();

          if (existingStreak) {
            // Check if this week is already counted
            if (existingStreak.last_qualified_week === currentWeek) {
              logStep("Week already counted for streak", { currentWeek });
            } else {
              // Check if this is consecutive
              const lastWeek = existingStreak.last_qualified_week;
              const isConsecutive = lastWeek ? isConsecutiveWeek(lastWeek, currentWeek) : false;
              
              const newStreak = isConsecutive ? existingStreak.current_streak + 1 : 1;
              const newBest = Math.max(existingStreak.best_streak, newStreak);

              await supabaseAdmin
                .from("user_streaks")
                .update({
                  current_streak: newStreak,
                  best_streak: newBest,
                  last_qualified_week: currentWeek,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingStreak.id);

              logStep("Updated streak", { newStreak, newBest, isConsecutive });

              // Check for streak milestones
              if (newStreak === 3) {
                // Award 3-week streak bonus (existing STREAK_3_BOOKINGS)
                const streakDef = await getDefinition("STREAK_3_BOOKINGS");
                if (streakDef) {
                  if (streakDef.awarding_mode === "AUTO_CLAIM") {
                    await autoClaimReward(userId, "STREAK_3_BOOKINGS", streakDef.points_rule.value, "streak", `${currentWeek}_3`);
                  } else {
                    await createRewardInstance(userId, "STREAK_3_BOOKINGS", streakDef.points_rule.value, "streak", `${currentWeek}_3`, "AVAILABLE");
                  }
                }
              } else if (newStreak === 5) {
                const streakDef = await getDefinition("STREAK_5_WEEKS");
                if (streakDef) {
                  await autoClaimReward(userId, "STREAK_5_WEEKS", streakDef.points_rule.value, "streak", `${currentWeek}_5`);
                }
              } else if (newStreak === 10) {
                const streakDef = await getDefinition("STREAK_10_WEEKS");
                if (streakDef) {
                  await autoClaimReward(userId, "STREAK_10_WEEKS", streakDef.points_rule.value, "streak", `${currentWeek}_10`);
                }
              }
            }
          } else {
            // Create first streak entry
            await supabaseAdmin
              .from("user_streaks")
              .insert({
                user_id: userId,
                streak_type: "WEEKLY_BOOKING",
                current_streak: 1,
                best_streak: 1,
                last_qualified_week: currentWeek,
              });
            logStep("Created first streak entry", { userId, currentWeek });
          }
        }

        break;
      }

      case "bookingCompleted": {
        if (!bookingId) {
          throw new Error("bookingId required for bookingCompleted");
        }

        // For auto-claim rewards, they're already claimed - nothing to do
        // For USER_CLAIM rewards that were PENDING, activate them now
        const { data: pendingRewards } = await supabaseAdmin
          .from("reward_instances")
          .select("*")
          .eq("source_type", "booking")
          .eq("source_id", bookingId)
          .eq("status", "PENDING");

        if (pendingRewards) {
          for (const reward of pendingRewards) {
            await supabaseAdmin
              .from("reward_instances")
              .update({
                status: "AVAILABLE",
                available_at: new Date().toISOString(),
              })
              .eq("id", reward.id);

            // Update notification
            await supabaseAdmin.from("notifications").insert({
              user_id: reward.user_id,
              type: "REWARD_AVAILABLE",
              title: "Reward verfügbar!",
              message: `Dein Reward ist jetzt verfügbar. Claim ${reward.points} Credits!`,
              cta_url: "/dashboard/p2g-points",
              metadata: { reward_instance_id: reward.id, points: reward.points },
            });

            logStep("Activated pending reward", { instanceId: reward.id });
          }
        }

        break;
      }

      case "bookingCancelled": {
        if (!bookingId) {
          throw new Error("bookingId required for bookingCancelled");
        }
        await reverseBookingRewards(bookingId, 100);
        break;
      }

      case "bookingRefunded": {
        if (!bookingId) {
          throw new Error("bookingId required for bookingRefunded");
        }
        const pct = refundPercentage || 100;
        await reverseBookingRewards(bookingId, pct);
        break;
      }

      case "profileCompleted": {
        const def = await getDefinition("PROFILE_COMPLETED");
        if (def) {
          if (def.awarding_mode === "AUTO_CLAIM") {
            await autoClaimReward(userId, "PROFILE_COMPLETED", def.points_rule.value, "profile", userId);
          } else {
            await createRewardInstance(userId, "PROFILE_COMPLETED", def.points_rule.value, "profile", userId, "AVAILABLE");
          }
        }
        break;
      }

      case "emailVerified": {
        const def = await getDefinition("EMAIL_VERIFIED");
        if (def) {
          if (def.awarding_mode === "AUTO_CLAIM") {
            await autoClaimReward(userId, "EMAIL_VERIFIED", def.points_rule.value, "verification", userId);
          } else {
            await createRewardInstance(userId, "EMAIL_VERIFIED", def.points_rule.value, "verification", userId, "AVAILABLE");
          }
        }

        // Also check for pending referral signup rewards and activate them
        const { data: referral } = await supabaseAdmin
          .from("referral_attributions")
          .select("*")
          .eq("referred_user_id", userId)
          .single();

        if (referral) {
          const { data: pendingReferral } = await supabaseAdmin
            .from("reward_instances")
            .select("*")
            .eq("definition_key", "REFERRAL_SIGNUP")
            .eq("source_type", "referral")
            .eq("source_id", userId)
            .eq("status", "PENDING")
            .single();

          if (pendingReferral) {
            const refDef = await getDefinition("REFERRAL_SIGNUP");
            if (refDef?.awarding_mode === "AUTO_CLAIM") {
              // Convert to auto-claim
              await supabaseAdmin
                .from("reward_instances")
                .update({
                  status: "CLAIMED",
                  available_at: new Date().toISOString(),
                  claimed_at: new Date().toISOString(),
                  metadata: { ...pendingReferral.metadata, auto_claimed: true },
                })
                .eq("id", pendingReferral.id);

              // Create ledger entry
              const { data: currentLedger } = await supabaseAdmin
                .from("points_ledger")
                .select("delta_points")
                .eq("user_id", pendingReferral.user_id)
                .eq("credit_type", "REWARD");

              const currentBalance = currentLedger?.reduce((sum, e) => sum + (e.delta_points || 0), 0) || 0;
              const newBalance = currentBalance + pendingReferral.points;

              await supabaseAdmin.from("points_ledger").insert({
                user_id: pendingReferral.user_id,
                credit_type: "REWARD",
                delta_points: pendingReferral.points,
                balance_after: newBalance,
                entry_type: "AUTO_CREDIT",
                description: "Referral-Signup Bonus",
                source_type: "referral",
                source_id: userId,
                reward_instance_id: pendingReferral.id,
              });

              // Update wallet
              const { data: wallet } = await supabaseAdmin
                .from("wallets")
                .select("reward_credits, lifetime_credits")
                .eq("user_id", pendingReferral.user_id)
                .maybeSingle();

              if (wallet) {
                await supabaseAdmin
                  .from("wallets")
                  .update({
                    reward_credits: (wallet.reward_credits || 0) + pendingReferral.points,
                    lifetime_credits: (wallet.lifetime_credits || 0) + pendingReferral.points,
                  })
                  .eq("user_id", pendingReferral.user_id);
              }

              await supabaseAdmin.from("notifications").insert({
                user_id: pendingReferral.user_id,
                type: "REWARD_CREDITED",
                title: `${pendingReferral.points} Referral-Credits gutgeschrieben!`,
                message: `Dein Freund hat sich verifiziert!`,
                cta_url: "/dashboard/p2g-points",
                metadata: { reward_instance_id: pendingReferral.id, points: pendingReferral.points },
              });
            } else {
              // Just make it available
              await supabaseAdmin
                .from("reward_instances")
                .update({
                  status: "AVAILABLE",
                  available_at: new Date().toISOString(),
                })
                .eq("id", pendingReferral.id);

              await supabaseAdmin.from("notifications").insert({
                user_id: pendingReferral.user_id,
                type: "REWARD_AVAILABLE",
                title: "Referral-Bonus verfügbar!",
                message: `Dein Freund hat sich verifiziert! Claim ${pendingReferral.points} Credits!`,
                cta_url: "/dashboard/p2g-points",
                metadata: { reward_instance_id: pendingReferral.id, points: pendingReferral.points },
              });
            }
          }
        }
        break;
      }

      case "referralSignup": {
        if (!referredUserId) {
          throw new Error("referredUserId required for referralSignup");
        }

        const def = await getDefinition("REFERRAL_SIGNUP");
        if (def) {
          // Create as PENDING - will be auto-claimed or made available when email is verified
          await createRewardInstance(
            userId,
            "REFERRAL_SIGNUP",
            def.points_rule.value,
            "referral",
            referredUserId,
            "PENDING",
            { referred_user_id: referredUserId }
          );
        }
        break;
      }

      case "referralFirstBooking": {
        if (!referredUserId || !bookingId) {
          throw new Error("referredUserId and bookingId required for referralFirstBooking");
        }

        const def = await getDefinition("REFERRAL_FIRST_BOOKING");
        if (def) {
          if (def.awarding_mode === "AUTO_CLAIM") {
            await autoClaimReward(
              userId,
              "REFERRAL_FIRST_BOOKING",
              def.points_rule.value,
              "referral",
              referredUserId,
              { referred_user_id: referredUserId, booking_id: bookingId }
            );
          } else {
            await createRewardInstance(
              userId,
              "REFERRAL_FIRST_BOOKING",
              def.points_rule.value,
              "referral",
              referredUserId,
              "AVAILABLE",
              { referred_user_id: referredUserId, booking_id: bookingId }
            );
          }
        }
        break;
      }

      case "instagramTag": {
        const def = await getDefinition("INSTAGRAM_TAG");
        if (def) {
          // Always requires approval
          await createRewardInstance(
            userId,
            "INSTAGRAM_TAG",
            def.points_rule.value,
            "instagram",
            `${userId}_${Date.now()}`,
            "PENDING_APPROVAL",
            metadata
          );
        }
        break;
      }

      case "participantPaid": {
        // Participant paid their share - award proportional booking points
        if (!bookingId || !priceCents) {
          throw new Error("bookingId and priceCents required for participantPaid");
        }
        
        const participantShareFraction = payload.shareFraction || 0.25;
        logStep("Processing participant payment", { userId, bookingId, priceCents, shareFraction: participantShareFraction });

        const bookingDef = await getDefinition("BOOKING_PAID");
        if (bookingDef) {
          // Calculate points based on what the participant actually paid
          const participantPriceCents = Math.floor(priceCents * participantShareFraction);
          const points = calculatePoints(bookingDef, participantPriceCents);
          
          if (points > 0) {
            // Use unique source_id to avoid conflicts with owner's reward
            const sourceId = `${bookingId}_participant_${userId}`;
            
            if (bookingDef.awarding_mode === "AUTO_CLAIM") {
              await autoClaimReward(userId, "BOOKING_PAID", points, "booking_participant", sourceId, {
                bookingId,
                shareFraction: participantShareFraction,
                participantPriceCents,
                originalPriceCents: priceCents,
              });
            } else {
              await createRewardInstance(userId, "BOOKING_PAID", points, "booking_participant", sourceId, "AVAILABLE", {
                bookingId,
                shareFraction: participantShareFraction,
                participantPriceCents,
                originalPriceCents: priceCents,
              });
            }
            
            logStep("Awarded participant booking points", { userId, points, shareFraction: participantShareFraction });
          }
        }
        break;
      }

      default:
        logStep("Unknown event", { event });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

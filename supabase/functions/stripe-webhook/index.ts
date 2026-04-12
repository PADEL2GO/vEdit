import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Stripe webhooks are server-to-server, minimal CORS needed
const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve keys: env var takes precedence, DB config is fallback
    let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      const { data: ic } = await supabaseAdmin.from("site_integration_configs").select("config").eq("service", "stripe").single();
      const cfg = (ic?.config as Record<string, string>) ?? {};
      if (!stripeKey) stripeKey = cfg.secret_key;
      if (!webhookSecret) webhookSecret = cfg.webhook_secret;
    }
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err as Error).message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const participantId = session.metadata?.participant_id;
        const paymentType = session.metadata?.type;
        
        logStep("Processing completed checkout", { 
          sessionId: session.id, 
          bookingId,
          participantId,
          paymentType,
          paymentStatus: session.payment_status 
        });

        if (session.payment_status === "paid") {
          // ============================================
          // LOBBY JOIN PAYMENT
          // ============================================
          if (paymentType === "lobby_join") {
            const lobbyId = session.metadata?.lobby_id;
            const lobbyMemberId = session.metadata?.lobby_member_id;
            const userId = session.metadata?.user_id;

            logStep("Processing lobby join payment", { lobbyId, lobbyMemberId, userId });

            if (lobbyMemberId) {
              // Idempotency check: skip if already processed
              const { data: currentMember } = await supabaseAdmin
                .from("lobby_members")
                .select("status")
                .eq("id", lobbyMemberId)
                .single();

              if (currentMember?.status === "paid") {
                logStep("Lobby member already paid — duplicate webhook ignored", { lobbyMemberId });
                break;
              }

              // Update member to paid
              const { error: memberError } = await supabaseAdmin
                .from("lobby_members")
                .update({
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  payment_intent_id: session.payment_intent as string,
                })
                .eq("id", lobbyMemberId);

              if (memberError) {
                logStep("Failed to update lobby member", { error: memberError.message });
              } else {
                logStep("Lobby member marked as paid", { lobbyMemberId });

                // Create lobby event
                await supabaseAdmin.from("lobby_events").insert({
                  lobby_id: lobbyId,
                  actor_id: userId,
                  event_type: "member_paid",
                  metadata: { member_id: lobbyMemberId, amount: session.amount_total },
                });

                // Check if lobby is now full
                const { data: lobby } = await supabaseAdmin
                  .from("lobbies")
                  .select("capacity, host_user_id")
                  .eq("id", lobbyId)
                  .single();

                const { data: paidMembers } = await supabaseAdmin
                  .from("lobby_members")
                  .select("id")
                  .eq("lobby_id", lobbyId)
                  .eq("status", "paid");

                const paidCount = paidMembers?.length || 0;
                
                if (lobby && paidCount >= lobby.capacity) {
                  await supabaseAdmin
                    .from("lobbies")
                    .update({ status: "full" })
                    .eq("id", lobbyId);

                  await supabaseAdmin.from("lobby_events").insert({
                    lobby_id: lobbyId,
                    event_type: "lobby_full",
                    metadata: { paid_count: paidCount },
                  });

                  logStep("Lobby marked as full", { lobbyId, paidCount });
                }

                // Notify host and other paid members
                const { data: otherMembers } = await supabaseAdmin
                  .from("lobby_members")
                  .select("user_id")
                  .eq("lobby_id", lobbyId)
                  .eq("status", "paid")
                  .neq("user_id", userId);

                const { data: userProfile } = await supabaseAdmin
                  .from("profiles")
                  .select("display_name")
                  .eq("user_id", userId)
                  .single();

                const notifyIds = [
                  lobby?.host_user_id,
                  ...(otherMembers || []).map((m: any) => m.user_id)
                ].filter((id, i, arr) => id && id !== userId && arr.indexOf(id) === i);

                for (const notifyId of notifyIds) {
                  await supabaseAdmin.from("notifications").insert({
                    user_id: notifyId,
                    type: "lobby_member_paid",
                    title: "Spieler hat bezahlt",
                    message: `${userProfile?.display_name || 'Ein Spieler'} hat seinen Anteil bezahlt.`,
                    entity_type: "lobby",
                    entity_id: lobbyId,
                    cta_url: `/lobbies/${lobbyId}`,
                  });
                }

                // If lobby is full, notify everyone
                if (lobby && paidCount >= lobby.capacity) {
                  const allMemberIds = [...notifyIds, userId].filter((id, i, arr) => arr.indexOf(id) === i);
                  for (const memberId of allMemberIds) {
                    await supabaseAdmin.from("notifications").insert({
                      user_id: memberId,
                      type: "lobby_full",
                      title: "Lobby vollständig!",
                      message: "Alle Spieler haben bezahlt. Viel Spaß beim Spiel!",
                      entity_type: "lobby",
                      entity_id: lobbyId,
                      cta_url: `/lobbies/${lobbyId}`,
                    });
                  }
                }
              }
            }
          }
          // Handle participant share payment
          else if (paymentType === "participant_share" && participantId) {
            // Idempotency check: skip if participant already paid
            const { data: currentParticipant } = await supabaseAdmin
              .from("booking_participants")
              .select("status")
              .eq("id", participantId)
              .single();

            if (currentParticipant?.status === "paid") {
              logStep("Participant already paid — duplicate webhook ignored", { participantId });
              break;
            }

            // Get participant details first
            const { data: participant, error: participantFetchError } = await supabaseAdmin
              .from("booking_participants")
              .select("share_fraction, share_price_cents, invited_user_id")
              .eq("id", participantId)
              .single();

            if (participantFetchError) {
              logStep("Failed to fetch participant", { error: participantFetchError.message });
            }

            const { error: participantError } = await supabaseAdmin
              .from("booking_participants")
              .update({ 
                status: "paid",
                paid_at: new Date().toISOString(),
              })
              .eq("id", participantId);

            if (participantError) {
              logStep("Failed to update participant", { error: participantError.message });
            } else {
              logStep("Participant marked as paid", { participantId });

              // Trigger rewards for participant payment
              const participantUserId = session.metadata?.participant_user_id;
              if (participantUserId && bookingId && participant) {
                // Get original booking price for proportional calculation
                const { data: booking } = await supabaseAdmin
                  .from("bookings")
                  .select("price_cents")
                  .eq("id", bookingId)
                  .single();

                const originalPriceCents = booking?.price_cents || (session.amount_total || 0) * 4; // Fallback estimate
                const shareFraction = participant.share_fraction || 0.25;

                try {
                  await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      event: "participantPaid",
                      userId: participantUserId,
                      bookingId,
                      priceCents: originalPriceCents,
                      shareFraction,
                    }),
                  });
                  logStep("Participant rewards triggered", { participantUserId, bookingId, shareFraction });
                } catch (rewardErr) {
                  logStep("Failed to trigger participant rewards", { error: (rewardErr as Error).message });
                }

                // Send confirmation email to participant
                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      booking_id: bookingId,
                      user_id: participantUserId,
                      payment_type: "participant",
                      participant_id: participantId,
                      amount_cents: session.amount_total,
                    }),
                  });
                  logStep("Participant confirmation email triggered", { participantUserId });
                } catch (emailErr) {
                  logStep("Failed to send participant confirmation", { error: (emailErr as Error).message });
                }
              }
            }
          }
          // Handle regular booking payment
          else if (bookingId) {
            // Idempotency check: skip if booking already confirmed
            const { data: currentBooking } = await supabaseAdmin
              .from("bookings")
              .select("status")
              .eq("id", bookingId)
              .single();

            if (currentBooking?.status === "confirmed") {
              logStep("Booking already confirmed — duplicate webhook ignored", { bookingId });
              break;
            }

            // Update booking to confirmed
            const { error: bookingError } = await supabaseAdmin
              .from("bookings")
              .update({ status: "confirmed" })
              .eq("id", bookingId);

            if (bookingError) {
              logStep("Failed to update booking", { error: bookingError.message });
            } else {
              logStep("Booking confirmed", { bookingId });
            }

            const isGuestWebhook = session.metadata?.is_guest === "1";
            const guestEmail = session.metadata?.guest_email;
            const guestName = session.metadata?.guest_name;

            // ── Award play credits for this booking (authenticated users only) ─
            if (!isGuestWebhook) try {
              const { data: bk } = await supabaseAdmin
                .from("bookings")
                .select("start_time, end_time, user_id, play_credits_awarded")
                .eq("id", bookingId)
                .single();

              if (bk && bk.play_credits_awarded === 0 && bk.user_id) {
                // Calculate weekly streak for this user
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const { data: prevBookings } = await supabaseAdmin
                  .from("bookings")
                  .select("start_time")
                  .eq("user_id", bk.user_id)
                  .eq("status", "confirmed")
                  .neq("id", bookingId)
                  .gte("start_time", threeMonthsAgo.toISOString());

                // ISO week key helper
                const isoWeekKey = (d: Date): string => {
                  const dt = new Date(d);
                  dt.setHours(12, 0, 0, 0);
                  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
                  const jan4 = new Date(dt.getFullYear(), 0, 4);
                  const wn = 1 + Math.round(((dt.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
                  return `${dt.getFullYear()}-W${String(wn).padStart(2, "0")}`;
                };

                const weekSet = new Set((prevBookings || []).map(b => isoWeekKey(new Date(b.start_time))));
                // Include current booking's week
                weekSet.add(isoWeekKey(new Date(bk.start_time)));

                let weekStreak = 0;
                const cursor = new Date();
                for (let i = 0; i < 13; i++) {
                  if (!weekSet.has(isoWeekKey(cursor))) break;
                  weekStreak++;
                  cursor.setDate(cursor.getDate() - 7);
                }

                // Multiplier
                const multiplier = weekStreak >= 4 ? 2.5 : weekStreak === 3 ? 2.0 : weekStreak === 2 ? 1.5 : 1.0;

                // Hours (rounded to nearest 0.5)
                const hours = (new Date(bk.end_time).getTime() - new Date(bk.start_time).getTime()) / 3600000;
                const roundedHours = Math.max(0.5, Math.round(hours * 2) / 2);
                const creditsToAward = Math.round(roundedHours * 100 * multiplier);

                // Fetch current wallet
                const { data: wallet } = await supabaseAdmin
                  .from("wallets")
                  .select("play_credits, lifetime_credits")
                  .eq("user_id", bk.user_id)
                  .single();

                const currentCredits = wallet?.play_credits ?? 0;
                const currentLifetime = wallet?.lifetime_credits ?? 0;

                await supabaseAdmin.from("wallets").upsert({
                  user_id: bk.user_id,
                  play_credits: currentCredits + creditsToAward,
                  lifetime_credits: currentLifetime + creditsToAward,
                }, { onConflict: "user_id" });

                await supabaseAdmin.from("bookings")
                  .update({ play_credits_awarded: creditsToAward })
                  .eq("id", bookingId);

                logStep("Play credits awarded", { bookingId, creditsToAward, weekStreak, multiplier });

                // First-booking onboarding bonus (one-time 500 pts)
                const { data: walletAfter } = await supabaseAdmin
                  .from("wallets")
                  .select("onboarding_booking_credited, play_credits, lifetime_credits")
                  .eq("user_id", bk.user_id)
                  .single();

                if (walletAfter && !walletAfter.onboarding_booking_credited) {
                  await supabaseAdmin.from("wallets").update({
                    play_credits: (walletAfter.play_credits ?? 0) + 500,
                    lifetime_credits: (walletAfter.lifetime_credits ?? 0) + 500,
                    onboarding_booking_credited: true,
                  }).eq("user_id", bk.user_id);
                  logStep("Onboarding booking bonus awarded", { userId: bk.user_id });
                }
              }
            } catch (creditErr) {
              logStep("Failed to award play credits", { error: (creditErr as Error).message });
            }
            // ────────────────────────────────────────────────────────────────


            // Update payment record
            const { error: paymentError } = await supabaseAdmin
              .from("payments")
              .update({ 
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("stripe_checkout_session_id", session.id);

            if (paymentError) {
              logStep("Failed to update payment", { error: paymentError.message });
            } else {
              logStep("Payment record updated");
            }

            // Record voucher redemption if a partial-discount voucher was applied.
            // (current_uses was already incremented as a soft-reserve in create-checkout-session)
            const appliedVoucherId = session.metadata?.voucher_id;
            if (appliedVoucherId) {
              await supabaseAdmin.from("voucher_redemptions").insert({
                voucher_id: appliedVoucherId,
                booking_id: bookingId,
                user_id: session.metadata?.user_id ?? "",
              });
              logStep("Voucher redemption recorded", { voucherId: appliedVoucherId, bookingId });
            }

            // ── Deduct credits if applied ────────────────────────────────
            const creditsUsed = parseInt(session.metadata?.credits_used ?? "0", 10);
            const creditUserId = session.metadata?.user_id;
            if (creditsUsed > 0 && creditUserId) {
              try {
                const { data: walletForCredits } = await supabaseAdmin
                  .from("wallets")
                  .select("play_credits")
                  .eq("user_id", creditUserId)
                  .single();
                const newBalance = Math.max(0, (walletForCredits?.play_credits ?? 0) - creditsUsed);
                await supabaseAdmin.from("wallets")
                  .update({ play_credits: newBalance })
                  .eq("user_id", creditUserId);
                await supabaseAdmin.from("bookings")
                  .update({ credits_used: creditsUsed })
                  .eq("id", bookingId);
                logStep("Credits deducted", { userId: creditUserId, creditsUsed, newBalance });
              } catch (cErr) {
                logStep("Failed to deduct credits", { error: (cErr as Error).message });
              }
            }
            // ─────────────────────────────────────────────────────────────

            const userId = session.metadata?.user_id;
            const priceCents = session.amount_total;

            if (!isGuestWebhook && userId && priceCents) {
              // ── Authenticated user: trigger rewards + send confirmation ──
              try {
                await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ event: "bookingPaid", userId, bookingId, priceCents }),
                });
                logStep("Rewards trigger called", { userId, bookingId, priceCents });
              } catch (rewardErr) {
                logStep("Failed to trigger rewards", { error: (rewardErr as Error).message });
              }

              try {
                await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    booking_id: bookingId,
                    user_id: userId,
                    payment_type: "owner",
                    amount_cents: priceCents,
                  }),
                });
                logStep("Owner confirmation email triggered", { userId });
              } catch (emailErr) {
                logStep("Failed to send owner confirmation", { error: (emailErr as Error).message });
              }
            } else if (isGuestWebhook && guestEmail) {
              // ── Guest: send confirmation to guest email, skip rewards ──
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    booking_id: bookingId,
                    guest_email: guestEmail,
                    guest_name: guestName || "Gast",
                    payment_type: "owner",
                    amount_cents: priceCents,
                  }),
                });
                logStep("Guest confirmation email triggered", { guestEmail });
              } catch (emailErr) {
                logStep("Failed to send guest confirmation", { error: (emailErr as Error).message });
              }
            }
          } else {
            logStep("No booking_id, participant_id or lobby in metadata", { sessionId: session.id });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (!bookingId) {
          logStep("No booking_id in metadata for expired session");
          break;
        }

        logStep("Processing expired checkout", { sessionId: session.id, bookingId });

        // Update booking to expired
        const { error: bookingError } = await supabaseAdmin
          .from("bookings")
          .update({ status: "expired" })
          .eq("id", bookingId)
          .eq("status", "pending_payment"); // Only expire if still pending

        if (bookingError) {
          logStep("Failed to expire booking", { error: bookingError.message });
        } else {
          logStep("Booking expired", { bookingId });
        }

        // Update payment record
        const { error: paymentError } = await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_checkout_session_id", session.id);

        if (paymentError) {
          logStep("Failed to update payment status", { error: paymentError.message });
        }

        // Release soft-reserved voucher use so the code can be used again
        const expiredVoucherId = session.metadata?.voucher_id;
        if (expiredVoucherId) {
          const { data: vData } = await supabaseAdmin
            .from("voucher_codes")
            .select("current_uses")
            .eq("id", expiredVoucherId)
            .single();
          if (vData && vData.current_uses > 0) {
            await supabaseAdmin
              .from("voucher_codes")
              .update({ current_uses: vData.current_uses - 1 })
              .eq("id", expiredVoucherId)
              .eq("current_uses", vData.current_uses); // optimistic lock
            logStep("Voucher soft reserve released", { voucherId: expiredVoucherId });
          }
        }
        break;
      }

      // ============================================
      // REFUND HANDLING
      // ============================================
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing refund", { 
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          amountCaptured: charge.amount_captured,
        });

        // Get payment intent to find booking
        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;

        if (!paymentIntentId) {
          logStep("No payment_intent in charge");
          break;
        }

        // Find payment record by payment intent
        const { data: payment, error: paymentFetchError } = await supabaseAdmin
          .from("payments")
          .select("booking_id, user_id, amount_total_cents")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single();

        if (paymentFetchError || !payment) {
          logStep("Payment record not found", { paymentIntentId, error: paymentFetchError?.message });
          break;
        }

        const bookingId = payment.booking_id;
        const userId = payment.user_id;
        const originalAmount = payment.amount_total_cents || charge.amount_captured;

        // Calculate refund percentage
        const refundPercentage = originalAmount > 0 
          ? Math.round((charge.amount_refunded / originalAmount) * 100)
          : 100;

        const isFullRefund = refundPercentage >= 100;

        logStep("Refund details", { 
          bookingId, 
          userId, 
          originalAmount, 
          amountRefunded: charge.amount_refunded,
          refundPercentage,
          isFullRefund 
        });

        // Update booking status
        if (isFullRefund) {
          const { error: bookingError } = await supabaseAdmin
            .from("bookings")
            .update({ 
              status: "cancelled",
              cancelled_at: new Date().toISOString()
            })
            .eq("id", bookingId);

          if (bookingError) {
            logStep("Failed to update booking to cancelled", { error: bookingError.message });
          } else {
            logStep("Booking marked as cancelled", { bookingId });
          }
        }

        // Update payment status
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("payments")
          .update({ 
            status: isFullRefund ? "refunded" : "partially_refunded"
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (paymentUpdateError) {
          logStep("Failed to update payment status", { error: paymentUpdateError.message });
        }

        // Trigger rewards reversal
        try {
          await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event: "bookingRefunded",
              userId,
              bookingId,
              refundPercentage,
            }),
          });
          logStep("Rewards reversal triggered", { userId, bookingId, refundPercentage });
        } catch (rewardErr) {
          logStep("Failed to trigger rewards reversal", { error: (rewardErr as Error).message });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.booking_id;

        logStep("Payment failed", { 
          paymentIntentId: paymentIntent.id, 
          bookingId,
          lastError: paymentIntent.last_payment_error?.message 
        });

        if (bookingId) {
          // Update payment record
          const { error: paymentError } = await supabaseAdmin
            .from("payments")
            .update({ status: "failed" })
            .eq("stripe_payment_intent_id", paymentIntent.id);

          if (paymentError) {
            logStep("Failed to update payment status", { error: paymentError.message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

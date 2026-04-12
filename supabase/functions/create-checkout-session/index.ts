import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://padel2go.lovable.app",
  "https://padel2go.de",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client for user auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    // Service client for writes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve Stripe key: env var takes precedence, DB config is fallback
    let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const { data: ic } = await supabaseAdmin.from("site_integration_configs").select("config").eq("service", "stripe").single();
      stripeKey = (ic?.config as Record<string, string>)?.secret_key;
    }
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    // Try to resolve authenticated user — for guests this will return null
    let user: { id: string; email: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user?.id && userData.user.email) {
        user = userData.user as { id: string; email: string };
      }
    }
    logStep("Auth resolved", { userId: user?.id ?? "guest" });

    const { booking_id, voucher_id, credits_to_use = 0 } = await req.json();
    if (!booking_id) throw new Error("booking_id is required");
    logStep("Received booking_id", { booking_id });

    // Fetch booking using service role (bypasses RLS) — works for both auth and guest
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        *,
        locations (name, slug),
        courts (name)
      `)
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingError) {
      logStep("Database error fetching booking", { error: bookingError.message });
      throw new Error("Failed to fetch booking");
    }

    if (!booking) {
      logStep("Booking not found", { booking_id });
      throw new Error("Booking not found");
    }

    // Ownership check:
    //   - Authenticated booking → user_id must match JWT user
    //   - Guest booking (user_id IS NULL) → UUID is the credential, no user required
    const isGuestBooking = booking.user_id === null;
    if (!isGuestBooking) {
      if (!user) throw new Error("Authentication required for this booking");
      if (booking.user_id !== user.id) {
        logStep("Access denied", { booking_user_id: booking.user_id, request_user_id: user.id });
        throw new Error("Access denied");
      }
    } else {
      // Guest booking — must have guest_email stored on record
      if (!(booking as any).guest_email) throw new Error("Guest booking is missing email");
      logStep("Guest booking access granted", { booking_id, guest_email: (booking as any).guest_email });
    }

    // Verify booking is in pending_payment status
    if (booking.status !== "pending_payment") {
      logStep("Invalid booking status", { status: booking.status });
      throw new Error(`Booking is not awaiting payment. Status: ${booking.status}`);
    }

    // Hold limit: max 3 active unpaid holds per authenticated user.
    // Guests are exempt — each guest booking is a one-off transaction.
    if (!isGuestBooking && user) {
      const now = new Date().toISOString();
      const { count: activeHolds, error: holdCountError } = await supabaseAdmin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_payment")
        .gt("hold_expires_at", now)
        .neq("id", booking_id);

      if (holdCountError) {
        logStep("Error checking active holds", { error: holdCountError.message });
      } else if ((activeHolds ?? 0) >= 3) {
        logStep("Hold limit exceeded", { userId: user.id, activeHolds });
        throw new Error("Buchungslimit erreicht: Du hast bereits 3 offene Reservierungen.");
      }
    }

    logStep("Booking verified", { 
      booking_id: booking.id, 
      status: booking.status,
      price_cents: booking.price_cents,
      payment_mode: booking.payment_mode,
      court_id: booking.court_id
    });

    // Calculate duration
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Get court-specific price from database, with fallback to global price
    let priceCents: number | null = null;

    // Try court-specific price first
    const { data: courtPrice, error: courtPriceError } = await supabaseAdmin
      .from("court_prices")
      .select("price_cents")
      .eq("court_id", booking.court_id)
      .eq("duration_minutes", durationMinutes)
      .maybeSingle();

    if (courtPriceError) {
      logStep("Error fetching court price", { error: courtPriceError.message });
    }

    if (courtPrice) {
      priceCents = courtPrice.price_cents;
      logStep("Using court-specific price", { court_id: booking.court_id, priceCents });
    } else {
      // Fallback to global price
      const { data: globalPrice, error: globalPriceError } = await supabaseAdmin
        .from("court_prices")
        .select("price_cents")
        .is("court_id", null)
        .eq("duration_minutes", durationMinutes)
        .maybeSingle();

      if (globalPriceError) {
        logStep("Error fetching global price", { error: globalPriceError.message });
        throw new Error("Failed to fetch price");
      }

      if (globalPrice) {
        priceCents = globalPrice.price_cents;
        logStep("Using global fallback price", { priceCents });
      } else {
        logStep("No price configured for duration", { duration: durationMinutes });
        throw new Error(`No price configured for duration (${durationMinutes} min)`);
      }
    }

    // Use the price stored in the booking (set at booking time) if available
    const totalPriceCents = booking.price_cents || priceCents;
    logStep("Price determined", { totalPriceCents, fromBooking: !!booking.price_cents });

    // Calculate owner's payment amount based on payment mode
    const MAX_PLAYERS = 4;
    let ownerPaymentCents = totalPriceCents;
    
    if (booking.payment_mode === "split") {
      // Count invited players to determine owner's share
      const { data: participants } = await supabaseAdmin
        .from("booking_participants")
        .select("id")
        .eq("booking_id", booking.id);
      
      const invitedCount = participants?.length || 0;
      // Owner pays their share (1/MAX_PLAYERS) + any unfilled empty slots
      // Guard against invitedCount exceeding available slots (data integrity issue)
      const safeInvitedCount = Math.min(invitedCount, MAX_PLAYERS - 1);
      const emptySlots = MAX_PLAYERS - 1 - safeInvitedCount;
      const ownerSlots = 1 + emptySlots;
      ownerPaymentCents = Math.ceil((totalPriceCents * ownerSlots) / MAX_PLAYERS);
      
      logStep("Split payment calculated", { 
        invitedCount, 
        ownerSlots, 
        ownerPaymentCents,
        totalPrice: totalPriceCents
      });
    }

    // Apply partial voucher discount if provided.
    // Fully-free vouchers (discount_type='free' or percentage=100) bypass Stripe via
    // voucher-redeem; this path handles percentage < 100 and fixed-amount codes.
    let appliedVoucherId: string | undefined;
    if (voucher_id) {
      const { data: voucher, error: vErr } = await supabaseAdmin
        .from("voucher_codes")
        .select("id, is_active, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until")
        .eq("id", voucher_id)
        .single();

      if (!vErr && voucher && voucher.is_active) {
        const vNow = new Date();
        const validFrom = new Date(voucher.valid_from);
        const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;
        const withinWindow = validFrom <= vNow && (!validUntil || validUntil > vNow);
        const hasUses = voucher.max_uses === null || voucher.current_uses < voucher.max_uses;

        if (withinWindow && hasUses) {
          // Soft-reserve a use slot atomically (same optimistic-lock pattern as voucher-redeem)
          const { data: reserved } = await supabaseAdmin
            .from("voucher_codes")
            .update({ current_uses: voucher.current_uses + 1 })
            .eq("id", voucher.id)
            .eq("current_uses", voucher.current_uses)
            .select("id");

          if (reserved && reserved.length > 0) {
            const dt: string = voucher.discount_type ?? "free";
            const dv: number = voucher.discount_value ?? 0;
            const before = ownerPaymentCents;

            if (dt === "percentage" && dv > 0 && dv < 100) {
              ownerPaymentCents = Math.max(0, Math.ceil(ownerPaymentCents * (1 - dv / 100)));
            } else if (dt === "fixed" && dv > 0) {
              ownerPaymentCents = Math.max(0, ownerPaymentCents - dv);
            }

            // If the discount makes the price zero, release the reserve and reject —
            // fully-free vouchers must go through voucher-redeem (bypasses Stripe).
            if (ownerPaymentCents === 0) {
              await supabaseAdmin
                .from("voucher_codes")
                .update({ current_uses: voucher.current_uses })
                .eq("id", voucher.id)
                .eq("current_uses", voucher.current_uses + 1);
              throw new Error("Dieser Gutschein macht die Buchung kostenlos — bitte über 'Kostenlos buchen' einlösen");
            }

            appliedVoucherId = voucher.id;
            logStep("Voucher discount applied", { voucherId: voucher.id, dt, dv, before, after: ownerPaymentCents });
          } else {
            logStep("Voucher soft-reserve failed (concurrent use)", { voucherId: voucher_id });
          }
        } else {
          logStep("Voucher no longer valid at checkout time", { voucherId: voucher_id });
        }
      } else {
        logStep("Voucher not found or inactive", { voucherId: voucher_id });
      }
    }

    // ── Apply credits discount (authenticated users only) ────────────────────
    let appliedCredits = 0;
    if (credits_to_use > 0 && !isGuestBooking && user) {
      // Fetch settings: max percent + credits per euro (default 50 / 100)
      const { data: siteSettings } = await supabaseAdmin
        .from("site_settings")
        .select("feature_credits_payment_enabled, credits_payment_max_percent, credits_per_euro")
        .eq("id", "global")
        .single();

      const creditsEnabled = (siteSettings as any)?.feature_credits_payment_enabled ?? false;
      const maxPercent: number = (siteSettings as any)?.credits_payment_max_percent ?? 50;
      const creditsPerEuro: number = (siteSettings as any)?.credits_per_euro ?? 100;

      if (!creditsEnabled) {
        throw new Error("Credits-Zahlung ist aktuell nicht aktiviert");
      }

      // Validate user has enough credits
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("play_credits")
        .eq("user_id", user.id)
        .single();

      const availableCredits = wallet?.play_credits ?? 0;
      if (credits_to_use > availableCredits) {
        throw new Error(`Nicht genug Credits. Verfügbar: ${availableCredits}`);
      }

      // Cap at max percent of ownerPaymentCents
      // 100 credits = 1 euro = 100 cents → credits_value_cents = credits_to_use * (100 / creditsPerEuro)
      const centsPerCredit = 100 / creditsPerEuro; // e.g. 1.0 at default rate
      const maxDiscountCents = Math.floor(ownerPaymentCents * maxPercent / 100);
      const requestedDiscountCents = Math.floor(credits_to_use * centsPerCredit);
      const actualDiscountCents = Math.min(requestedDiscountCents, maxDiscountCents);
      appliedCredits = Math.ceil(actualDiscountCents / centsPerCredit);

      ownerPaymentCents = Math.max(50, ownerPaymentCents - actualDiscountCents); // Stripe minimum 50 cents
      logStep("Credits discount applied", { credits_to_use, appliedCredits, actualDiscountCents, newPrice: ownerPaymentCents });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve email for Stripe checkout
    const effectiveEmail = isGuestBooking
      ? (booking as any).guest_email as string
      : (user!.email as string);

    // Check for existing Stripe customer (only for authenticated users)
    let customerId: string | undefined;
    if (!isGuestBooking) {
      const customers = await stripe.customers.list({ email: effectiveEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      }
    }

    const requestOrigin = origin || "https://padel2go.lovable.app";
    const locationName = (booking.locations as { name: string })?.name || "Court";
    const courtName = (booking.courts as { name: string })?.name || "";

    // Build description
    let description = `${courtName} • ${durationMinutes} Minuten • ${startTime.toLocaleDateString('de-DE')} ${startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    if (booking.payment_mode === "split" && ownerPaymentCents < totalPriceCents) {
      description += ` (Dein Anteil)`;
    }

    // Session expires in 30 minutes — keeps the court slot hold short
    const sessionExpiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : effectiveEmail,
      payment_method_types: ["card"],
      expires_at: sessionExpiresAt,
      line_items: [
        {
          price_data: {
            currency: booking.currency || "eur",
            product_data: {
              name: `Padel Court - ${locationName}`,
              description,
            },
            unit_amount: ownerPaymentCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${requestOrigin}/booking/success?session_id={CHECKOUT_SESSION_ID}${isGuestBooking ? "&guest=1" : ""}`,
      cancel_url: `${requestOrigin}/booking/cancel?booking_id=${booking_id}`,
      metadata: {
        booking_id: booking.id,
        location_id: booking.location_id,
        court_id: booking.court_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_minutes: durationMinutes.toString(),
        payment_mode: booking.payment_mode || "full",
        owner_amount_cents: ownerPaymentCents.toString(),
        ...(isGuestBooking
          ? {
              is_guest: "1",
              guest_email: (booking as any).guest_email,
              guest_name: (booking as any).guest_name ?? "",
            }
          : { user_id: user!.id }),
        ...(appliedVoucherId ? { voucher_id: appliedVoucherId } : {}),
        ...(appliedCredits > 0 ? { credits_used: appliedCredits.toString() } : {}),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Extend both hold_expires_at (read by the client countdown timer) and
    // expires_at to match the 30-minute Stripe session window.
    // Before this point hold_expires_at was set to only 15 min at booking creation;
    // we sync it here so the timer on the checkout page stays accurate.
    const expiresAtIso = new Date(sessionExpiresAt * 1000).toISOString();
    await supabaseAdmin
      .from("bookings")
      .update({ hold_expires_at: expiresAtIso, expires_at: expiresAtIso })
      .eq("id", booking.id);
    logStep("Booking expiry set", { expiresAt: expiresAtIso });

    // Check for existing payment record and upsert
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existingPayment) {
      // Update existing payment with new session
      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({
          stripe_checkout_session_id: session.id,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPayment.id);

      if (updateError) {
        logStep("Payment record update failed", { error: updateError.message });
      } else {
        logStep("Existing payment record updated");
      }
    } else {
      // Create new payment record
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          booking_id: booking.id,
          user_id: isGuestBooking ? null : user!.id,
          stripe_checkout_session_id: session.id,
          amount_total_cents: ownerPaymentCents,
          currency: booking.currency || "EUR",
          status: "pending",
        });

      if (paymentError) {
        logStep("Payment record creation failed", { error: paymentError.message });
      } else {
        logStep("Payment record created");
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
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

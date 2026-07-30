import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "npm:stripe@18.5.0";

// Native in-app payments (Apple Pay / saved cards) for COURT BOOKINGS via Stripe's
// PaymentSheet. Mirrors create-checkout-session's validation + pricing + voucher logic, but
// returns a PaymentIntent client secret instead of a hosted-checkout URL.
//
// Settlement is NOT duplicated: the intent carries the SAME metadata as a checkout session
// plus `flow: "native_sheet"`, and stripe-webhook normalizes `payment_intent.succeeded`
// events with that flag into a session-shaped object — so the existing (battle-tested)
// booking settlement path runs unchanged.
//
// Marketplace deliberately stays on hosted checkout (points/stock reservation logic lives
// there); Apple Pay is available there through the in-app browser.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const logStep = (step: string, details?: Record<string, unknown>) =>
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const { data: ic } = await supabaseAdmin.from("site_integration_configs").select("config").eq("service", "stripe").single();
      stripeKey = (ic?.config as Record<string, string>)?.secret_key;
    }
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    // Auth — native payments are for signed-in users only (guests use hosted checkout).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);
    const { data: userData } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user?.id || !user.email) return json({ error: "Authentication required" }, 401);

    // TEST MODE for allowlisted testers (sandbox cards) — same switch as checkout.
    const testKey = Deno.env.get("STRIPE_TEST_SECRET_KEY");
    const testEmails = (Deno.env.get("STRIPE_TEST_USER_EMAILS") ?? "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const isTestMode = !!testKey && testEmails.includes(user.email.toLowerCase());
    if (isTestMode) {
      stripeKey = testKey!;
      logStep("TEST MODE intent (sandbox key)", { email: user.email });
    }

    // Publishable key must match the mode the intent is created in — the app initializes
    // the Stripe SDK with whatever we return here.
    let publishableKey = isTestMode
      ? Deno.env.get("STRIPE_TEST_PUBLISHABLE_KEY") ?? ""
      : Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? "";
    if (!publishableKey) {
      const { data: ic } = await supabaseAdmin.from("site_integration_configs").select("config").eq("service", "stripe").single();
      const cfg = (ic?.config as Record<string, string>) ?? {};
      // The DB config holds the test pair; only use it when it matches the active mode.
      const cfgKey = cfg.publishable_key ?? "";
      if (cfgKey.startsWith(isTestMode ? "pk_test" : "pk_live")) publishableKey = cfgKey;
    }
    if (!publishableKey) throw new Error("Stripe publishable key is not configured for this mode");

    const { booking_id, voucher_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id is required" }, 400);

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*, locations (name), courts (name)")
      .eq("id", booking_id)
      .maybeSingle();
    if (bookingError) throw new Error("Failed to fetch booking");
    if (!booking) return json({ error: "Booking not found" }, 404);
    if (booking.user_id !== user.id) return json({ error: "Access denied" }, 403);
    if (booking.status !== "pending_payment") {
      return json({ error: `Booking is not awaiting payment. Status: ${booking.status}` }, 409);
    }
    if (new Date(booking.start_time).getTime() < Date.now() - 15 * 60 * 1000) {
      return json({ error: "Der gebuchte Zeitraum liegt in der Vergangenheit" }, 409);
    }

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Server-recomputed price (court-specific, then global fallback) — never trust the
    // client-inserted booking.price_cents.
    let priceCents: number | null = null;
    const { data: courtPrice } = await supabaseAdmin
      .from("court_prices").select("price_cents")
      .eq("court_id", booking.court_id).eq("duration_minutes", durationMinutes).maybeSingle();
    if (courtPrice) {
      priceCents = courtPrice.price_cents;
    } else {
      const { data: globalPrice } = await supabaseAdmin
        .from("court_prices").select("price_cents")
        .is("court_id", null).eq("duration_minutes", durationMinutes).maybeSingle();
      if (!globalPrice) throw new Error(`No price configured for duration (${durationMinutes} min)`);
      priceCents = globalPrice.price_cents;
    }
    let amountCents = priceCents!;

    // Partial voucher discount — identical semantics to create-checkout-session
    // (fully-free vouchers must go through voucher-redeem, sub-minimum clamps to 50c).
    let appliedVoucherId: string | undefined;
    if (voucher_id) {
      const { data: voucher } = await supabaseAdmin
        .from("voucher_codes")
        .select("id, is_active, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until")
        .eq("id", voucher_id).single();
      if (voucher?.is_active) {
        const now = new Date();
        const withinWindow = new Date(voucher.valid_from) <= now &&
          (!voucher.valid_until || new Date(voucher.valid_until) > now);
        const hasUses = voucher.max_uses === null || voucher.current_uses < voucher.max_uses;
        if (withinWindow && hasUses) {
          const { data: reserved } = await supabaseAdmin
            .from("voucher_codes")
            .update({ current_uses: voucher.current_uses + 1 })
            .eq("id", voucher.id).eq("current_uses", voucher.current_uses).select("id");
          if (reserved && reserved.length > 0) {
            const dt = voucher.discount_type ?? "free";
            const dv = voucher.discount_value ?? 0;
            if (dt === "percentage" && dv > 0 && dv < 100) {
              amountCents = Math.max(0, Math.ceil(amountCents * (1 - dv / 100)));
            } else if (dt === "fixed" && dv > 0) {
              amountCents = Math.max(0, amountCents - dv);
            }
            if (amountCents === 0) {
              await supabaseAdmin.from("voucher_codes")
                .update({ current_uses: voucher.current_uses })
                .eq("id", voucher.id).eq("current_uses", voucher.current_uses + 1);
              return json({ error: "Dieser Gutschein macht die Buchung kostenlos — bitte über 'Kostenlos buchen' einlösen" }, 409);
            }
            if (amountCents < 50) amountCents = 50;
            appliedVoucherId = voucher.id;
            logStep("Voucher applied", { voucherId: voucher.id, amountCents });
          }
        }
      }
    }
    amountCents = Math.max(50, amountCents);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reuse (or create) the Stripe customer so PaymentSheet can offer saved cards.
    let customerId: string;
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = existing.data.length > 0
      ? existing.data[0].id
      : (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })).id;

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2025-08-27.basil" },
    );

    const locationName = (booking.locations as { name: string })?.name || "Court";
    const courtName = (booking.courts as { name: string })?.name || "";

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: (booking.currency || "eur").toLowerCase(),
      customer: customerId,
      receipt_email: user.email,
      description: `Padel Court - ${locationName} · ${courtName} · ${durationMinutes} Min`,
      automatic_payment_methods: { enabled: true },
      // Same keys the checkout session sets — the webhook reads these verbatim.
      metadata: {
        booking_id: booking.id,
        location_id: booking.location_id,
        court_id: booking.court_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_minutes: durationMinutes.toString(),
        owner_amount_cents: amountCents.toString(),
        user_id: user.id,
        flow: "native_sheet",
        ...(appliedVoucherId ? { voucher_id: appliedVoucherId } : {}),
      },
    }, { idempotencyKey: `pi_${booking.id}_${amountCents}` });

    logStep("PaymentIntent created", { intentId: intent.id, amountCents, testMode: isTestMode });

    return json({
      publishable_key: publishableKey,
      client_secret: intent.client_secret,
      customer_id: customerId,
      ephemeral_key: ephemeralKey.secret,
      amount_cents: amountCents,
      test_mode: isTestMode,
    });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    logStep("ERROR", { message });
    return json({ error: message }, 500);
  }
});

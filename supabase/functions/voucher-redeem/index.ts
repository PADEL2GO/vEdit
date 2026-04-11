import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { code, booking_id } = await req.json();
    if (!code || !booking_id) {
      return new Response(JSON.stringify({ error: "Code und Booking-ID erforderlich" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Look up voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from("voucher_codes")
      .select("*")
      .eq("code", normalizedCode)
      .single();

    if (voucherError || !voucher) {
      return new Response(JSON.stringify({ error: "Ungültiger Code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate
    if (!voucher.is_active) {
      return new Response(JSON.stringify({ error: "Code ist nicht mehr aktiv" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const now = new Date();
    if (new Date(voucher.valid_from) > now) {
      return new Response(JSON.stringify({ error: "Code ist noch nicht gültig" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return new Response(JSON.stringify({ error: "Code ist abgelaufen" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return new Response(JSON.stringify({ error: "Code vollständig eingelöst" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify booking belongs to user and is pending_payment
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, price_cents")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Buchung nicht gefunden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Kein Zugriff auf diese Buchung" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (booking.status !== "pending_payment") {
      return new Response(JSON.stringify({ error: "Buchung kann nicht eingelöst werden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Guard: this endpoint only handles fully-free vouchers.
    // Partial discounts (percentage < 100, fixed below booking price) must go through
    // create-checkout-session so Stripe collects the remaining amount.
    const dt: string = voucher.discount_type ?? "free";
    const dv: number = voucher.discount_value ?? 0;
    const bookingPrice: number = booking.price_cents ?? 0;

    const isFree =
      dt === "free" ||
      (dt === "percentage" && dv >= 100) ||
      (dt === "fixed" && dv >= bookingPrice);

    if (!isFree) {
      return new Response(
        JSON.stringify({ error: "Dieser Gutschein gewährt nur einen Teilrabatt — bitte über Stripe bezahlen" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if already redeemed for this booking
    const { data: existingRedemption } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("id")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(JSON.stringify({ error: "Für diese Buchung wurde bereits ein Code eingelöst" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // All good — redeem!
    // 1. Atomically reserve a use slot (optimistic lock prevents concurrent over-redemption)
    //    This MUST happen before any booking changes so we can cleanly abort if exhausted.
    const { data: reservedVoucher, error: reserveError } = await supabaseAdmin
      .from("voucher_codes")
      .update({ current_uses: voucher.current_uses + 1 })
      .eq("id", voucher.id)
      .eq("current_uses", voucher.current_uses) // Only succeeds if nobody else changed it
      .select("id");

    if (reserveError || !reservedVoucher || reservedVoucher.length === 0) {
      // Another concurrent request incremented first — re-check if still under limit
      const { data: freshVoucher } = await supabaseAdmin
        .from("voucher_codes")
        .select("current_uses, max_uses")
        .eq("id", voucher.id)
        .single();
      const alreadyExhausted = freshVoucher && freshVoucher.max_uses !== null && freshVoucher.current_uses >= freshVoucher.max_uses;
      return new Response(JSON.stringify({
        error: alreadyExhausted
          ? "Dieser Code wurde bereits vollständig eingelöst"
          : "Code konnte nicht eingelöst werden – bitte erneut versuchen",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // 2. Update booking: price to 0, status to confirmed
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        price_cents: 0,
        status: "confirmed",
        payment_mode: "voucher",
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      // Rollback the reserved slot
      await supabaseAdmin
        .from("voucher_codes")
        .update({ current_uses: voucher.current_uses })
        .eq("id", voucher.id)
        .eq("current_uses", voucher.current_uses + 1);
      return new Response(JSON.stringify({ error: "Fehler beim Aktualisieren der Buchung" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // 3. Create redemption record
    const { error: redemptionError } = await supabaseAdmin
      .from("voucher_redemptions")
      .insert({
        voucher_id: voucher.id,
        booking_id: booking_id,
        user_id: user.id,
      });

    if (redemptionError) {
      console.error("Failed to create redemption:", redemptionError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Buchung kostenlos bestätigt!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("voucher-redeem error:", err);
    return new Response(JSON.stringify({ error: "Serverfehler" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

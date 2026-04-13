import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://www.padel2go-official.de",
  "https://padel2go-official.de",
  "https://padel2go.lovable.app",
  "https://padel2go.de",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed =
    origin &&
    allowedOrigins.some(
      (a) =>
        origin === a ||
        origin.endsWith(".lovable.app") ||
        origin.endsWith(".lovableproject.com")
    );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

const log = (step: string, details?: Record<string, unknown>) =>
  console.log(
    `[CREATE-GUEST-BOOKING] ${step}${details ? " - " + JSON.stringify(details) : ""}`
  );

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      court_id,
      location_id,
      start_time,
      end_time,
      guest_name,
      guest_email,
      guest_phone,
    } = await req.json();

    // ── Input validation ─────────────────────────────────────────────────────
    if (!court_id || !location_id || !start_time || !end_time) {
      throw new Error("court_id, location_id, start_time, end_time are required");
    }
    if (!guest_name?.trim()) {
      throw new Error("guest_name is required");
    }
    if (!guest_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email.trim())) {
      throw new Error("A valid guest_email is required");
    }

    log("Input validated", { court_id, location_id, start_time, end_time, guest_email });

    // ── Verify court is active and belongs to location ───────────────────────
    const { data: court, error: courtError } = await supabaseAdmin
      .from("courts")
      .select("id, is_active, location_id")
      .eq("id", court_id)
      .eq("is_active", true)
      .maybeSingle();

    if (courtError || !court) {
      throw new Error("Court not found or inactive");
    }
    if (court.location_id !== location_id) {
      throw new Error("Court does not belong to this location");
    }

    // ── Calculate duration ────────────────────────────────────────────────────
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid start_time or end_time");
    }
    const durationMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / 60000
    );
    if (durationMinutes <= 0 || durationMinutes > 240) {
      throw new Error(`Invalid booking duration: ${durationMinutes} min`);
    }

    // ── Fetch price (court-specific, fallback to global) ──────────────────────
    let priceCents: number | null = null;

    const { data: courtPrice } = await supabaseAdmin
      .from("court_prices")
      .select("price_cents")
      .eq("court_id", court_id)
      .eq("duration_minutes", durationMinutes)
      .maybeSingle();

    if (courtPrice) {
      priceCents = courtPrice.price_cents;
      log("Using court-specific price", { priceCents });
    } else {
      const { data: globalPrice } = await supabaseAdmin
        .from("court_prices")
        .select("price_cents")
        .is("court_id", null)
        .eq("duration_minutes", durationMinutes)
        .maybeSingle();
      if (globalPrice) {
        priceCents = globalPrice.price_cents;
        log("Using global fallback price", { priceCents });
      }
    }

    if (!priceCents) {
      throw new Error(`No price configured for ${durationMinutes}-minute slot`);
    }

    // ── Check for overlapping bookings ────────────────────────────────────────
    // We rely on the DB exclusion constraint (no_overlapping_bookings) to be the
    // final guard; do a quick pre-check here for a better error message.
    const { data: overlapping, error: overlapError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("court_id", court_id)
      .in("status", ["pending_payment", "confirmed"])
      .lt("start_time", end_time)
      .gt("end_time", start_time)
      .limit(1);

    if (overlapError) {
      log("Overlap check error (non-fatal)", { error: overlapError.message });
    } else if (overlapping && overlapping.length > 0) {
      throw new Error("Dieser Zeitslot ist nicht mehr verfügbar");
    }

    // ── Insert guest booking ──────────────────────────────────────────────────
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: newBooking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: null,
        location_id,
        court_id,
        start_time,
        end_time,
        status: "pending_payment",
        price_cents: priceCents,
        currency: "EUR",
        hold_expires_at: holdExpiresAt,
        payment_mode: "full",
        guest_name: guest_name.trim(),
        guest_email: guest_email.trim().toLowerCase(),
        guest_phone: guest_phone?.trim() || null,
      })
      .select("id, price_cents")
      .single();

    if (insertError) {
      log("Insert failed", { error: insertError.message, code: insertError.code });
      // Exclusion constraint = slot taken between our check and insert
      if (
        insertError.code === "23P01" ||
        insertError.message.includes("no_overlapping_bookings")
      ) {
        throw new Error("Dieser Zeitslot ist nicht mehr verfügbar");
      }
      throw new Error("Buchung konnte nicht angelegt werden");
    }

    log("Guest booking created", { bookingId: newBooking.id, priceCents });

    return new Response(
      JSON.stringify({ booking_id: newBooking.id, price_cents: newBooking.price_cents }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: {
        ...getCorsHeaders(req.headers.get("origin")),
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});

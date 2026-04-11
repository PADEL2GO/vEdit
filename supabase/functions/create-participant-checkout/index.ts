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
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PARTICIPANT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Get auth user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request
    const { participant_id } = await req.json();
    if (!participant_id) throw new Error("participant_id is required");

    logStep("Received participant_id", { participant_id });

    // Get participant details with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: participant, error: participantError } = await supabaseAdmin
      .from("booking_participants")
      .select(`
        id,
        booking_id,
        invited_user_id,
        share_price_cents,
        status
      `)
      .eq("id", participant_id)
      .single();

    if (participantError || !participant) {
      throw new Error("Participant not found");
    }

    // Verify this is the invited user
    if (participant.invited_user_id !== user.id) {
      throw new Error("Not authorized to pay for this invite");
    }

    // Verify status is accepted (not pending_invite or already paid)
    if (participant.status !== "accepted") {
      throw new Error(`Invalid participant status: ${participant.status}`);
    }

    if (!participant.share_price_cents || participant.share_price_cents <= 0) {
      throw new Error("No share price defined for this invite");
    }

    logStep("Participant verified", {
      participant_id: participant.id,
      share_price_cents: participant.share_price_cents,
    });

    // Get booking details for metadata
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        start_time,
        currency,
        location_id
      `)
      .eq("id", participant.booking_id)
      .single();
    
    // Get location name separately
    const { data: locationData } = await supabaseAdmin
      .from("locations")
      .select("name")
      .eq("id", booking?.location_id || "")
      .maybeSingle();
    
    const locationName = locationData?.name || "Court";

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const requestOrigin = origin || "https://padel2go.de";

    // Create checkout session for participant share
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: booking?.currency?.toLowerCase() || "eur",
            product_data: {
              name: `Padel Court Anteil - ${locationName}`,
              description: `Buchung am ${new Date(booking?.start_time || "").toLocaleDateString("de-DE")}`,
            },
            unit_amount: participant.share_price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${requestOrigin}/booking/success?participant=${participant_id}`,
      cancel_url: `${requestOrigin}/account`,
      metadata: {
        participant_id: participant.id,
        booking_id: participant.booking_id,
        type: "participant_share",
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

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

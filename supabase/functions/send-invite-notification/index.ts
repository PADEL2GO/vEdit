import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: unknown) => {
  console.log(`[SEND-INVITE] ${step}`, data ? JSON.stringify(data) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller identity — accept either a user JWT or the service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let callerId: string | null = null;
    const isServiceCall = authHeader === `Bearer ${supabaseServiceKey}`;

    if (!isServiceCall) {
      // Verify as user JWT
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await userClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = user.id;
    }

    const { participant_id, origin } = await req.json();
    logStep("Request received", { participant_id, origin });

    if (!participant_id) {
      throw new Error("participant_id is required");
    }

    // Fetch participant with booking and location details
    const { data: participant, error: participantError } = await adminClient
      .from("booking_participants")
      .select(`
        id,
        invited_user_id,
        invited_username,
        share_price_cents,
        booking_id,
        inviter_user_id
      `)
      .eq("id", participant_id)
      .single();

    if (participantError || !participant) {
      throw new Error(`Participant not found: ${participantError?.message}`);
    }
    logStep("Participant found", participant);

    // Verify caller is the inviter (booking owner) — service calls bypass this check
    if (!isServiceCall && callerId !== participant.inviter_user_id) {
      logStep("Caller is not the inviter", { callerId, inviter_user_id: participant.inviter_user_id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(`
        id,
        start_time,
        end_time,
        price_cents,
        location_id,
        court_id
      `)
      .eq("id", participant.booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }
    logStep("Booking found", booking);

    // Fetch location details
    const { data: location, error: locationError } = await adminClient
      .from("locations")
      .select("name, address, city")
      .eq("id", booking.location_id)
      .single();

    if (locationError || !location) {
      throw new Error(`Location not found: ${locationError?.message}`);
    }
    logStep("Location found", location);

    // Fetch inviter profile
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", participant.inviter_user_id)
      .single();

    const inviterName = inviterProfile?.display_name || inviterProfile?.username || "Ein Spieler";
    logStep("Inviter name", { inviterName });

    // Fetch invited user's email from auth.users using admin client
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      participant.invited_user_id
    );

    if (userError || !userData?.user?.email) {
      throw new Error(`Could not get invited user email: ${userError?.message}`);
    }

    const invitedEmail = userData.user.email;
    logStep("Invited user email", { invitedEmail });

    // Format date and time
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    
    const dateFormatter = new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    
    const timeFormatter = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const formattedDate = dateFormatter.format(startDate);
    const formattedStartTime = timeFormatter.format(startDate);
    const formattedEndTime = timeFormatter.format(endDate);
    
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    const sharePriceEuros = ((participant.share_price_cents || 0) / 100).toFixed(2).replace(".", ",");

    // Build accept URL - use participant_id as token
    const baseUrl = origin || "https://padel2go.lovable.app";
    const acceptUrl = `${baseUrl}/invite/accept?token=${participant.id}`;

    logStep("Building email", { acceptUrl, sharePriceEuros });

    // Send email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel Einladung</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🎾 PADEL2GO</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">Du wurdest eingeladen!</h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.5;">
                <strong style="color: #18181b;">@${participant.invited_username}</strong>, ${inviterName} hat dich zu einem Padel-Match eingeladen.
              </p>
              
              <!-- Match Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #71717a; font-size: 14px;">📍 Location</span><br>
                          <span style="color: #18181b; font-size: 16px; font-weight: 500;">${location.name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #71717a; font-size: 14px;">📅 Datum</span><br>
                          <span style="color: #18181b; font-size: 16px; font-weight: 500;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #71717a; font-size: 14px;">🕐 Uhrzeit</span><br>
                          <span style="color: #18181b; font-size: 16px; font-weight: 500;">${formattedStartTime} - ${formattedEndTime} Uhr (${durationMinutes} Min)</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Price -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dcfce7; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td>
                    <span style="color: #166534; font-size: 14px; font-weight: 500;">💰 Dein Anteil</span><br>
                    <span style="color: #15803d; font-size: 28px; font-weight: 700;">${sharePriceEuros} €</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);">
                      JETZT BEZAHLEN
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; text-align: center; line-height: 1.5;">
                Nach der Bezahlung erscheint das Match automatisch in deinen Buchungen.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f4f4f5; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} PADEL2GO. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "PADEL2GO <contact@padel2go.eu>",
      to: [invitedEmail],
      subject: `🎾 ${inviterName} hat dich zu einem Padel-Match eingeladen!`,
      html: emailHtml,
    });

    logStep("Email sent", emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.data?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("Error", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

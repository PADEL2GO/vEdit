import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

// Resend is initialized lazily inside the handler so we can fall back to DB config

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BOOKING-CONFIRMATION] ${step}${detailsStr}`);
};

interface ConfirmationRequest {
  booking_id: string;
  user_id?: string;
  guest_email?: string;
  guest_name?: string;
  payment_type: "owner" | "participant";
  participant_id?: string;
  amount_cents?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Only allow calls from internal services (stripe-webhook, etc.) using service role key
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      logStep("Unauthorized call rejected");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve Resend API key: env var takes precedence, DB config is fallback
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    let appUrl = Deno.env.get("APP_URL");
    if (!resendApiKey || !appUrl) {
      const { data: ic } = await supabase.from("site_integration_configs").select("config, service").in("service", ["resend", "app"]);
      for (const row of ic ?? []) {
        const cfg = (row.config as Record<string, string>) ?? {};
        if (row.service === "resend" && !resendApiKey) resendApiKey = cfg.api_key;
        if (row.service === "app" && !appUrl) appUrl = cfg.url;
      }
    }
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(resendApiKey);

    const { booking_id, user_id, guest_email, guest_name, payment_type, participant_id, amount_cents }: ConfirmationRequest = await req.json();
    logStep("Request parsed", { booking_id, user_id: user_id ?? "guest", payment_type, participant_id, amount_cents });

    if (!booking_id) {
      throw new Error("booking_id is required");
    }
    if (!user_id && !guest_email) {
      throw new Error("Either user_id or guest_email is required");
    }

    // Fetch booking details with location and court
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        start_time,
        end_time,
        price_cents,
        currency,
        user_id,
        courts!inner(id, name),
        locations!inner(id, name, address, city)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message || "Not found"}`);
    }
    logStep("Booking fetched", { bookingId: booking.id });

    // Resolve recipient email + name
    let recipientEmail: string;
    let recipientName: string;

    if (guest_email) {
      // Guest booking — use provided email/name directly
      recipientEmail = guest_email;
      recipientName = guest_name || "Gast";
      logStep("Guest recipient resolved", { email: recipientEmail });
    } else {
      // Authenticated user — fetch from auth.users + profile
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id!);
      if (userError || !userData.user?.email) {
        throw new Error(`Failed to fetch user email: ${userError?.message || "No email"}`);
      }
      recipientEmail = userData.user.email;
      logStep("Recipient email fetched", { email: recipientEmail });

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user_id!)
        .single();

      recipientName = profile?.display_name || profile?.username || "Spieler";
    }

    // Calculate duration and format times
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    
    const formattedDate = startDate.toLocaleDateString('de-DE', dateOptions);
    const startTime = startDate.toLocaleTimeString('de-DE', timeOptions);
    const endTime = endDate.toLocaleTimeString('de-DE', timeOptions);

    // Determine paid amount
    let paidAmountCents = amount_cents;
    
    if (!paidAmountCents) {
      if (payment_type === "participant" && participant_id) {
        const { data: participant } = await supabase
          .from("booking_participants")
          .select("share_price_cents")
          .eq("id", participant_id)
          .single();
        paidAmountCents = participant?.share_price_cents || 0;
      } else {
        paidAmountCents = booking.price_cents || 0;
      }
    }

    const finalAmountCents = paidAmountCents ?? 0;
    const paidAmount = (finalAmountCents / 100).toFixed(2).replace('.', ',');
    const bookingRef = booking.id.substring(0, 8).toUpperCase();

    // Get location and court details - these are single objects due to !inner join
    const location = (Array.isArray(booking.locations) ? booking.locations[0] : booking.locations) as { id: string; name: string; address?: string; city?: string };
    const court = (Array.isArray(booking.courts) ? booking.courts[0] : booking.courts) as { id: string; name: string };

    // Different messaging for owner vs participant
    const isOwner = payment_type === "owner";
    const subjectLine = isOwner 
      ? "✅ Deine Buchung ist bestätigt!"
      : "✅ Deine Zahlung war erfolgreich!";
    
    const headerText = isOwner
      ? "Buchung bestätigt!"
      : "Zahlung erfolgreich!";
    
    const introText = isOwner
      ? "Deine Buchung wurde erfolgreich bezahlt und ist damit bestätigt."
      : "Deine Teilnahme am Match wurde erfolgreich bezahlt.";

    // Generate booking URL (appUrl resolved above, fallback to production domain)
    const resolvedAppUrl = appUrl || "https://padel2go.de";
    // Guests land on /booking (they can't access the dashboard); users go to their booking list
    const bookingUrl = guest_email
      ? `${resolvedAppUrl}/booking`
      : `${resolvedAppUrl}/dashboard/booking`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectLine}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🎾 PADEL2GO
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Success Icon & Title -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #22c55e;">
                  ${headerText}
                </h1>
                <p style="margin: 12px 0 0; color: #94a3b8; font-size: 15px;">
                  ${introText}
                </p>
              </div>

              <!-- Greeting -->
              <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 24px;">
                Hallo ${recipientName},
              </p>

              <!-- Booking Details Card -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                  Buchungsdetails
                </h2>
                
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 18px; margin-right: 12px;">📍</span>
                    <div>
                      <div style="color: #ffffff; font-weight: 600; font-size: 16px;">${location.name}</div>
                      ${location.address ? `<div style="color: #94a3b8; font-size: 14px;">${location.address}${location.city ? `, ${location.city}` : ''}</div>` : ''}
                    </div>
                  </div>
                </div>

                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 16px; margin-right: 12px;">📅</span>
                    <span style="color: #e2e8f0; font-size: 15px;">${formattedDate}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 16px; margin-right: 12px;">🕐</span>
                    <span style="color: #e2e8f0; font-size: 15px;">${startTime} - ${endTime} Uhr (${durationMinutes} Min)</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 16px; margin-right: 12px;">🎾</span>
                    <span style="color: #e2e8f0; font-size: 15px;">${court.name}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Info -->
              <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="color: #94a3b8; font-size: 13px; margin-bottom: 4px;">Bezahlt</div>
                    <div style="color: #22c55e; font-size: 24px; font-weight: 700;">${paidAmount} €</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: #94a3b8; font-size: 13px; margin-bottom: 4px;">Buchungsnr.</div>
                    <div style="color: #e2e8f0; font-size: 14px; font-weight: 600;">#${bookingRef}</div>
                  </div>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${bookingUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                  Buchung ansehen
                </a>
              </div>

              <!-- Footer Message -->
              <p style="text-align: center; color: #94a3b8; font-size: 14px; margin: 0;">
                Wir freuen uns auf dein Match! 🏆
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: rgba(0,0,0,0.2); text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
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

    // Send email
    const emailResponse = await resend.emails.send({
      from: "PADEL2GO <contact@padel2go.eu>",
      to: [recipientEmail],
      subject: subjectLine,
      html: htmlContent,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

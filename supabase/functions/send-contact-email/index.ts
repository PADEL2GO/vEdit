import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

interface ContactEmailRequest {
  name: string;
  email: string;
  reason: string;
  message: string;
  organization?: string;
}

const reasonLabels: Record<string, string> = {
  spieler: "Frage als Spieler",
  verein: "Anfrage als Verein",
  partner: "Partnerschaftsanfrage",
  presse: "Presseanfrage",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  console.log("send-contact-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log("Client IP:", clientIP);

    // Initialize Supabase client for rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count, error: countError } = await supabaseAdmin
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .eq('action', 'contact_form')
      .gte('created_at', windowStart);

    if (countError) {
      console.error("Rate limit check error:", countError);
      // Continue without rate limiting if check fails
    } else if (count !== null && count >= MAX_REQUESTS_PER_WINDOW) {
      console.log(`Rate limit exceeded for IP: ${clientIP}, count: ${count}`);
      return new Response(
        JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { name, email, reason, message, organization }: ContactEmailRequest = await req.json();
    
    console.log("Received contact request:", { name, reason });

    if (!name || !email || !message) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Name, E-Mail und Nachricht sind erforderlich" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Basic input validation
    if (name.length > 100 || email.length > 255 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Eingabe zu lang" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Ungültige E-Mail-Adresse" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sanitize inputs for HTML (basic XSS prevention)
    const sanitize = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const safeName = sanitize(name);
    const safeEmail = sanitize(email);
    const safeMessage = sanitize(message);
    const safeOrganization = organization ? sanitize(organization) : null;

    const reasonLabel = reasonLabels[reason] || reason || "Allgemeine Anfrage";
    const safeReasonLabel = sanitize(reasonLabel);

    // Log the request for rate limiting (before sending email)
    const { error: logError } = await supabaseAdmin
      .from('rate_limit_log')
      .insert({
        ip_address: clientIP,
        action: 'contact_form',
      });

    if (logError) {
      console.error("Failed to log rate limit entry:", logError);
      // Continue even if logging fails
    }

    // Send email to contact@padel2go.eu
    const emailResponse = await resend.emails.send({
      from: "PADEL2GO <contact@padel2go.eu>",
      to: ["contact@padel2go.eu"],
      reply_to: email,
      subject: `Kontaktanfrage: ${safeReasonLabel} - ${safeName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #d4ff00; margin: 0; font-size: 24px;">Neue Kontaktanfrage</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold; color: #495057;">Anfrageart:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #212529;">${safeReasonLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold; color: #495057;">Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #212529;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold; color: #495057;">E-Mail:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #212529;"><a href="mailto:${safeEmail}" style="color: #007bff;">${safeEmail}</a></td>
              </tr>
              ${safeOrganization ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; font-weight: bold; color: #495057;">Organisation:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #212529;">${safeOrganization}</td>
              </tr>` : ''}
            </table>
            
            <div style="margin-top: 20px;">
              <h3 style="color: #495057; margin-bottom: 10px;">Nachricht:</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; white-space: pre-wrap; color: #212529;">${safeMessage}</div>
            </div>
          </div>
          
          <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 20px;">
            Diese E-Mail wurde automatisch über das Kontaktformular auf padel2go.eu gesendet.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Fehler beim Senden der E-Mail" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

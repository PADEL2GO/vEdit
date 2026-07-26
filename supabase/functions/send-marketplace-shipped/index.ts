import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

// Admin-only: mark a marketplace order as shipped (tracking number + carrier) and
// send the customer the shipping confirmation with the tracking link.
// Idempotent: the mail is claimed via shipping_confirmation_sent_at, so a double
// click can never send twice; tracking data itself may be corrected by re-calls.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPERADMIN_EMAIL = "fsteinfelder@padel2go.eu";

const TRACKING_URLS: Record<string, (n: string) => string> = {
  dhl: (n) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(n)}`,
  dpd: (n) => `https://tracking.dpd.de/status/de_DE/parcel/${encodeURIComponent(n)}`,
  gls: (n) => `https://gls-group.eu/DE/de/paketverfolgung?match=${encodeURIComponent(n)}`,
  hermes: (n) => `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#${encodeURIComponent(n)}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Auth: caller must be an admin ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nicht autorisiert" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) return json({ error: "Nicht autorisiert" }, 401);

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole && user.email !== SUPERADMIN_EMAIL) {
      return json({ error: "Keine Admin-Berechtigung" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = (body as { order_id?: string }).order_id;
    const trackingNumber = ((body as { tracking_number?: string }).tracking_number ?? "").trim();
    const carrier = ((body as { carrier?: string }).carrier ?? "").trim();
    if (!orderId) return json({ error: "order_id fehlt" }, 400);
    if (!trackingNumber || !carrier) return json({ error: "Trackingnummer und Versanddienstleister sind erforderlich" }, 400);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("marketplace_redemptions")
      .select("id, status, reference_code, user_id, item_id, guest_email, guest_name, shipping_confirmation_sent_at")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "Bestellung nicht gefunden" }, 404);
    if (order.status !== "success") return json({ error: "Nur bezahlte Bestellungen können versendet werden" }, 400);

    // Persist tracking + shipped state (always — corrections allowed).
    const { error: updateErr } = await supabaseAdmin
      .from("marketplace_redemptions")
      .update({
        tracking_number: trackingNumber,
        carrier,
        shipped_at: new Date().toISOString(),
        fulfillment_status: "shipped",
      })
      .eq("id", orderId);
    if (updateErr) return json({ error: "Bestellung konnte nicht aktualisiert werden: " + updateErr.message }, 500);

    // ── Customer mail (claim so a double click can't double-send) ──────────────
    const { data: mailClaim } = await supabaseAdmin
      .from("marketplace_redemptions")
      .update({ shipping_confirmation_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("shipping_confirmation_sent_at", null)
      .select("id");

    if (!mailClaim || mailClaim.length === 0) {
      return json({ success: true, mail: "already_sent" }, 200);
    }

    const releaseClaim = () =>
      supabaseAdmin
        .from("marketplace_redemptions")
        .update({ shipping_confirmation_sent_at: null })
        .eq("id", orderId);

    try {
      let recipientEmail = order.guest_email as string | null;
      let recipientName = order.guest_name as string | null;
      if (!recipientEmail && order.user_id) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        recipientEmail = authUser?.user?.email ?? null;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", order.user_id)
          .maybeSingle();
        recipientName = profile?.display_name || profile?.username || null;
      }
      if (!recipientEmail) {
        return json({ success: true, mail: "no_recipient_email" }, 200);
      }

      let itemName = "Deine Bestellung";
      if (order.item_id) {
        const { data: itemRow } = await supabaseAdmin
          .from("marketplace_items")
          .select("name")
          .eq("id", order.item_id)
          .maybeSingle();
        if (itemRow?.name) itemName = itemRow.name;
      }

      const resendKey = await resolveResendKey(supabaseAdmin);
      if (!resendKey) {
        await releaseClaim();
        return json({ error: "Resend ist nicht konfiguriert" }, 500);
      }

      const trackingUrl = TRACKING_URLS[carrier.toLowerCase()]?.(trackingNumber);
      const rows = [
        { label: "Produkt", value: itemName },
        { label: "Bestellnr.", value: order.reference_code ?? order.id.substring(0, 8).toUpperCase() },
        { label: "Versanddienstleister", value: carrier },
        { label: "Sendungsnummer", value: trackingNumber },
      ];

      const html = brandedEmailHtml({
        title: "Bestellung versendet",
        emoji: "📦",
        heading: "Deine Bestellung ist unterwegs!",
        intro: "Wir haben dein Paket dem Versanddienstleister übergeben.",
        greetingName: recipientName ?? undefined,
        rows,
        ...(trackingUrl ? { ctaLabel: "Sendung verfolgen", ctaUrl: trackingUrl } : {}),
        note: "Die Zustellung dauert je nach Dienstleister in der Regel 1–3 Werktage.",
      });

      await sendBrandedEmail(resendKey, recipientEmail, `Deine Bestellung ist unterwegs: ${itemName}`, html);
      return json({ success: true }, 200);
    } catch (mailErr) {
      await releaseClaim();
      return json({ error: "Versand-Mail fehlgeschlagen: " + (mailErr as Error).message }, 500);
    }
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

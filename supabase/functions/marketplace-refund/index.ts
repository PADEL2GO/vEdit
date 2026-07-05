import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Admin-only refund/cancellation for a paid marketplace order.
// Flow (idempotent + retry-safe):
//   1. verify caller is an admin
//   2. load the order; only a 'success' order can be refunded
//   3. issue the Stripe money refund (skipped if a refund already exists, or if the
//      order was fully points-covered / has no Stripe session)
//   4. reverse the DB side via refund_marketplace_order (stock + points + status)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPERADMIN_EMAIL = "fsteinfelder@padel2go.eu";

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
    if (!orderId) return json({ error: "order_id fehlt" }, 400);

    // ── Load order ─────────────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("marketplace_redemptions")
      .select("id, status, amount_cents, stripe_session_id, reference_code")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "Bestellung nicht gefunden" }, 404);
    if (order.status === "refunded") return json({ error: "Bestellung wurde bereits erstattet" }, 400);
    if (order.status !== "success") {
      return json({ error: "Nur bezahlte Bestellungen können storniert werden" }, 400);
    }

    // ── Stripe money refund (only if actually paid with money) ──────────────────
    const amount = Number((order as { amount_cents?: number }).amount_cents ?? 0);
    const sessionId = (order as { stripe_session_id?: string }).stripe_session_id;
    if (amount > 0 && sessionId) {
      let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        const { data: ic } = await supabaseAdmin
          .from("site_integration_configs")
          .select("config")
          .eq("service", "stripe")
          .single();
        stripeKey = (ic?.config as Record<string, string>)?.secret_key;
      }
      if (!stripeKey) return json({ error: "Stripe ist nicht konfiguriert" }, 500);

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      let paymentIntentId: string | null = null;
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as { id?: string } | null)?.id ?? null;
      } catch (e) {
        return json({ error: "Stripe-Zahlung konnte nicht geladen werden: " + (e as Error).message }, 502);
      }
      if (!paymentIntentId) {
        return json({ error: "Zu dieser Bestellung wurde keine Stripe-Zahlung gefunden" }, 400);
      }

      // Idempotent: skip only if a refund that actually returns money already exists
      // (succeeded or still pending). A prior failed/canceled refund must NOT block a
      // real one — otherwise the DB would flip to 'refunded' with no money returned.
      const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 10 });
      const alreadyRefunded = existing.data.some(
        (r) => r.status === "succeeded" || r.status === "pending",
      );
      if (!alreadyRefunded) {
        try {
          await stripe.refunds.create(
            { payment_intent: paymentIntentId },
            { idempotencyKey: `mp_refund_${orderId}` },
          );
        } catch (e) {
          // Money not refunded → do NOT touch the DB; admin can retry safely.
          return json({ error: "Stripe-Rückerstattung fehlgeschlagen: " + (e as Error).message }, 502);
        }
      }
    }

    // ── Reverse the DB side (stock + points + status). Idempotent. ──────────────
    const { data: refunded, error: rpcErr } = await supabaseAdmin.rpc("refund_marketplace_order", {
      p_order_id: orderId,
    });
    if (rpcErr) {
      return json({ error: "Rückabwicklung in der Datenbank fehlgeschlagen: " + rpcErr.message }, 500);
    }

    return json({ success: true, refunded: !!refunded, reference_code: order.reference_code }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveResendKey, brandedEmailHtml, sendBrandedEmail } from "../_shared/email.ts";

// Sends the branded customer order-confirmation for a completed marketplace order.
// Called server-to-server (service role) by marketplace-checkout (free/points path) and
// stripe-webhook (paid path). Idempotent: an atomic claim on customer_confirmation_sent_at
// guarantees a retried webhook can never double-mail the buyer.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-MARKETPLACE-CONFIRMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Service-role only (mirrors send-booking-confirmation).
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: "order_id fehlt" }, 400);

    const { data: order, error: orderError } = await supabase
      .from("marketplace_redemptions")
      .select(
        "id, status, user_id, item_id, quantity, play_spent, reward_spent, amount_cents, reference_code, guest_email, guest_name, shipping_address_line1, shipping_postal_code, shipping_city, shipping_country, customer_confirmation_sent_at",
      )
      .eq("id", order_id)
      .maybeSingle();

    if (orderError) throw new Error(`Bestellung konnte nicht geladen werden: ${orderError.message}`);
    if (!order) return json({ error: "Bestellung nicht gefunden" }, 404);
    if (order.status !== "success") {
      // Only a completed order gets a confirmation (released/refunded/pending must not).
      return json({ success: true, skipped: "order_not_success" }, 200);
    }
    if (order.customer_confirmation_sent_at) {
      return json({ success: true, skipped: "already_sent" }, 200);
    }

    // Atomic claim: only the caller that flips NULL -> now() sends the mail.
    const { data: claimed } = await supabase
      .from("marketplace_redemptions")
      .update({ customer_confirmation_sent_at: new Date().toISOString() })
      .eq("id", order_id)
      .is("customer_confirmation_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return json({ success: true, skipped: "already_claimed" }, 200);
    }

    const releaseClaim = async () => {
      await supabase
        .from("marketplace_redemptions")
        .update({ customer_confirmation_sent_at: null })
        .eq("id", order_id);
    };

    // Everything after the claim runs guarded: ANY failure (DB read, getUserById, send)
    // releases the claim so a later delivery can re-send. Without this a transient blip
    // would leave the row 'confirmed' with no email ever sent.
    try {
      const resendKey = await resolveResendKey(supabase);
      if (!resendKey) {
        // Nothing to send now — release so a later delivery (once the key is set) can re-claim.
        await releaseClaim();
        return json({ success: true, skipped: "resend_not_configured" }, 200);
      }

      // Resolve recipient: guest email directly, otherwise the account email.
      let recipientEmail: string | null = order.guest_email ?? null;
      let recipientName: string = order.guest_name || "Gast";
      if (!recipientEmail && order.user_id) {
        const { data: u } = await supabase.auth.admin.getUserById(order.user_id);
        recipientEmail = u.user?.email ?? null;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", order.user_id)
          .maybeSingle();
        recipientName = profile?.display_name || profile?.username || "Spieler";
      }
      if (!recipientEmail) {
        // No address on the order — leave the claim set so we don't retry a hopeless send.
        return json({ success: true, skipped: "no_recipient_email" }, 200);
      }

      // Item name + whether it is a physical product that ships.
      let itemName = "Artikel";
      let isPhysical = false;
      if (order.item_id) {
        const { data: itemRow } = await supabase
          .from("marketplace_items")
          .select("name, product_type")
          .eq("id", order.item_id)
          .maybeSingle();
        if (itemRow?.name) itemName = itemRow.name;
        isPhysical = itemRow?.product_type === "purchase";
      }

      const pointsSpent = (order.play_spent ?? 0) + (order.reward_spent ?? 0);
      const amountCents = order.amount_cents ?? 0;
      const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

      // Receipt with sequential number + VAT split (created at settle time).
      const { data: receipt } = await supabase
        .from("receipts")
        .select("receipt_number, gross_cents, discount_cents, paid_cents, tax_rate, tax_cents")
        .eq("receipt_type", "marketplace_order")
        .eq("source_id", order.id)
        .maybeSingle();

      const rows = [
        { label: "Produkt", value: `${itemName}${(order.quantity ?? 1) > 1 ? ` × ${order.quantity}` : ""}` },
        { label: "Bestellnr.", value: order.reference_code ?? order.id.substring(0, 8).toUpperCase() },
      ];
      if (receipt?.receipt_number) rows.push({ label: "Belegnr.", value: receipt.receipt_number });
      if (receipt && (receipt.discount_cents ?? 0) > 0) {
        rows.push({ label: "Warenwert", value: eur(receipt.gross_cents ?? 0) });
        rows.push({ label: "Punkte-Rabatt", value: `−${eur(receipt.discount_cents ?? 0)}` });
      }
      if (pointsSpent > 0) rows.push({ label: "Mit Punkten bezahlt", value: `${pointsSpent} Punkte` });
      if (amountCents > 0) rows.push({ label: "Betrag", value: eur(amountCents) });
      if (receipt && (receipt.tax_cents ?? 0) > 0) {
        rows.push({ label: `enthaltene USt (${Number(receipt.tax_rate ?? 19).toFixed(0)} %)`, value: eur(receipt.tax_cents ?? 0) });
      }

      // Physical products ship to the stored address; digital ones don't.
      const shipsPhysical = isPhysical && !!order.shipping_address_line1;
      if (shipsPhysical) {
        rows.push({
          label: "Lieferadresse",
          value: [order.shipping_address_line1, `${order.shipping_postal_code ?? ""} ${order.shipping_city ?? ""}`.trim(), order.shipping_country ?? "DE"]
            .filter(Boolean)
            .join(", "),
        });
      }

      // Statutory withdrawal instructions (Art. 246a EGBGB) — must reach the buyer
      // on a durable medium, hence embedded in the confirmation mail for goods.
      const widerrufsbelehrung = `
        <p style="margin:0 0 8px;font-weight:700;color:#b0b0b0;">Widerrufsbelehrung</p>
        <p style="margin:0 0 8px;"><strong>Widerrufsrecht:</strong> Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (PADEL2GO UG (haftungsbeschränkt), Am Neudeck 10, 81541 München, E-Mail: info@padel2go-official.de) mittels einer eindeutigen Erklärung (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das Muster-Widerrufsformular unter <a href="https://www.padel2go-official.de/widerruf" style="color:#8a8a8a;">padel2go-official.de/widerruf</a> verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
        <p style="margin:0 0 8px;"><strong>Folgen des Widerrufs:</strong> Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme zusätzlicher Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel wie bei der ursprünglichen Transaktion; es werden Ihnen dafür keine Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren zurückerhalten haben oder Sie den Nachweis der Rücksendung erbracht haben, je nachdem, welches der frühere Zeitpunkt ist. Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf unterrichten, an uns zurückzusenden. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist absenden. <strong>Wir tragen die Kosten der Rücksendung der Waren.</strong> Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise nicht notwendigen Umgang zurückzuführen ist.</p>
        <p style="margin:0;"><strong>Ausschluss:</strong> Das Widerrufsrecht besteht nicht bei individuell angefertigten Waren sowie bei versiegelten Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet sind, wenn die Versiegelung nach der Lieferung entfernt wurde. Es gelten unsere <a href="https://www.padel2go-official.de/agb" style="color:#8a8a8a;">AGB</a>.</p>`;

      const html = brandedEmailHtml({
        title: "Bestellung bestätigt",
        emoji: "🛍️",
        heading: "Bestellung bestätigt!",
        intro: "Danke für deinen Einkauf im PADEL2GO Shop.",
        greetingName: recipientName,
        rows,
        note: shipsPhysical
          ? "Wir bereiten deine Bestellung für den Versand vor. Lieferzeit: in der Regel 2–4 Werktage."
          : "Deine Bestellung ist abgeschlossen. Viel Spaß!",
        ctaLabel: "Zum Shop",
        ctaUrl: "https://www.padel2go-official.de/marketplace",
        ...(isPhysical ? { legalHtml: widerrufsbelehrung } : {}),
      });

      await sendBrandedEmail(resendKey, recipientEmail, `Bestellung bestätigt: ${itemName}`, html);
      logStep("Customer confirmation sent", { order_id, email: recipientEmail });
      return json({ success: true }, 200);
    } catch (postClaimErr) {
      // Any failure after the claim: release it so a later delivery can re-send.
      await releaseClaim();
      logStep("Customer confirmation failed after claim — released for retry", { order_id, error: (postClaimErr as Error).message });
      return json({ error: (postClaimErr as Error).message }, 500);
    }
  } catch (e) {
    logStep("ERROR", { message: (e as Error).message });
    return json({ error: (e as Error).message }, 500);
  }
});

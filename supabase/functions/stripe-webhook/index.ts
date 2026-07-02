import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

// Stripe webhooks are server-to-server, minimal CORS needed
const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve keys: env var takes precedence, DB config is fallback
    let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      const { data: ic } = await supabaseAdmin.from("site_integration_configs").select("config").eq("service", "stripe").single();
      const cfg = (ic?.config as Record<string, string>) ?? {};
      if (!stripeKey) stripeKey = cfg.secret_key;
      if (!webhookSecret) webhookSecret = cfg.webhook_secret;
    }
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err as Error).message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const paymentType = session.metadata?.type;

        logStep("Processing completed checkout", {
          sessionId: session.id,
          bookingId,
          paymentType,
          paymentStatus: session.payment_status
        });

        if (session.payment_status === "paid") {
          // ============================================
          // MARKETPLACE PURCHASE (money +/- points)
          // ============================================
          if (paymentType === "marketplace_purchase") {
            const redemptionId = session.metadata?.redemption_id;
            if (!redemptionId) {
              logStep("Marketplace session missing redemption_id", { sessionId: session.id });
              break;
            }

            // Idempotent settle: flips pending -> success exactly once. A duplicate
            // webhook (or an order a sibling expired/cron already cancelled) returns
            // false, so we never re-ledger or re-ship.
            const { data: settled, error: settleError } = await supabaseAdmin.rpc("settle_marketplace_order", {
              p_order_id: redemptionId,
            });
            if (settleError) {
              // Return non-2xx so Stripe RETRIES this PAID event. A `break` here returns 200,
              // Stripe treats the event as delivered and stops retrying, and the still-pending
              // order is then cron-cancelled + points-refunded + restocked at hold_expires_at —
              // a single transient DB error would guarantee a paid-for-nothing order. Retrying
              // lets a later attempt still settle it before the cron reclaims it.
              logStep("CRITICAL: paid marketplace order settle failed — returning 500 so Stripe retries", { redemptionId, error: settleError.message });
              return new Response(JSON.stringify({ error: "marketplace_settle_failed" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            if (settled !== true) {
              // settle returned false for one of two very different reasons:
              //  1) benign duplicate — the order is already 'success' (re-delivered webhook).
              //  2) paid-for-nothing — the cron backstop / expiry already released this order
              //     (status 'cancelled', or the row is gone) before this delayed webhook landed,
              //     so the points were refunded + stock restored while Stripe still holds the
              //     card money. This must NEVER be silently skipped: refund the customer's card
              //     and alert an admin to reconcile.
              const { data: releasedOrder, error: reReadError } = await supabaseAdmin
                .from("marketplace_redemptions")
                .select("status, reference_code")
                .eq("id", redemptionId)
                .maybeSingle();

              if (reReadError) {
                // A failed re-read cannot distinguish a shipped duplicate ('success') from a
                // genuinely released order. Refunding on that guess would refund an already-
                // fulfilled order, so return 500 and let Stripe retry (mirrors settleError).
                logStep("CRITICAL: marketplace order status re-read failed — returning 500 so Stripe retries", { redemptionId, error: reReadError.message });
                return new Response(JSON.stringify({ error: "marketplace_reread_failed" }), {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              if (releasedOrder?.status === "success") {
                // Not a blind skip: the first delivery's fulfillment side-effects (ledger +
                // physical-ship email) may have failed transiently AFTER settle committed, so
                // fall through to the idempotent fulfillment block below. It no-ops if the work
                // already landed and otherwise finishes it (Stripe keeps retrying via 500).
                logStep("Marketplace order already settled — verifying fulfillment", { redemptionId });
              } else {
                // Genuinely released: the cron backstop / expiry already cancelled this order
                // (status 'cancelled', or the row is gone) while Stripe still holds the card
                // money. Refund the customer + alert an admin (points/stock already reversed).
                logStep("CRITICAL: paid marketplace order was already released — refunding customer", {
                  redemptionId,
                  status: releasedOrder?.status ?? "missing",
                });

              const paymentIntentId = typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id;
              let refundOk = false;
              if (paymentIntentId) {
                try {
                  // Idempotency key: a retried webhook can never create a second refund.
                  await stripe.refunds.create(
                    { payment_intent: paymentIntentId },
                    { idempotencyKey: `mp_refund_${redemptionId}` },
                  );
                  refundOk = true;
                  logStep("Marketplace: auto-refund issued for released paid order", { redemptionId, paymentIntentId });
                } catch (refundErr) {
                  logStep("CRITICAL: auto-refund failed for released paid order", { redemptionId, paymentIntentId, error: (refundErr as Error).message });
                }
              }

              try {
                const resendApiKey = Deno.env.get("RESEND_API_KEY");
                if (resendApiKey) {
                  const resend = new Resend(resendApiKey);
                  await resend.emails.send({
                    from: "Padel2Go <noreply@padel2go.eu>",
                    to: ["contact@padel2go.eu"],
                    subject: `KRITISCH: Bezahlte Marketplace-Bestellung storniert - ${releasedOrder?.reference_code ?? redemptionId}`,
                    html: `
                      <html>
                        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                            <h1 style="color: #b00020; margin-bottom: 20px;">Bezahlte Bestellung wurde storniert</h1>
                            <p>Eine per Karte bezahlte Marketplace-Bestellung wurde storniert, bevor der Zahlungs-Webhook eintraf. Punkte und Bestand wurden bereits zurueckgebucht.</p>
                            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                              <p><strong>Referenz:</strong> ${releasedOrder?.reference_code ?? redemptionId}</p>
                              <p><strong>Bestell-ID:</strong> ${redemptionId}</p>
                              <p><strong>Status:</strong> ${releasedOrder?.status ?? "nicht gefunden"}</p>
                              <p><strong>Stripe Session:</strong> ${session.id}</p>
                              <p><strong>Bezahlt (Cent):</strong> ${session.amount_total ?? 0}</p>
                              <p><strong>Automatische Rueckerstattung:</strong> ${refundOk ? "ausgeloest" : "FEHLGESCHLAGEN - bitte manuell pruefen"}</p>
                            </div>
                          </div>
                        </body>
                      </html>
                    `,
                  });
                  logStep("Marketplace: critical release alert emailed", { redemptionId });
                } else {
                  logStep("Marketplace: RESEND_API_KEY not configured — critical release alert not emailed", { redemptionId });
                }
              } catch (alertErr) {
                logStep("Marketplace: critical release alert email failed", { redemptionId, error: (alertErr as Error).message });
              }
                break;
              }
            } else {
              logStep("Marketplace order settled", { redemptionId });
            }

            const { data: order, error: orderReadError } = await supabaseAdmin
              .from("marketplace_redemptions")
              .select("user_id, item_id, quantity, play_spent, reward_spent, amount_cents, reference_code, guest_email, guest_name, shipping_address_line1, shipping_postal_code, shipping_city, shipping_country, fulfillment_notified_at")
              .eq("id", redemptionId)
              .single();

            if (orderReadError || !order) {
              // The order row drives the ledger + the physical-ship email. A discarded re-read
              // error here (after settle already committed status='success') would skip the
              // fulfillment email yet still return 200, so Stripe never retries and a paid
              // physical order is never shipped. Return 500 so Stripe re-delivers this event.
              logStep("CRITICAL: settled marketplace order re-read failed — returning 500 so Stripe retries", { redemptionId, error: orderReadError?.message });
              return new Response(JSON.stringify({ error: "marketplace_fulfillment_reread_failed" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            let item: { name: string; category: string; partner_name: string | null; product_type: string } | null = null;
            if (order?.item_id) {
              const { data: itemRow } = await supabaseAdmin
                .from("marketplace_items")
                .select("name, category, partner_name, product_type")
                .eq("id", order.item_id)
                .single();
              item = itemRow as typeof item;
            }

            // Finalize the points spend in the ledger. The wallet was already debited at
            // checkout by reserve_points; this records the movement (mirrors the free path).
            // Gated on the settle-winner (settled === true) so a concurrent duplicate delivery
            // that fell through on status='success' cannot double-insert the REDEMPTION row;
            // the existence check below is defense-in-depth.
            const pointsSpent = (order.play_spent ?? 0) + (order.reward_spent ?? 0);
            const ledgerSourceId = order.reference_code ?? redemptionId;
            if (settled === true && order.user_id && pointsSpent > 0) {
              const { data: existingLedger } = await supabaseAdmin
                .from("points_ledger")
                .select("id")
                .eq("source_id", ledgerSourceId)
                .eq("entry_type", "REDEMPTION")
                .limit(1);
              if (!existingLedger || existingLedger.length === 0) {
                const { data: postWallet } = await supabaseAdmin
                  .from("wallets")
                  .select("play_credits, reward_credits")
                  .eq("user_id", order.user_id)
                  .single();
                const balanceAfter = (postWallet?.play_credits ?? 0) + (postWallet?.reward_credits ?? 0);
                const { error: ledgerError } = await supabaseAdmin.from("points_ledger").insert({
                  user_id: order.user_id,
                  credit_type: "REWARD",
                  delta_points: -pointsSpent,
                  balance_after: balanceAfter,
                  entry_type: "REDEMPTION",
                  description: `Marketplace: ${item?.name ?? "Artikel"}`,
                  source_type: "REDEMPTION",
                  source_id: ledgerSourceId,
                });
                if (ledgerError) logStep("Marketplace: ledger insert failed", { redemptionId, error: ledgerError.message });
              }
            }

            // Fulfillment email for physical products (mirrors the checkout free path). This is
            // the ONLY ship signal, so it must survive transient failures: it is gated on
            // fulfillment_notified_at (set only after a successful send) and a send failure
            // returns 500 so Stripe re-delivers and this block retries until it lands.
            // Atomically CLAIM the fulfillment notification (flip fulfillment_notified_at from
            // NULL to now) so two concurrent duplicate webhook deliveries cannot both email the
            // admin (a double physical-ship signal). Only the instance that wins the flip sends;
            // the claim is released back to NULL if the send cannot complete, so it still retries.
            let fulfillmentClaimed = false;
            if (item?.product_type === "purchase" && !order.fulfillment_notified_at) {
              const { data: notifyClaim } = await supabaseAdmin
                .from("marketplace_redemptions")
                .update({ fulfillment_notified_at: new Date().toISOString() })
                .eq("id", redemptionId)
                .is("fulfillment_notified_at", null)
                .select("id");
              fulfillmentClaimed = !!(notifyClaim && notifyClaim.length > 0);
            }
            if (fulfillmentClaimed) {
              const resendApiKey = Deno.env.get("RESEND_API_KEY");
              if (!resendApiKey) {
                logStep("Marketplace: RESEND_API_KEY not configured — fulfillment email not sent, order stays in admin queue", { redemptionId });
                // Release the claim so a later delivery re-sends once the key is configured.
                await supabaseAdmin
                  .from("marketplace_redemptions")
                  .update({ fulfillment_notified_at: null })
                  .eq("id", redemptionId);
              } else {
                try {
                  let customerName = order?.guest_name || "Gast";
                  if (order?.user_id) {
                    const { data: profile } = await supabaseAdmin
                      .from("profiles")
                      .select("display_name, username")
                      .eq("user_id", order.user_id)
                      .single();
                    customerName = profile?.display_name || profile?.username || "Unbekannt";
                  }
                  const customerEmail = session.customer_details?.email || session.customer_email || order?.guest_email || "";
                  const formattedAddress = `${order?.shipping_address_line1 ?? ""}\n${order?.shipping_postal_code ?? ""} ${order?.shipping_city ?? ""}\n${order?.shipping_country ?? "Deutschland"}`;
                  const resend = new Resend(resendApiKey);
                  await resend.emails.send({
                    from: "Padel2Go <noreply@padel2go.eu>",
                    to: ["contact@padel2go.eu"],
                    subject: `Neue Marketplace-Bestellung: ${item.name} - ${order?.reference_code ?? redemptionId}`,
                    html: `
                      <html>
                        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                            <h1 style="color: #111; margin-bottom: 20px;">Neue Marketplace-Bestellung</h1>
                            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                              <h2 style="color: #333; margin-top: 0;">Bestelldetails</h2>
                              <p><strong>Referenz:</strong> ${order?.reference_code ?? redemptionId}</p>
                              <p><strong>Produkt:</strong> ${item.name}</p>
                              <p><strong>Kategorie:</strong> ${item.category}</p>
                              <p><strong>Menge:</strong> ${order?.quantity ?? 1}</p>
                              <p><strong>Bezahlt mit Punkten:</strong> ${pointsSpent}</p>
                              <p><strong>Bezahlt bar (Cent):</strong> ${order?.amount_cents ?? session.amount_total ?? 0}</p>
                            </div>
                            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                              <h2 style="color: #333; margin-top: 0;">Kundeninformationen</h2>
                              <p><strong>Name:</strong> ${customerName}</p>
                              <p><strong>E-Mail:</strong> ${customerEmail}</p>
                            </div>
                            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px;">
                              <h2 style="color: #333; margin-top: 0;">Lieferadresse</h2>
                              <p style="white-space: pre-line; margin: 0;">${formattedAddress}</p>
                            </div>
                          </div>
                        </body>
                      </html>
                    `,
                  });
                  logStep("Marketplace: fulfillment email sent", { redemptionId });
                } catch (emailError) {
                  // Release the claim so the next Stripe delivery re-sends (this send did not land).
                  await supabaseAdmin
                    .from("marketplace_redemptions")
                    .update({ fulfillment_notified_at: null })
                    .eq("id", redemptionId);
                  logStep("CRITICAL: marketplace fulfillment email failed — returning 500 so Stripe retries", { redemptionId, error: (emailError as Error).message });
                  return new Response(JSON.stringify({ error: "marketplace_fulfillment_email_failed" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
                }
              }
            }
          }
          // ============================================
          // LOBBY JOIN PAYMENT
          // ============================================
          else if (paymentType === "lobby_join") {
            const lobbyId = session.metadata?.lobby_id;
            const lobbyMemberId = session.metadata?.lobby_member_id;
            const userId = session.metadata?.user_id;

            logStep("Processing lobby join payment", { lobbyId, lobbyMemberId, userId });

            if (lobbyMemberId) {
              // Idempotency check: skip if already processed
              const { data: currentMember } = await supabaseAdmin
                .from("lobby_members")
                .select("status")
                .eq("id", lobbyMemberId)
                .single();

              if (currentMember?.status === "paid") {
                logStep("Lobby member already paid — duplicate webhook ignored", { lobbyMemberId });
                break;
              }

              // Update member to paid
              const { error: memberError } = await supabaseAdmin
                .from("lobby_members")
                .update({
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  payment_intent_id: session.payment_intent as string,
                })
                .eq("id", lobbyMemberId);

              if (memberError) {
                logStep("Failed to update lobby member", { error: memberError.message });
              } else {
                logStep("Lobby member marked as paid", { lobbyMemberId });

                // Create lobby event
                await supabaseAdmin.from("lobby_events").insert({
                  lobby_id: lobbyId,
                  actor_id: userId,
                  event_type: "member_paid",
                  metadata: { member_id: lobbyMemberId, amount: session.amount_total },
                });

                // Check if lobby is now full
                const { data: lobby } = await supabaseAdmin
                  .from("lobbies")
                  .select("capacity, host_user_id")
                  .eq("id", lobbyId)
                  .single();

                const { data: paidMembers } = await supabaseAdmin
                  .from("lobby_members")
                  .select("id")
                  .eq("lobby_id", lobbyId)
                  .eq("status", "paid");

                const paidCount = paidMembers?.length || 0;
                
                if (lobby && paidCount >= lobby.capacity) {
                  await supabaseAdmin
                    .from("lobbies")
                    .update({ status: "full" })
                    .eq("id", lobbyId);

                  await supabaseAdmin.from("lobby_events").insert({
                    lobby_id: lobbyId,
                    event_type: "lobby_full",
                    metadata: { paid_count: paidCount },
                  });

                  logStep("Lobby marked as full", { lobbyId, paidCount });
                }

                // Notify host and other paid members
                const { data: otherMembers } = await supabaseAdmin
                  .from("lobby_members")
                  .select("user_id")
                  .eq("lobby_id", lobbyId)
                  .eq("status", "paid")
                  .neq("user_id", userId);

                const { data: userProfile } = await supabaseAdmin
                  .from("profiles")
                  .select("display_name")
                  .eq("user_id", userId)
                  .single();

                const notifyIds = [
                  lobby?.host_user_id,
                  ...(otherMembers || []).map((m: any) => m.user_id)
                ].filter((id, i, arr) => id && id !== userId && arr.indexOf(id) === i);

                for (const notifyId of notifyIds) {
                  await supabaseAdmin.from("notifications").insert({
                    user_id: notifyId,
                    type: "lobby_member_paid",
                    title: "Spieler hat bezahlt",
                    message: `${userProfile?.display_name || 'Ein Spieler'} hat seinen Anteil bezahlt.`,
                    entity_type: "lobby",
                    entity_id: lobbyId,
                    cta_url: `/lobbies/${lobbyId}`,
                  });
                }

                // If lobby is full, notify everyone
                if (lobby && paidCount >= lobby.capacity) {
                  const allMemberIds = [...notifyIds, userId].filter((id, i, arr) => arr.indexOf(id) === i);
                  for (const memberId of allMemberIds) {
                    await supabaseAdmin.from("notifications").insert({
                      user_id: memberId,
                      type: "lobby_full",
                      title: "Lobby vollständig!",
                      message: "Alle Spieler haben bezahlt. Viel Spaß beim Spiel!",
                      entity_type: "lobby",
                      entity_id: lobbyId,
                      cta_url: `/lobbies/${lobbyId}`,
                    });
                  }
                }
              }
            }
          }
          // Handle regular booking payment
          else if (bookingId) {
            // Atomically settle: confirm the booking + finalize credits_used from the
            // LOCKED reserved_credits, only if it is still pending_payment. Returns
            // false for a duplicate (already-confirmed) webhook OR a booking a sibling
            // expired session already cancelled — in both cases we must NOT confirm or
            // award, which would leak credits (reserves already refunded on cancel).
            // Exactly one caller ever wins the settle, so the award below can't double-run.
            const { data: settled, error: settleError } = await supabaseAdmin.rpc("settle_booking_reserves", {
              p_booking_id: bookingId,
            });

            if (settleError) {
              logStep("CRITICAL: paid booking could not be settled", { bookingId, error: settleError.message });
              break;
            }
            if (settled !== true) {
              // settle returned false for one of two very different reasons:
              //  1) benign duplicate — the booking is already 'confirmed' (re-delivered webhook).
              //  2) paid-for-nothing — a sibling expired session / cron backstop already cancelled
              //     this booking (status 'cancelled'/'expired', or the row is gone) before this
              //     delayed webhook landed, so the reserves were already refunded while Stripe
              //     still holds the card money. This must NEVER be silently skipped: refund the
              //     customer's card and alert an admin to reconcile.
              const { data: releasedBooking, error: reReadError } = await supabaseAdmin
                .from("bookings")
                .select("status")
                .eq("id", bookingId)
                .maybeSingle();

              if (reReadError) {
                // A failed re-read cannot distinguish a confirmed duplicate from a genuinely
                // cancelled booking. Refunding on that guess would refund an already-confirmed
                // booking, so return 500 and let Stripe retry (mirrors settleError handling).
                logStep("CRITICAL: booking status re-read failed — returning 500 so Stripe retries", { bookingId, error: reReadError.message });
                return new Response(JSON.stringify({ error: "booking_reread_failed" }), {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              if (releasedBooking?.status === "confirmed") {
                // Benign duplicate: the first delivery already confirmed + awarded. No-op.
                logStep("Booking already settled — duplicate webhook ignored", { bookingId });
                break;
              }

              // A non-'confirmed' status is NOT proof of a paid-for-nothing release. A booking
              // that an earlier delivery already confirmed + paid + awarded, and the user then
              // CANCELLED (MyBookings, governed by the AGB policy — no refund <24h before start),
              // is now 'cancelled' with the card money lawfully kept. Its payment row stays
              // 'completed' (the cancel flow never touches payments). Re-read the payment for this
              // session: only a payment that never completed (still 'pending'/'failed') is a
              // genuine paid-for-nothing release this webhook must refund. If it already
              // completed (or was already refunded), do NOT auto-refund — that would claw back
              // money the business is entitled to keep.
              const { data: paymentRow, error: paymentReadError } = await supabaseAdmin
                .from("payments")
                .select("status")
                .eq("stripe_checkout_session_id", session.id)
                .maybeSingle();

              if (paymentReadError) {
                // Can't tell a completed-then-cancelled booking from a never-completed one.
                // Refunding on that guess could claw back money the business lawfully holds,
                // so return 500 and let Stripe retry (mirrors settleError / status re-read).
                logStep("CRITICAL: payment status re-read failed — returning 500 so Stripe retries", { bookingId, error: paymentReadError.message });
                return new Response(JSON.stringify({ error: "payment_reread_failed" }), {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              if (paymentRow?.status === "completed" || paymentRow?.status === "refunded") {
                // The booking was already confirmed + paid (and credits awarded) by an earlier
                // delivery; any later cancellation is a post-confirmation user cancel governed by
                // the AGB refund policy, not a paid-for-nothing release. Do NOT auto-refund.
                logStep("Booking already confirmed+paid — later cancellation handled by cancel flow, no auto-refund", {
                  bookingId,
                  bookingStatus: releasedBooking?.status ?? "missing",
                  paymentStatus: paymentRow?.status,
                });
                break;
              }

              // Genuinely released: the payment never completed and a sibling expired session /
              // cron backstop already cancelled this booking (status 'cancelled'/'expired', or the
              // row is gone) while Stripe still holds the card money. Refund the customer + alert
              // an admin (reserves already reversed on cancel).
              logStep("CRITICAL: paid booking was already cancelled — refunding customer", {
                bookingId,
                status: releasedBooking?.status ?? "missing",
              });

              const paymentIntentId = typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id;
              let refundOk = false;
              if (paymentIntentId) {
                try {
                  // Idempotency key: a retried webhook can never create a second refund.
                  await stripe.refunds.create(
                    { payment_intent: paymentIntentId },
                    { idempotencyKey: `bk_refund_${bookingId}` },
                  );
                  refundOk = true;
                  logStep("Booking: auto-refund issued for cancelled paid booking", { bookingId, paymentIntentId });
                } catch (refundErr) {
                  logStep("CRITICAL: auto-refund failed for cancelled paid booking", { bookingId, paymentIntentId, error: (refundErr as Error).message });
                }
              }

              // Mark the payment row refunded so it reconciles with Stripe.
              const { error: paymentRefundError } = await supabaseAdmin
                .from("payments")
                .update({ status: "refunded" })
                .eq("stripe_checkout_session_id", session.id);
              if (paymentRefundError) logStep("Booking: failed to mark payment refunded", { bookingId, error: paymentRefundError.message });

              try {
                const resendApiKey = Deno.env.get("RESEND_API_KEY");
                if (resendApiKey) {
                  const resend = new Resend(resendApiKey);
                  await resend.emails.send({
                    from: "Padel2Go <noreply@padel2go.eu>",
                    to: ["contact@padel2go.eu"],
                    subject: `KRITISCH: Bezahlte Buchung storniert - ${bookingId}`,
                    html: `
                      <html>
                        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                            <h1 style="color: #b00020; margin-bottom: 20px;">Bezahlte Buchung wurde storniert</h1>
                            <p>Eine per Karte bezahlte Buchung wurde storniert, bevor der Zahlungs-Webhook eintraf. Die reservierten Credits wurden bereits zurueckgebucht.</p>
                            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                              <p><strong>Buchungs-ID:</strong> ${bookingId}</p>
                              <p><strong>Status:</strong> ${releasedBooking?.status ?? "nicht gefunden"}</p>
                              <p><strong>Stripe Session:</strong> ${session.id}</p>
                              <p><strong>Bezahlt (Cent):</strong> ${session.amount_total ?? 0}</p>
                              <p><strong>Automatische Rueckerstattung:</strong> ${refundOk ? "ausgeloest" : "FEHLGESCHLAGEN - bitte manuell pruefen"}</p>
                            </div>
                          </div>
                        </body>
                      </html>
                    `,
                  });
                  logStep("Booking: critical release alert emailed", { bookingId });
                } else {
                  logStep("Booking: RESEND_API_KEY not configured — critical release alert not emailed", { bookingId });
                }
              } catch (alertErr) {
                logStep("Booking: critical release alert email failed", { bookingId, error: (alertErr as Error).message });
              }
              break;
            }
            logStep("Booking confirmed", { bookingId });

            const isGuestWebhook = session.metadata?.is_guest === "1";
            const guestEmail = session.metadata?.guest_email;
            const guestName = session.metadata?.guest_name;

            // ── Award play credits for this booking (authenticated users only) ─
            if (!isGuestWebhook) try {
              const { data: bk } = await supabaseAdmin
                .from("bookings")
                .select("start_time, end_time, user_id, play_credits_awarded")
                .eq("id", bookingId)
                .single();

              if (bk && bk.play_credits_awarded === 0 && bk.user_id) {
                // Calculate weekly streak for this user
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const { data: prevBookings } = await supabaseAdmin
                  .from("bookings")
                  .select("start_time")
                  .eq("user_id", bk.user_id)
                  .eq("status", "confirmed")
                  .neq("id", bookingId)
                  .gte("start_time", threeMonthsAgo.toISOString());

                // ISO week key helper
                const isoWeekKey = (d: Date): string => {
                  const dt = new Date(d);
                  dt.setHours(12, 0, 0, 0);
                  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
                  const jan4 = new Date(dt.getFullYear(), 0, 4);
                  const wn = 1 + Math.round(((dt.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
                  return `${dt.getFullYear()}-W${String(wn).padStart(2, "0")}`;
                };

                const weekSet = new Set((prevBookings || []).map(b => isoWeekKey(new Date(b.start_time))));
                // Include current booking's week
                weekSet.add(isoWeekKey(new Date(bk.start_time)));

                let weekStreak = 0;
                const cursor = new Date();
                for (let i = 0; i < 13; i++) {
                  if (!weekSet.has(isoWeekKey(cursor))) break;
                  weekStreak++;
                  cursor.setDate(cursor.getDate() - 7);
                }

                // Multiplier
                const multiplier = weekStreak >= 4 ? 2.5 : weekStreak === 3 ? 2.0 : weekStreak === 2 ? 1.5 : 1.0;

                // Hours (rounded to nearest 0.5)
                const hours = (new Date(bk.end_time).getTime() - new Date(bk.start_time).getTime()) / 3600000;
                const roundedHours = Math.max(0.5, Math.round(hours * 2) / 2);
                const creditsToAward = Math.round(roundedHours * 100 * multiplier);

                // Award atomically (a signed delta, not a stale-read absolute value)
                // so a concurrent reserve/refund on the same wallet can't clobber it.
                const { error: awardError } = await supabaseAdmin.rpc("increment_play_and_lifetime", {
                  p_user_id: bk.user_id,
                  p_play_delta: creditsToAward,
                  p_lifetime_delta: creditsToAward,
                });

                if (awardError) {
                  logStep("Failed to award play credits", { bookingId, error: awardError.message });
                } else {
                  await supabaseAdmin.from("bookings")
                    .update({ play_credits_awarded: creditsToAward })
                    .eq("id", bookingId);
                  logStep("Play credits awarded", { bookingId, creditsToAward, weekStreak, multiplier });
                }

                // First-booking onboarding bonus is handled exclusively by the
                // claim_onboarding_bonus RPC (called from the dashboard checklist).
                // Do NOT duplicate it here, otherwise users get 1000 credits instead of 500.
              }
            } catch (creditErr) {
              logStep("Failed to award play credits", { error: (creditErr as Error).message });
            }
            // ────────────────────────────────────────────────────────────────


            // Update payment record
            const { error: paymentError } = await supabaseAdmin
              .from("payments")
              .update({ 
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("stripe_checkout_session_id", session.id);

            if (paymentError) {
              logStep("Failed to update payment", { error: paymentError.message });
            } else {
              logStep("Payment record updated");
            }

            // Record voucher redemption if a partial-discount voucher was applied.
            // (current_uses was already incremented as a soft-reserve in create-checkout-session)
            const appliedVoucherId = session.metadata?.voucher_id;
            if (appliedVoucherId) {
              await supabaseAdmin.from("voucher_redemptions").insert({
                voucher_id: appliedVoucherId,
                booking_id: bookingId,
                user_id: session.metadata?.user_id ?? "",
              });
              logStep("Voucher redemption recorded", { voucherId: appliedVoucherId, bookingId });
            }

            const userId = session.metadata?.user_id;
            const priceCents = session.amount_total;

            if (!isGuestWebhook && userId && priceCents) {
              // ── Authenticated user: trigger rewards + send confirmation ──
              try {
                await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ event: "bookingPaid", userId, bookingId, priceCents }),
                });
                logStep("Rewards trigger called", { userId, bookingId, priceCents });
              } catch (rewardErr) {
                logStep("Failed to trigger rewards", { error: (rewardErr as Error).message });
              }

              try {
                await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    booking_id: bookingId,
                    user_id: userId,
                    payment_type: "owner",
                    amount_cents: priceCents,
                  }),
                });
                logStep("Owner confirmation email triggered", { userId });
              } catch (emailErr) {
                logStep("Failed to send owner confirmation", { error: (emailErr as Error).message });
              }
            } else if (isGuestWebhook && guestEmail) {
              // ── Guest: send confirmation to guest email, skip rewards ──
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    booking_id: bookingId,
                    guest_email: guestEmail,
                    guest_name: guestName || "Gast",
                    payment_type: "owner",
                    amount_cents: priceCents,
                  }),
                });
                logStep("Guest confirmation email triggered", { guestEmail });
              } catch (emailErr) {
                logStep("Failed to send guest confirmation", { error: (emailErr as Error).message });
              }
            }
          } else {
            logStep("No booking_id or lobby in metadata", { sessionId: session.id });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Marketplace: an abandoned/expired order must refund its reserved points and
        // restore its reserved stock. The release RPC is idempotent + pending-only, so
        // it is race-free against the cron backstop calling the same RPC.
        if (session.metadata?.type === "marketplace_purchase") {
          const redemptionId = session.metadata?.redemption_id;
          if (!redemptionId) {
            logStep("Marketplace expired session missing redemption_id", { sessionId: session.id });
            break;
          }
          const { error: releaseError } = await supabaseAdmin.rpc("release_marketplace_order", {
            p_order_id: redemptionId,
          });
          if (releaseError) {
            logStep("Failed to release expired marketplace order", { redemptionId, error: releaseError.message });
          } else {
            logStep("Marketplace order released (points refunded, stock restored)", { redemptionId });
          }
          break;
        }

        const bookingId = session.metadata?.booking_id;

        if (!bookingId) {
          logStep("No booking_id in metadata for expired session");
          break;
        }

        logStep("Processing expired checkout", { sessionId: session.id, bookingId });

        // Cancel booking (unpaid — session expired)
        const { error: bookingError } = await supabaseAdmin
          .from("bookings")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", bookingId)
          .eq("status", "pending_payment"); // Only cancel if still unpaid

        if (bookingError) {
          logStep("Failed to cancel expired booking", { error: bookingError.message });
        } else {
          logStep("Booking cancelled (unpaid session expired)", { bookingId });
        }

        // Update payment record
        const { error: paymentError } = await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_checkout_session_id", session.id);

        if (paymentError) {
          logStep("Failed to update payment status", { error: paymentError.message });
        }

        // Refund reserved play credits AND release the soft-reserved voucher use
        // atomically. Keying off the booking's reserved_* columns (not the Stripe
        // session metadata) makes this idempotent and race-free against the cron,
        // which calls the same RPC — so credits/voucher uses can't be double-released.
        const { error: releaseError } = await supabaseAdmin.rpc("release_booking_reserves", {
          p_booking_id: bookingId,
        });
        if (releaseError) {
          logStep("Failed to release booking reserves", { bookingId, error: releaseError.message });
        } else {
          logStep("Booking reserves released (credits refunded, voucher freed)", { bookingId });
        }
        break;
      }

      // ============================================
      // REFUND HANDLING
      // ============================================
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing refund", { 
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          amountCaptured: charge.amount_captured,
        });

        // Get payment intent to find booking
        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;

        if (!paymentIntentId) {
          logStep("No payment_intent in charge");
          break;
        }

        // Find payment record by payment intent
        const { data: payment, error: paymentFetchError } = await supabaseAdmin
          .from("payments")
          .select("booking_id, user_id, amount_total_cents")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single();

        if (paymentFetchError || !payment) {
          logStep("Payment record not found", { paymentIntentId, error: paymentFetchError?.message });
          break;
        }

        const bookingId = payment.booking_id;
        const userId = payment.user_id;
        const originalAmount = payment.amount_total_cents || charge.amount_captured;

        // Calculate refund percentage
        const refundPercentage = originalAmount > 0 
          ? Math.round((charge.amount_refunded / originalAmount) * 100)
          : 100;

        const isFullRefund = refundPercentage >= 100;

        logStep("Refund details", { 
          bookingId, 
          userId, 
          originalAmount, 
          amountRefunded: charge.amount_refunded,
          refundPercentage,
          isFullRefund 
        });

        // Update booking status
        if (isFullRefund) {
          const { error: bookingError } = await supabaseAdmin
            .from("bookings")
            .update({ 
              status: "cancelled",
              cancelled_at: new Date().toISOString()
            })
            .eq("id", bookingId);

          if (bookingError) {
            logStep("Failed to update booking to cancelled", { error: bookingError.message });
          } else {
            logStep("Booking marked as cancelled", { bookingId });
          }
        }

        // Update payment status
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("payments")
          .update({ 
            status: isFullRefund ? "refunded" : "partially_refunded"
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (paymentUpdateError) {
          logStep("Failed to update payment status", { error: paymentUpdateError.message });
        }

        // Trigger rewards reversal
        try {
          await fetch(`${supabaseUrl}/functions/v1/rewards-trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event: "bookingRefunded",
              userId,
              bookingId,
              refundPercentage,
            }),
          });
          logStep("Rewards reversal triggered", { userId, bookingId, refundPercentage });
        } catch (rewardErr) {
          logStep("Failed to trigger rewards reversal", { error: (rewardErr as Error).message });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.booking_id;

        logStep("Payment failed", { 
          paymentIntentId: paymentIntent.id, 
          bookingId,
          lastError: paymentIntent.last_payment_error?.message 
        });

        if (bookingId) {
          // Update payment record
          const { error: paymentError } = await supabaseAdmin
            .from("payments")
            .update({ status: "failed" })
            .eq("stripe_payment_intent_id", paymentIntent.id);

          if (paymentError) {
            logStep("Failed to update payment status", { error: paymentError.message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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

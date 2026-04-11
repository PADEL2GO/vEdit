import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingAddress {
  address_line1: string;
  postal_code: string;
  city: string;
  country: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Parse request body
    const { itemId, shippingAddress } = await req.json();
    if (!itemId) {
      return new Response(
        JSON.stringify({ error: "Item ID fehlt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Redeem request for item:", itemId);

    // Get the marketplace item
    const { data: item, error: itemError } = await supabaseAdmin
      .from("marketplace_items")
      .select("*")
      .eq("id", itemId)
      .eq("is_active", true)
      .single();

    if (itemError || !item) {
      console.error("Item not found:", itemError);
      return new Response(
        JSON.stringify({ error: "Item nicht gefunden oder nicht verfügbar" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a purchase product and validate shipping address
    if (item.product_type === "purchase") {
      if (!shippingAddress || !shippingAddress.address_line1 || !shippingAddress.postal_code || !shippingAddress.city) {
        return new Response(
          JSON.stringify({ error: "Lieferadresse ist erforderlich für dieses Produkt" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check stock if applicable (pre-flight; atomic check happens on update below)
    if (item.stock_quantity !== null && item.stock_quantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Item ist ausverkauft" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Item found:", item.name, "Type:", item.product_type, "Cost:", item.credit_cost);

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      console.error("Wallet not found:", walletError);
      return new Response(
        JSON.stringify({ error: "Wallet nicht gefunden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCredits = wallet.play_credits + wallet.reward_credits;
    console.log("User credits:", totalCredits, "Required:", item.credit_cost);

    // Check if user has enough credits
    if (totalCredits < item.credit_cost) {
      return new Response(
        JSON.stringify({ error: "Nicht genügend Credits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for email
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .single();

    // Calculate how to deduct credits (play_credits first, then reward_credits)
    let remainingCost = item.credit_cost;
    let newPlayCredits = wallet.play_credits;
    let newRewardCredits = wallet.reward_credits;

    if (newPlayCredits >= remainingCost) {
      newPlayCredits -= remainingCost;
    } else {
      remainingCost -= newPlayCredits;
      newPlayCredits = 0;
      newRewardCredits -= remainingCost;
    }

    // Generate reference code
    const referenceCode = `P2G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log("Deducting credits. New balances:", { newPlayCredits, newRewardCredits });

    // Atomic wallet update with optimistic lock — prevents double-spend from concurrent requests
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        play_credits: newPlayCredits,
        reward_credits: newRewardCredits,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("play_credits", wallet.play_credits)    // Optimistic lock
      .eq("reward_credits", wallet.reward_credits) // Optimistic lock
      .select("user_id");

    if (updateError) {
      console.error("Wallet update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Aktualisieren des Guthabens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updatedWallet || updatedWallet.length === 0) {
      // Concurrent request modified the wallet — balances changed between our read and write
      return new Response(
        JSON.stringify({ error: "Kontostand hat sich geändert – bitte erneut versuchen" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create redemption record with shipping address for purchase products
    const redemptionData: Record<string, unknown> = {
      user_id: user.id,
      item_id: itemId,
      credit_cost: item.credit_cost,
      status: "success",
      reference_code: referenceCode,
      fulfillment_status: item.product_type === "purchase" ? "pending" : "delivered",
    };

    if (item.product_type === "purchase" && shippingAddress) {
      redemptionData.shipping_address_line1 = shippingAddress.address_line1;
      redemptionData.shipping_postal_code = shippingAddress.postal_code;
      redemptionData.shipping_city = shippingAddress.city;
      redemptionData.shipping_country = shippingAddress.country || "DE";
    }

    const { error: redemptionError } = await supabaseAdmin
      .from("marketplace_redemptions")
      .insert(redemptionData);

    if (redemptionError) {
      console.error("Redemption record error:", redemptionError);
      // Note: Credits already deducted, but we log the error
    }

    // Atomically decrement stock if applicable (gt check prevents going negative)
    if (item.stock_quantity !== null) {
      const { data: updatedItem } = await supabaseAdmin
        .from("marketplace_items")
        .update({ stock_quantity: item.stock_quantity - 1 })
        .eq("id", itemId)
        .gt("stock_quantity", 0) // Only decrement if still in stock
        .select("id");

      if (!updatedItem || updatedItem.length === 0) {
        // Race: another request grabbed the last unit — rollback the wallet deduction
        await supabaseAdmin
          .from("wallets")
          .update({
            play_credits: wallet.play_credits,
            reward_credits: wallet.reward_credits,
          })
          .eq("user_id", user.id);
        return new Response(
          JSON.stringify({ error: "Item ist ausverkauft" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send email notification for purchase products
    if (item.product_type === "purchase") {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          const displayName = userProfile?.display_name || userProfile?.username || "Unbekannt";
          const formattedAddress = `${shippingAddress.address_line1}\n${shippingAddress.postal_code} ${shippingAddress.city}\n${shippingAddress.country || "Deutschland"}`;
          
          const emailHtml = `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                  <h1 style="color: #111; margin-bottom: 20px;">🎾 Neue Marketplace-Bestellung</h1>
                  
                  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-top: 0;">Bestelldetails</h2>
                    <p><strong>Referenz:</strong> ${referenceCode}</p>
                    <p><strong>Produkt:</strong> ${item.name}</p>
                    <p><strong>Kategorie:</strong> ${item.category}</p>
                    <p><strong>Credits:</strong> ${item.credit_cost}</p>
                    <p><strong>Bestelldatum:</strong> ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  
                  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-top: 0;">Kundeninformationen</h2>
                    <p><strong>Name:</strong> ${displayName}</p>
                    <p><strong>E-Mail:</strong> ${user.email}</p>
                  </div>
                  
                  <div style="background: #e8f5e9; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #333; margin-top: 0;">📦 Lieferadresse</h2>
                    <p style="white-space: pre-line; margin: 0;">${formattedAddress}</p>
                  </div>
                  
                  <p style="color: #666; margin-top: 30px; font-size: 14px;">
                    Diese E-Mail wurde automatisch generiert. Bitte bearbeite die Bestellung im Admin-Bereich.
                  </p>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: "Padel2Go <noreply@padel2go.eu>",
            to: ["contact@padel2go.eu"],
            subject: `Neue Marketplace-Bestellung: ${item.name} - ${referenceCode}`,
            html: emailHtml,
          });

          console.log("Order notification email sent to contact@padel2go.eu");
        } else {
          console.warn("RESEND_API_KEY not configured, skipping email notification");
        }
      } catch (emailError) {
        console.error("Failed to send order notification email:", emailError);
        // Don't fail the redemption if email fails
      }
    }

    console.log("Redemption successful. Reference:", referenceCode);

    return new Response(
      JSON.stringify({
        success: true,
        referenceCode,
        newBalance: newPlayCredits + newRewardCredits,
        message: `${item.name} erfolgreich eingelöst!`,
        productType: item.product_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

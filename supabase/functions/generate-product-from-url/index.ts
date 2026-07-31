import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// AI product importer for the marketplace admin: takes one product URL (manufacturer
// or shop page), extracts the page content incl. JSON-LD/OG data and returns a
// pre-filled product draft (name, descriptions, specs, price, brand, images).
// Nothing is written to the DB — the admin reviews the pre-filled form and saves.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPERADMIN_EMAIL = "fsteinfelder@padel2go.eu";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[generate-product-from-url] ${step}`, details ? JSON.stringify(details) : "");
};

const buildSystemPrompt = (categories: string[], brands: string[]) => `Du bist Produktdaten-Redakteur:in für den PADEL2GO Marketplace — einen deutschen Padel-Equipment-Shop.
Du erhältst den extrahierten Inhalt einer Produktseite (Hersteller- oder Shop-Seite). Extrahiere daraus die
Produktdaten für unseren Shop und übergib das Ergebnis über das Tool draft_product.

Regeln:
- Erfinde NICHTS: Übernimm nur Fakten, die auf der Seite stehen. Fehlt eine Angabe, lass das Feld leer bzw. 0.
- name: Produktname inkl. Marke, wie er im Shop stehen soll (z.B. "Babolat Technical Viper 2026"), max. 80 Zeichen
- subtitle: kurzer verkaufsstarker Zusatz, max. 60 Zeichen (z.B. "Kontrolle & Power für Fortgeschrittene")
- description: Kurzbeschreibung für die Produktkarte, 1–2 Sätze, max. 200 Zeichen
- long_description: 100–220 Wörter EIGENSTÄNDIG formulierte Produktbeschreibung auf Deutsch (kein Copy-Paste
  der Herstellertexte, keine Übersetzung Satz für Satz). REINER TEXT ohne HTML — Absätze durch eine Leerzeile
  trennen, 2–4 kurze Absätze. Sachlich, freundlich, Du-Form okay.
- specs: bis zu 10 technische Daten als Label/Wert-Paare (z.B. Gewicht, Balance, Form, Material Rahmen,
  Material Schlagfläche, Härte, Spielertyp). Labels auf Deutsch.
- brand_name: die Marke des Produkts.${brands.length ? ` Wenn eine dieser vorhandenen Marken passt, verwende sie EXAKT so geschrieben: ${brands.join(", ")}.` : ""}
- category_name: ${categories.length ? `GENAU eine dieser Kategorien, wenn eine eindeutig passt, EXAKT so geschrieben: ${categories.join(", ")}. Sonst leer lassen.` : "leer lassen."}
- price_eur: der auf der Seite genannte Verkaufspreis in Euro als Zahl (z.B. 179.95). 0 wenn kein Preis erkennbar.
- compare_at_price_eur: durchgestrichener Vergleichspreis / UVP, falls vorhanden, sonst 0.
- product_identifier: GTIN/EAN oder Hersteller-Artikelnummer/SKU, falls auf der Seite angegeben.
- manufacturer_name: Herstellername, falls (z.B. im Impressum-/GPSR-Block) angegeben.
- safety_warnings: Sicherheits-/Warnhinweise, falls angegeben.
- textile_composition: Materialzusammensetzung bei Textilien (z.B. "92% Polyester, 8% Elasthan"), falls angegeben.
- meta_title: SEO-Titel, max. 60 Zeichen. meta_description: SEO-Beschreibung, max. 155 Zeichen. Beides auf Deutsch.`;

const TOOL_DEFINITION = (categories: string[], brands: string[]) => ({
  name: "draft_product",
  description: "Übergibt die aus der Produktseite extrahierten Produktdaten.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Produktname inkl. Marke, max. 80 Zeichen" },
      subtitle: { type: "string", description: "Kurzer Zusatz, max. 60 Zeichen — leer wenn nichts passt" },
      description: { type: "string", description: "Kurzbeschreibung, 1–2 Sätze, max. 200 Zeichen" },
      long_description: {
        type: "string",
        description: "100–220 Wörter reiner Text ohne HTML, Absätze durch Leerzeile getrennt",
      },
      specs: {
        type: "array",
        description: "Bis zu 10 technische Daten",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
      brand_name: {
        type: "string",
        description: brands.length ? `Marke — vorhandene Marken exakt übernehmen: ${brands.join(", ")}` : "Marke des Produkts",
      },
      category_name: {
        type: "string",
        description: categories.length ? `Genau eine vorhandene Kategorie oder leer: ${categories.join(", ")}` : "Leer lassen",
      },
      price_eur: { type: "number", description: "Verkaufspreis in Euro, 0 wenn unbekannt" },
      compare_at_price_eur: { type: "number", description: "UVP/Streichpreis in Euro, 0 wenn keiner" },
      product_identifier: { type: "string", description: "GTIN/EAN/SKU falls angegeben" },
      manufacturer_name: { type: "string", description: "Hersteller falls angegeben" },
      safety_warnings: { type: "string", description: "Sicherheitshinweise falls angegeben" },
      textile_composition: { type: "string", description: "Materialzusammensetzung bei Textilien falls angegeben" },
      meta_title: { type: "string", description: "SEO-Titel, max. 60 Zeichen" },
      meta_description: { type: "string", description: "SEO-Beschreibung, max. 155 Zeichen" },
    },
    required: ["name", "description", "long_description"],
  },
});

/** Resolve a possibly relative image URL against the page URL; https only. */
function absolutize(src: string, pageUrl: string): string | null {
  try {
    const abs = new URL(src, pageUrl).toString();
    return /^https?:\/\//i.test(abs) ? abs : null;
  } catch {
    return null;
  }
}

interface ExtractedPage {
  pageTitle: string;
  text: string;
  jsonLd: string;
  images: string[];
}

/** Fetch the product page and reduce it to text + JSON-LD product data + image URLs. */
async function extractSource(url: string): Promise<ExtractedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PADEL2GO-ProductBot/1.0; +https://www.padel2go-official.de)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Produktseite antwortet mit HTTP ${res.status}`);
    const html = await res.text();

    const meta = (name: string) => {
      const m = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      ) ?? html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
      );
      return m?.[1]?.trim() ?? "";
    };
    const pageTitle = meta("og:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || url;

    // JSON-LD: collect Product objects — most shops expose name/brand/price/images here.
    const ldBlocks: unknown[] = [];
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        ldBlocks.push(JSON.parse(m[1].trim()));
      } catch { /* ignore malformed blocks */ }
    }
    const products: Record<string, unknown>[] = [];
    const visit = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.some((t) => typeof t === "string" && /product/i.test(t))) products.push(obj);
      if (Array.isArray(obj["@graph"])) visit(obj["@graph"]);
    };
    ldBlocks.forEach(visit);
    const jsonLd = products.length ? JSON.stringify(products).slice(0, 4000) : "";

    // Images: JSON-LD product images first (highest quality signal), then OG image.
    const images: string[] = [];
    const pushImage = (raw: unknown) => {
      if (typeof raw === "string") {
        const abs = absolutize(raw, url);
        if (abs && !images.includes(abs)) images.push(abs);
      } else if (Array.isArray(raw)) {
        raw.forEach(pushImage);
      } else if (raw && typeof raw === "object" && typeof (raw as { url?: unknown }).url === "string") {
        pushImage((raw as { url: string }).url);
      }
    };
    products.forEach((p) => pushImage(p.image));
    pushImage(meta("og:image:secure_url") || meta("og:image"));

    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const description = meta("og:description");
    if (description) text = `${description}\n\n${text}`;
    if (text.length < 200 && !jsonLd) throw new Error("Zu wenig Inhalt auf der Produktseite gefunden");
    return { pageTitle, text: text.slice(0, 9000), jsonLd, images: images.slice(0, 6) };
  } finally {
    clearTimeout(timeout);
  }
}

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

    // ── Auth: admin only ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nicht autorisiert" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
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

    // ── Input ──────────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({})) as {
      url?: unknown;
      categories?: unknown;
      brands?: unknown;
    };
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!/^https?:\/\/\S+$/i.test(url)) {
      return json({ error: "Bitte eine gültige http(s)-Produkt-URL angeben" }, 400);
    }
    const strList = (v: unknown) =>
      (Array.isArray(v) ? v : []).filter((s): s is string => typeof s === "string" && !!s.trim()).slice(0, 50);
    const categories = strList(body.categories);
    const brands = strList(body.brands);

    // ── Anthropic key: env first, DB fallback ──────────────────────────────────
    let anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      const { data: ic } = await supabaseAdmin
        .from("site_integration_configs")
        .select("config")
        .eq("service", "anthropic")
        .maybeSingle();
      anthropicKey = (ic?.config as Record<string, string> | null)?.api_key;
    }
    if (!anthropicKey) {
      return json({ error: "Anthropic API-Key nicht konfiguriert (Admin → Integrationen)" }, 500);
    }

    // ── Extract page + draft product; errors go back as ok:false with message ──
    try {
      logStep("Fetching product page", { url });
      const source = await extractSource(url);

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 3000,
          system: buildSystemPrompt(categories, brands),
          tools: [TOOL_DEFINITION(categories, brands)],
          tool_choice: { type: "tool", name: "draft_product" },
          messages: [{
            role: "user",
            content:
              `Produktseite: ${url}\nSeitentitel: ${source.pageTitle}\n\n` +
              (source.jsonLd ? `Strukturierte Produktdaten (JSON-LD):\n${source.jsonLd}\n\n` : "") +
              `Extrahierter Seiteninhalt:\n${source.text}`,
          }],
        }),
      });
      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        throw new Error(`Claude API ${claudeResponse.status}: ${errText.slice(0, 200)}`);
      }
      const claudeData = await claudeResponse.json();
      const toolUse = (Array.isArray(claudeData?.content) ? claudeData.content : []).find(
        (b: { type?: string; name?: string }) => b?.type === "tool_use" && b?.name === "draft_product",
      ) as { input?: Record<string, unknown> } | undefined;

      const product = toolUse?.input;
      if (!product || typeof product.name !== "string" || !product.name.trim()) {
        throw new Error("Keine verwertbaren Produktdaten auf der Seite erkannt");
      }

      logStep("Product drafted", { url, name: product.name, images: source.images.length });
      return json({ ok: true, product, images: source.images }, 200);
    } catch (err) {
      logStep("Import failed", { url, error: (err as Error).message });
      return json({ ok: false, error: (err as Error).message }, 200);
    }
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

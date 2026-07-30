import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Weekly AI news generator: takes 1–3 source URLs from the padel press, writes an
// ORIGINAL German article per URL (no copy/translation of the source), inserts each
// as an UNPUBLISHED draft (ai_generated = true, source_url set) and triggers the
// DeepL EN translation. The admin adds a cover image and publishes manually.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPERADMIN_EMAIL = "fsteinfelder@padel2go.eu";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[generate-news-from-urls] ${step}`, details ? JSON.stringify(details) : "");
};

const TOPICS = ["Inside P2G", "Events", "Marketplace", "Community", "Business"] as const;

const SYSTEM_PROMPT = `Du bist Redakteur:in für das PADEL2GO News-Portal — eine Plattform für die deutsche Padel-Community.
Du erhältst den extrahierten Inhalt eines fremden Branchenartikels. Schreibe daraus einen EIGENSTÄNDIGEN,
komplett neu formulierten News-Artikel für unsere Leser und übergib das Ergebnis über das Tool draft_article.

Regeln:
- KEIN Plagiat: Übernimm ausschließlich Fakten, niemals Formulierungen, Satzstrukturen oder wörtliche Zitate
  länger als ein kurzes, als Zitat gekennzeichnetes Fragment. Der Text muss eine eigene journalistische Leistung sein.
- Erfinde keine Fakten, Zahlen, Namen oder Zitate. Wenn die Quelle etwas nicht hergibt, lass es weg.
- Ordne die Nachricht für die deutsche Padel-Community ein (Warum ist das relevant?).
- title: prägnante Schlagzeile, max. 60 Zeichen, kein Punkt am Ende
- title_highlight: OPTIONAL ein pointierter Schluss-Teilsatz (max. 30 Zeichen), der farbig-kursiv
  an die Schlagzeile angehängt wird (title + title_highlight = komplette H1). Nur setzen, wenn es
  die Headline stärker macht — sonst leer lassen. Nicht den title wiederholen.
- excerpt: max. 120 Zeichen, Anreißer für die Artikelkarte
- lead: 1–2 Sätze Einstieg für den Artikel-Hero (max. 280 Zeichen), fasst die Kernnachricht zusammen
- topic: GENAU eines von ${TOPICS.map((t) => `"${t}"`).join(", ")}.
  Inside P2G = eigene PADEL2GO-News (Standorte, Produkt, Team) · Events = Turniere & Veranstaltungen ·
  Marketplace = Equipment, Produkte, Deals · Community = Vereine, Spieler-Stories, Breitensport ·
  Business = Markt, Investments, Industrie-News
- seo_title: max. 60 Zeichen (darf vom title abweichen, suchorientiert)
- seo_description: max. 155 Zeichen, beschreibt den Artikel für Google
- body_html: 300–500 Wörter, einfaches semantisches HTML — erlaubt sind <p>, <h3>, <ul>, <li>, <strong>, <em>,
  <blockquote> für gekennzeichnete Zitate; KEIN <script>, KEIN inline-Style, KEINE Class-Attribute,
  KEINE Links (die Quelle wird separat verlinkt)
- Zeitungsstruktur: Gliedere den Text in KURZE Absätze (je 2–4 Sätze, jeweils ein eigenes <p>)
  und setze 1–2 <h3>-Zwischenüberschriften. Niemals den ganzen Text in einen einzigen Absatz packen.
- Ton: sachlich, freundlich, deutsch (Du-Form ist okay)`;

const TOOL_DEFINITION = {
  name: "draft_article",
  description: "Übergibt den fertigen, eigenständig formulierten News-Artikel.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Prägnante Schlagzeile, max. 60 Zeichen" },
      title_highlight: {
        type: "string",
        description: "Optionaler farbig-kursiver Schluss-Teilsatz der H1, max. 30 Zeichen — leer lassen wenn nicht sinnvoll",
      },
      excerpt: { type: "string", description: "Anreißer für die Artikelkarte, max. 120 Zeichen" },
      lead: { type: "string", description: "Einstiegsabsatz für den Artikel-Hero, max. 280 Zeichen" },
      topic: { type: "string", enum: [...TOPICS], description: "Genau ein Topic für Filter + Farbcode" },
      seo_title: { type: "string", description: "SEO-Titel, max. 60 Zeichen" },
      seo_description: { type: "string", description: "SEO-Beschreibung, max. 155 Zeichen" },
      body_html: {
        type: "string",
        description: "Artikelinhalt als einfaches semantisches HTML (<p>, <h3>, <ul>, <li>, <strong>, <em>, <blockquote>)",
      },
    },
    required: ["title", "excerpt", "lead", "topic", "body_html"],
  },
};

/** URL-Slug aus dem Titel — identisch zur Frontend-Logik, plus Zufalls-Suffix für Eindeutigkeit. */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Fetch a source page and reduce it to plain text the model can work with. */
async function extractSource(url: string): Promise<{ pageTitle: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PADEL2GO-NewsBot/1.0; +https://www.padel2go-official.de)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Quelle antwortet mit HTTP ${res.status}`);
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

    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const description = meta("og:description");
    if (description) text = `${description}\n\n${text}`;
    if (text.length < 300) throw new Error("Zu wenig Textinhalt auf der Quellseite gefunden");
    return { pageTitle, text: text.slice(0, 9000) };
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

    // ── Input: 1–3 http(s) URLs ────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const rawUrls = Array.isArray((body as { urls?: unknown }).urls) ? (body as { urls: unknown[] }).urls : [];
    const urls = rawUrls
      .filter((u): u is string => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim()))
      .map((u) => u.trim())
      .slice(0, 3);
    if (urls.length === 0) {
      return json({ error: "Bitte mindestens eine gültige http(s)-URL angeben" }, 400);
    }

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

    // ── One article per URL; a failing URL never kills the batch ──────────────
    const results: Array<Record<string, unknown>> = [];

    for (const url of urls) {
      try {
        logStep("Fetching source", { url });
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
            system: SYSTEM_PROMPT,
            tools: [TOOL_DEFINITION],
            tool_choice: { type: "tool", name: "draft_article" },
            messages: [{
              role: "user",
              content: `Quelle: ${url}\nTitel der Quelle: ${source.pageTitle}\n\nExtrahierter Inhalt:\n${source.text}`,
            }],
          }),
        });
        if (!claudeResponse.ok) {
          const errText = await claudeResponse.text();
          throw new Error(`Claude API ${claudeResponse.status}: ${errText.slice(0, 200)}`);
        }
        const claudeData = await claudeResponse.json();
        const toolUse = (Array.isArray(claudeData?.content) ? claudeData.content : []).find(
          (b: { type?: string; name?: string }) => b?.type === "tool_use" && b?.name === "draft_article",
        ) as { input?: Record<string, unknown> } | undefined;

        const str = (key: string) =>
          typeof toolUse?.input?.[key] === "string" ? (toolUse.input[key] as string).trim() : "";
        const title = str("title");
        const excerpt = str("excerpt");
        const bodyHtml = str("body_html");
        if (!title || !bodyHtml) throw new Error("Generierter Artikel ist unvollständig");

        const topicRaw = str("topic");
        const topic = (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : "Inside P2G";
        const words = bodyHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const readingMinutes = Math.max(1, Math.round(words / 200));

        // Draft insert — the admin adds the cover image and publishes manually.
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("articles")
          .insert({
            title,
            title_highlight: str("title_highlight") || null,
            slug: slugify(title),
            excerpt,
            lead: str("lead") || null,
            body_html: bodyHtml,
            topic,
            reading_minutes: readingMinutes,
            seo_title: str("seo_title") || null,
            seo_description: str("seo_description") || null,
            is_published: false,
            ai_generated: true,
            source_url: url,
            audience: "everyone",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (insertError || !inserted) throw new Error(insertError?.message ?? "Insert fehlgeschlagen");

        // EN translation via the existing DeepL function (needs the admin JWT).
        let translated = false;
        try {
          const tRes = await fetch(`${supabaseUrl}/functions/v1/translate-content`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": authHeader },
            body: JSON.stringify({
              table: "articles",
              id: inserted.id,
              fields: ["title", "excerpt", "body_html", "title_highlight", "lead"],
            }),
          });
          translated = tRes.ok;
          if (!tRes.ok) logStep("Translation failed", { id: inserted.id, status: tRes.status });
        } catch (tErr) {
          logStep("Translation error", { id: inserted.id, error: (tErr as Error).message });
        }

        logStep("Article drafted", { id: inserted.id, url, translated });
        results.push({ url, ok: true, id: inserted.id, title, translated });
      } catch (err) {
        logStep("URL failed", { url, error: (err as Error).message });
        results.push({ url, ok: false, error: (err as Error).message });
      }
    }

    return json({ results }, 200);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

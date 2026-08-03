import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { safeFetch } from "../_shared/safeFetch.ts";
import { stripUnsafeHtml } from "../_shared/stripUnsafeHtml.ts";

// Weekly AI news generator: takes 1–3 sources from the padel press — URLs and/or
// uploaded files (PDF datasheets go to Claude natively, HTML files through the same
// extractor as fetched pages, TXT files as plain text) — writes an ORIGINAL German
// article per source (no copy/translation), inserts each as an UNPUBLISHED draft
// (ai_generated = true, source_url set for URLs) and triggers the DeepL EN
// translation. The admin adds a cover image and publishes manually. Optionally a
// stored writing style (news_writing_styles) steers tone/structure of the output.

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
Du erhältst den Inhalt eines fremden Branchenartikels — als extrahierten Webseiten-Text oder als hochgeladenes
Dokument (z.B. PDF-Pressemitteilung). Schreibe daraus einen EIGENSTÄNDIGEN, komplett neu formulierten
News-Artikel für unsere Leser und übergib das Ergebnis über das Tool draft_article.

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

/** Reduce raw HTML to plain text the model can work with (shared by URL fetch and file upload). */
function htmlToText(html: string, fallbackTitle: string): { pageTitle: string; text: string } {
    const meta = (name: string) => {
      const m = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      ) ?? html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
      );
      return m?.[1]?.trim() ?? "";
    };
    const pageTitle = meta("og:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || fallbackTitle;

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
    if (text.length < 300) throw new Error("Zu wenig Textinhalt in der Quelle gefunden");
    return { pageTitle, text: text.slice(0, 9000) };
}

/** Fetch a source page and reduce it to plain text the model can work with. */
async function extractSource(url: string): Promise<{ pageTitle: string; text: string }> {
  // safeFetch blockt interne/Metadata-Ziele (SSRF, Fund 10) und validiert Redirects.
  const res = await safeFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PADEL2GO-NewsBot/1.0; +https://www.padel2go-official.de)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error("Quelle konnte nicht geladen werden");
  return htmlToText(await res.text(), url);
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

    // ── Input: 1–3 sources — http(s) URLs and/or uploaded files (PDF / HTML / TXT)
    const body = await req.json().catch(() => ({})) as { urls?: unknown; files?: unknown; style_id?: unknown };
    const rawUrls = Array.isArray(body.urls) ? body.urls : [];
    const urls = rawUrls
      .filter((u): u is string => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim()))
      .map((u) => u.trim());

    type FileKind = "pdf" | "html" | "txt";
    type FileSource = { name: string; kind: FileKind; data: string };
    const rawFiles = Array.isArray(body.files) ? body.files : [];
    const files: FileSource[] = rawFiles
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({
        name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Dokument",
        kind: f.kind === "pdf" || f.kind === "html" || f.kind === "txt" ? (f.kind as FileKind) : null,
        data: typeof f.data === "string" ? f.data.replace(/\s+/g, "") : "",
      }))
      .filter((f): f is FileSource => !!f.kind && !!f.data);

    type Source = { type: "url"; url: string } | ({ type: "file" } & FileSource);
    const sources: Source[] = [
      ...urls.map((url) => ({ type: "url" as const, url })),
      ...files.map((f) => ({ type: "file" as const, ...f })),
    ].slice(0, 3);
    if (sources.length === 0) {
      return json({ error: "Bitte mindestens eine gültige http(s)-URL oder eine PDF/HTML/TXT-Datei angeben" }, 400);
    }
    // ~15 MB decoded combined — Claude's request limit is 32 MB, base64 adds ~1/3 overhead
    if (files.reduce((sum, f) => sum + f.data.length, 0) > 20_000_000) {
      return json({ error: "Dateien zu groß (max. 15 MB gesamt)" }, 400);
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

    // ── Optional writing style: sample text steers tone/structure, never content ─
    let systemPrompt = SYSTEM_PROMPT;
    const styleId = typeof body.style_id === "string" ? body.style_id.trim() : "";
    if (styleId) {
      const { data: style } = await supabaseAdmin
        .from("news_writing_styles")
        .select("name, sample_text")
        .eq("id", styleId)
        .maybeSingle();
      const sample = (style?.sample_text ?? "").trim();
      if (sample) {
        logStep("Using writing style", { styleId, name: style?.name, sampleChars: sample.length });
        systemPrompt += `

Schreibstil-Vorgabe ("${style?.name ?? "Eigener Stil"}"):
Orientiere dich in Tonalität, Satzbau, Wortwahl, Absatzlänge und Struktur an den folgenden
Beispieltexten des Herausgebers. Übernimm AUSSCHLIESSLICH den Stil — niemals Inhalte, Fakten,
Namen oder Formulierungen aus den Beispielen. Die Fakten kommen allein aus der Quelle.
--- BEISPIELTEXTE ANFANG ---
${sample.slice(0, 8000)}
--- BEISPIELTEXTE ENDE ---`;
      } else {
        logStep("Writing style not found or empty", { styleId });
      }
    }

    // ── One article per source; a failing source never kills the batch ────────
    const results: Array<Record<string, unknown>> = [];

    for (const src of sources) {
      const label = src.type === "url" ? src.url : src.name;
      try {
        let messageContent: unknown;
        if (src.type === "url") {
          logStep("Fetching source", { url: src.url });
          const source = await extractSource(src.url);
          messageContent =
            `Quelle: ${src.url}\nTitel der Quelle: ${source.pageTitle}\n\nExtrahierter Inhalt:\n${source.text}`;
        } else if (src.kind === "html") {
          logStep("Analyzing HTML file", { name: src.name });
          const html = new TextDecoder().decode(Uint8Array.from(atob(src.data), (c) => c.charCodeAt(0)));
          const source = htmlToText(html, src.name);
          messageContent =
            `Quelle: Hochgeladene Datei "${src.name}"\nTitel der Quelle: ${source.pageTitle}\n\nExtrahierter Inhalt:\n${source.text}`;
        } else if (src.kind === "txt") {
          logStep("Analyzing TXT file", { name: src.name });
          const text = new TextDecoder().decode(Uint8Array.from(atob(src.data), (c) => c.charCodeAt(0)))
            .replace(/\r\n/g, "\n")
            .trim();
          if (text.length < 50) throw new Error("Zu wenig Textinhalt in der Datei gefunden");
          messageContent =
            `Quelle: Hochgeladene Textdatei "${src.name}"\n\nInhalt:\n${text.slice(0, 9000)}`;
        } else {
          // PDFs go to Claude natively as a base64 document block — no local parsing.
          logStep("Analyzing PDF", { name: src.name, base64Length: src.data.length });
          messageContent = [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: src.data },
            },
            {
              type: "text",
              text: `Quelle: Hochgeladenes Dokument "${src.name}". Schreibe daraus den eigenständigen News-Artikel und übergib ihn über draft_article.`,
            },
          ];
        }

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
            system: systemPrompt,
            tools: [TOOL_DEFINITION],
            tool_choice: { type: "tool", name: "draft_article" },
            messages: [{ role: "user", content: messageContent }],
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
        const bodyHtml = stripUnsafeHtml(str("body_html")); // Fund 2: XSS-Schutz vor DB-Write
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
            source_url: src.type === "url" ? src.url : null,
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

        logStep("Article drafted", { id: inserted.id, source: label, translated });
        results.push({ url: label, ok: true, id: inserted.id, title, translated });
      } catch (err) {
        logStep("Source failed", { source: label, error: (err as Error).message });
        results.push({ url: label, ok: false, error: (err as Error).message });
      }
    }

    return json({ results }, 200);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

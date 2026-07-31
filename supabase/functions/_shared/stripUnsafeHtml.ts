// Sicherheitsaudit 2026-07-31, Fund 2 (Stored XSS): server-seitige Bereinigung von
// KI-/DeepL-generiertem body_html VOR dem DB-Write. Defense-in-Depth — die
// autoritative Bereinigung passiert render-seitig via DOMPurify (src/lib/sanitizeHtml.ts);
// diese Funktion entfernt die gefährlichsten Konstrukte bereits an der Quelle, damit
// nie roher Schadcode in der DB landet (Deno hat kein DOM für einen vollen Parser).
export function stripUnsafeHtml(html: string): string {
  if (!html) return "";
  return html
    // Gefährliche Element-Blöcke inkl. Inhalt entfernen
    .replace(/<\s*(script|style|iframe|object|embed|form|noscript|template)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    // Selbstschließende/verwaiste gefährliche Tags
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|noscript|template|input|button|link|meta|base)\b[^>]*>/gi, "")
    // Inline-Event-Handler (on*="…" / on*='…' / on*=wert)
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // javascript:/vbscript:/data:-URIs in href/src neutralisieren
    .replace(/(href|src)\s*=\s*"(?:\s*)(javascript|vbscript|data):[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'(?:\s*)(javascript|vbscript|data):[^']*'/gi, "$1='#'")
    // style-Attribute entfernen (können expression()/url(javascript:) tragen)
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, "")
    .replace(/\sstyle\s*=\s*'[^']*'/gi, "");
}

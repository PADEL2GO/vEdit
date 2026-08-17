import DOMPurify from "dompurify";
import { storageImage } from "@/lib/imageUrl";

// Sicherheitsaudit 2026-07-31, Fund 2 (Stored XSS): Artikel-body_html stammt aus
// KI-Generierung + DeepL-Übersetzung und wird via dangerouslySetInnerHTML gerendert.
// Diese Allow-Liste entspricht den Tags, die die Generator-Prompts ohnehin vorgeben —
// hier aber technisch erzwungen. Keine on*-Handler, kein script/iframe/style,
// Links nur http(s)/mailto. Defense-in-depth zusätzlich zur Server-Sanitisierung.
const ALLOWED_TAGS = [
  "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "b", "i",
  "blockquote", "a", "br", "img",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel"];

export function sanitizeArticleHtml(html: string): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "form", "input"],
    ADD_ATTR: ["target"],
  });
  return withScaledImages(clean);
}

/**
 * Bilder im Artikeltext über den Render-Endpunkt: skaliertes WebP mit `max-age` statt
 * Original mit `no-cache`. Ein `onerror`-Fallback ist hier nicht möglich (die Allow-Liste
 * erlaubt keine on*-Attribute) — den übernimmt useStorageImageFallback am Container.
 */
function withScaledImages(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const scaled = storageImage(img.getAttribute("src"), { width: 1200 });
    if (scaled) img.setAttribute("src", scaled);
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  }
  return doc.body.innerHTML;
}

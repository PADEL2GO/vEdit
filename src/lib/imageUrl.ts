const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Rewrites a public Supabase storage URL to its scaled WebP derivative.
 * Everything else (foreign hosts, data: URIs, already-transformed URLs, null) passes through
 * unchanged — this helper must never be the reason an image fails to load.
 *
 * Bewusst identisch zur App (`lib/imageUrl.ts` im App-Repo), damit beide Seiten dieselben
 * URLs erzeugen und sich denselben CDN-Cache teilen. Der Render-Endpunkt schickt zudem
 * `max-age=…`, der rohe Objekt-Endpunkt `no-cache`.
 */
export function storageImage(
  url: string | null | undefined,
  opts: { width: number; quality?: number },
): string | null {
  if (!url) return null;
  const [base, query] = url.split("?");
  if (!base.includes(OBJECT_PATH)) return url;
  // SVG ist vektoriell und winzig — durch den Transformer gäbe es nur ein 400.
  if (base.toLowerCase().endsWith(".svg")) return url;

  // Vorhandene Parameter erhalten: Avatare hängen ?v=<timestamp> zum Cache-Busting an.
  const params = new URLSearchParams(query);
  params.set("width", String(Math.max(1, Math.round(opts.width))));
  params.set("quality", String(opts.quality ?? 70));
  params.set("format", "webp");
  return `${base.replace(OBJECT_PATH, RENDER_PATH)}?${params.toString()}`;
}

/**
 * Kehrt storageImage() um. Der Transformer lehnt Quellen über ~25 MB mit HTTP 400 ab —
 * genau dort brauchen wir das unveränderte Original als Fallback.
 */
export function originalImage(url: string): string {
  if (!url.includes(RENDER_PATH)) return url;
  const [base, query] = url.split("?");
  const params = new URLSearchParams(query);
  for (const key of ["width", "quality", "format"]) params.delete(key);
  const rest = params.toString();
  return base.replace(RENDER_PATH, OBJECT_PATH) + (rest ? `?${rest}` : "");
}

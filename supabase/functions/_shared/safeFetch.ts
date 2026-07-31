// Sicherheitsaudit 2026-07-31, Fund 10 (SSRF): gemeinsamer Guard für die
// server-seitigen URL-Fetcher (generate-news-from-urls, generate-product-from-url).
// Blockt private/loopback/link-local/metadata-Ziele und validiert jeden
// Redirect-Hop einzeln (fetch folgt Redirects sonst automatisch und könnte eine
// externe Allowlist per 302 auf eine interne Adresse umleiten).

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "metadata.google.internal",
]);

/** true, wenn die IP in einem privaten / loopback / link-local / metadata-Bereich liegt. */
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true;                       // 10.0.0.0/8
    if (a === 127) return true;                      // 127.0.0.0/8 loopback
    if (a === 0) return true;                        // 0.0.0.0/8
    if (a === 169 && b === 254) return true;         // 169.254.0.0/16 link-local (Cloud-Metadata!)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;         // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::" ) return true;        // IPv6 loopback / unspecified
  if (lower.startsWith("fe80:")) return true;                // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7)); // IPv4-mapped
  return false;
}

/** Wirft, wenn die URL kein öffentliches http(s)-Ziel ist. */
async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Ungültige URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Nur http(s)-URLs erlaubt");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("Zieladresse nicht erlaubt");
  }
  // Wenn der Host bereits eine IP ist, direkt prüfen …
  if (/^[0-9.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("Interne Zieladresse nicht erlaubt");
    return;
  }
  // … sonst DNS auflösen und ALLE Antworten prüfen (Schutz vor DNS-Rebinding).
  const ips: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      ips.push(...(await Deno.resolveDns(host, type)));
    } catch { /* Record-Typ fehlt — ignorieren */ }
  }
  if (ips.length === 0) throw new Error("Zieladresse nicht auflösbar");
  if (ips.some(isPrivateIp)) throw new Error("Interne Zieladresse nicht erlaubt");
}

/**
 * Wie fetch(), aber SSRF-sicher: validiert das Ziel und jeden Redirect-Hop.
 * Folgt max. 4 Redirects manuell. Timeout in ms (Default 15000).
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; maxRedirects?: number } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const maxRedirects = opts.maxRedirects ?? 4;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current, { ...init, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Zu viele Weiterleitungen");
}

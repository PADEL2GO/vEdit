// Shared PADEL2GO-branded transactional email helper (Resend).
// Keeps confirmation / cancellation / event / reminder mails visually consistent.
import { Resend } from "npm:resend@4.0.0";

const FROM = "PADEL2GO <booking@padel2go.eu>";

/** Resolve the Resend API key: env var first, site_integration_configs (service='resend') fallback. */
export async function resolveResendKey(supabaseAdmin: any): Promise<string | null> {
  let key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    const { data } = await supabaseAdmin
      .from("site_integration_configs")
      .select("config, service")
      .eq("service", "resend")
      .maybeSingle();
    key = (data?.config as Record<string, string> | undefined)?.api_key;
  }
  return key ?? null;
}

export interface EmailRow { label: string; value: string }
export interface BrandedEmailOpts {
  title: string;                 // <title> / meta
  emoji?: string;                // big emoji above the heading
  heading: string;               // main lime heading
  intro: string;                 // sentence under the heading
  greetingName?: string;         // "Hallo {name},"
  rows?: EmailRow[];             // detail rows (label / value)
  highlight?: { label: string; value: string }; // boxed value (amount / ticket code)
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;                 // footer note above the copyright
}

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Full branded HTML document (black + lime, PADEL2GO header). */
export function brandedEmailHtml(o: BrandedEmailOpts): string {
  const rows = (o.rows ?? [])
    .map(
      (r) => `
              <tr>
                <td style="padding:7px 0;color:#8a8a8a;font-size:14px;vertical-align:top;">${esc(r.label)}</td>
                <td style="padding:7px 0;color:#FAFAFA;font-size:14px;font-weight:600;text-align:right;vertical-align:top;">${esc(r.value)}</td>
              </tr>`,
    )
    .join("");

  const highlight = o.highlight
    ? `
              <div style="background:rgba(199,240,17,0.08);border:1px solid rgba(199,240,17,0.25);border-radius:12px;padding:18px 20px;margin:0 0 24px;text-align:center;">
                <div style="color:#8a8a8a;font-size:13px;margin-bottom:4px;">${esc(o.highlight.label)}</div>
                <div style="color:#C7F011;font-size:22px;font-weight:800;letter-spacing:0.04em;">${esc(o.highlight.value)}</div>
              </div>`
    : "";

  const cta = o.ctaLabel && o.ctaUrl
    ? `
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${o.ctaUrl}" style="display:inline-block;background:#C7F011;color:#000000;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;box-shadow:0 4px 20px rgba(199,240,17,0.35);">${esc(o.ctaLabel)}</a>
              </div>`
    : "";

  const detailCard = rows
    ? `
              <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:22px 24px;margin:0 0 24px;">
                <table role="presentation" style="width:100%;border-collapse:collapse;">${rows}
                </table>
              </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(o.title)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" style="max-width:520px;margin:0 auto;background:#101010;border:1px solid rgba(199,240,17,0.18);border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:28px;font-weight:800;color:#FAFAFA;letter-spacing:-0.5px;">PADEL<span style="color:#C7F011;">2</span>GO</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="text-align:center;margin-bottom:24px;">
                ${o.emoji ? `<div style="font-size:48px;margin-bottom:16px;">${o.emoji}</div>` : ""}
                <h1 style="margin:0;font-size:24px;font-weight:800;color:#C7F011;">${esc(o.heading)}</h1>
                <p style="margin:12px 0 0;color:#8a8a8a;font-size:15px;">${esc(o.intro)}</p>
              </div>
              ${o.greetingName ? `<p style="color:#e2e8f0;font-size:15px;margin:0 0 24px;">Hallo ${esc(o.greetingName)},</p>` : ""}
              ${detailCard}
              ${highlight}
              ${cta}
              ${o.note ? `<p style="text-align:center;color:#8a8a8a;font-size:14px;margin:0;">${esc(o.note)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:rgba(0,0,0,0.3);text-align:center;">
              <p style="margin:0;color:#5a5a5a;font-size:13px;">© ${new Date().getFullYear()} PADEL2GO. Alle Rechte vorbehalten.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Send a branded email via Resend. Returns the Resend response (throws on hard error). */
export async function sendBrandedEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string; contentType?: string }[],
) {
  const resend = new Resend(resendKey);
  return resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
    ...(attachments && attachments.length ? { attachments } : {}),
  });
}

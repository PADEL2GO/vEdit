// Renders a block-based newsletter into the PADEL2GO branded HTML shell.
export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "button"; label: string; url: string };

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderBlock = (b: Block): string => {
  switch (b?.type) {
    case "heading":
      return `<h2 style="margin:24px 0 8px;font-size:20px;font-weight:800;color:#C7F011;">${esc(b.text)}</h2>`;
    case "text":
      return `<p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.6;">${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "image":
      return `<img src="${esc(b.url)}" alt="${esc(b.alt ?? "")}" style="display:block;width:100%;max-width:100%;border-radius:12px;margin:0 0 20px;" />`;
    case "button":
      return `<div style="text-align:center;margin:8px 0 24px;"><a href="${esc(b.url)}" style="display:inline-block;background:#C7F011;color:#000;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">${esc(b.label)}</a></div>`;
    default:
      return "";
  }
};

export function renderNewsletterHtml(
  campaign: { subject: string; preheader?: string; blocks: Block[] },
  opts: { unsubscribeUrl: string },
): string {
  const body = (campaign.blocks ?? []).map(renderBlock).join("");
  const pre = campaign.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(campaign.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(campaign.subject)}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">${pre}
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:40px 20px;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#101010;border:1px solid rgba(199,240,17,0.18);border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <tr><td style="padding:28px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:26px;font-weight:800;color:#FAFAFA;letter-spacing:-0.5px;">PADEL<span style="color:#C7F011;">2</span>GO</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">${body}</td></tr>
      <tr><td style="padding:20px 32px;background:rgba(0,0,0,0.3);text-align:center;">
        <p style="margin:0 0 6px;color:#5a5a5a;font-size:12px;">© ${new Date().getFullYear()} PADEL2GO ·
          <a href="https://www.padel2go-official.de/impressum" style="color:#8a8a8a;">Impressum</a></p>
        <p style="margin:0;color:#5a5a5a;font-size:12px;">
          Du erhältst diese E-Mail als Newsletter-Abonnent. <a href="${opts.unsubscribeUrl}" style="color:#C7F011;">Abmelden</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

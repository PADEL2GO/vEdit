// Generates supabase/functions/_shared/agb-text.ts (plain-text AGB) from
// src/locales/de/agb.json so confirmation emails can attach the full terms
// (§ 312f BGB: contract terms incl. AGB on a durable medium).
// Run after every AGB change: node scripts/generate-agb-email-text.mjs
import { readFileSync, writeFileSync } from "node:fs";

const agb = JSON.parse(readFileSync("src/locales/de/agb.json", "utf8"));
const s = agb.sections;
const lines = [];

lines.push(agb.header.title, agb.header.subtitle, "");

const para = (sec) => {
  lines.push(sec.heading);
  for (const key of Object.keys(sec)) {
    if (key === "heading") continue;
    const v = sec[key];
    if (typeof v === "string") lines.push(v);
  }
  lines.push("");
};

// § 1 (composed) — keep in sync with AGB.tsx render order
lines.push(s.scope.heading);
lines.push(s.scope.p1Prefix + s.scope.p1Domain + s.scope.p1Suffix);
lines.push(s.scope.p2, s.scope.p3, "");

para(s.registration);

lines.push(s.booking.heading);
for (const item of s.booking.items) lines.push(`${item.label} ${item.text}`);
lines.push("");

lines.push(s.cancellation.heading);
lines.push(`${s.cancellation.noWithdrawalLabel} ${s.cancellation.noWithdrawalText}`);
lines.push(`${s.cancellation.userLabel} ${s.cancellation.userText}`);
for (const item of s.cancellation.userList) lines.push(`- ${item}`);
lines.push(`${s.cancellation.providerLabel} ${s.cancellation.providerText}`, "");

lines.push(s.goods.heading);
for (const item of s.goods.items) lines.push(`${item.label} ${item.text}`);
lines.push("");

lines.push(s.withdrawal.heading);
lines.push(s.withdrawal.p1Prefix + "www.padel2go-official.de/widerruf" + s.withdrawal.p1Suffix);
lines.push(s.withdrawal.p2, s.withdrawal.p3, s.withdrawal.p4, "");

lines.push(s.userDuties.heading, s.userDuties.intro);
for (const item of s.userDuties.list) lines.push(`- ${item}`);
lines.push(s.userDuties.outro, "");

para(s.rewards);

lines.push(s.liability.heading, s.liability.p1, s.liability.p2, s.liability.intro);
for (const item of s.liability.list) lines.push(`- ${item}`);
lines.push("");

lines.push(s.privacy.heading);
lines.push(s.privacy.prefix + "Datenschutzerklärung (www.padel2go-official.de/datenschutz)" + s.privacy.suffix, "");

para(s.changes);
para(s.final);

lines.push(agb.footerNote);

const text = lines.join("\n");
const out = `// AUTO-GENERATED from src/locales/de/agb.json — do not edit by hand.
// Regenerate after AGB changes: node scripts/generate-agb-email-text.mjs
export const AGB_PLAIN_TEXT = ${JSON.stringify(text)};
export const AGB_ATTACHMENT = {
  filename: "PADEL2GO-AGB.txt",
  content: btoa(String.fromCharCode(...new TextEncoder().encode(AGB_PLAIN_TEXT))),
  contentType: "text/plain; charset=utf-8",
};
`;
writeFileSync("supabase/functions/_shared/agb-text.ts", out);
console.log(`agb-text.ts generated (${text.length} chars)`);

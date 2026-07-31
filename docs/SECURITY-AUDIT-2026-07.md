# Sicherheitsaudit PADEL2GO — 2026-07-31

**Umfang:** komplette Plattform — 45 Edge Functions, 156 Migrationen (Postgres/RLS, 42 SECURITY-DEFINER-Funktionen), React/Vite-Frontend, Stripe, Resend, DNS/Mail.
**Methode:** 6 parallele Security-Reviewer (read-only), jeder Fund am tatsächlichen Code-/Migrationspfad verifiziert. Kein Live-Pentest, kein DB-Zugriff — reine Repo- und DNS-Analyse.

> **Wichtiger Vorbehalt:** Geprüft wurde der **Repo-Stand**. Ob alle Migrationen im Live-System gelaufen sind, ist nicht verifiziert (laut Projektnotizen stehen u. a. mehrere Migrationen noch aus). Vor dem Fix jedes DB-Funds bitte gegen den Live-Zustand prüfen.

> **Ausgeschlossen:** Der Kamera-Webhook-Fund (`camera-webhook`, unbegrenztes Credit-Minting) wurde vom Owner als **irrelevant** eingestuft und ist **nicht** Teil der Maßnahmenliste. Er ist unten nur der Vollständigkeit halber dokumentiert.

---

## Überblick

| # | Schwere | Fund | Bereich |
|---|---------|------|---------|
| 1 | 🔴 Kritisch | `bookings` UPDATE-Policy ohne `WITH CHECK` → Gratis-Buchungen / Zahlungsumgehung | DB/RLS |
| 2 | 🔴 Kritisch | Stored XSS über News-`body_html` → Admin-Übernahme (2 Agenten bestätigt) | Frontend + Edge |
| 3 | 🔴 Kritisch | Mail-Spoofing: `padel2go-official.de` ohne SPF & DMARC | Infra/Mail |
| 4 | 🟠 Hoch | `receipt_counters` ohne RLS → Belegnummern manipulierbar, Settlement-DoS | DB/RLS |
| 5 | 🟠 Hoch | `lobby_members` UPDATE ohne `WITH CHECK` → Gratis bezahlpflichtige Lobby-Plätze | DB/RLS |
| 6 | 🟠 Hoch | `get_user_rewards_balance()` ohne `REVOKE` → Punktestand jedes Users (auch anonym) | DB/RLS |
| 7 | 🟠 Hoch | `friendships` UPDATE ohne `WITH CHECK` → Freundschaft fälschen → DM-/Invite-Gates umgehen | DB/RLS |
| 8 | 🟠 Hoch | Doppelbelastung bei Checkout-Retry wird nie erstattet | Zahlungen |
| 9 | 🟠 Hoch | Gutschein-Slot bei `create-payment-intent` unwiderruflich verbraucht ohne Zahlung | Zahlungen |
| 10 | 🟠 Hoch | SSRF in `generate-news-from-urls` / `generate-product-from-url` | Edge/SSRF |
| 11 | 🟠 Hoch | `create-guest-booking` ohne Auth/Rate-Limit → Court-Slot-DoS | Edge |
| 12 | 🟠 Hoch | `react-router-dom` 7.13.0 mit HIGH-CVEs (Open-Redirect-Bypass in `Auth.tsx`) | Frontend |
| 13 | 🟡 Mittel | RLS-Hilfsfunktionen (`has_role` u. a.) ohne `REVOKE` → Admin-/Mitgliedschafts-Enumeration | DB/RLS |
| 14 | 🟡 Mittel | Kein Rate-Limit beim Erraten von Gutschein-Codes & PINs | Zahlungen |
| 15 | 🟡 Mittel | X-Forwarded-For spoofbar → Contact-/Newsletter-Mail-Bombing | Edge/Mail |
| 16 | 🟡 Mittel | Nicht-atomare Wallet-Updates (Race) inkl. Double-Credit bei `approve_reward` | Wallet |
| 17 | 🟡 Mittel | Zu breite CORS-Allowlist (`*.vercel.app`, `*.lovable.app`) | Zahlungen |
| 18 | 🟡 Mittel | `match_suggestions` UPDATE ohne `WITH CHECK` | DB/RLS |
| 19 | 🔵 Niedrig | Diverse (IDOR rewards-estimate, hartkodierte PINs, Fehlerleaks, site_settings anon, Bild-Hotlinking, u. a.) | mehrere |

**Sauber bestätigt (kein Fund):** Stripe-Webhook-Signaturprüfung · server-seitige Preisberechnung · Booking-/Marketplace-Idempotenz & Row-Locks · `user_roles`-Rolleneskalation nicht möglich · `site_integration_configs` (API-Keys) gehärtet, kein Client-SELECT · `wallets`/`points_ledger`/`receipts`/`voucher_codes` nur via service-role-RPC mutierbar · alle 42 SECURITY-DEFINER-Funktionen mit gesetztem `search_path` · Superadmin-Bypass nicht fälschbar (E-Mail aus verifiziertem JWT) · keine Secrets im Repo · `cancel-booking`/`delete-account`/`export-my-data`/`public-profile-api`/`user-search`/Club-/Lobby-APIs ohne IDOR.

---

## 🔴 Kritisch

### 1. `bookings` UPDATE-Policy ohne `WITH CHECK` → Gratis-Buchungen
**Ort:** `supabase/migrations/20251218084743_remix_migration_from_pg_dump.sql:552`, Policy `"Users can update their own bookings"` (`FOR UPDATE USING (auth.uid() = user_id)`, kein `WITH CHECK`). Im finalen Zustand nie eingeschränkt.

**Szenario:** Ein Nutzer legt eine Buchung an (`pending_payment`, `price_cents > 0`), zahlt aber nicht, sondern schickt mit eigenem JWT direkt:
```
PATCH /rest/v1/bookings?id=eq.<eigene_id>
{ "status":"confirmed", "price_cents":0, "credits_used":0, "reserved_voucher_id":null }
```
Da nur `USING` (auf `user_id`) geprüft wird und kein `WITH CHECK` existiert, werden alle anderen Spalten nicht validiert → bestätigte Buchung ohne Zahlung. Umgeht den kompletten Stripe-/Settlement-Stack, weil der nur den offiziellen Checkout-Pfad absichert, nicht den direkten Tabellenzugriff. Beliebig wiederholbar.

**Fix:** Policy streichen (Client braucht sie nicht — Stornierung läuft bereits über die service-role-RPC `cancel_confirmed_booking()`) **oder** durch enges `WITH CHECK` + Trigger ersetzen, der nur `status`-Wechsel erlaubt und Preis-/Credit-/Court-/Zeit-Spalten unverändert lässt.

---

### 2. Stored XSS über News-`body_html` → Admin-Übernahme
**Bestätigt von zwei unabhängigen Reviewern.**
**Ort:** Render ohne Sanitizing `src/pages/NewsArticle.tsx:217` (`dangerouslySetInnerHTML`), Quelle `supabase/functions/generate-news-from-urls/index.ts`, `generate-article/index.ts`, `translate-content/index.ts` (DeepL `tag_handling=html`), Publish-Bypass `src/pages/admin/AdminNews.tsx` (Live-Schalter → `usePublishArticle`, ohne Tiptap). Im ganzen Repo **kein** DOMPurify/sanitize-html.

**Szenario:** Der KI-News-Generator holt Fremdinhalt (URL oder hochgeladene Datei) → indirekte Prompt-Injection kann `<img src=x onerror=…>` in `body_html` schleusen. Der einzige bereinigende Pfad (Tiptap-Editor) wird umgangen, wenn der Admin den Artikel nur per Live-Schalter aus der Liste veröffentlicht. Danach führt `/news/<slug>` das Script im Browser **jedes** (auch anonymen) Besuchers aus. Da `/admin/*` dieselbe Origin nutzt und die Supabase-Session in `localStorage` liegt, kann ein Admin, der den Artikel ansieht, sein Session-Token verlieren → Admin-Übernahme → Zugriff auf alle admin-gated Funktionen.

**Fix:** DOMPurify am Render-Rand (`NewsArticle.tsx`) auf die erlaubte Tag-Liste (`p,h3,ul,li,strong,em,blockquote`, keine `on*`, kein `script`/`iframe`/`style`, `href`/`src` nur `http(s)`) — **und** server-seitig in den drei Generator-/Translate-Funktionen vor dem DB-Write (Defense in Depth). Publish-Pfad so absichern, dass nichts unbereinigt live gehen kann.

---

### 3. Mail-Spoofing: `padel2go-official.de` ohne SPF & DMARC
**Ort:** DNS der Resend-Absenderdomain (per `dig` geprüft).
```
padel2go-official.de   SPF: (fehlt)   DMARC: (fehlt)
padel2go.eu            SPF: v=spf1 include:_spf-eu.ionos.com ~all   DMARC: p=none
```
**Szenario:** Ohne SPF/DMARC auf der Absenderdomain kann jeder E-Mails „von padel2go-official.de" fälschen (Phishing/Buchungsbetrug gegen deine Nutzer), ohne dass Empfänger-Mailserver dies erkennen. `padel2go.eu` hat SPF, aber `p=none` (DMARC nur beobachtend, keine Durchsetzung).

**Fix:** Für `padel2go-official.de` die von Resend vorgegebenen SPF-/DKIM-Records setzen und `_dmarc` mit mind. `p=quarantine` (später `p=reject`) anlegen. Bei `padel2go.eu` DMARC schrittweise auf `quarantine`/`reject` anheben. Kein Code — reine DNS-Konfiguration.

---

## 🟠 Hoch

### 4. `receipt_counters` ohne RLS → Belegnummern manipulierbar
**Ort:** `supabase/migrations/20260726162000_receipts_tax_refunds.sql:70` — einzige Tabelle ohne `ENABLE ROW LEVEL SECURITY`.
**Szenario:** Jeder eingeloggte Client kann `receipt_counters` per PostgREST ändern/löschen → GoBD-pflichtige lückenlose Belegnummerierung manipulierbar; ein Reset lässt `create_receipt()` an der `UNIQUE`-Constraint scheitern → Settlement-/Checkout-Pfad crasht (DoS).
**Fix:** `ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;` ohne Client-Policy (nur intern via `create_receipt()`), analog zu `rate_limit_log`.

### 5. `lobby_members` UPDATE ohne `WITH CHECK` → Gratis-Lobby-Plätze
**Ort:** `20260108182453_*.sql:167` und `20260112203021_*.sql:121` (`FOR UPDATE USING (user_id = auth.uid())`, kein `WITH CHECK`).
**Szenario:** `update({ status:'paid', paid_at:… })` auf die eigene Zeile sichert einen bezahlpflichtigen Lobby-Platz (`price_per_player_cents`) ohne Stripe-Zahlung.
**Fix:** Policy streichen (Statuswechsel zu `paid` nur via service-role-RPC) oder `WITH CHECK`, das `paid` verbietet.

### 6. `get_user_rewards_balance()` ohne `REVOKE` → fremder Punktestand
**Ort:** `20251222143818_*.sql:204` — SECURITY DEFINER, aber kein `REVOKE EXECUTE FROM PUBLIC`.
**Szenario:** `POST /rest/v1/rpc/get_user_rewards_balance {"p_user_id":"<beliebig>"}` liefert (auch **unauthentifiziert**) den Punktestand jedes Users und hebelt die `points_ledger`-RLS aus.
**Fix:** `REVOKE ALL … FROM PUBLIC, anon, authenticated;` + `auth.uid()`-Check oder `service_role`-only.

### 7. `friendships` UPDATE ohne `WITH CHECK` → Freundschaft fälschen
**Ort:** `20260108153745_*.sql:40,44`.
**Szenario:** Der Requester akzeptiert seine eigene Anfrage per `update({status:'accepted'})` → `are_friends()` = true ohne Zustimmung des Opfers → umgeht die „nur Freunde"-Gates für Direktnachrichten (`chat_messages`) und Lobby-Einladungen. Symmetrisch kann der Addressee `requester_id` umbiegen.
**Fix:** Statuswechsel über SECURITY-DEFINER-RPC kapseln, die `requester_id`/`addressee_id` fixiert; RLS-`WITH CHECK` ergänzen.

### 8. Doppelbelastung bei Checkout-Retry wird nie erstattet
**Ort:** `create-checkout-session/index.ts:792` + `stripe-webhook/index.ts:642-646`.
**Szenario:** Beim Retry wird die alte Stripe-Session nicht `expire()`t (nur im Free-Path). Werden beide Sessions bezahlt, behandelt der Webhook die zweite, real erfasste Zahlung als „gutartiges Duplikat" (Buchung bereits `confirmed`) und erstattet **nicht** — Kunde zahlt doppelt.
**Fix:** Vor jeder neuen Session offene Vorgänger-Session `expire()`n; im Webhook prüfen, ob `session.payment_intent` von der gespeicherten abweicht → zweite Zahlung automatisch erstatten + Admin alarmieren (Pfad existiert bereits für „paid-for-nothing").

### 9. Gutschein-Slot ohne Zahlung verbraucht (`create-payment-intent`)
**Ort:** `create-payment-intent/index.ts:116-152`.
**Szenario:** Funktion inkrementiert `voucher.current_uses`, schreibt aber **nie** `reserved_voucher_id` auf die Buchung → keine Freigabe durch `release_booking_reserves`/Cron. Ein Nutzer bucht wiederholt mit demselben limitierten Code, ohne je zu zahlen → Code für alle echten Kunden aufgebraucht.
**Fix:** `reserved_voucher_id` (analog `create-checkout-session`) atomar auf die Buchung persistieren, bevor der PaymentIntent erstellt wird; bei Fehler/Ablauf freigeben.

### 10. SSRF in `generate-news-from-urls` / `generate-product-from-url`
**Ort:** `generate-news-from-urls/index.ts:122-138`, `generate-product-from-url/index.ts:177-193`.
**Szenario:** Server-seitiger `fetch()` beliebiger `http(s)`-URLs, ohne IP-Allow-/Denylist, ohne Redirect-Limit, ohne DNS-Rebinding-Schutz. Admin-gated — aber koppelt gefährlich mit Fund 2 (gestohlenes Admin-Token). Ziel `http://169.254.169.254/` (Cloud-Metadata), `localhost`, RFC1918 erreichbar; bei `generate-product-from-url` wird der Inhalt direkt in der Response gespiegelt (Read-Primitive). Drei unterscheidbare Fehlerzustände = Reachability-Oracle.
**Fix:** Hostname auflösen und private/loopback/link-local/metadata-IPs ablehnen (vor Connect **und** nach jedem Redirect, oder Redirects deaktivieren); nur `https:`; ggf. Domain-Allowlist; einheitliche generische Fehlermeldung.

### 11. `create-guest-booking` ohne Auth/Rate-Limit → Court-Slot-DoS
**Ort:** `create-guest-booking/index.ts` (`verify_jwt = false`, keinerlei Rate-Limit).
**Szenario:** Unauthentifiziert `pending_payment`-Holds (15 Min, blockieren die Overlap-Prüfung) für alle Court/Zeit-Kombinationen anlegen und alle ~14 Min erneuern → kein echter Kunde kann buchen. Voll automatisierbar, ohne Credentials.
**Fix:** Rate-Limit pro IP **und** E-Mail und/oder CAPTCHA vor dem Hold; ggf. kürzere Hold-Dauer für unverifizierte Gäste; E-Mail-/OTP-Verifikation vor Slot-Lock.

### 12. `react-router-dom` 7.13.0 mit HIGH-CVEs (Open-Redirect-Bypass)
**Ort:** `package.json:75`, betroffener Pfad `src/pages/Auth.tsx:51-61`.
**Szenario:** `react-router` 7.13.0 liegt im verwundbaren Bereich; u. a. `GHSA-wrjc-x8rr-h8h6` (Open-Redirect via Backslash in `useNavigate`). Der App-Guard `safeRedirect` prüft `startsWith("/") && !startsWith("//")`, fängt aber `/\evil.com` nicht ab. Die übrigen `npm audit`-HIGH-Treffer (`postcss`, `minimatch`, `ws`, `yaml` …) sind reine Build-Tooling-Deps und landen nicht im Browser-Bundle.
**Fix:** `react-router`/`react-router-dom` auf gepatchte Version aktualisieren; `safeRedirect` zusätzlich härten (Backslash ablehnen bzw. `new URL(param, origin).origin === origin` prüfen).

---

## 🟡 Mittel

### 13. RLS-Hilfsfunktionen ohne `REVOKE FROM PUBLIC` → Enumeration
`has_role()`, `are_friends()`, `is_club_member()`, `get_user_club_id()`, `is_lobby_member()`, `is_lobby_host()`, `is_group_member()`, `is_group_creator()` sind direkt per RPC aufrufbar. `POST /rpc/has_role {"_user_id":"<uuid>","_role":"admin"}` verrät, ob eine UUID Admin ist (Recon für gezieltes Phishing). **Fix:** `REVOKE EXECUTE … FROM PUBLIC` — RLS-interne Aufrufe brauchen kein Client-GRANT.

### 14. Kein Rate-Limit beim Erraten von Gutschein-Codes & PINs
`voucher-validate`, `voucher-redeem`, `validate-pin` liefern unbegrenzt ein Gültig/Ungültig-Oracle (`validate-pin` sogar unauthentifiziert). **Fix:** IP-/User-Rate-Limit mit Backoff/Lockout, generische verzögerte Antwort.

### 15. X-Forwarded-For spoofbar → Mail-Bombing
`send-contact-email` (3/h) und `newsletter-subscribe` (5/h) bucketen nach dem **linkesten**, client-kontrollierbaren `X-Forwarded-For`-Wert → Limit trivial umgehbar; `newsletter-subscribe` verschickt Bestätigungsmails an beliebige Opfer-Adressen. Tokens selbst sind sicher (`gen_random_uuid()`). **Fix:** vertrauenswürdigen Client-IP-Header nutzen; `newsletter-subscribe` zusätzlich pro Ziel-E-Mail limitieren.

### 16. Nicht-atomare Wallet-Updates (Race) inkl. Double-Credit
Mehrere Pfade in `admin-credits`, `p2g-points-api`, `rewards-trigger`, `friends-api` nutzen Read-modify-write auf Wallet-Spalten statt der vorhandenen atomaren RPC `increment_wallet_credits`. `approve_reward`/`bulk_approve_rewards` haben keinen `status`-Guard auf dem Update → zwei parallele Freigaben derselben Reward-Instanz können doppelt gutschreiben. **Fix:** alle Credit-Writes über `increment_wallet_credits`/`set_wallet_credits`; Status-Flip konditional (`… AND status IN ('PENDING_APPROVAL','PENDING')`).

### 17. Zu breite CORS-Allowlist
`create-checkout-session`/`marketplace-checkout` akzeptieren jeden Origin auf `.vercel.app`/`.lovable.app`/`.lovableproject.com` (öffentliche Hosting-TLDs). Risiko aktuell durch Bearer-Auth (kein Cookie) begrenzt. **Fix:** auf konkrete Deploy-Domains einschränken.

### 18. `match_suggestions` UPDATE ohne `WITH CHECK`
Nutzer könnte `matched_user_id`/`score`/`status` fälschen; geringe Folgewirkung, da an keine weitere Berechtigungslogik gekoppelt. **Fix:** `WITH CHECK`, das `user_id`/`matched_user_id` fixiert.

---

## 🔵 Niedrig

- **IDOR `rewards-estimate`** (`:63-70`): client-`booking_id` ohne Ownership-Check → grobe Buchungsdauer eines Fremd-UUID lesbar (read-only, kein Credit). Fix: `.eq("user_id", user.id)`.
- **Nicht-konstantzeitige Secret-Vergleiche** (`rewards-trigger:87`, u. a.): theoretischer Timing-Kanal, praktisch kaum ausnutzbar. Fix: timing-safe-Compare.
- **`validate-pin` hartkodierte PINs** (`:9-12`): Klartext im Repo, unauth, kein Rate-Limit; nur Content-Gating (kein Geldfluss). Fix: PINs via env/`site_integration_configs`.
- **Interne Fehlermeldungen nach außen** (Checkout-Funktionen, finaler `catch`): Postgres-/Stripe-Fehlertexte an Aufrufer. Fix: generische Meldung, Detail nur serverseitig loggen.
- **`site_settings` anon-lesbar** (`20251220155828_*.sql:17`, `USING (true)`): Feature-Flags/Launch-Datum öffentlich; **keine** Secrets. Fix (optional): `TO authenticated`.
- **Marketplace-Bilder von Fremd-URLs** hotgelinkt (`generate-product-from-url`): Besucher-IP-Leak an Dritt-Origin, Dead-Image-Risiko. Fix: Bilder server-seitig re-hosten (mit SSRF-Schutz aus Fund 10).
- **Cleanup-Utility-Funktionen ohne `REVOKE`** (`cleanup_expired_*`): von jedem aufrufbar, aber nicht steuerbar; leichtes DoS. Fix: `REVOKE` + `GRANT service_role`.
- **`newsletter_subscribers` anon-INSERT** (`WITH CHECK (true)`): bewusst fürs Public-Formular; Spam-Insert-Risiko, kein Lesezugriff. Fix: Rate-Limit.
- **Stripe Test-Mode-Webhook** settlet Prod-Tabellen (Design-Hinweis): unkritisch, solange Test-Secret wie Live-Secret geschützt bleibt.

---

## Ausgeschlossen (Owner: irrelevant)

- **`camera-webhook` — unbegrenztes Credit-Minting** (`match-complete` prüft keine Session-Mitgliedschaft): vom Owner als irrelevant eingestuft, **nicht** Teil der Maßnahmen. Falls das Kamera-Feature je live geht, vor Aktivierung neu bewerten.

---

## Empfohlene Reihenfolge

1. **Sofort (Geld-/Account-Abfluss, direkt ausnutzbar):** Fund 1 (Gratis-Buchungen), 2 (XSS→Admin), 6 (Punktestand-Leak), 8 (Doppelbelastung), 9 (Gutschein-Leak). Fund 1 ist eine einzeilige RLS-Änderung mit der größten Hebelwirkung.
2. **Kurzfristig:** 3 (DNS/SPF/DMARC — kein Code), 4, 5, 7, 10, 11, 12.
3. **Nächste Wartung:** 13–18.
4. **Gelegenheit:** Niedrig-Funde.

*Alle DB-Funde vor dem Fix gegen den tatsächlichen Live-Migrationsstand prüfen.*

# Security-Fix-Log — PADEL2GO

Zentrale Historie aller umgesetzten Sicherheits-Fixes. Grundlage: Audit vom 2026-07-31 (`docs/SECURITY-AUDIT-2026-07.md`). Neueste Einträge oben.

Legende: ✅ umgesetzt · 🟡 teilweise · ⏳ offen/geplant · ⛔ bewusst ausgeschlossen

---

## 2026-07-31 — Umsetzung Audit-Funde (Runde 1)

Commit-Kontext: DB-Migration `supabase/migrations/20260731130000_security_audit_fixes.sql` (muss manuell im Supabase SQL-Editor laufen — Projektregel: kein `db push`); Frontend + 4 Edge Functions deployed.

### ✅ Umgesetzt

| Fund | Schwere | Fix | Dateien |
|------|---------|-----|---------|
| 1 | 🔴 Kritisch | `bookings`-UPDATE-Policy „Users can update their own bookings" entfernt → kein direkter Client-Schreibpfad mehr, der Preis/Status ungeprüft lässt. User-Storno läuft weiter über `cancel-booking` (service-role), Admin über eigene Policy. | `…20260731130000_security_audit_fixes.sql` |
| 2 | 🔴 Kritisch | Stored XSS: `body_html` wird jetzt **render-seitig** via DOMPurify (autoritativ) **und server-seitig** vor dem DB-Write bereinigt (Defense-in-Depth). | `src/lib/sanitizeHtml.ts` (neu), `src/pages/NewsArticle.tsx`, `supabase/functions/_shared/stripUnsafeHtml.ts` (neu), `generate-news-from-urls`, `generate-article`, `translate-content` |
| 4 | 🟠 Hoch | `receipt_counters`: RLS aktiviert (nur intern via `create_receipt()` beschreibbar). | `…20260731130000_…sql` |
| 5 | 🟠 Hoch | `lobby_members`: permissive UPDATE-Policies entfernt (Statuswechsel `paid` nur via `lobby-api` service-role). | `…20260731130000_…sql` |
| 6 | 🟠 Hoch | `get_user_rewards_balance()`: EXECUTE von PUBLIC/anon/authenticated entzogen (fremder Punktestand nicht mehr per /rpc auslesbar). | `…20260731130000_…sql` |
| 7 | 🟠 Hoch | `friendships`: permissive UPDATE-Policies entfernt (Annehmen/Ablehnen nur via `friends-api` service-role) → Freundschaft nicht mehr fälschbar. | `…20260731130000_…sql` |
| 10 | 🟠 Hoch | SSRF: beide URL-Fetcher nutzen jetzt `safeFetch` — blockt loopback/private/link-local/Metadata-IPs (auch nach jedem Redirect), nur http(s), generische Fehlermeldung. | `supabase/functions/_shared/safeFetch.ts` (neu), `generate-news-from-urls`, `generate-product-from-url` |
| 11 | 🟠 Hoch | `create-guest-booking`: Rate-Limit (8 Holds/IP/Stunde über `rate_limit_log`), vertrauenswürdiger `cf-connecting-ip`-Header statt spoofbarem X-Forwarded-For. | `create-guest-booking` |
| 12 | 🟠 Hoch | Open-Redirect-Guard in `Auth.tsx` gehärtet: Backslash-Bypass geschlossen, Validierung via `new URL()` gegen eigene Origin. | `src/pages/Auth.tsx` |
| 18 | 🟡 Mittel | `match_suggestions`: permissive UPDATE-Policy entfernt. | `…20260731130000_…sql` |

### ⏳ Offen / geplant (bewusst noch nicht angefasst)

| Fund | Schwere | Grund der Zurückstellung | Nächster Schritt |
|------|---------|--------------------------|------------------|
| 3 | 🔴 Kritisch | Reine **DNS-Konfiguration**, nicht aus dem Code lösbar. | Bei Resend die SPF/DKIM-Records für `padel2go-official.de` hinterlegen; `_dmarc` mit `p=quarantine` (→ später `reject`) anlegen. `padel2go.eu` DMARC von `p=none` hochstufen. |
| 8 | 🟠 Hoch | Money-Flow (Doppelbelastung Checkout-Retry) — Änderung an Stripe-Webhook + Session-Handling, braucht Test gegen Stripe-Testmodus. | Alte Session vor neuer `expire()`n; Webhook: abweichende `payment_intent` erkennen → auto-refund + Admin-Alert. |
| 9 | 🟠 Hoch | Money-Flow (Gutschein-Leak `create-payment-intent`) — muss mit dem Release-/Cleanup-Pfad zusammen getestet werden. | `reserved_voucher_id` analog `create-checkout-session` auf die Buchung persistieren. |
| 13 | 🟡 Mittel | REVOKE auf RLS-Hilfsfunktionen (`has_role` u.a.) — in 39 Policies genutzt, EXECUTE-Entzug kann RLS brechen. | In Staging testen, dann separat migrieren. |
| 14 | 🟡 Mittel | Rate-Limit für Voucher-/PIN-Erraten. | `voucher-validate`/`voucher-redeem`/`validate-pin` an `rate_limit_log` hängen (Muster wie Fund 11). |
| 15 | 🟡 Mittel | Teilbehoben: guest-booking nutzt jetzt vertrauenswürdigen IP-Header. `send-contact-email`/`newsletter-subscribe` noch offen. | Dort denselben `cf-connecting-ip`-Ansatz + Ziel-E-Mail-Limit. |
| 16 | 🟡 Mittel | Nicht-atomare Wallet-Updates — größerer Refactor auf `increment_wallet_credits`. | Read-modify-write-Stellen einzeln auf RPC umstellen; `approve_reward` Status-Guard. |
| 17 | 🟡 Mittel | CORS-Allowlist — braucht die exakten Prod-Deploy-Domains. | `*.vercel.app`/`*.lovable.app` durch konkrete Domains ersetzen. |
| Niedrig | 🔵 | Diverse (IDOR rewards-estimate, hartkodierte PINs, Fehlerleaks, site_settings anon, Bild-Hotlinking). | Bei nächster Wartung. |

### ⛔ Bewusst ausgeschlossen

| Fund | Grund |
|------|-------|
| Kamera-Webhook (unbegrenztes Credit-Minting) | Vom Owner als **irrelevant** eingestuft. Falls das Kamera-Feature live geht, vor Aktivierung neu bewerten. |

### ⚠️ Manuelle Schritte nach diesem Commit
1. **Migration ausführen:** `supabase/migrations/20260731130000_security_audit_fixes.sql` im Supabase SQL-Editor (Projekt `wvvdkuextsbsecqbfksb`) — **erst gegen den Live-Zustand prüfen** (nicht alle früheren Migrationen sind evtl. gelaufen).
2. **DNS (Fund 3):** SPF/DKIM/DMARC für `padel2go-official.de` setzen.

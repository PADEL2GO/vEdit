# Design-Spec: Konto-Sicherheit (E-Mail & Passwort ändern) + Passwort-vergessen-Härtung

**Datum:** 2026-07-07
**Status:** Freigegeben (Brainstorming abgeschlossen)
**Scope:** Neuer „Sicherheit"-Tab im Konto zum Ändern von E-Mail und Passwort (inkl. vollem Bestätigungsflow), plus Absicherung des bestehenden „Passwort vergessen"-Flows.

---

## 1. Ziel & Kontext

Eingeloggte User sollen im Profil (`/account`) ihre **E-Mail-Adresse** und ihr **Passwort** selbst ändern können, inklusive des vollständigen E-Mail-Bestätigungsflows. Zusätzlich wird der bereits existierende „Passwort vergessen"-Flow in der Anmeldemaske kontrolliert und gegen abgelaufene/ungültige Links abgesichert.

**Entscheidungen aus dem Brainstorming:**
- Passwort-Änderung wird über die Abfrage des **aktuellen Passworts** (Reauth) abgesichert — sofort aktiv, keine Mail-Bestätigung.
- Der „Passwort vergessen"-Flow wird **geprüft & gehärtet**, das Layout bleibt im Kern erhalten.
- Platzierung: **neuer Tab „Sicherheit"** im Konto.
- Die **Konto-Löschung** wandert aus dem Profil-Tab in den Sicherheit-Tab (alle sensiblen Aktionen an einem Ort).
- Beim **E-Mail-Ändern** wird zusätzlich das **aktuelle Passwort** abgefragt (Reauth, konsistent zum PW-Ändern).

---

## 2. Ausgangslage (Ist-Zustand)

| Bereich | Datei | Status |
|---------|-------|--------|
| Supabase-Client | `src/integrations/supabase/client.ts` | `persistSession`, `autoRefreshToken`, `detectSessionInUrl` (Default = true) → Recovery-/Change-Tokens im URL-Hash werden automatisch verarbeitet |
| Auth-Context | `src/hooks/useAuth.tsx` | Bietet `user, session, loading, signUp, signInWithPassword, signOut, resetPassword`. Sessions via `onAuthStateChange` + `getSession`. |
| Auth-Seite | `src/pages/Auth.tsx` (Route `/auth`) | Modus-gesteuert: `login \| register \| forgot \| reset \| confirm`. „Passwort vergessen"-Flow **vollständig vorhanden**. |
| Konto-Seite | `src/pages/Account.tsx` (Route `/account`, hinter `RequireAuth`) | Tabs: Profil / Buchungen / Bestellungen / P2G-Punkte. **Keine** E-Mail-/Passwort-Änderung. Konto-Löschung als Mailto im Profil-Tab. |
| Profil-Formular | `src/components/account/AccountProfileForm.tsx` | Username, Anzeigename, Alter, Avatar. |
| i18n | `src/i18n/index.ts` + `src/locales/{de,en}/*.json` | Auto-Load aller JSONs; Namespaces `auth`, `account` etc. |
| Auth-Mail-Templates | `docs/email-templates/auth-confirm-signup.html`, `auth-reset-password.html` | Branded, im Supabase-Dashboard hinterlegt. **Kein** „Change Email"-Template vorhanden. |
| Produktions-Domains | `src/i18n/index.ts` | DE: `www.padel2go-official.de`, EN: `www.padel2go-official.com`. Redirects nutzen `window.location.origin`. |

Bestehender „Passwort vergessen"-Flow im Detail:
`Auth.tsx` Link (`setMode("forgot")`) → `useAuth.resetPassword(email)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth?mode=reset })` → Mail → Klick → SDK erkennt Recovery-Token im Hash → `/auth?mode=reset` → `supabase.auth.updateUser({ password })` → Toast + Redirect `/account`.

---

## 3. Architektur & Datei-Änderungen

### 3.1 `src/hooks/useAuth.tsx` (erweitern)
Zentralisiert alle `supabase.auth.*`-Calls (bestehendes Muster). Neue Context-Methoden:

- `verifyPassword(currentPassword: string): Promise<{ error: any }>`
  Verifiziert das aktuelle Passwort via `signInWithPassword(user.email, currentPassword)`. Schlägt der Call fehl → Passwort falsch. Die bestehende Session bleibt bei Fehler unberührt (fehlgeschlagenes signInWithPassword zerstört sie nicht).
- `updatePassword(currentPassword, newPassword): Promise<{ error: any }>`
  1. `verifyPassword(currentPassword)` → bei Fehler zurückgeben. 2. `supabase.auth.updateUser({ password: newPassword })`.
- `updateEmail(currentPassword, newEmail): Promise<{ error: any }>`
  1. `verifyPassword(currentPassword)` → bei Fehler zurückgeben. 2. `supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: ${window.location.origin}/auth?mode=email-change })`.

Interface `AuthContextType` + Provider-`value` entsprechend ergänzen.

### 3.2 `src/components/account/AccountSecurityTab.tsx` (neu)
Eigenständige Tab-Komponente (Muster wie `AccountOrdersTab.tsx`). Enthält drei Blöcke, jeweils im bestehenden Karten-Stil (`bg-card border border-border rounded-2xl p-6`, `variant="lime"`-Buttons, Lucide-Icons, Framer-Motion-Fade):

**A) E-Mail-Änderung**
- Anzeige der aktuellen E-Mail (`user.email`, read-only).
- Felder: Neue E-Mail, Neue E-Mail bestätigen, Aktuelles Passwort.
- Lokale Validierung: gültige E-Mail (zod, wie in `Auth.tsx`), beide E-Mail-Felder identisch, neue ≠ aktuelle E-Mail, Passwort nicht leer.
- Submit → `updateEmail(...)`. Bei Erfolg: Umschalten auf **Pending-State** „Bestätigung ausstehend" mit Hinweis, dass Links an alte **und** neue Adresse gingen und beide bestätigt werden müssen. Formular zurücksetzen.
- Fehler (z. B. „email address already in use", Reauth-Fehler) → Toast (`sonner`).

**B) Passwort-Änderung**
- Felder: Aktuelles Passwort, Neues Passwort, Neues Passwort bestätigen.
- Validierung: neues PW ≥ 6 Zeichen, beide neuen Felder identisch, neues ≠ aktuelles (optionaler Hinweis).
- Submit → `updatePassword(...)`. Erfolg → Toast „Passwort geändert", Felder leeren. Fehler („Aktuelles Passwort falsch" bei Reauth-Fehler / sonst Supabase-Message) → Toast.

**C) Konto-Löschung**
- Der bestehende Löschungs-Block (DSGVO Art. 17, Mailto an `contact@padel2go.eu`) wird **1:1** aus `Account.tsx` hierher verschoben (gleiche Texte/Keys `page.delete.*`).

Interner State: lokales `useState` + zod-Validierung (Projektmuster, kein react-hook-form). Loading-Spinner an den Buttons wie im restlichen Code.

### 3.3 `src/pages/Account.tsx` (bearbeiten)
- `TabsList`: `grid-cols-2 sm:grid-cols-4` → `grid-cols-2 sm:grid-cols-5` (bzw. `grid-cols-3` mobil prüfen — mobil-tauglich lassen), neuer `<TabsTrigger value="security">{t("page.tabs.security")}</TabsTrigger>`.
- Neuer `<TabsContent value="security"><AccountSecurityTab /></TabsContent>`.
- Der Konto-Löschungs-Block (Zeilen ~300–317) wird aus dem Profil-`TabsContent` **entfernt** und lebt künftig in `AccountSecurityTab`.
- Import von `AccountSecurityTab` ergänzen. Ggf. `Trash2`-Import entfernen, falls in Account.tsx nicht mehr genutzt.

### 3.4 `src/pages/Auth.tsx` (bearbeiten)
**Neuer Modus `email-change`** (Landing für E-Mail-Bestätigungslinks):
- `AuthMode`-Type um `"email-change"` erweitern.
- URL-Erkennung: bei `searchParams.get("mode") === "email-change"` → `setMode("email-change")`.
- Redirect-Guard (aktuell nur `mode === "reset"` übersprungen): **auch** `email-change` überspringen, damit eingeloggte User die Bestätigungsmeldung sehen, bevor sie weitergeleitet werden.
- View: Status-Ansicht. Nach dem automatischen Token-Handling durch das SDK zeigt sie via `supabase.auth.getUser()`:
  - noch ausstehend (`user.new_email` gesetzt) → „Danke! Bitte bestätige auch den Link in deiner zweiten E-Mail."
  - abgeschlossen (E-Mail aktualisiert) → „Deine E-Mail-Adresse wurde erfolgreich geändert." + Button „Zum Konto".
  - Fehler-Hash (`error_code`) → freundliche Fehlermeldung + Button „Zum Konto".

**Härtung `reset`-Modus:**
- URL-Hash auf `error`/`error_code=otp_expired` prüfen (Supabase hängt das bei abgelaufenem Link an). Falls vorhanden → statt Reset-Formular ein Hinweis „Link abgelaufen oder ungültig" + Button „Neuen Link anfordern" (`setMode("forgot")`).
- „Kein Recovery-Session": Wenn `mode=reset` aktiv ist, aber nach dem SDK-Handling keine (Recovery-)Session existiert (kein `user`), ebenfalls den „Neuen Link anfordern"-Hinweis zeigen statt eines leeren Formulars, das beim Absenden fehlschlägt. Umsetzung über einen `recoveryReady`-State, gesetzt sobald eine Session/`PASSWORD_RECOVERY`/`USER_UPDATED` vorliegt; ein kurzer Grace-Timeout unterscheidet „noch am Laden" von „kein Token".
- Bestehende Erfolgs-/Fehler-Toasts und das Layout des Reset-Formulars bleiben.

### 3.5 i18n — `src/locales/{de,en}/account.json` & `auth.json` (bearbeiten)
- `account.json`: `page.tabs.security`; neue Sektion `security.*` (Kartentitel, Feld-Labels/Placeholder, Buttons, Pending-Text, Toast-Titel/Beschreibungen, Fehlermeldungen „Aktuelles Passwort falsch", „E-Mail bereits vergeben", „Passwörter stimmen nicht überein" etc.). Löschungs-Keys `page.delete.*` bleiben nutzbar (Block wird verschoben, Keys unverändert).
- `auth.json`: `emailChange.*` (Landing: Titel, „wird verarbeitet", Erfolg, Teil-Bestätigung, Fehler, „Zum Konto"); `reset.expired.*` (Titel/Beschreibung „Link abgelaufen", „Neuen Link anfordern").
- **Beide Sprachen (DE + EN) vollständig pflegen.**

### 3.6 `docs/email-templates/auth-change-email.html` (neu, Doku)
Branded HTML-Template (Stil wie `auth-confirm-signup.html` / `auth-reset-password.html`, Schwarz + Lime, deutsch) für das Supabase-Dashboard „Change Email Address". Nutzt Supabase-Variable `{{ .ConfirmationURL }}` (und `{{ .Email }}` / `{{ .NewEmail }}` wo passend). Reine Doku-Datei; das Einspielen erfolgt manuell (siehe §5).

---

## 4. Datenfluss (Zusammenfassung)

**Passwort ändern (eingeloggt):**
Sicherheit-Tab → `updatePassword(cur, neu)` → `verifyPassword` (signInWithPassword) → `updateUser({password})` → Toast. Sofort aktiv, keine Mail.

**E-Mail ändern (eingeloggt):**
Sicherheit-Tab → `updateEmail(cur, neu)` → `verifyPassword` → `updateUser({email}, {emailRedirectTo})` → Supabase schickt 2 Links (alt+neu) → Pending-State. User klickt Links → `/auth?mode=email-change` → SDK verarbeitet Token → Statusmeldung. Änderung greift nach Bestätigung beider Adressen.

**Passwort vergessen (ausgeloggt):**
`/auth` forgot → `resetPasswordForEmail(..., /auth?mode=reset)` → Mail → Klick → `/auth?mode=reset` (SDK legt Recovery-Session an) → Reset-Formular → `updateUser({password})` → Login + Redirect. Neu: abgelaufener/fehlender Token → „Neuen Link anfordern".

---

## 5. ⚠️ Manuelle Schritte im Supabase-Dashboard (nicht aus Code möglich)

1. **„Change Email Address"-Template** unter Authentication → Email Templates hinterlegen (Inhalt aus `docs/email-templates/auth-change-email.html`).
2. **Redirect-URL** `…/auth?mode=email-change` in der URL-Allowlist bestätigen. Da der Reset-Flow denselben `/auth`-Pfad bereits nutzt und funktioniert, ist das mit hoher Wahrscheinlichkeit schon abgedeckt — nur zur Kontrolle.
3. **„Secure email change"** (Doppel-Bestätigung) ist Standard = an. Optional abschaltbar (nur neue Adresse bestätigen); die App unterstützt beide Varianten.

---

## 6. Fehler- & Edge-Cases

- Falsches aktuelles Passwort → „Aktuelles Passwort falsch" (Reauth-Fehler abgefangen).
- Neue E-Mail == aktuelle E-Mail → lokale Validierung blockt.
- Neue E-Mail bereits vergeben → Supabase-Fehler als Toast durchreichen.
- Passwörter stimmen nicht überein / < 6 Zeichen → inline/Toast.
- Abgelaufener/ungültiger Recovery-Link → „Neuen Link anfordern".
- Netzwerk-/unerwartete Fehler → generischer Fehler-Toast.
- Mobile 320–375px: Karten einspaltig; Tab-Leiste bei 5 Tabs mobil auf 2–3 Spalten umbrechen lassen.
- Alle User haben ein Passwort (nur E-Mail/PW-Login, kein OAuth) → kein „kein-Passwort"-Edge.

---

## 7. Verifikation

- `bun run build` bzw. TypeScript-Check grün.
- Manuelles Durchspielen im Dev-Server:
  - PW ändern mit falschem/richtigem aktuellem PW.
  - E-Mail ändern → Pending-State erscheint; `/auth?mode=email-change` zeigt Statusmeldung (Token-Handling ggf. mit echtem Link auf Staging/Live testbar).
  - `/auth?mode=reset` ohne Token und mit simuliertem `#error=…` → „Neuen Link anfordern".
  - Bestehender Login/Register/Forgot unverändert funktionsfähig.
- Finale visuelle Abnahme durch Florian im Live-Vercel-Deploy (Projektmuster).

---

## 8. Nicht im Scope (YAGNI)

2FA/MFA, Passwort-Stärke-Meter über die 6-Zeichen-Regel hinaus, Session-/Geräteverwaltung, Änderungshistorie, In-App-Konto-Löschung (bleibt Mailto), Redesign der Auth-Seite (separater Redesign-Track).

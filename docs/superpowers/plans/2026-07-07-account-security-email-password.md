# Konto-Sicherheit (E-Mail & Passwort ändern) + Passwort-vergessen-Härtung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eingeloggte User können im Konto (`/account`) über einen neuen „Sicherheit"-Tab ihre E-Mail (mit vollem Doppel-Bestätigungsflow) und ihr Passwort (mit Reauth per aktuellem Passwort) ändern; der bestehende „Passwort vergessen"-Flow wird gegen abgelaufene/ungültige Links gehärtet.

**Architecture:** Alle `supabase.auth.*`-Aufrufe liegen zentral in `useAuth.tsx` (bestehendes Muster). Ein neuer, in sich geschlossener Tab-Component `AccountSecurityTab.tsx` bündelt E-Mail-, Passwort- und Konto-Löschungs-Block. `Auth.tsx` bekommt einen neuen `email-change`-Landing-Modus und eine gehärtete `reset`-Ansicht. i18n in `src/locales/{de,en}/{account,auth}.json`.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase JS SDK, shadcn/ui (Input/Label/Button), Tailwind, Framer Motion, sonner (Toasts), react-i18next, zod.

**Projekt-Kontext (wichtig):**
- **Kein Test-Framework** im Projekt (nur `dev/build/lint/preview`). Verifikation je Task = `bun run build` (TypeScript/Vite) + `bun run lint` + manueller Dev-Server-Check. TDD mit Framework ist bewusst **nicht** Teil dieses Plans (CLAUDE.md: keine spekulativen/neuen Infrastruktur-Dateien).
- **Package-Manager:** `bun` (siehe `bun.lockb`). Falls `bun` fehlt, `npm run <script>` verwenden.
- **Commits:** lokal pro Task erlaubt. **Push nach `main` triggert das Live-Vercel-Deploy** → nur nach ausdrücklichem OK von Florian pushen. Commit-Steps unten committen nur lokal.
- **Arbeitsverzeichnis aller Befehle:** `/Users/floriansteinfelder/Desktop/padel2go_live/padel2go-edit-main`

---

## Dateiübersicht

| Aktion | Datei | Verantwortung |
|--------|-------|---------------|
| Modify | `src/locales/de/account.json` | DE-Keys: `page.tabs.security` + `security.*` |
| Modify | `src/locales/en/account.json` | EN-Keys: `page.tabs.security` + `security.*` |
| Modify | `src/locales/de/auth.json` | DE-Keys: `reset.expired.*`, `reset.checking`, `emailChange.*` |
| Modify | `src/locales/en/auth.json` | EN-Keys: `reset.expired.*`, `reset.checking`, `emailChange.*` |
| Modify | `src/hooks/useAuth.tsx` | Neue Context-Methoden `verifyPassword`, `updatePassword`, `updateEmail` |
| Create | `src/components/account/AccountSecurityTab.tsx` | E-Mail-Karte + Passwort-Karte + Löschungs-Block |
| Modify | `src/pages/Account.tsx` | 5. Tab „Sicherheit", Löschungs-Block entfernen, Import |
| Modify | `src/pages/Auth.tsx` | `email-change`-Landing + gehärteter `reset`-Modus |
| Create | `docs/email-templates/auth-change-email.html` | Branded Dashboard-Template (Doku) |

---

## Task 1: i18n-Keys ergänzen (DE + EN)

**Files:**
- Modify: `src/locales/de/account.json`
- Modify: `src/locales/en/account.json`
- Modify: `src/locales/de/auth.json`
- Modify: `src/locales/en/auth.json`

- [ ] **Step 1: `src/locales/de/account.json` — Tab-Key ergänzen**

In `page.tabs` (aktuell endet mit `"stats": "Stats"`) eine Zeile ergänzen:

```json
    "tabs": {
      "profile": "Profil",
      "bookings": "Buchungen",
      "orders": "Bestellungen",
      "p2gPoints": "P2G Points",
      "stats": "Stats",
      "security": "Sicherheit"
    },
```

- [ ] **Step 2: `src/locales/de/account.json` — `security`-Sektion ergänzen**

Als neue Top-Level-Sektion einfügen (z. B. direkt nach der schließenden `}` von `"points"`), Komma-Syntax beachten:

```json
  "security": {
    "email": {
      "title": "E-Mail-Adresse ändern",
      "current": "Aktuelle E-Mail:",
      "newLabel": "Neue E-Mail",
      "newPlaceholder": "neue@email.de",
      "confirmLabel": "Neue E-Mail bestätigen",
      "submit": "E-Mail ändern",
      "invalid": "Bitte gib eine gültige E-Mail-Adresse ein.",
      "mismatch": "Die E-Mail-Adressen stimmen nicht überein.",
      "same": "Das ist bereits deine aktuelle E-Mail-Adresse.",
      "pendingTitle": "Bestätigung ausstehend",
      "pendingBody": "Wir haben Bestätigungslinks an deine alte und deine neue E-Mail-Adresse geschickt. Bitte bestätige beide Links, damit die Änderung wirksam wird."
    },
    "password": {
      "title": "Passwort ändern",
      "currentLabel": "Aktuelles Passwort",
      "newLabel": "Neues Passwort",
      "confirmLabel": "Neues Passwort bestätigen",
      "submit": "Passwort ändern",
      "success": "Dein Passwort wurde erfolgreich geändert.",
      "tooShort": "Passwort muss mindestens 6 Zeichen haben.",
      "mismatch": "Die Passwörter stimmen nicht überein.",
      "currentRequired": "Bitte gib dein aktuelles Passwort ein.",
      "wrongCurrent": "Dein aktuelles Passwort ist falsch."
    },
    "toast": {
      "errorTitle": "Fehler",
      "successTitle": "Erfolg"
    }
  },
```

- [ ] **Step 3: `src/locales/en/account.json` — Tab-Key ergänzen**

```json
    "tabs": {
      "profile": "Profile",
      "bookings": "Bookings",
      "orders": "Orders",
      "p2gPoints": "P2G Points",
      "stats": "Stats",
      "security": "Security"
    },
```

- [ ] **Step 4: `src/locales/en/account.json` — `security`-Sektion ergänzen**

```json
  "security": {
    "email": {
      "title": "Change email address",
      "current": "Current email:",
      "newLabel": "New email",
      "newPlaceholder": "new@email.com",
      "confirmLabel": "Confirm new email",
      "submit": "Change email",
      "invalid": "Please enter a valid email address.",
      "mismatch": "The email addresses do not match.",
      "same": "That is already your current email address.",
      "pendingTitle": "Confirmation pending",
      "pendingBody": "We've sent confirmation links to your old and your new email address. Please confirm both links for the change to take effect."
    },
    "password": {
      "title": "Change password",
      "currentLabel": "Current password",
      "newLabel": "New password",
      "confirmLabel": "Confirm new password",
      "submit": "Change password",
      "success": "Your password has been changed successfully.",
      "tooShort": "Password must be at least 6 characters.",
      "mismatch": "The passwords do not match.",
      "currentRequired": "Please enter your current password.",
      "wrongCurrent": "Your current password is incorrect."
    },
    "toast": {
      "errorTitle": "Error",
      "successTitle": "Success"
    }
  },
```

- [ ] **Step 5: `src/locales/de/auth.json` — `reset` erweitern + `emailChange` ergänzen**

`reset`-Objekt um `expired` und `checking` erweitern (nach `"successDescription"`), und neues Top-Level `emailChange` (z. B. nach `reset`) einfügen:

```json
  "reset": {
    "title": "Neues Passwort festlegen",
    "description": "Gib ein neues Passwort für deinen Account ein.",
    "passwordLabel": "Neues Passwort",
    "confirmLabel": "Neues Passwort bestätigen",
    "submit": "Passwort speichern",
    "success": "Passwort aktualisiert",
    "successDescription": "Dein Passwort wurde geändert. Du bist jetzt eingeloggt.",
    "checking": "Link wird geprüft …",
    "expired": {
      "title": "Link abgelaufen oder ungültig",
      "description": "Dieser Link zum Zurücksetzen ist abgelaufen oder ungültig. Fordere einen neuen an.",
      "requestNew": "Neuen Link anfordern"
    }
  },
  "emailChange": {
    "title": "E-Mail-Bestätigung",
    "processing": "Deine Bestätigung wird verarbeitet …",
    "partial": "Danke! Bitte bestätige auch den Link in deiner anderen E-Mail, damit die Änderung abgeschlossen wird.",
    "done": "Deine E-Mail-Adresse wurde erfolgreich geändert.",
    "error": "Der Bestätigungslink ist abgelaufen oder ungültig. Bitte starte die Änderung in deinem Konto erneut.",
    "toAccount": "Zum Konto"
  },
```

- [ ] **Step 6: `src/locales/en/auth.json` — `reset` erweitern + `emailChange` ergänzen**

```json
  "reset": {
    "title": "Set new password",
    "description": "Enter a new password for your account.",
    "passwordLabel": "New password",
    "confirmLabel": "Confirm new password",
    "submit": "Save password",
    "success": "Password updated",
    "successDescription": "Your password has been changed. You're now signed in.",
    "checking": "Checking link …",
    "expired": {
      "title": "Link expired or invalid",
      "description": "This reset link has expired or is invalid. Request a new one.",
      "requestNew": "Request new link"
    }
  },
  "emailChange": {
    "title": "Email confirmation",
    "processing": "Your confirmation is being processed …",
    "partial": "Thanks! Please also confirm the link in your other email to complete the change.",
    "done": "Your email address has been changed successfully.",
    "error": "The confirmation link has expired or is invalid. Please start the change again from your account.",
    "toAccount": "To account"
  },
```

- [ ] **Step 7: JSON-Gültigkeit + Build prüfen**

Run: `bun run build`
Expected: Build erfolgreich (kein JSON-Parse-Fehler, keine TS-Fehler). Alternativ vorab `node -e "require('./src/locales/de/account.json'); require('./src/locales/en/account.json'); require('./src/locales/de/auth.json'); require('./src/locales/en/auth.json'); console.log('JSON ok')"`.

- [ ] **Step 8: Commit (lokal)**

```bash
git add src/locales/de/account.json src/locales/en/account.json src/locales/de/auth.json src/locales/en/auth.json
git commit -m "feat(i18n): add security tab + email-change + reset-expired keys (de/en)"
```

---

## Task 2: `useAuth.tsx` — Auth-Methoden ergänzen

**Files:**
- Modify: `src/hooks/useAuth.tsx`

- [ ] **Step 1: Interface `AuthContextType` erweitern**

In `src/hooks/useAuth.tsx` die drei Methoden zum Interface (nach `resetPassword`) hinzufügen:

```tsx
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null } | null; error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyPassword: (currentPassword: string) => Promise<{ error: any }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  updateEmail: (currentPassword: string, newEmail: string) => Promise<{ error: any }>;
}
```

- [ ] **Step 2: Implementierungen einfügen**

Direkt nach der `resetPassword`-Funktion (vor dem `return (`) einfügen:

```tsx
  // Verify the current password by re-authenticating. A failed sign-in leaves
  // the existing session intact, so this is a safe "confirm it's really you"
  // check before a sensitive change (email/password).
  const verifyPassword = async (currentPassword: string) => {
    if (!user?.email) return { error: { message: "no_user" } };
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    return { error };
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    const { error: verifyError } = await verifyPassword(currentPassword);
    if (verifyError) return { error: verifyError };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const updateEmail = async (currentPassword: string, newEmail: string) => {
    const { error: verifyError } = await verifyPassword(currentPassword);
    if (verifyError) return { error: verifyError };
    const redirectUrl = `${window.location.origin}/auth?mode=email-change`;
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: redirectUrl }
    );
    return { error };
  };
```

- [ ] **Step 3: Provider-`value` erweitern**

Das `value={{ ... }}` des `AuthContext.Provider` ergänzen:

```tsx
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signInWithPassword,
      signOut,
      resetPassword,
      verifyPassword,
      updatePassword,
      updateEmail,
    }}>
```

- [ ] **Step 4: Build prüfen**

Run: `bun run build`
Expected: Erfolgreich, keine TS-Fehler.

- [ ] **Step 5: Commit (lokal)**

```bash
git add src/hooks/useAuth.tsx
git commit -m "feat(auth): add verifyPassword/updatePassword/updateEmail to useAuth"
```

---

## Task 3: `AccountSecurityTab.tsx` erstellen + in `Account.tsx` einbinden

**Files:**
- Create: `src/components/account/AccountSecurityTab.tsx`
- Modify: `src/pages/Account.tsx`

- [ ] **Step 1: `src/components/account/AccountSecurityTab.tsx` anlegen**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { z } from "zod";
import { Mail, Lock, Loader2, Save, MailCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().email();

export function AccountSecurityTab() {
  const { t } = useTranslation("account");
  const { user, updateEmail, updatePassword } = useAuth();

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailPending, setEmailPending] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSchema.safeParse(newEmail).success) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.invalid") });
      return;
    }
    if (newEmail !== confirmEmail) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.mismatch") });
      return;
    }
    if (newEmail.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.same") });
      return;
    }
    if (!emailPassword) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.password.currentRequired") });
      return;
    }
    setEmailSaving(true);
    const { error } = await updateEmail(emailPassword, newEmail);
    setEmailSaving(false);
    if (error) {
      const description =
        error.message === "Invalid login credentials"
          ? t("security.password.wrongCurrent")
          : error.message;
      toast.error(t("security.toast.errorTitle"), { description });
      return;
    }
    setEmailPending(true);
    setNewEmail("");
    setConfirmEmail("");
    setEmailPassword("");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.password.tooShort") });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.password.mismatch") });
      return;
    }
    if (!currentPassword) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.password.currentRequired") });
      return;
    }
    setPwSaving(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setPwSaving(false);
    if (error) {
      const description =
        error.message === "Invalid login credentials"
          ? t("security.password.wrongCurrent")
          : error.message;
      toast.error(t("security.toast.errorTitle"), { description });
      return;
    }
    toast.success(t("security.toast.successTitle"), { description: t("security.password.success") });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      {/* Email change card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> {t("security.email.title")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("security.email.current")}{" "}
          <span className="font-medium text-foreground break-all">{user?.email}</span>
        </p>

        {emailPending ? (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <MailCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">{t("security.email.pendingTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("security.email.pendingBody")}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <Label htmlFor="newEmail">{t("security.email.newLabel")}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="pl-10"
                  placeholder={t("security.email.newPlaceholder")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="confirmEmail">{t("security.email.confirmLabel")}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmEmail"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="pl-10"
                  placeholder={t("security.email.newPlaceholder")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="emailPassword">{t("security.password.currentLabel")}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="emailPassword"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" variant="lime" disabled={emailSaving} className="w-full sm:w-auto">
              {emailSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {t("security.email.submit")}
            </Button>
          </form>
        )}
      </motion.div>

      {/* Password change card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" /> {t("security.password.title")}
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">{t("security.password.currentLabel")}</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="newPassword">{t("security.password.newLabel")}</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">{t("security.password.confirmLabel")}</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button type="submit" variant="lime" disabled={pwSaving} className="w-full sm:w-auto">
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("security.password.submit")}
          </Button>
        </form>
      </motion.div>

      {/* Account deletion — moved from the Profile tab. DSGVO Art. 17. */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm text-destructive">{t("page.delete.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("page.delete.description")}</p>
            <a
              href={`mailto:contact@padel2go.eu?subject=Kontol%C3%B6schung&body=Bitte%20l%C3%B6sche%20mein%20Konto%20mit%20der%20E-Mail-Adresse%3A%20${encodeURIComponent(user?.email ?? "")}`}
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-destructive hover:underline"
            >
              {t("page.delete.cta")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/Account.tsx` — Import ergänzen**

Nach `import { AccountOrdersTab } from "@/components/account/AccountOrdersTab";` einfügen:

```tsx
import { AccountSecurityTab } from "@/components/account/AccountSecurityTab";
```

- [ ] **Step 3: `src/pages/Account.tsx` — `Trash2`-Import entfernen**

Die Lucide-Import-Zeile ändern (Trash2 wird nur noch im verschobenen Block genutzt):

```tsx
import { LogOut, Loader2, Coins, ShoppingBag, ArrowRight } from "lucide-react";
```

- [ ] **Step 4: `src/pages/Account.tsx` — `TabsList` auf 5 Tabs erweitern**

Den bestehenden `TabsList`-Block ersetzen:

```tsx
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-y-1">
              <TabsTrigger value="profile">{t("page.tabs.profile")}</TabsTrigger>
              <TabsTrigger value="bookings">{t("page.tabs.bookings")}</TabsTrigger>
              <TabsTrigger value="orders">{t("page.tabs.orders")}</TabsTrigger>
              <TabsTrigger value="p2g-points" className="text-xs sm:text-sm">{t("page.tabs.p2gPoints")}</TabsTrigger>
              <TabsTrigger value="security">{t("page.tabs.security")}</TabsTrigger>
            </TabsList>
```

- [ ] **Step 5: `src/pages/Account.tsx` — Löschungs-Block aus Profil-Tab entfernen**

Im `<TabsContent value="profile">` den kompletten Konto-Löschungs-Block entfernen (das `div` mit `border-destructive/30` samt Mailto-Link). Danach enthält `value="profile"` nur noch `<AccountProfileForm ... />`.

- [ ] **Step 6: `src/pages/Account.tsx` — neuen Security-Tab-Content einfügen**

Nach dem `<TabsContent value="orders">…</TabsContent>` (oder an beliebiger Stelle innerhalb `<Tabs>`) einfügen:

```tsx
            <TabsContent value="security" className="space-y-6">
              <AccountSecurityTab />
            </TabsContent>
```

- [ ] **Step 7: Build + Lint prüfen**

Run: `bun run build && bun run lint`
Expected: Build grün; Lint ohne neue Fehler (insb. kein „Trash2 is defined but never used" in Account.tsx, kein ungenutzter Import).

- [ ] **Step 8: Manueller Dev-Check**

Run: `bun run dev` → im Browser `/account` (eingeloggt) öffnen.
Expected: 5 Tabs sichtbar; „Sicherheit"-Tab zeigt E-Mail-Karte (mit aktueller E-Mail), Passwort-Karte und Löschungs-Block. Profil-Tab zeigt **keinen** Löschungs-Block mehr. Mobil (Devtools 320–375px): Tab-Leiste bricht sauber um, Karten einspaltig.

- [ ] **Step 9: Commit (lokal)**

```bash
git add src/components/account/AccountSecurityTab.tsx src/pages/Account.tsx
git commit -m "feat(account): add Security tab (change email/password), move deletion block"
```

---

## Task 4: `Auth.tsx` — `email-change`-Landing + `reset`-Härtung

**Files:**
- Modify: `src/pages/Auth.tsx`

- [ ] **Step 1: Lucide-Import + `AuthMode`-Type erweitern**

Import-Zeile ersetzen:

```tsx
import { Mail, Lock, ArrowLeft, Loader2, AlertCircle, MailCheck } from "lucide-react";
```

Type ersetzen:

```tsx
type AuthMode = "login" | "register" | "forgot" | "reset" | "confirm" | "email-change";
```

- [ ] **Step 2: Neue State-Variablen ergänzen**

Nach `const [errors, setErrors] = useState<...>({});` einfügen:

```tsx
  // Captured synchronously on first render — Supabase strips the URL hash after
  // processing, so read the error markers before they disappear.
  const [linkError] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return !!(params.get("error") || params.get("error_code"));
  });
  const [resetChecked, setResetChecked] = useState(false);
  const [emailChangeStatus, setEmailChangeStatus] =
    useState<"processing" | "partial" | "done" | "error">("processing");
```

- [ ] **Step 3: URL-Mode-Effect erweitern (reset + email-change)**

Den bestehenden Effect ersetzen:

```tsx
  // Check for reset / email-change mode from URL
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "reset") setMode("reset");
    else if (m === "email-change") setMode("email-change");
  }, [searchParams]);
```

- [ ] **Step 4: Redirect-Guard-Effect erweitern**

Den bestehenden „Redirect if already logged in"-Effect ersetzen:

```tsx
  // Redirect if already logged in — but not during password reset or email-change,
  // where the link creates/updates a session and we must show the flow first.
  useEffect(() => {
    const m = searchParams.get("mode");
    if (mode === "reset" || mode === "email-change" || m === "reset" || m === "email-change") return;
    if (user) {
      redirectBasedOnRole(user.id);
    }
  }, [user, mode]);
```

- [ ] **Step 5: Grace-Timer + Email-Change-Status-Effekte ergänzen**

Nach den Effekten aus Step 3/4 einfügen:

```tsx
  // Reset flow: give the SDK a moment to process the recovery token before we
  // decide the link is missing/expired.
  useEffect(() => {
    if (mode !== "reset") return;
    const timer = setTimeout(() => setResetChecked(true), 2500);
    return () => clearTimeout(timer);
  }, [mode]);

  // Email-change landing: after the SDK processes the token, read the user to
  // distinguish "one link confirmed, one still pending" from "fully changed".
  useEffect(() => {
    if (mode !== "email-change") return;
    if (linkError) {
      setEmailChangeStatus("error");
      return;
    }
    let active = true;
    (async () => {
      await new Promise((r) => setTimeout(r, 800));
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const u = data.user as any;
      if (u && u.new_email) setEmailChangeStatus("partial");
      else setEmailChangeStatus("done");
    })();
    return () => {
      active = false;
    };
  }, [mode, linkError]);
```

- [ ] **Step 6: Reset-Render-Block ersetzen (3 Zustände)**

Den bestehenden `{/* Reset Password */} {mode === "reset" && ( ... )}`-Block **komplett** ersetzen durch:

```tsx
              {/* Reset Password — expired / invalid link */}
              {mode === "reset" && (linkError || (resetChecked && !user)) && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <h1 className="text-2xl font-bold">{t("reset.expired.title")}</h1>
                  <p className="text-muted-foreground text-sm">{t("reset.expired.description")}</p>
                  <Button variant="lime" className="w-full" onClick={() => setMode("forgot")}>
                    {t("reset.expired.requestNew")}
                  </Button>
                </div>
              )}

              {/* Reset Password — still verifying the recovery token */}
              {mode === "reset" && !linkError && !user && !resetChecked && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">{t("reset.checking")}</p>
                </div>
              )}

              {/* Reset Password — recovery session ready, show the form */}
              {mode === "reset" && !linkError && user && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-2">{t("reset.title")}</h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    {t("reset.description")}
                  </p>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">{t("reset.passwordLabel")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => validatePassword(password)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="confirmNewPassword">{t("reset.confirmLabel")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("reset.submit")}
                    </Button>
                  </form>
                </>
              )}
```

- [ ] **Step 7: Email-Change-Render-Block ergänzen**

Nach dem `{/* Confirm Email … */}`-Block (vor der schließenden `</div>` der Karte) einfügen:

```tsx
              {/* Email change confirmation landing */}
              {mode === "email-change" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    {emailChangeStatus === "error" ? (
                      <AlertCircle className="w-12 h-12 text-destructive" />
                    ) : emailChangeStatus === "processing" ? (
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    ) : (
                      <MailCheck className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <h1 className="text-2xl font-bold">{t("emailChange.title")}</h1>
                  <p className="text-muted-foreground text-sm">
                    {emailChangeStatus === "error"
                      ? t("emailChange.error")
                      : emailChangeStatus === "processing"
                      ? t("emailChange.processing")
                      : emailChangeStatus === "partial"
                      ? t("emailChange.partial")
                      : t("emailChange.done")}
                  </p>
                  <button
                    onClick={() => navigate("/account")}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {t("emailChange.toAccount")}
                  </button>
                </div>
              )}
```

- [ ] **Step 8: Build + Lint prüfen**

Run: `bun run build && bun run lint`
Expected: Build grün; keine ungenutzten Imports (alle von `AlertCircle`, `MailCheck` verwendet).

- [ ] **Step 9: Manueller Dev-Check (Härtung)**

Run: `bun run dev`
- `/auth?mode=reset` **ohne** Token direkt aufrufen (ausgeloggt): nach ~2,5 s erscheint „Link abgelaufen oder ungültig" + Button „Neuen Link anfordern" (→ wechselt zu Vergessen-Formular). Kein leeres Reset-Formular.
- `/auth?mode=reset#error=access_denied&error_code=otp_expired&error_description=x` aufrufen: sofort die Expired-Ansicht.
- `/auth?mode=email-change` aufrufen: zeigt Verarbeitungs-/Status-Ansicht + „Zum Konto".
- Regression: normaler Login/Registrieren/„Passwort vergessen"-Anfrage unverändert funktionsfähig.

- [ ] **Step 10: Commit (lokal)**

```bash
git add src/pages/Auth.tsx
git commit -m "feat(auth): add email-change landing + harden reset link handling"
```

---

## Task 5: Branded „Change Email"-Mail-Template (Doku)

**Files:**
- Create: `docs/email-templates/auth-change-email.html`

- [ ] **Step 1: Template anlegen**

```html
<!-- Supabase → Authentication → Email Templates → "Change Email Address"
     Betreff: PADEL2GO — E-Mail-Adresse bestätigen
     Nutzt die Supabase-Variablen {{ .ConfirmationURL }}, {{ .Email }} (aktuell), {{ .NewEmail }} (neu).
     Hinweis: Bei aktivem "Secure email change" geht diese Mail an beide Adressen; beide müssen bestätigt werden. -->
<table role="presentation" style="width:100%;border-collapse:collapse;background-color:#0a0a0a;">
  <tr>
    <td style="padding:40px 20px;">
      <table role="presentation" style="max-width:520px;margin:0 auto;background:#101010;border:1px solid rgba(199,240,17,0.18);border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:28px;font-weight:800;color:#FAFAFA;letter-spacing:-0.5px;font-family:Arial,sans-serif;">PADEL<span style="color:#C7F011;">2</span>GO</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:Arial,sans-serif;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="font-size:48px;margin-bottom:16px;">✉️</div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#C7F011;">E-Mail-Adresse bestätigen</h1>
              <p style="margin:12px 0 0;color:#8a8a8a;font-size:15px;">Du hast angefragt, deine E-Mail-Adresse zu ändern.</p>
            </div>
            <p style="color:#e2e8f0;font-size:15px;margin:0 0 24px;text-align:center;">
              Bitte bestätige die Änderung deiner E-Mail-Adresse:
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#C7F011;color:#000000;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">E-Mail-Adresse bestätigen</a>
            </div>
            <p style="text-align:center;color:#8a8a8a;font-size:13px;margin:0 0 8px;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#C7F011;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </p>
            <p style="text-align:center;color:#5a5a5a;font-size:12px;margin:16px 0 0;">
              Aus Sicherheitsgründen senden wir diese Bestätigung an deine alte und deine neue Adresse. Bitte bestätige beide Links, damit die Änderung wirksam wird. Wenn du das nicht angefragt hast, ignoriere diese E-Mail — deine Adresse bleibt unverändert.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background:rgba(0,0,0,0.3);text-align:center;font-family:Arial,sans-serif;">
            <p style="margin:0;color:#5a5a5a;font-size:13px;">© 2026 PADEL2GO. Alle Rechte vorbehalten.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

- [ ] **Step 2: Commit (lokal)**

```bash
git add docs/email-templates/auth-change-email.html
git commit -m "docs(email): add branded change-email template for Supabase dashboard"
```

---

## Task 6: Gesamt-Verifikation + manuelle Dashboard-Schritte

**Files:** keine (Verifikation + Doku-Handoff)

- [ ] **Step 1: Voller Build + Lint**

Run: `bun run build && bun run lint`
Expected: Beides grün, keine neuen Warnungen/Fehler.

- [ ] **Step 2: End-to-End manuell (Dev-Server)**

Run: `bun run dev`, eingeloggt testen:
1. **Passwort ändern** mit **falschem** aktuellem PW → Toast „Dein aktuelles Passwort ist falsch."
2. **Passwort ändern** mit **richtigem** aktuellem PW, neues ≥ 6 Zeichen, Bestätigung gleich → Toast „Erfolg / Passwort geändert"; danach mit neuem PW aus-/einloggbar.
3. **E-Mail ändern**: neue ≠ alte, Bestätigung gleich, aktuelles PW korrekt → „Bestätigung ausstehend"-Karte. (Reale Link-Bestätigung nur auf Staging/Live mit echtem Postfach voll testbar — Landing `/auth?mode=email-change` prüfen.)
4. **Passwort vergessen** (ausgeloggt) → Anfrage sendet Mail (Toast „E-Mail gesendet"). `/auth?mode=reset` ohne Token → Expired-Hinweis.

- [ ] **Step 3: ⚠️ Manuelle Dashboard-Schritte an Florian übergeben**

Diese Schritte kann der Code nicht setzen — im Übergabe-Text an Florian klar auflisten:
1. **Supabase → Authentication → Email Templates → „Change Email Address"**: Inhalt aus `docs/email-templates/auth-change-email.html` einfügen, Betreff „PADEL2GO — E-Mail-Adresse bestätigen".
2. **Supabase → Authentication → URL Configuration → Redirect URLs**: sicherstellen, dass `…/auth`-Redirects für die Produktionsdomains erlaubt sind (der Reset-Flow nutzt bereits `…/auth?mode=reset` — dann ist `…/auth?mode=email-change` mit abgedeckt). Nur kontrollieren.
3. **„Secure email change"** ist standardmäßig aktiv (Doppel-Bestätigung an alte + neue Adresse). So belassen (empfohlen) oder bei Bedarf ausschalten; die App unterstützt beide Varianten.

- [ ] **Step 4: Push nach Absprache**

Nach Florians OK: `git push` (löst Live-Vercel-Deploy aus). Ggf. gemäß CLAUDE.md auf beide Remotes (`origin`, `padel2go`) pushen.

---

## Self-Review (bereits durchgeführt)

- **Spec-Abdeckung:** Sicherheit-Tab (T3), Passwort-Änderung mit Reauth (T2+T3), E-Mail-Änderung mit Doppel-Bestätigung + Landing (T2+T3+T4), Reset-Härtung (T4), i18n DE/EN (T1), Löschungs-Umzug (T3), Mail-Template + Dashboard-Schritte (T5+T6). Alle Spec-Abschnitte haben einen Task.
- **Platzhalter:** keine (jeder Step enthält vollständigen Code/Befehl).
- **Typ-/Namens-Konsistenz:** `verifyPassword/updatePassword/updateEmail`-Signaturen identisch in Interface (T2 Step 1), Impl (T2 Step 2) und Nutzung (T3 `useAuth()`); i18n-Keys in T1 exakt gleich benannt wie in T3/T4 verwendet (`security.*`, `reset.expired.*`, `reset.checking`, `emailChange.*`); Tab-`value="security"` konsistent zwischen `TabsTrigger` und `TabsContent`.
```

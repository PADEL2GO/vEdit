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

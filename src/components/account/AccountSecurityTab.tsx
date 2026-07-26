import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Mail, Lock, Loader2, Save, MailCheck, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email();

export function AccountSecurityTab() {
  const { t } = useTranslation("account");
  const { user, updateEmail, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  // Marketing push opt-in (default off; own-row profiles update)
  const [pushMarketingOptIn, setPushMarketingOptIn] = useState(false);
  const [pushSaving, setPushSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("push_marketing_opt_in")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPushMarketingOptIn(((data as any).push_marketing_opt_in) === true);
      });
  }, [user]);

  const handlePushMarketingChange = async (checked: boolean) => {
    if (!user) return;
    setPushSaving(true);
    const prev = pushMarketingOptIn;
    setPushMarketingOptIn(checked);
    const { error } = await supabase
      .from("profiles")
      .update({ push_marketing_opt_in: checked } as any)
      .eq("user_id", user.id);
    setPushSaving(false);
    if (error) {
      setPushMarketingOptIn(prev);
      toast.error(t("security.toast.errorTitle"), { description: t("security.toast.genericError") });
    }
  };

  // Data export (Art. 15/20 DSGVO)
  const [exporting, setExporting] = useState(false);

  const handleDataExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-my-data", { body: {} });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error ?? error?.message);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `padel2go-datenexport-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("page.dataExport.success"));
    } catch (err) {
      console.error("[AccountSecurity] export-my-data", err);
      toast.error(t("security.toast.errorTitle"), { description: t("security.toast.genericError") });
    } finally {
      setExporting(false);
    }
  };

  // Account deletion (two-step, DSGVO Art. 17 / Apple 5.1.1(v))
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== t("page.delete.confirmWord").toUpperCase()) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error ?? error?.message);
      }
      toast.success(t("page.delete.successTitle"), { description: t("page.delete.successBody") });
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[AccountSecurity] delete-account", err);
      toast.error(t("security.toast.errorTitle"), { description: t("page.delete.error") });
      setDeleting(false);
    }
  };

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

  // Reflect a pending email change: Supabase keeps user.new_email set until both
  // confirmation links are clicked, so re-entering the tab (or reloading) after
  // starting a change should still show the "pending" banner, not an empty form.
  useEffect(() => {
    if ((user as { new_email?: string } | null)?.new_email) setEmailPending(true);
  }, [user]);

  // Never surface the raw Supabase error: it is English-only (breaks the German
  // UI) and can leak whether an email is already registered (account enumeration).
  // Log it for debugging, show friendly translated copy to the user.
  const errorDescription = (error: { message?: string } | null) => {
    if (error?.message) console.error("[AccountSecurity]", error.message);
    return error?.message === "Invalid login credentials"
      ? t("security.password.wrongCurrent")
      : t("security.toast.genericError");
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim();
    const trimmedConfirm = confirmEmail.trim();
    if (!emailSchema.safeParse(trimmedEmail).success) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.invalid") });
      return;
    }
    if (trimmedEmail !== trimmedConfirm) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.mismatch") });
      return;
    }
    if (trimmedEmail.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.email.same") });
      return;
    }
    if (!emailPassword) {
      toast.error(t("security.toast.errorTitle"), { description: t("security.password.currentRequired") });
      return;
    }
    setEmailSaving(true);
    const { error } = await updateEmail(emailPassword, trimmedEmail);
    setEmailSaving(false);
    if (error) {
      toast.error(t("security.toast.errorTitle"), { description: errorDescription(error) });
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
      toast.error(t("security.toast.errorTitle"), { description: errorDescription(error) });
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

      {/* Marketing push opt-in (REQ-D09, § 7 UWG: strictly opt-in, default off) */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">{t("page.pushMarketing.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("page.pushMarketing.description")}</p>
          </div>
          <Switch
            checked={pushMarketingOptIn}
            disabled={pushSaving}
            onCheckedChange={handlePushMarketingChange}
          />
        </div>
      </div>

      {/* Data export (Art. 15/20 DSGVO) */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">{t("page.dataExport.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("page.dataExport.description")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDataExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            {t("page.dataExport.cta")}
          </Button>
        </div>
      </div>

      {/* Account deletion — moved from the Profile tab. DSGVO Art. 17. */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm text-destructive">{t("page.delete.title")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("page.delete.description")}</p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => { setDeleteConfirmText(""); setDeleteOpen(true); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {t("page.delete.cta")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("page.delete.confirmTitle")}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {t("page.delete.confirmBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">{t("page.delete.confirmLabel", { word: t("page.delete.confirmWord") })}</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t("page.delete.confirmWord")}
              disabled={deleting}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t("page.delete.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText.trim().toUpperCase() !== t("page.delete.confirmWord").toUpperCase()}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t("page.delete.confirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

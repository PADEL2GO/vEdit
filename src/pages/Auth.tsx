import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Mail, Lock, ArrowLeft, Loader2, AlertCircle, MailCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/padel2go-logo.png";

type AuthMode = "login" | "register" | "forgot" | "reset" | "confirm" | "email-change";

const Auth = () => {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { user, signUp, signInWithPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
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

  const emailSchema = z.string().email(t("validation.invalidEmail"));
  const passwordSchema = z.string().min(6, t("validation.passwordTooShort"));

  // Safe internal redirect target from ?redirect=<path> (set by RequireAuth)
  const redirectParam = searchParams.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;

  // Role-based redirect helper (honors ?redirect= when it's a safe internal path)
  const redirectBasedOnRole = async (userId: string) => {
    if (safeRedirect) {
      navigate(safeRedirect);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles?.some(r => r.role === "admin")) {
      navigate("/admin");
    } else if (roles?.some(r => r.role === "club_owner")) {
      navigate("/club");
    } else {
      navigate("/account");
    }
  };

  // Redirect if already logged in — but not during password reset or email-change,
  // where the link creates/updates a session and we must show the flow first.
  useEffect(() => {
    const m = searchParams.get("mode");
    if (mode === "reset" || mode === "email-change" || m === "reset" || m === "email-change") return;
    if (user) {
      redirectBasedOnRole(user.id);
    }
  }, [user, mode]);

  // Check for reset / email-change mode from URL
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "reset") setMode("reset");
    else if (m === "email-change") setMode("email-change");
  }, [searchParams]);

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
      const u = data.user as { new_email?: string } | null;
      if (u && u.new_email) setEmailChangeStatus("partial");
      else setEmailChangeStatus("done");
    })();
    return () => {
      active = false;
    };
  }, [mode, linkError]);

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setErrors(prev => ({ ...prev, email: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: e.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = (value: string) => {
    try {
      passwordSchema.parse(value);
      setErrors(prev => ({ ...prev, password: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, password: e.errors[0].message }));
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;

    setLoading(true);
    const { error } = await signInWithPassword(email, password);

    if (error) {
      setLoading(false);
      toast.error(t("toasts.loginFailed"), {
        description: error.message === "Invalid login credentials"
          ? t("toasts.invalidCredentials")
          : error.message,
      });
      return;
    }

    toast.success(t("toasts.welcome"), {
      description: t("toasts.loggedIn"),
    });

    // Get current user and redirect based on role
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await redirectBasedOnRole(currentUser.id);
    } else {
      navigate("/account");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;

    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: t("validation.passwordsDoNotMatch") }));
      return;
    }

    if (!termsAccepted) {
      toast.error(t("toasts.registerFailed"), { description: t("validation.termsRequired") });
      return;
    }
    if (!adultConfirmed) {
      toast.error(t("toasts.registerFailed"), { description: t("validation.adultRequired") });
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email, password, {
      terms_accepted_at: new Date().toISOString(),
      adult_confirmed: true,
    });
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error(t("toasts.registerFailed"), {
          description: t("toasts.alreadyRegistered"),
        });
      } else {
        toast.error(t("toasts.registerFailed"), {
          description: error.message,
        });
      }
      return;
    }

    // With email confirmation on, Supabase returns a user whose identities array is
    // empty when the address already exists (no error, to avoid user enumeration).
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      toast.error(t("toasts.registerFailed"), {
        description: t("toasts.alreadyRegistered"),
      });
      return;
    }

    // No session means email confirmation is required — show the confirmation screen
    // instead of a false "logged in" success + redirect (RequireAuth would bounce it).
    if (!data?.session) {
      toast.success(t("toasts.confirmEmailTitle"), {
        description: t("toasts.confirmEmailInfo"),
      });
      setMode("confirm");
      return;
    }

    // Session created (email confirmation disabled) — user is logged in.
    toast.success(t("toasts.welcome"), {
      description: t("toasts.accountCreated"),
    });
    navigate("/account");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast.error(t("toasts.error"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("toasts.emailSent"), {
      description: t("toasts.resetLinkInfo"),
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(password)) return;

    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: t("validation.passwordsDoNotMatch") }));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error(t("toasts.error"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("reset.success"), {
      description: t("reset.successDescription"),
    });
    setMode("login");
    navigate("/account");
  };

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 pb-12 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img src={logo} alt={t("logoAlt")} className="h-10" />
              </div>

              {/* Login Form */}
              {mode === "login" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">{t("signIn.title")}</h1>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">{t("fields.password")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signIn.submit")}
                    </Button>
                  </form>
                  <div className="mt-4 text-center space-y-2">
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t("signIn.forgotPassword")}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {t("signIn.noAccount")}{" "}
                      <button
                        onClick={() => setMode("register")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("signIn.registerLink")}
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Register Form */}
              {mode === "register" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">{t("signUp.title")}</h1>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">{t("fields.password")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
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
                      <Label htmlFor="confirmPassword">{t("fields.confirmPassword")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>

                    <div className="space-y-3 pt-1">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={termsAccepted}
                          onCheckedChange={(v) => setTermsAccepted(v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                          {t("signUp.termsIntro")}
                          <NavLink to="/agb" target="_blank" className="text-primary underline hover:no-underline">
                            {t("signUp.termsLink")}
                          </NavLink>
                          {t("signUp.termsAnd")}
                          <NavLink to="/datenschutz" target="_blank" className="text-primary underline hover:no-underline">
                            {t("signUp.privacyLink")}
                          </NavLink>
                          {t("signUp.termsOutro")}
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={adultConfirmed}
                          onCheckedChange={(v) => setAdultConfirmed(v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                          {t("signUp.adultConfirm")}
                        </span>
                      </label>
                    </div>

                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signUp.submit")}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("signUp.alreadyRegistered")}{" "}
                      <button
                        onClick={() => setMode("login")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("signUp.signInLink")}
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Forgot Password */}
              {mode === "forgot" && (
                <>
                  <button
                    onClick={() => setMode("login")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("forgot.back")}
                  </button>
                  <h1 className="text-2xl font-bold text-center mb-2">{t("forgot.title")}</h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    {t("forgot.description")}
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("forgot.submit")}
                    </Button>
                  </form>
                </>
              )}

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

              {/* Confirm Email — shown after signup when email confirmation is required */}
              {mode === "confirm" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <Mail className="w-12 h-12 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold">{t("confirm.title")}</h1>
                  <p className="text-muted-foreground text-sm">
                    {t("confirm.body", { email })}
                  </p>
                  <button
                    onClick={() => setMode("login")}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {t("confirm.backToLogin")}
                  </button>
                </div>
              )}

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
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Auth;

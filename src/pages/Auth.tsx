import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/padel2go-logo.png";

const emailSchema = z.string().email("Bitte gib eine gültige E-Mail-Adresse ein");
const passwordSchema = z.string().min(6, "Passwort muss mindestens 6 Zeichen haben");

type AuthMode = "login" | "register" | "forgot" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, signUp, signInWithPassword, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  // Role-based redirect helper
  const redirectBasedOnRole = async (userId: string) => {
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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      redirectBasedOnRole(user.id);
    }
  }, [user]);

  // Check for reset mode from URL
  useEffect(() => {
    if (searchParams.get("mode") === "reset") {
      setMode("reset");
    }
  }, [searchParams]);

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
    setLoading(false);

    if (error) {
      toast.error("Login fehlgeschlagen", {
        description: error.message === "Invalid login credentials" 
          ? "E-Mail oder Passwort falsch" 
          : error.message,
      });
      return;
    }

    toast.success("Willkommen!", {
      description: "Du bist jetzt eingeloggt.",
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
      setErrors(prev => ({ ...prev, confirmPassword: "Passwörter stimmen nicht überein" }));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Registrierung fehlgeschlagen", {
          description: "Diese E-Mail ist bereits registriert. Bitte logge dich ein.",
        });
      } else {
        toast.error("Registrierung fehlgeschlagen", {
          description: error.message,
        });
      }
      return;
    }

    toast.success("Willkommen!", {
      description: "Dein Account wurde erstellt. Du bist jetzt eingeloggt.",
    });
    
    // New users go to account page (no roles yet)
    navigate("/account");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast.error("Fehler", {
        description: error.message,
      });
      return;
    }

    toast.success("E-Mail gesendet", {
      description: "Falls ein Account existiert, erhältst du einen Link zum Zurücksetzen.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Login | Padel2Go</title>
        <meta name="description" content="Logge dich in deinen Padel2Go Account ein oder registriere dich." />
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
                <img src={logo} alt="Padel2Go" className="h-10" />
              </div>

              {/* Login Form */}
              {mode === "login" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">Willkommen zurück</h1>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-Mail</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="deine@email.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">Passwort</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Einloggen"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center space-y-2">
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Passwort vergessen?
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Noch kein Account?{" "}
                      <button
                        onClick={() => setMode("register")}
                        className="text-primary hover:underline font-medium"
                      >
                        Registrieren
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Register Form */}
              {mode === "register" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">Account erstellen</h1>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-Mail</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="deine@email.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">Passwort</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => validatePassword(password)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrieren"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Bereits registriert?{" "}
                      <button
                        onClick={() => setMode("login")}
                        className="text-primary hover:underline font-medium"
                      >
                        Einloggen
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
                    <ArrowLeft className="w-4 h-4" /> Zurück
                  </button>
                  <h1 className="text-2xl font-bold text-center mb-2">Passwort vergessen?</h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-Mail</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="deine@email.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link senden"}
                    </Button>
                  </form>
                </>
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

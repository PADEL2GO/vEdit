import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { LogOut, Loader2, Zap, Users, Sparkles, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAccountData } from "@/hooks/useAccountData";
import { supabase } from "@/integrations/supabase/client";
import { MyBookings } from "@/components/booking/MyBookings";
import {
  AccountRewardsCard,
  AccountSkillLevel,
  AccountProfileForm,
  AccountInvites,
} from "@/components/account";
import { DUMMY_ANALYTICS_EMAIL } from "@/lib/constants";
import { LevelUpAnimation, MyGamesSection } from "@/components/p2g";
import { getExpertLevel, getProgressToNextLevel, getExpertLevelEmoji } from "@/lib/expertLevels";
import { useLevelUpDetection } from "@/hooks/useLevelUpDetection";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { MatchOptInSettings, MatchSuggestionsList } from "@/components/matching";
import { ComingSoonCard } from "@/components/ComingSoonOverlay";

const Account = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { matching_enabled } = useFeatureToggles();
  
  // Use extracted hook for data fetching
  const { loading, profile, setProfile, wallet, skillStats, analytics } = useAccountData(user);
  
  // Fetch match history for stats tab
  const { matchHistory, isSkillsLoading, summary, isSummaryLoading } = useP2GPoints();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const isDummyAccount = user?.email === DUMMY_ANALYTICS_EMAIL;

  // Get expert level based on play credits (auto-updates via React Query)
  const playCredits = summary?.play_credits ?? wallet?.play_credits ?? 0;
  const expertLevel = getExpertLevel(playCredits);
  const progress = getProgressToNextLevel(playCredits);

  // Level up detection
  const { showLevelUp, newLevel, previousLevel, closeLevelUp } = useLevelUpDetection({
    lifetimeCredits: playCredits,
    enabled: !loading && !!wallet,
  });

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (cleanUsername !== username.toLowerCase()) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", cleanUsername)
      .neq("user_id", user?.id ?? "")
      .maybeSingle();

    setCheckingUsername(false);
    setUsernameAvailable(!data && !error);
  };

  const handleUsernameChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setProfile(prev => ({ ...prev, username: cleanValue }));
    checkUsernameAvailability(cleanValue);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Fehler", { description: "Bitte wähle ein Bild aus." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fehler", { description: "Das Bild darf maximal 5MB groß sein." });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Erfolg", { description: "Profilbild aktualisiert!" });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Fehler", { description: "Konnte Profilbild nicht hochladen." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (profile.username && (profile.username.length < 3 || profile.username.length > 30)) {
      toast.error("Fehler", { description: "Username muss zwischen 3 und 30 Zeichen lang sein." });
      return;
    }

    if (usernameAvailable === false) {
      toast.error("Fehler", { description: "Dieser Username ist bereits vergeben." });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          username: profile.username || null,
          display_name: profile.display_name || null,
          age: profile.age,
          avatar_url: profile.avatar_url,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Gespeichert!", { description: "Dein Profil wurde aktualisiert." });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Fehler", { description: error.message || "Konnte Profil nicht speichern." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mein Konto | Padel2Go</title>
        <meta name="description" content="Verwalte dein Padel2Go Profil, sieh deine Rewards und dein Skill-Level." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background">
        {/* Hero Header with Expert Level Gradient */}
        <div className={`relative pt-24 pb-8 bg-gradient-to-br ${expertLevel.bgGradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 max-w-2xl relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-white">Mein Konto</h1>
                  {/* Expert Level Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${expertLevel.gradient} shadow-lg`}>
                    <span className="text-lg">{getExpertLevelEmoji(expertLevel.name)}</span>
                    <span className="text-sm font-semibold text-white">{expertLevel.name}</span>
                  </div>
                  {/* Play Credits Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                    <Zap className="w-4 h-4 text-yellow-300" />
                    <span className="text-sm font-semibold text-white">
                      {(summary?.play_credits ?? wallet.play_credits).toLocaleString("de-DE")} Play Credits
                    </span>
                  </div>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="text-white/80 hover:text-white hover:bg-white/10">
                  <LogOut className="w-4 h-4 mr-2" /> Ausloggen
                </Button>
              </div>

              {/* Progress to next level */}
              {progress.nextLevelName && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>{playCredits.toLocaleString("de-DE")} Play Credits</span>
                    <span>{progress.remaining.toLocaleString("de-DE")} bis {progress.nextLevelName}</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${expertLevel.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 max-w-2xl py-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-y-1">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="bookings">Buchungen</TabsTrigger>
              <TabsTrigger value="p2g-points" className="text-xs sm:text-sm">P2G Points</TabsTrigger>
              <TabsTrigger value="matching" className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>Matching</span>
              </TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <AccountProfileForm
                profile={profile}
                setProfile={setProfile}
                saving={saving}
                uploadingAvatar={uploadingAvatar}
                checkingUsername={checkingUsername}
                usernameAvailable={usernameAvailable}
                onSave={handleSave}
                onAvatarUpload={handleAvatarUpload}
                onUsernameChange={handleUsernameChange}
              />
              <AccountInvites />

              {/* Account deletion — DSGVO Art. 17 Recht auf Löschung */}
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-destructive">Konto löschen</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Du hast das Recht, die Löschung deiner Daten zu beantragen (Art. 17 DSGVO).
                      Schreib uns eine E-Mail und wir löschen dein Konto innerhalb von 30 Tagen.
                    </p>
                    <a
                      href={`mailto:contact@padel2go.eu?subject=Kontol%C3%B6schung&body=Bitte%20l%C3%B6sche%20mein%20Konto%20mit%20der%20E-Mail-Adresse%3A%20${encodeURIComponent(user?.email ?? "")}`}
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-destructive hover:underline"
                    >
                      Löschung beantragen →
                    </a>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <MyBookings />
            </TabsContent>

            <TabsContent value="p2g-points" className="space-y-6">
              <AccountRewardsCard wallet={wallet} />
            </TabsContent>

            <TabsContent value="matching" className="space-y-6">
              {matching_enabled || isAdmin ? (
                <>
                  <MatchOptInSettings />
                  <MatchSuggestionsList />
                </>
              ) : (
                <ComingSoonCard
                  title="Automatisches Matching"
                  description="Werde automatisch mit Spielern auf deinem Level gematcht. Definiere deine Präferenzen und erhalte passende Vorschläge – bald verfügbar!"
                  icon={Sparkles}
                />
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <AccountSkillLevel 
                skillStats={skillStats} 
                analytics={analytics} 
                isDummyAccount={isDummyAccount}
                wallet={wallet}
              />
              <MyGamesSection 
                matchHistory={matchHistory || []} 
                isLoading={isSkillsLoading} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Level Up Animation */}
      {newLevel && (
        <LevelUpAnimation
          isOpen={showLevelUp}
          onClose={closeLevelUp}
          newLevel={newLevel}
          previousLevel={previousLevel ?? undefined}
        />
      )}
    </>
  );
};

export default Account;
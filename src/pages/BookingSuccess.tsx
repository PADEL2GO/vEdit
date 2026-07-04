import { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, ArrowRight, Loader2, Coins, Gift, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { LobbyActionButton, type BookingForLobby } from "@/components/lobby";

interface EarnedReward {
  points: number;
  title: string;
}

const BookingSuccess = () => {
  const { t } = useTranslation("booking");
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [earnedRewards, setEarnedRewards] = useState<EarnedReward[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [recentBooking, setRecentBooking] = useState<BookingForLobby | null>(null);
  const { user } = useAuth();
  const { canSee } = useFeatureToggles();
  const sessionId = searchParams.get("session_id");
  const isGuest = searchParams.get("guest") === "1" || !user;

  useEffect(() => {
    const fetchEarnedRewards = async () => {
      // Brief loading state to allow webhook processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (user) {
        // Fetch the just-paid booking so we can offer "make it a lobby"
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: latestBookings } = await supabase
          .from("bookings")
          .select(`
            id, location_id, court_id, start_time, end_time, price_cents,
            location:locations(name),
            court:courts(name)
          `)
          .eq("user_id", user.id)
          .eq("status", "confirmed")
          .gte("start_time", new Date().toISOString())
          .gte("updated_at", tenMinutesAgo)
          .order("updated_at", { ascending: false })
          .limit(1);

        const lb = latestBookings?.[0];
        if (lb && lb.location_id && lb.court_id) {
          setRecentBooking({
            id: lb.id,
            location_id: lb.location_id,
            court_id: lb.court_id,
            start_time: lb.start_time,
            end_time: lb.end_time,
            price_cents: lb.price_cents || 0,
            location_name: (lb.location as any)?.name,
            court_name: (lb.court as any)?.name,
          });
        }

        // Fetch rewards earned in the last 5 minutes (recent booking rewards)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentRewards } = await supabase
          .from("reward_instances")
          .select("points, definition_key, created_at")
          .eq("user_id", user.id)
          .eq("status", "CLAIMED")
          .gte("created_at", fiveMinutesAgo)
          .in("source_type", ["booking"])
          .order("created_at", { ascending: false });

        if (recentRewards && recentRewards.length > 0) {
          // Map definition keys to titles via translations
          const rewards = recentRewards.map((r) => {
            const key = `success.rewards.titles.${r.definition_key}`;
            const translated = t(key, { defaultValue: r.definition_key });
            return {
              points: r.points,
              title: translated,
            };
          });

          setEarnedRewards(rewards);
          setTotalEarned(rewards.reduce((sum, r) => sum + r.points, 0));
        }
      }

      setLoading(false);
    };

    fetchEarnedRewards();
  }, [user, t]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("success.processing")}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("meta.success.title")}</title>
        <meta name="description" content={t("meta.success.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto"
          >
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-6"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                  </motion.div>

                  <h1 className="text-2xl font-bold mb-2">{t("success.title")}</h1>
                  <p className="text-muted-foreground mb-6">
                    {t("success.description")}
                  </p>

                  {/* P2G Points Earned Confirmation */}
                  {totalEarned > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mb-6 rounded-lg bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/30 p-4 text-left"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-full bg-emerald-500/20">
                          <Coins className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="font-semibold text-emerald-400">
                          {t("success.rewards.creditedHeading")}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 ml-8 text-sm">
                        {earnedRewards.map((reward, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-muted-foreground">{reward.title}</span>
                            <span className="text-emerald-400 font-medium">+{reward.points}</span>
                          </div>
                        ))}
                        <div className="border-t border-emerald-500/20 pt-2 mt-2 flex justify-between items-center font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Gift className="h-4 w-4 text-emerald-400" />
                            {t("success.rewards.totalLabel")}
                          </span>
                          <span className="text-emerald-400 text-lg">+{totalEarned}{t("success.rewards.totalSuffix")}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Lobby CTA — turn this booking into a lobby (hidden while lobbies feature isn't visible to this user) */}
                  {!isGuest && recentBooking && canSee("lobbies") && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-full bg-primary/20 shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">
                            {t("success.lobby.title")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                            {t("success.lobby.body")}
                          </p>
                          <LobbyActionButton booking={recentBooking} variant="default" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    {!isGuest ? (
                      <Button variant="lime" size="lg" className="w-full" asChild>
                        <NavLink to="/account">
                          <Calendar className="w-4 h-4 mr-2" />
                          {t("success.actions.myBookings")}
                        </NavLink>
                      </Button>
                    ) : (
                      <Button variant="lime" size="lg" className="w-full" asChild>
                        <NavLink to="/auth">
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t("success.actions.createAccount")}
                        </NavLink>
                      </Button>
                    )}

                    {!isGuest && totalEarned > 0 && (
                      <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" asChild>
                        <NavLink to="/dashboard/p2g-points">
                          <Coins className="w-4 h-4 mr-2" />
                          {t("success.actions.myCredits")}
                        </NavLink>
                      </Button>
                    )}

                    {isGuest && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground text-left">
                        <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-primary" />
                          {t("success.guestInfo.title")}
                        </p>
                        <p>{t("success.guestInfo.body")}</p>
                      </div>
                    )}

                    <Button variant="outline" className="w-full" asChild>
                      <NavLink to="/booking">
                        {t("success.actions.anotherBooking")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </NavLink>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingSuccess;

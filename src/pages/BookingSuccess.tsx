import { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, ArrowRight, Loader2, Coins, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EarnedReward {
  points: number;
  title: string;
}

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [earnedRewards, setEarnedRewards] = useState<EarnedReward[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const { user } = useAuth();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const fetchEarnedRewards = async () => {
      // Brief loading state to allow webhook processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (user) {
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
          // Map definition keys to titles
          const titleMap: Record<string, string> = {
            BOOKING_PAID: "Buchungs-Bonus",
            FIRST_BOOKING_BONUS: "Erste Buchung",
            OFFPEAK_BONUS: "Off-Peak Bonus",
            EARLY_BIRD: "Early Bird",
          };

          const rewards = recentRewards.map((r) => ({
            points: r.points,
            title: titleMap[r.definition_key] || r.definition_key,
          }));

          setEarnedRewards(rewards);
          setTotalEarned(rewards.reduce((sum, r) => sum + r.points, 0));
        }
      }

      setLoading(false);
    };

    fetchEarnedRewards();
  }, [user]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Zahlung wird verarbeitet...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Zahlung erfolgreich | PADEL2GO</title>
        <meta name="description" content="Deine Padel-Court Buchung wurde erfolgreich bezahlt." />
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

                  <h1 className="text-2xl font-bold mb-2">Zahlung erfolgreich!</h1>
                  <p className="text-muted-foreground mb-6">
                    Deine Buchung wurde bestätigt. Du erhältst eine Bestätigungsmail an deine E-Mail-Adresse.
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
                          Credits gutgeschrieben!
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
                            Gesamt
                          </span>
                          <span className="text-emerald-400 text-lg">+{totalEarned} Credits</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <Button variant="lime" size="lg" className="w-full" asChild>
                      <NavLink to="/account">
                        <Calendar className="w-4 h-4 mr-2" />
                        Meine Buchungen ansehen
                      </NavLink>
                    </Button>

                    {totalEarned > 0 && (
                      <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" asChild>
                        <NavLink to="/dashboard/p2g-points">
                          <Coins className="w-4 h-4 mr-2" />
                          Meine P2G Credits ansehen
                        </NavLink>
                      </Button>
                    )}

                    <Button variant="outline" className="w-full" asChild>
                      <NavLink to="/booking">
                        Weitere Buchung vornehmen
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

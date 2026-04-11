import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Calendar, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStreakData } from "@/hooks/useP2GPoints";

interface StreakProgressCardProps {
  streak: WeeklyStreakData | null;
  isLoading?: boolean;
}

export function StreakProgressCard({ streak, isLoading }: StreakProgressCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const bestStreak = streak?.best_streak || 0;
  const nextMilestone = streak?.next_milestone || 3;
  const progress = streak?.progress_to_next || 0;
  const qualifiedThisWeek = streak?.qualified_this_week || false;

  // Calculate days until end of week (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const isStreakAtRisk = currentStreak > 0 && !qualifiedThisWeek && daysUntilSunday <= 2;

  return (
    <Card className={`bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/30 relative overflow-hidden ${
      currentStreak >= 7 ? "ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20" : ""
    }`}>
      {/* Glow effect for high streaks */}
      <AnimatePresence>
        {currentStreak >= 7 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-amber-400/10 to-orange-500/5"
            style={{
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </AnimatePresence>

      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`p-1.5 rounded-lg bg-orange-500/20 ${currentStreak > 0 ? "relative" : ""}`}>
            {/* Animated flame for active streaks */}
            {currentStreak > 0 ? (
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [-3, 3, -3],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Flame className="h-4 w-4 text-orange-400" />
              </motion.div>
            ) : (
              <Flame className="h-4 w-4 text-orange-400/50" />
            )}
          </div>
          Buchungs-Streak
          {currentStreak >= 5 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full"
            >
              🔥 On Fire!
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {/* Current Streak */}
        <div className="flex items-center justify-between">
          <div>
            <motion.div
              key={currentStreak}
              initial={{ scale: 1.3, color: "hsl(24, 100%, 60%)" }}
              animate={{ scale: 1, color: "hsl(24, 95%, 53%)" }}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-3xl font-bold text-orange-400"
            >
              {currentStreak}
            </motion.div>
            <p className="text-sm text-muted-foreground">Wochen in Folge</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-400">
              <Trophy className="h-4 w-4" />
              <span className="text-lg font-semibold">{bestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Dein Rekord</p>
          </div>
        </div>

        {/* Progress to next milestone */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Nächster Bonus bei {nextMilestone} Wochen
            </span>
            <span className="text-orange-400 font-medium">
              {currentStreak}/{nextMilestone}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-orange-900/30" />
        </div>

        {/* This week status */}
        <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
          qualifiedThisWeek 
            ? "bg-green-500/10 text-green-400" 
            : isStreakAtRisk
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "bg-muted/30 text-muted-foreground"
        }`}>
          {qualifiedThisWeek ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <Check className="h-4 w-4" />
              </motion.div>
              <span>Diese Woche abgehakt!</span>
            </>
          ) : isStreakAtRisk ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <AlertTriangle className="h-4 w-4" />
              </motion.div>
              <span>
                Nur noch {daysUntilSunday} {daysUntilSunday === 1 ? "Tag" : "Tage"} – buche jetzt!
              </span>
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              <span>Buche diese Woche, um deinen Streak zu halten</span>
            </>
          )}
        </div>

        {/* Milestone hints with improved styling */}
        {currentStreak >= 1 && currentStreak < 3 && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            🎯 Noch {3 - currentStreak} Woche(n) bis zum 3-Wochen-Bonus 
            <span className="text-emerald-400 font-medium">(+30 Credits)</span>
          </motion.p>
        )}
        {currentStreak >= 3 && currentStreak < 5 && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            🎯 Noch {5 - currentStreak} Woche(n) bis zum 5-Wochen-Bonus 
            <span className="text-emerald-400 font-medium">(+50 Credits)</span>
          </motion.p>
        )}
        {currentStreak >= 5 && currentStreak < 10 && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            🔥 Noch {10 - currentStreak} Woche(n) bis zum 10-Wochen-Bonus 
            <span className="text-emerald-400 font-medium">(+100 Credits)</span>
          </motion.p>
        )}
        {currentStreak >= 10 && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-orange-400 font-medium"
          >
            🏆 Unglaublich! Du hast den Höchstbonus erreicht!
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}

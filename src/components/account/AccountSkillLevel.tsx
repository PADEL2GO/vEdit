import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Target, ChevronDown, BarChart3, Swords, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import type { SkillStats, AnalyticsState, Wallet } from "./types";
import { getExpertLevel, getProgressToNextLevel, getExpertLevelEmoji } from "@/lib/expertLevels";
import { useP2GPoints, WLStats } from "@/hooks/useP2GPoints";

interface AccountSkillLevelProps {
  skillStats: SkillStats;
  analytics: AnalyticsState;
  isDummyAccount: boolean;
  wallet: Wallet;
}

export function AccountSkillLevel({ skillStats, analytics, isDummyAccount, wallet }: AccountSkillLevelProps) {
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const { wlStats, summary } = useP2GPoints();

  // Use React Query data for auto-updating play credits - this drives expert level
  const playCredits = summary?.play_credits ?? wallet.play_credits ?? 0;
  const expertLevel = getExpertLevel(playCredits);
  const progress = getProgressToNextLevel(playCredits);
  const levelEmoji = getExpertLevelEmoji(expertLevel.name);

  useEffect(() => {
    if (playCredits > 0) {
      const duration = 2000;
      const steps = 60;
      const increment = playCredits / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= playCredits) {
          setAnimatedPoints(playCredits);
          clearInterval(timer);
        } else {
          setAnimatedPoints(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [playCredits]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-6 overflow-hidden"
    >
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" /> Expert Level
      </h2>

      {/* Animated Expert Level Badge */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className={`bg-gradient-to-br ${expertLevel.gradient} rounded-2xl p-6 text-center relative overflow-hidden`}
        >
          {/* Animated background effect */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.2) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(255,255,255,0.2) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.2) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <div className="relative z-10">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-5xl mb-2"
            >
              {levelEmoji}
            </motion.div>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="text-2xl font-bold text-white mb-1"
            >
              {expertLevel.name}
            </motion.p>
            
            {/* Play Credits - prominent display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-2 mt-2"
            >
              <Zap className="w-6 h-6 text-yellow-300" />
              <span className="text-4xl font-black text-white">
                {playCredits.toLocaleString('de-DE')}
              </span>
            </motion.div>
            <p className="text-white/80 text-sm font-medium">Play Credits</p>
            
          </div>
        </motion.div>

        {/* Progress to next level */}
        {progress.nextLevelName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Nächstes Level: <span className="text-foreground font-medium">{progress.nextLevelName}</span></span>
              <span className="text-primary font-medium">{progress.remaining.toLocaleString('de-DE')} Points</span>
            </div>
            <div className="relative">
              <Progress value={progress.percentage} className="h-3" />
              <motion.div
                className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* AI Rank Info + W/L Stats */}
        <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
          {skillStats.ai_rank && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span className="text-sm">Global Rank: <span className="text-primary font-bold">#{skillStats.ai_rank}</span></span>
            </div>
          )}
          {wlStats?.has_data && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Swords className="w-4 h-4" />
              <span className="text-sm">
                W/L: <span className="text-green-500 font-bold">{wlStats.wins}</span>
                <span className="mx-1">/</span>
                <span className="text-red-500 font-bold">{wlStats.losses}</span>
                {wlStats.win_rate !== null && (
                  <span className="ml-1 text-muted-foreground">({wlStats.win_rate}%)</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Accordion - Only show if has AI data OR is dummy account */}
      {(analytics.hasAiData || isDummyAccount) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-6"
        >
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 rounded-xl p-4 border border-primary/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Mehr Info</p>
                <p className="text-xs text-muted-foreground">Detaillierte AI-Spielanalyse</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: analyticsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-primary" />
            </motion.div>
          </button>

          <AnimatePresence>
            {analyticsOpen && analytics.data && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <AnalyticsSection data={analytics.data} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

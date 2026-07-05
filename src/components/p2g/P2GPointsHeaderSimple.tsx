import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Trophy, Zap, Target, Sparkles, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/p2g/AnimatedCounter";
import { NavLink } from "@/components/NavLink";
import { ExpertLevelInfoPopover } from "./ExpertLevelInfoPopover";
import type { P2GSummary } from "@/hooks/useP2GPoints";
import { useExpertLevels, levelForPoints, nextLevelForPoints, progressToNext } from "@/hooks/useExpertLevels";
import { EXPERT_LEVELS, getExpertLevelEmoji } from "@/lib/expertLevels";

interface P2GPointsHeaderSimpleProps {
  summary: P2GSummary | undefined;
  isLoading: boolean;
}

/**
 * Simplified P2G Points Header — Expert Level (from the admin-configurable DB levels),
 * current payback multiplier, play-credits counter and progress to the next level.
 * The level is based on lifetime credits (total ever earned).
 */
export function P2GPointsHeaderSimple({ summary, isLoading }: P2GPointsHeaderSimpleProps) {
  const { t } = useTranslation("p2g");
  const { levels } = useExpertLevels();

  const playCredits = summary?.play_credits ?? 0;
  // Level & multiplier follow the total earned (lifetime) points, from the DB config.
  const levelPoints = summary?.lifetime_credits || summary?.play_credits || 0;
  const dbLevel = levelForPoints(levels, levelPoints);
  const nextLevel = nextLevelForPoints(levels, levelPoints);
  const progressPct = progressToNext(levels, levelPoints);
  const multiplier = Number(dbLevel.multiplier ?? 1);

  // Cosmetic fields (borderColor/bgGradient/textColor) fall back to the lib match by name.
  const libLevel = EXPERT_LEVELS.find((l) => l.name === dbLevel.name) ?? EXPERT_LEVELS[0];
  const gradient = dbLevel.gradient ?? libLevel.gradient;
  const borderColor = libLevel.borderColor;
  const bgGradient = libLevel.bgGradient;
  const textColor = libLevel.textColor;
  const levelEmoji = dbLevel.emoji ?? getExpertLevelEmoji(dbLevel.name);
  const remaining = nextLevel ? Math.max(0, nextLevel.min_points - levelPoints) : 0;

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            {t("p2gPointsHeaderSimple.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("p2gPointsHeaderSimple.subtitle")}</p>
        </div>
        
        {/* CTAs */}
        <div className="flex items-center gap-2">
          <ExpertLevelInfoPopover currentPlayCredits={levelPoints} />
          <Button variant="lime" size="sm" asChild className="gap-2">
            <NavLink to="/marketplace">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">{t("p2gPointsHeaderSimple.redeem")}</span>
            </NavLink>
          </Button>
        </div>
      </div>

      {/* Main Play Credits Card */}
      {!isLoading && summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className={`overflow-hidden border ${borderColor} relative`}>
            {/* Tier-based gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`} />
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
            
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Expert Level Badge */}
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block">{t("p2gPointsHeaderSimple.expertLevel")}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-3xl">{levelEmoji}</span>
                      <span className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                        {dbLevel.name}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/25 text-primary">
                      <Zap className="h-3 w-3" />×{multiplier} Payback pro Buchung
                    </span>
                  </div>
                </div>

                {/* Play Credits Counter */}
                <div className="flex items-center justify-start md:justify-end">
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-green-500" />
                      <div>
                        <span className="text-sm text-muted-foreground block">{t("p2gPointsHeaderSimple.playCredits")}</span>
                        <span className="text-3xl font-bold text-green-500">
                          <AnimatedCounter value={playCredits} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar to Next Level */}
              <div className="mt-6 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                <div className="space-y-3">
                  <Progress
                    value={progressPct}
                    className="h-3 bg-muted/50"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("p2gPointsHeaderSimple.pointsProgress", { current: levelPoints.toLocaleString(), target: (nextLevel ? nextLevel.min_points : dbLevel.min_points).toLocaleString() })}
                    </span>
                    {nextLevel ? (
                      <span className={`font-medium flex items-center gap-1 ${textColor}`}>
                        <Target className="h-3.5 w-3.5" />
                        {t("p2gPointsHeaderSimple.remaining", { count: remaining.toLocaleString(), level: nextLevel.name })}
                      </span>
                    ) : (
                      <span className="font-medium text-yellow-400 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("p2gPointsHeaderSimple.maxLevel")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading && (
        <Card className="border-0 bg-muted/20">
          <CardContent className="p-6">
            <div className="h-32 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

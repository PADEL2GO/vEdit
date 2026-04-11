import { motion } from "framer-motion";
import { Trophy, Zap, Target, Sparkles, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { NavLink } from "@/components/NavLink";
import { ExpertLevelInfoPopover } from "./ExpertLevelInfoPopover";
import type { P2GSummary } from "@/hooks/useP2GPoints";
import { getExpertLevel, getProgressToNextLevel, getExpertLevelEmoji } from "@/lib/expertLevels";

interface P2GPointsHeaderSimpleProps {
  summary: P2GSummary | undefined;
  isLoading: boolean;
}

/**
 * Simplified P2G Points Header - Focus on Play Credits only
 * Expert Level + Progress Bar + Simple CTAs
 */
export function P2GPointsHeaderSimple({ summary, isLoading }: P2GPointsHeaderSimpleProps) {
  // Play Credits are the primary metric for Expert Level
  const playCredits = summary?.play_credits ?? 0;
  
  // Expert Level based on Play Credits
  const expertLevel = getExpertLevel(playCredits);
  const progress = getProgressToNextLevel(playCredits);
  const levelEmoji = getExpertLevelEmoji(expertLevel.name);

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            P2G Points
          </h1>
          <p className="text-muted-foreground mt-1">Deine zentrale Punktebörse</p>
        </div>
        
        {/* CTAs */}
        <div className="flex items-center gap-2">
          <ExpertLevelInfoPopover currentPlayCredits={playCredits} />
          <Button variant="lime" size="sm" asChild className="gap-2">
            <NavLink to="/dashboard/marketplace?affordable=true">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Einlösen</span>
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
          <Card className={`overflow-hidden border ${expertLevel.borderColor} relative`}>
            {/* Tier-based gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${expertLevel.bgGradient}`} />
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${expertLevel.gradient} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
            
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Expert Level Badge */}
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${expertLevel.gradient} shadow-lg`}>
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block">Expert Level</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-3xl">{levelEmoji}</span>
                      <span className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${expertLevel.gradient} bg-clip-text text-transparent`}>
                        {expertLevel.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Play Credits Counter */}
                <div className="flex items-center justify-start md:justify-end">
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-green-500" />
                      <div>
                        <span className="text-sm text-muted-foreground block">Play Credits</span>
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
                    value={progress.percentage} 
                    className="h-3 bg-muted/50"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {playCredits.toLocaleString()} / {progress.target.toLocaleString()} Points
                    </span>
                    {progress.nextLevelName ? (
                      <span className={`font-medium flex items-center gap-1 ${expertLevel.textColor}`}>
                        <Target className="h-3.5 w-3.5" />
                        Noch {progress.remaining.toLocaleString()} bis {progress.nextLevelName}
                      </span>
                    ) : (
                      <span className="font-medium text-yellow-400 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        Max Level erreicht!
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

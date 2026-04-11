import { motion } from "framer-motion";
import { Gift, Zap, TrendingUp, ShoppingBag, HelpCircle, Trophy, Flame, Sparkles, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { RewardCatalogDrawer } from "./RewardCatalogDrawer";
import { NavLink } from "@/components/NavLink";
import type { P2GSummary } from "@/hooks/useP2GPoints";
import { useState } from "react";
import { getExpertLevel, getProgressToNextLevel, getExpertLevelEmoji } from "@/lib/expertLevels";

interface P2GPointsHeaderProps {
  summary: P2GSummary | undefined;
  isLoading: boolean;
}

export function P2GPointsHeader({ summary, isLoading }: P2GPointsHeaderProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  
  // Use play_credits for Expert Level tier (Beginner to Padel Legend)
  const playCredits = summary?.play_credits ?? 0;
  const bookingCredits = summary?.booking_credits ?? 0;
  const redeemableBalance = summary?.redeemable_balance ?? (playCredits + bookingCredits);
  
  // Skill Level is the 0-10 multiplier from match analyses
  const skillLevel = summary?.skill_level ?? 0;
  const lastGameCredits = summary?.last_game_credits ?? null;
  
  // Expert Level based on Play Credits
  const expertLevel = getExpertLevel(playCredits);
  const progress = getProgressToNextLevel(playCredits);
  const levelEmoji = getExpertLevelEmoji(expertLevel.name);

  return (
    <div className="space-y-4">
      {/* Title Row with CTAs */}
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
        
        {/* CTA Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCatalogOpen(true)}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Wie bekomme ich Punkte?</span>
            <span className="sm:hidden">Info</span>
          </Button>
          <Button variant="lime" size="sm" asChild className="gap-2">
            <NavLink to="/dashboard/marketplace?affordable=true">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Einlösen</span>
            </NavLink>
          </Button>
        </div>
      </div>

      {/* Main Stats Card - Tier-colored background */}
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
            <div className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br ${expertLevel.gradient} opacity-5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2`} />
            
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Expert Level Badge + Progress - LEFT SIDE (Larger) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-7 space-y-4"
                >
                  {/* Large Expert Level Badge */}
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${expertLevel.gradient} shadow-lg`}>
                      <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">Expert Level</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl">{levelEmoji}</span>
                        <span className={`text-3xl font-bold bg-gradient-to-r ${expertLevel.gradient} bg-clip-text text-transparent`}>
                          {expertLevel.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Play Credits Progress Bar */}
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">Play Credits</span>
                      </div>
                      <span className="text-2xl font-bold text-green-500">
                        <AnimatedCounter value={playCredits} />
                      </span>
                    </div>
                    
                    {/* Progress Bar to Next Level */}
                    <div className="space-y-2">
                      <Progress 
                        value={progress.percentage} 
                        className={`h-4 bg-muted/50`}
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {playCredits.toLocaleString()} / {progress.target.toLocaleString()}
                        </span>
                        {progress.nextLevelName && (
                          <span className={`font-medium flex items-center gap-1 ${expertLevel.textColor}`}>
                            <Target className="h-3.5 w-3.5" />
                            Noch {progress.remaining.toLocaleString()} bis {progress.nextLevelName}
                          </span>
                        )}
                        {!progress.nextLevelName && (
                          <span className="font-medium text-yellow-400 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Max Level erreicht!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Skill Level + Credits Breakdown - RIGHT SIDE */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-5 space-y-4"
                >
                  {/* Skill Level (Multiplier) */}
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Skill Level (Multiplikator)</span>
                      <Badge variant="outline" className="bg-primary/10 font-bold text-lg px-3">
                        {skillLevel.toFixed(1)}x
                      </Badge>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold">{skillLevel.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xl mb-1">/ 10</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ø der letzten 5 Spiele
                    </p>
                  </div>

                  {/* Credits Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Booking Credits */}
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">Booking</span>
                      </div>
                      <span className="text-xl font-bold text-primary">
                        <AnimatedCounter value={bookingCredits} />
                      </span>
                    </div>
                    
                    {/* Last Game */}
                    {lastGameCredits && lastGameCredits > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-medium">Letztes Match</span>
                        </div>
                        <span className="text-xl font-bold text-amber-500">
                          +{lastGameCredits}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Redeemable Balance */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-primary/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Einlösbar im Marketplace</span>
                      </div>
                      <span className="text-xl font-bold text-green-500">
                        <AnimatedCounter value={redeemableBalance} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Formula Explanation - Compact */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 pt-4 border-t border-border/30"
              >
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Formel:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">Match-Score</Badge>
                  <span className="text-muted-foreground">×</span>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Skill-Level ({skillLevel.toFixed(1)})</Badge>
                  <span className="text-muted-foreground">=</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">Play-Credits</Badge>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading && (
        <Card className="border-0 bg-muted/20">
          <CardContent className="p-6">
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catalog Drawer */}
      <RewardCatalogDrawer open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  );
}

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Zap, 
  Calendar, 
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { 
  getExpertLevel, 
  getProgressToNextLevel, 
  getExpertLevelEmoji 
} from "@/lib/expertLevels";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { ExpertLevelInfoPopover } from "./ExpertLevelInfoPopover";
import { CreditBreakdown } from "@/hooks/useP2GPoints";

interface MarketplaceCreditsHeaderProps {
  playCredits: number;
  rewardCredits: number;
  creditBreakdown?: CreditBreakdown;
  isLoading?: boolean;
}

export function MarketplaceCreditsHeader({ 
  playCredits, 
  rewardCredits,
  creditBreakdown,
  isLoading = false 
}: MarketplaceCreditsHeaderProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCredits = playCredits + rewardCredits;
  const expertLevel = getExpertLevel(playCredits);
  const progress = getProgressToNextLevel(playCredits);
  const levelEmoji = getExpertLevelEmoji(expertLevel.name);

  // Credit breakdown values - only Play Credits and Booking Credits
  const breakdownItems = [
    {
      label: "Play Credits",
      value: creditBreakdown?.play_credits_total ?? playCredits,
      icon: Zap,
      color: "text-green-500",
    },
    {
      label: "Booking Credits",
      value: creditBreakdown?.booking_credits_total ?? 0,
      icon: Calendar,
      color: "text-blue-500",
    },
  ];

  return (
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Expert Level + Total Balance - LEFT */}
            <div className="lg:col-span-5 space-y-4">
              {/* Expert Level Badge */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${expertLevel.gradient} shadow-lg`}>
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Expert Level</span>
                    <ExpertLevelInfoPopover currentPlayCredits={playCredits} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl">{levelEmoji}</span>
                    <span className={`text-2xl font-bold bg-gradient-to-r ${expertLevel.gradient} bg-clip-text text-transparent`}>
                      {expertLevel.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Points Display */}
              <div className="flex items-center gap-2 -mt-1">
                <span className="text-sm font-medium text-foreground">
                  {playCredits.toLocaleString()} / {progress.target.toLocaleString()} Play Points
                </span>
              </div>

              {/* Progress to Next Level */}
              <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  {progress.nextLevelName && (
                    <span className="text-muted-foreground">
                      → {progress.nextLevelName}
                    </span>
                  )}
                </div>
                <Progress value={progress.percentage} className="h-2" />
              </div>
            </div>

            {/* Total Balance + Breakdown - RIGHT */}
            <div className="lg:col-span-7 space-y-4">
              {/* Total Available Credits */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <ShoppingBag className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block">Verfügbar zum Einlösen</span>
                    <span className="text-3xl font-bold text-green-500">
                      <AnimatedCounter value={totalCredits} />
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Credits
                </Badge>
              </div>

              {/* Credits Breakdown Grid - 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                {breakdownItems.map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30 text-center"
                  >
                    <item.icon className={`h-5 w-5 ${item.color} mx-auto mb-1`} />
                    <span className="text-xl font-bold block">{item.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground block">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, Gift, Sparkles, Clock, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { useRewards } from "@/hooks/useRewards";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { RewardCard } from "./RewardCard";

export function RewardsPanel() {
  const { claimable, pending, rewardHistory, isRewardsLoading, rewards } = useP2GPoints();
  const { claimReward, isClaiming } = useRewards();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (rewardId: string) => {
    setClaimingId(rewardId);
    try {
      await claimReward(rewardId);
      toast.success("Reward erfolgreich eingelöst!");
    } catch (error) {
      toast.error("Fehler beim Einlösen des Rewards");
    } finally {
      setClaimingId(null);
    }
  };

  if (isRewardsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Reward-Credits</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold text-primary">
                  <AnimatedCounter value={rewards?.reward_balance || 0} />
                </span>
                <Gift className="h-6 w-6 text-primary/60" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {claimable.length > 0 && (
                <div className="flex items-center gap-1.5 bg-primary/20 px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">{claimable.length} einlösbar</span>
                </div>
              )}
              {pending.length > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/20 px-2.5 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-400">{pending.length} gesperrt</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claimable Rewards */}
      {claimable.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Bereit zum Einlösen
          </h3>
          <AnimatePresence mode="popLayout">
            {claimable.map((reward) => (
              <RewardCard 
                key={reward.id} 
                reward={reward} 
                onClaim={handleClaim}
                isClaiming={claimingId === reward.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pending Rewards */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            Ausstehend / Gesperrt
          </h3>
          <AnimatePresence>
            {pending.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* History */}
      {rewardHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Verlauf
          </h3>
          <AnimatePresence>
            {rewardHistory.slice(0, 10).map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {claimable.length === 0 && pending.length === 0 && rewardHistory.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">Noch keine Rewards verdient</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buche Courts und nimm an Events teil!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

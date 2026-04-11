import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Loader2, Flame } from "lucide-react";
import { useP2GPoints, DailyClaimStatus } from "@/hooks/useP2GPoints";
import { toast } from "sonner";

interface DailyClaimButtonProps {
  dailyClaimStatus?: DailyClaimStatus;
  isLoading?: boolean;
}

export function DailyClaimButton({ dailyClaimStatus, isLoading = false }: DailyClaimButtonProps) {
  const { claimDaily, isClaimingDaily } = useP2GPoints();

  const handleClaim = async () => {
    try {
      const result = await claimDaily();
      toast.success(`+${result.credits_awarded || 5} Credits erhalten!`, {
        description: "Daily Login Bonus gutgeschrieben",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Fehler beim Abholen";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 animate-pulse">
        <div className="h-12 bg-muted rounded-lg" />
      </div>
    );
  }

  const alreadyClaimed = dailyClaimStatus?.claimed_today ?? false;
  const streak = dailyClaimStatus?.current_streak ?? 0;
  const creditsAvailable = dailyClaimStatus?.credits_available ?? 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${alreadyClaimed ? "bg-green-500/20" : "bg-primary/20"}`}>
            {alreadyClaimed ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Calendar className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {alreadyClaimed ? "Heute bereits abgeholt" : "Daily Login Bonus"}
            </p>
            {streak > 1 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {streak} Tage Streak
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleClaim}
          disabled={alreadyClaimed || isClaimingDaily}
          variant={alreadyClaimed ? "secondary" : "lime"}
          size="sm"
        >
          {isClaimingDaily ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : alreadyClaimed ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Abgeholt
            </>
          ) : (
            `+${creditsAvailable} abholen`
          )}
        </Button>
      </div>
    </motion.div>
  );
}

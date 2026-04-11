import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, X, Sparkles, Loader2 } from "lucide-react";

export function DailyLoginNotification() {
  const { dailyClaimStatus, isDailyClaimStatusLoading, claimDaily, isClaimingDaily } = useP2GPoints();
  const [dismissed, setDismissed] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // Show notification after a short delay if not claimed today
  useEffect(() => {
    if (!isDailyClaimStatusLoading && dailyClaimStatus && !dailyClaimStatus.claimed_today && !dismissed) {
      const timer = setTimeout(() => {
        setShowNotification(true);
      }, 1000); // 1 second delay for smooth entrance
      return () => clearTimeout(timer);
    }
  }, [dailyClaimStatus, isDailyClaimStatusLoading, dismissed]);

  const handleClaim = async () => {
    try {
      await claimDaily();
      setShowNotification(false);
    } catch (error) {
      console.error("Failed to claim daily:", error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowNotification(false);
  };

  // Don't render anything if already claimed or dismissed
  if (isDailyClaimStatusLoading || !dailyClaimStatus || dailyClaimStatus.claimed_today || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm"
        >
          <Card className="bg-gradient-to-br from-primary/20 via-background to-primary/10 border-primary/30 shadow-2xl shadow-primary/20 overflow-hidden">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 animate-pulse" />
            
            <CardContent className="p-4 relative">
              {/* Close button */}
              <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-4">
                {/* Gift Icon with animation */}
                <motion.div 
                  className="p-3 rounded-xl bg-primary/20 border border-primary/30"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Gift className="h-8 w-8 text-primary" />
                </motion.div>

                <div className="flex-1">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Daily Bonus
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Hole dir deine täglichen Credits ab!
                  </p>
                </div>
              </div>

              <Button
                onClick={handleClaim}
                disabled={isClaimingDaily}
                variant="lime"
                className="w-full mt-4"
              >
                {isClaimingDaily ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird abgeholt...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Jetzt abholen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

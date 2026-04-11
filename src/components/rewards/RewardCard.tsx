import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Sparkles,
  Calendar,
  Trophy,
  Users,
  Star,
  Coins
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { RewardInstance } from "@/types/rewards";

interface RewardCardProps {
  reward: RewardInstance;
  onClaim?: (id: string) => void;
  isClaiming?: boolean;
  variant: "claimable" | "pending" | "history";
}

const categoryIcons: Record<string, typeof Gift> = {
  booking_revenue: Coins,
  referral_growth: Users,
  engagement_quality: Star,
  loyalty_retention: Trophy,
};

const statusConfig = {
  PENDING: { color: "bg-yellow-500/10 text-yellow-600", icon: Clock, label: "Ausstehend" },
  AVAILABLE: { color: "bg-green-500/10 text-green-600", icon: Gift, label: "Verfügbar" },
  CLAIMED: { color: "bg-primary/10 text-primary", icon: CheckCircle2, label: "Eingelöst" },
  REVERSED: { color: "bg-destructive/10 text-destructive", icon: XCircle, label: "Storniert" },
  EXPIRED: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Abgelaufen" },
};

export function RewardCard({ reward, onClaim, isClaiming, variant }: RewardCardProps) {
  const status = statusConfig[reward.status];
  const category = reward.reward_definitions?.category || "engagement_quality";
  const CategoryIcon = categoryIcons[category] || Gift;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "dd. MMM yyyy, HH:mm", { locale: de });
  };

  const getAvailableText = () => {
    if (reward.status === "PENDING" && reward.available_at) {
      const availableDate = new Date(reward.available_at);
      if (availableDate > new Date()) {
        return `Verfügbar ${formatDistanceToNow(availableDate, { addSuffix: true, locale: de })}`;
      }
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <Card className={`
        bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden
        ${variant === "claimable" ? "border-primary/30 shadow-lg shadow-primary/5" : ""}
        ${variant === "history" && reward.status === "REVERSED" ? "opacity-60" : ""}
      `}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center shrink-0
              ${variant === "claimable" ? "bg-primary/10" : "bg-secondary"}
            `}>
              <CategoryIcon className={`w-6 h-6 ${variant === "claimable" ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm truncate">
                    {reward.reward_definitions?.title || reward.definition_key}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {reward.reward_definitions?.description}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${status.color}`}>
                  <status.icon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              {/* Points & Action */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className={`
                    text-lg font-bold
                    ${reward.status === "REVERSED" ? "text-destructive line-through" : "text-primary"}
                  `}>
                    +{reward.points}
                  </span>
                  <span className="text-xs text-muted-foreground">Punkte</span>
                </div>

                {variant === "claimable" && onClaim && (
                  <Button 
                    size="sm" 
                    variant="lime"
                    onClick={() => onClaim(reward.id)}
                    disabled={isClaiming}
                    className="gap-1"
                  >
                    {isClaiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Einlösen
                      </>
                    )}
                  </Button>
                )}

                {variant === "pending" && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {getAvailableText() || "Wird freigeschaltet"}
                  </span>
                )}

                {variant === "history" && reward.claimed_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(reward.claimed_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

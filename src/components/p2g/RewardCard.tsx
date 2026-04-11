import { motion } from "framer-motion";
import { 
  Loader2, 
  Gift, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  AlertCircle,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { RewardInstance } from "@/types/rewards";

interface RewardCardProps {
  reward: RewardInstance;
  onClaim?: (id: string) => void;
  isClaiming?: boolean;
}

export function RewardCard({ reward, onClaim, isClaiming }: RewardCardProps) {
  const status = reward.status as string;
  const isClaimable = status === "AVAILABLE";
  const isPending = status === "PENDING";
  const isPendingApproval = status === "PENDING_APPROVAL";
  const isClaimed = status === "CLAIMED";
  const isReversed = status === "REVERSED";

  const getStatusConfig = () => {
    switch (status) {
      case "AVAILABLE":
        return {
          badge: <Badge className="bg-primary/20 text-primary border-primary/30">Jetzt einlösen</Badge>,
          icon: <Gift className="h-5 w-5 text-primary" />,
          bgClass: "bg-primary/20",
        };
      case "PENDING":
        return {
          badge: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Gesperrt</Badge>,
          icon: <Clock className="h-5 w-5 text-yellow-400" />,
          bgClass: "bg-yellow-500/20",
        };
      case "PENDING_APPROVAL":
        return {
          badge: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">In Prüfung</Badge>,
          icon: <AlertCircle className="h-5 w-5 text-orange-400" />,
          bgClass: "bg-orange-500/20",
        };
      case "CLAIMED":
        return {
          badge: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Gutgeschrieben</Badge>,
          icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
          bgClass: "bg-green-500/20",
        };
      case "REVERSED":
        return {
          badge: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Storniert</Badge>,
          icon: <XCircle className="h-5 w-5 text-red-400" />,
          bgClass: "bg-red-500/20",
        };
      case "EXPIRED":
        return {
          badge: <Badge className="bg-muted text-muted-foreground">Abgelaufen</Badge>,
          icon: <Clock className="h-5 w-5 text-muted-foreground" />,
          bgClass: "bg-muted",
        };
      default:
        return {
          badge: null,
          icon: <Gift className="h-5 w-5 text-muted-foreground" />,
          bgClass: "bg-muted",
        };
    }
  };

  const { badge, icon, bgClass } = getStatusConfig();

  // Check if this was auto-claimed (claimed_at is very close to created_at)
  const wasAutoClaimed = isClaimed && reward.claimed_at && reward.created_at && 
    (new Date(reward.claimed_at).getTime() - new Date(reward.created_at).getTime() < 5000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className={`border transition-all duration-200 ${
        isClaimable 
          ? "border-primary/50 bg-primary/5 hover:border-primary/70 hover:bg-primary/10" 
          : "border-border/50 hover:border-border"
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`p-2.5 rounded-xl shrink-0 ${bgClass}`}>
                {icon}
              </div>
              <div className="space-y-1.5 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {reward.reward_definitions?.title || reward.definition_key}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {reward.reward_definitions?.description || reward.source_type}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {badge}
                  {wasAutoClaimed && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/30">
                      <Zap className="h-2.5 w-2.5 mr-0.5" />
                      Auto
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(reward.created_at), "dd.MM.yyyy", { locale: de })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`font-bold text-lg ${
                isClaimable ? "text-primary" : isClaimed ? "text-green-400" : "text-foreground"
              }`}>
                +{reward.points}
              </span>
              {isClaimable && onClaim && (
                <Button 
                  size="sm" 
                  onClick={() => onClaim(reward.id)}
                  disabled={isClaiming}
                  className="gap-1 h-8"
                >
                  {isClaiming ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      Einlösen
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

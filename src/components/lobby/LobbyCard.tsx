import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPrice } from "@/lib/pricing";
import type { Lobby } from "@/types/lobby";

interface LobbyCardProps {
  lobby: Lobby;
  index?: number;
}

export function LobbyCard({ lobby, index = 0 }: LobbyCardProps) {
  const navigate = useNavigate();
  const membersCount = lobby.members_count || 0;
  const progressPercent = (membersCount / lobby.capacity) * 100;
  const spotsLeft = lobby.capacity - membersCount;

  const statusBadge = {
    open: { label: "Offen", variant: "default" as const },
    full: { label: "Voll", variant: "secondary" as const },
    cancelled: { label: "Abgesagt", variant: "destructive" as const },
    expired: { label: "Abgelaufen", variant: "outline" as const },
    completed: { label: "Abgeschlossen", variant: "outline" as const },
  };

  const { label, variant } = statusBadge[lobby.status] || statusBadge.open;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover:border-primary/50 transition-all duration-200 group">
        {/* Header with gradient background */}
        <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-4">
          <Badge 
            variant={variant}
            className="absolute top-3 right-3"
          >
            {label}
          </Badge>
          
          <div className="absolute bottom-3 left-4">
            <p className="font-semibold text-foreground">
              {lobby.locations?.name || "Location"}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {lobby.courts?.name || "Court"}
            </p>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {format(new Date(lobby.start_time), "dd.MM. 'um' HH:mm 'Uhr'", { locale: de })}
            </span>
          </div>

          {/* Participants Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Teilnehmer</span>
              <span className="font-medium">
                {membersCount}/{lobby.capacity}
                {spotsLeft > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({spotsLeft} frei)
                  </span>
                )}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Skill Range */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">
              Skill {lobby.skill_min}–{lobby.skill_max}
              {lobby.avg_skill && (
                <span className="text-muted-foreground ml-1">
                  (Ø {lobby.avg_skill})
                </span>
              )}
            </span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground">Pro Spieler</span>
              <p className="font-bold text-lg text-primary">
                {formatPrice(lobby.price_per_player_cents, lobby.currency)}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate(`/lobbies/${lobby.id}`)}
              disabled={lobby.status !== "open"}
            >
              <Users className="w-4 h-4 mr-1" />
              Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

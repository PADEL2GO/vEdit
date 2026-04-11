import { motion } from "framer-motion";
import { MapPin, Clock, Check, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchSuggestion } from "@/hooks/useMatchSuggestions";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface MatchSuggestionCardProps {
  suggestion: MatchSuggestion;
  onAccept: () => void;
  onDecline: () => void;
  isResponding: boolean;
}

export function MatchSuggestionCard({
  suggestion,
  onAccept,
  onDecline,
  isResponding,
}: MatchSuggestionCardProps) {
  const navigate = useNavigate();
  const expiresIn = formatDistanceToNow(new Date(suggestion.expires_at), { 
    locale: de, 
    addSuffix: true 
  });

  const handleViewProfile = () => {
    if (suggestion.matched_user?.username) {
      navigate(`/u/${suggestion.matched_user.username}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar 
              className="w-14 h-14 border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={handleViewProfile}
            >
              <AvatarImage src={suggestion.matched_user?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {suggestion.matched_user?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 
                  className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={handleViewProfile}
                >
                  {suggestion.matched_user?.display_name || "Unbekannt"}
                </h3>
                {suggestion.matched_user?.username && (
                  <span className="text-sm text-muted-foreground">
                    @{suggestion.matched_user.username}
                  </span>
                )}
              </div>

              {/* Location */}
              {suggestion.location && (
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{suggestion.location.name}</span>
                  {suggestion.location.city && (
                    <span className="text-muted-foreground/70">• {suggestion.location.city}</span>
                  )}
                </div>
              )}

              {/* Match Reason */}
              {suggestion.match_reason && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {suggestion.match_reason}
                </Badge>
              )}

              {/* Expiry */}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Läuft ab {expiresIn}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={onAccept}
                disabled={isResponding}
                className="gap-1"
              >
                {isResponding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Annehmen
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDecline}
                disabled={isResponding}
                className="gap-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
                Ablehnen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

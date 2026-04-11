import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMatchSuggestions } from "@/hooks/useMatchSuggestions";
import { MatchSuggestionCard } from "./MatchSuggestionCard";

export function MatchSuggestionsList() {
  const { suggestions, isLoading, respond, isResponding } = useMatchSuggestions();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleRespond = (suggestionId: string, response: "accepted" | "declined") => {
    setRespondingId(suggestionId);
    respond(
      { suggestionId, response },
      { onSettled: () => setRespondingId(null) }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Match-Vorschläge</CardTitle>
            <CardDescription>
              {suggestions.length > 0
                ? `${suggestions.length} passende Spieler gefunden`
                : "Keine neuen Vorschläge diese Woche"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Aktiviere Matchmaking in deinen Einstellungen, um passende Spielpartner zu finden.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion) => (
              <MatchSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => handleRespond(suggestion.id, "accepted")}
                onDecline={() => handleRespond(suggestion.id, "declined")}
                isResponding={isResponding && respondingId === suggestion.id}
              />
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}

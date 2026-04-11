import { motion } from "framer-motion";
import { Activity, TrendingUp, Calendar, Zap, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function SkillLast5Section() {
  const { skillLast5, isSkillLast5Loading } = useP2GPoints();

  if (isSkillLast5Loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Letzte 5 Matches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!skillLast5 || skillLast5.matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Letzte 5 Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Matches analysiert</p>
            <p className="text-sm mt-1">Spiele werden automatisch nach Abschluss analysiert</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Letzte 5 Matches
          </CardTitle>
          {/* Average Skill Level Badge */}
          <Badge variant="outline" className="bg-primary/10 border-primary/30 gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Ø {(skillLast5.average_skill_level ?? 0).toFixed(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Dein Skill-Level ist der Durchschnitt deiner letzten 5 Matches
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {skillLast5.matches.map((match, index) => (
          <motion.div
            key={match.match_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
          >
            {/* Match Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              #{skillLast5.matches.length - index}
            </div>

            {/* Match Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">Match Score</span>
                <Badge variant="secondary" className="text-xs">
                  {match.match_score.toFixed(1)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <Calendar className="h-3 w-3" />
                {format(new Date(match.date), "dd. MMM yyyy, HH:mm", { locale: de })}
              </div>
            </div>

            {/* Skill Level */}
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{match.skill_level.toFixed(1)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Skill</div>
            </div>

            {/* Play Credits Earned */}
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-green-500">
                <Zap className="h-4 w-4" />
                <span className="font-semibold">+{match.play_credits}</span>
              </div>
              <div className="text-xs text-muted-foreground">Credits</div>
            </div>
          </motion.div>
        ))}

        {/* Skill Level Explanation */}
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Skill-Level Berechnung</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dein aktuelles Skill-Level ({(skillLast5.average_skill_level ?? 0).toFixed(1)}) ist der Durchschnitt 
                deiner letzten {skillLast5.matches?.length ?? 0} Matches. Es dient als Multiplikator für deine Play Credits.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

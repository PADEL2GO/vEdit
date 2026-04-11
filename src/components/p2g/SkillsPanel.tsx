import { motion } from "framer-motion";
import { Loader2, Zap, TrendingUp, Target, Trophy, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useP2GPoints, type MatchAnalysis } from "@/hooks/useP2GPoints";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { format } from "date-fns";
import { de } from "date-fns/locale";

function MatchCard({ match }: { match: MatchAnalysis }) {
  const score = match.manual_score ?? match.ai_score ?? 0;
  const isCompleted = match.status === "COMPLETED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border/50 hover:border-green-500/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isCompleted ? "bg-green-500/20" : "bg-muted"}`}>
                <Target className={`h-5 w-5 ${isCompleted ? "text-green-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h4 className="font-medium text-sm">Match #{match.match_id.slice(0, 8)}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Score: {score}</span>
                  <span className="text-border">•</span>
                  <span>Level: {match.skill_level_snapshot}</span>
                  {match.analyzed_at && (
                    <>
                      <span className="text-border">•</span>
                      <span>{format(new Date(match.analyzed_at), "dd.MM.yy", { locale: de })}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-lg ${isCompleted ? "text-green-400" : "text-muted-foreground"}`}>
                +{match.credits_awarded}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                v{match.formula_version}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SkillsPanel() {
  const { skillBalance, lastGame, matchHistory, skillConfig, isSkillsLoading } = useP2GPoints();

  if (isSkillsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-green-500/20 via-green-500/10 to-green-500/5 border-green-500/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Skill-Credits</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold text-green-400">
                  <AnimatedCounter value={skillBalance} />
                </span>
                <Zap className="h-6 w-6 text-green-400/60" />
              </div>
            </div>
            {skillConfig && (
              <Badge variant="outline" className="bg-background/50 border-green-500/30">
                Formel v{skillConfig.formula_version}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Game Highlight */}
      {lastGame && (
        <Card className="border-green-500/30 bg-green-500/5 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Letztes Spiel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-background/30 rounded-xl">
                <p className="text-2xl font-bold text-green-400">
                  {lastGame.manual_score ?? lastGame.ai_score ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Score</p>
              </div>
              <div className="p-3 bg-background/30 rounded-xl">
                <p className="text-2xl font-bold">{lastGame.skill_level}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Skill-Level</p>
              </div>
              <div className="p-3 bg-background/30 rounded-xl">
                <p className="text-2xl font-bold text-primary">+{lastGame.delta}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Credits</p>
              </div>
            </div>
            {lastGame.analyzed_at && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {format(new Date(lastGame.analyzed_at), "dd. MMMM yyyy, HH:mm", { locale: de })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formula Info */}
      {skillConfig && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Formel:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                    score × skill × {skillConfig.base_multiplier}
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max pro Match:</span>
                  <span className="font-medium">{skillConfig.max_credits_per_match} Credits</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rundung:</span>
                  <span className="text-xs text-muted-foreground">{skillConfig.rounding_policy}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History */}
      {matchHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Match-Verlauf
          </h3>
          {matchHistory.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!lastGame && matchHistory.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">Noch keine Skill-Credits</p>
            <p className="text-sm text-muted-foreground mt-1">
              Spiele Matches und verbessere dein Skill-Level!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

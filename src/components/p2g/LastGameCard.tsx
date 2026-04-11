import { motion } from "framer-motion";
import { Zap, Target, TrendingUp, Clock, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { NavLink } from "@/components/NavLink";

interface LastGameData {
  match_id: string;
  match_score: number;
  skill_level: number;
  play_points_delta: number;
  analyzed_at: string;
  status: string;
}

interface LastGameCardProps {
  lastGame: LastGameData | null | undefined;
  skillLevel?: number;
  isLoading?: boolean;
}

export function LastGameCard({ lastGame, isLoading }: LastGameCardProps) {
  if (isLoading) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-6">
          <div className="h-20 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no game analyzed yet
  if (!lastGame) {
    return (
      <Card className="border-dashed border-green-500/30 bg-green-500/5">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Play className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="font-semibold mb-2">Noch kein Spiel analysiert</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Spiele dein erstes Match und verdiene Play-Credits durch KI-Analyse!
          </p>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <NavLink to="/dashboard/booking">
              <Target className="h-4 w-4" />
              Court buchen
            </NavLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const score = lastGame.match_score;
  const isCompleted = lastGame.status === "COMPLETED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Letztes Spiel
            </div>
            {lastGame.analyzed_at && (
              <span className="text-xs text-muted-foreground font-normal">
                {format(new Date(lastGame.analyzed_at), "dd.MM.yyyy", { locale: de })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Match Score */}
            <div className="p-4 bg-background/40 rounded-xl">
              <Target className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl md:text-3xl font-bold text-green-400">{score}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Match Score</p>
            </div>
            
            {/* Skill Level (read-only from existing system) */}
            <div className="p-4 bg-background/40 rounded-xl">
              <Zap className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl md:text-3xl font-bold">{lastGame.skill_level}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Skill-Level</p>
            </div>
            
            {/* Play Points Delta */}
            <div className="p-4 bg-background/40 rounded-xl relative">
              {isCompleted && (
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-xs px-1.5 py-0">
                  ✓
                </Badge>
              )}
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl md:text-3xl font-bold text-primary">+{lastGame.play_points_delta}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Play-Credits</p>
            </div>
          </div>
          
          {/* Formula hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Formel: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Score × Skill-Level = Play-Credits</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

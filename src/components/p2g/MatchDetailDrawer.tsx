import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Gamepad2,
  Trophy,
  X,
  Users,
  Swords,
  Target,
  TrendingUp,
  Footprints,
  Activity,
  Timer,
  MapPin,
  BarChart3,
  Crosshair,
  Zap,
} from "lucide-react";
import { CourtHeatmap } from "@/components/analytics/CourtHeatmap";
import { RadarCoverage } from "@/components/analytics/RadarCoverage";
import { MatchAnalysis } from "@/hooks/useP2GPoints";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MatchAnalysisMetadata {
  total_distance_meters?: number;
  zone_time?: { net: number; mid: number; baseline: number };
  coverage_vertical_percent?: number;
  coverage_horizontal_percent?: number;
  heatmap_zones?: Array<{ label: string; percentage: number }>;
  total_shots?: number;
  avg_rally_duration_seconds?: number;
  longest_rally_shots?: number;
  serve_accuracy_percent?: number;
  serve_speed_avg_kmh?: number;
  stroke_distribution?: {
    forehand: number;
    backhand: number;
    volley: number;
    lob: number;
  };
  partner_user_id?: string;
  opponent_1_user_id?: string;
  opponent_2_user_id?: string;
}

interface MatchDetailDrawerProps {
  match: MatchAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlayerInfo {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function MatchDetailDrawer({ match, open, onOpenChange }: MatchDetailDrawerProps) {
  const metadata = match?.metadata as MatchAnalysisMetadata | undefined;
  
  // Collect all player IDs we need to fetch
  const playerIds = [
    match?.user_id,
    match?.opponent_user_id,
    metadata?.partner_user_id,
    metadata?.opponent_1_user_id,
    metadata?.opponent_2_user_id,
  ].filter(Boolean) as string[];

  // Fetch player profiles
  const { data: players } = useQuery({
    queryKey: ["match-players", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", playerIds);
      return (data || []) as PlayerInfo[];
    },
    enabled: open && playerIds.length > 0,
  });

  const getPlayer = (userId: string | null | undefined): PlayerInfo | undefined => {
    if (!userId || !players) return undefined;
    return players.find(p => p.user_id === userId);
  };

  if (!match) return null;

  const score = match.manual_score ?? match.ai_score ?? 0;
  const hasAIData = metadata && (
    metadata.total_distance_meters !== undefined ||
    metadata.heatmap_zones !== undefined ||
    metadata.stroke_distribution !== undefined
  );

  const mainPlayer = getPlayer(match.user_id);
  const partner = getPlayer(metadata?.partner_user_id);
  const opponent1 = getPlayer(metadata?.opponent_1_user_id || match.opponent_user_id);
  const opponent2 = getPlayer(metadata?.opponent_2_user_id);

  const PlayerAvatar = ({ player, label }: { player?: PlayerInfo; label: string }) => (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar className="w-12 h-12 border-2 border-primary/20">
        <AvatarImage src={player?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {player?.display_name?.charAt(0) || player?.username?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium truncate max-w-[80px]">
        {player?.display_name || player?.username || "Unbekannt"}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                match.result === "W" 
                  ? "bg-green-500/20" 
                  : match.result === "L" 
                    ? "bg-red-500/20" 
                    : "bg-primary/20"
              )}>
                {match.result === "W" ? (
                  <Trophy className="w-6 h-6 text-green-500" />
                ) : match.result === "L" ? (
                  <X className="w-6 h-6 text-red-500" />
                ) : (
                  <Gamepad2 className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <span className="text-lg">Match #{match.match_id.slice(0, 8)}</span>
                <p className="text-sm text-muted-foreground font-normal">
                  {match.analyzed_at 
                    ? format(new Date(match.analyzed_at), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })
                    : format(new Date(match.created_at), "dd. MMMM yyyy", { locale: de })}
                </p>
              </div>
            </div>
            <Badge className={cn(
              "text-lg px-4 py-1",
              match.result === "W" 
                ? "bg-green-500/20 text-green-500 border-green-500/30" 
                : match.result === "L"
                  ? "bg-red-500/20 text-red-500 border-red-500/30"
                  : "bg-primary/20 text-primary border-primary/30"
            )}>
              {match.result === "W" ? "Sieg" : match.result === "L" ? "Niederlage" : "—"}
            </Badge>
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6 space-y-6">
          {/* Players Section */}
          <div className="bg-secondary/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Spieler</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              {/* Team 1 */}
              <div className="flex items-center gap-3 bg-green-500/10 rounded-xl p-3 flex-1 justify-center">
                <PlayerAvatar player={mainPlayer} label="Du" />
                {partner && (
                  <>
                    <span className="text-muted-foreground text-lg">+</span>
                    <PlayerAvatar player={partner} label="Partner" />
                  </>
                )}
              </div>

              {/* VS */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Swords className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex items-center gap-3 bg-red-500/10 rounded-xl p-3 flex-1 justify-center">
                {opponent1 ? (
                  <PlayerAvatar player={opponent1} label="Gegner 1" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">?</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Unbekannt</span>
                  </div>
                )}
                {opponent2 && (
                  <>
                    <span className="text-muted-foreground text-lg">+</span>
                    <PlayerAvatar player={opponent2} label="Gegner 2" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Points & Score */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-500/10 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-500">+{match.credits_awarded}</p>
              <p className="text-xs text-muted-foreground">Points verdient</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{score}</p>
              <p className="text-xs text-muted-foreground">Match Score</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-500">{match.skill_level_snapshot}</p>
              <p className="text-xs text-muted-foreground">Skill Level</p>
            </div>
          </div>

          <Separator />

          {/* Performance Stats */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Performance
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Footprints className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <p className="text-lg font-bold text-blue-400">
                  {metadata?.total_distance_meters 
                    ? `${(metadata.total_distance_meters / 1000).toFixed(2)}km`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Laufstrecke</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Activity className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                <p className="text-lg font-bold text-orange-400">
                  {metadata?.total_shots ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Schläge</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Timer className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <p className="text-lg font-bold text-purple-400">
                  {metadata?.avg_rally_duration_seconds 
                    ? `${metadata.avg_rally_duration_seconds.toFixed(1)}s`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Ø Rallye</p>
              </div>
            </div>
          </div>

          {/* AI Visualizations */}
          {hasAIData && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {metadata?.heatmap_zones && metadata.heatmap_zones.length > 0 && (
                  <CourtHeatmap 
                    zones={metadata.heatmap_zones} 
                    title="Positionierung auf dem Court" 
                  />
                )}
                {(metadata?.coverage_vertical_percent !== undefined || 
                  metadata?.coverage_horizontal_percent !== undefined) && (
                  <RadarCoverage 
                    vertical={metadata?.coverage_vertical_percent || 0} 
                    horizontal={metadata?.coverage_horizontal_percent || 0} 
                  />
                )}
              </div>

              {/* Zone Time */}
              {metadata?.zone_time && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Zeit pro Zone
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-blue-500/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-blue-400">{metadata.zone_time.net}%</p>
                      <p className="text-xs text-muted-foreground">Netz</p>
                    </div>
                    <div className="flex-1 bg-yellow-500/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-yellow-400">{metadata.zone_time.mid}%</p>
                      <p className="text-xs text-muted-foreground">Mitte</p>
                    </div>
                    <div className="flex-1 bg-green-500/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-400">{metadata.zone_time.baseline}%</p>
                      <p className="text-xs text-muted-foreground">Baseline</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stroke Distribution */}
              {metadata?.stroke_distribution && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Schlagverteilung
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: "forehand", label: "Vorhand", color: "from-primary to-primary/60" },
                      { key: "backhand", label: "Rückhand", color: "from-blue-500 to-blue-500/60" },
                      { key: "volley", label: "Volley", color: "from-orange-500 to-orange-500/60" },
                      { key: "lob", label: "Lob", color: "from-purple-500 to-purple-500/60" },
                    ].map(({ key, label, color }, idx) => (
                      <div key={key} className="text-center">
                        <div className="h-16 bg-secondary/50 rounded-lg flex items-end justify-center overflow-hidden">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${metadata.stroke_distribution![key as keyof typeof metadata.stroke_distribution]}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={cn("w-full rounded-t-lg bg-gradient-to-t", color)}
                          />
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {metadata.stroke_distribution![key as keyof typeof metadata.stroke_distribution]}%
                        </p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Serve Stats */}
              {(metadata?.serve_accuracy_percent !== undefined || metadata?.serve_speed_avg_kmh !== undefined) && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    Aufschlag-Statistiken
                  </p>
                  <div className="flex gap-4">
                    {metadata?.serve_accuracy_percent !== undefined && (
                      <div className="flex-1 bg-green-500/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">
                          {metadata.serve_accuracy_percent}%
                        </p>
                        <p className="text-xs text-muted-foreground">Genauigkeit</p>
                      </div>
                    )}
                    {metadata?.serve_speed_avg_kmh !== undefined && (
                      <div className="flex-1 bg-blue-500/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">
                          {metadata.serve_speed_avg_kmh} km/h
                        </p>
                        <p className="text-xs text-muted-foreground">Ø Geschwindigkeit</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* No AI Data */}
          {!hasAIData && (
            <div className="text-center py-6 text-muted-foreground bg-secondary/20 rounded-xl">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine detaillierte KI-Analyse verfügbar</p>
              <p className="text-xs mt-1">
                Spiele an Standorten mit KI-Kamera für erweiterte Statistiken.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

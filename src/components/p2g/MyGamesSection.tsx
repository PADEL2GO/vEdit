import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Gamepad2, 
  Target, 
  TrendingUp, 
  Filter,
  X,
  CalendarIcon,
  RotateCcw,
  Trophy,
  Frown,
  ChevronRight,
  Activity,
} from "lucide-react";
import { MatchAnalysis } from "@/hooks/useP2GPoints";
import { MatchDetailDrawer } from "./MatchDetailDrawer";
import { cn } from "@/lib/utils";

interface MyGamesSectionProps {
  matchHistory: MatchAnalysis[];
  isLoading?: boolean;
}

export function MyGamesSection({ matchHistory, isLoading }: MyGamesSectionProps) {
  const [selectedMatch, setSelectedMatch] = useState<MatchAnalysis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [matchIdSearch, setMatchIdSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "W" | "L">("all");

  // Filter logic
  const filteredMatches = useMemo(() => {
    if (!matchHistory) return [];
    
    return matchHistory.filter(match => {
      const matchDate = new Date(match.analyzed_at || match.created_at);
      const score = match.manual_score ?? match.ai_score ?? 0;
      
      // Date filter
      if (dateFrom) {
        const fromStart = new Date(dateFrom);
        fromStart.setHours(0, 0, 0, 0);
        if (matchDate < fromStart) return false;
      }
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (matchDate > toEnd) return false;
      }
      
      // Score filter
      if (minScore && score < Number(minScore)) return false;
      if (maxScore && score > Number(maxScore)) return false;
      
      // Result filter
      if (resultFilter !== "all" && match.result !== resultFilter) return false;
      
      // Match ID search
      if (matchIdSearch && !match.match_id.toLowerCase().includes(matchIdSearch.toLowerCase())) return false;
      
      return true;
    });
  }, [matchHistory, dateFrom, dateTo, minScore, maxScore, resultFilter, matchIdSearch]);

  const hasActiveFilters = dateFrom || dateTo || minScore || maxScore || matchIdSearch || resultFilter !== "all";
  
  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinScore("");
    setMaxScore("");
    setMatchIdSearch("");
    setResultFilter("all");
  };

  const handleMatchClick = (match: MatchAnalysis) => {
    setSelectedMatch(match);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-muted/40 via-background to-primary/5 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Meine Spiele
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matchHistory || matchHistory.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-muted/40 via-background to-primary/5 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Meine Spiele
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Noch keine Spiele analysiert. Nach deinem ersten Match erscheinen hier deine Spielstatistiken.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-muted/40 via-background to-primary/5 border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="w-5 h-5 text-primary" />
              Meine Spiele
              <Badge variant="secondary" className="ml-2">
                {hasActiveFilters ? `${filteredMatches.length}/${matchHistory.length}` : matchHistory.length} Matches
              </Badge>
            </CardTitle>
            <Button
              variant={filtersOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                "gap-1.5",
                hasActiveFilters && "border-primary/50 text-primary"
              )}
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter Section */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary/30 rounded-xl p-4 mb-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter-Einstellungen
                  </p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-xs h-7">
                      <RotateCcw className="w-3 h-3" />
                      Zurücksetzen
                    </Button>
                  )}
                </div>

                {/* Date Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Von Datum</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Auswählen"}
                          {dateFrom && (
                            <X 
                              className="ml-auto h-3 w-3 hover:text-destructive" 
                              onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                            />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Bis Datum</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd.MM.yyyy") : "Auswählen"}
                          {dateTo && (
                            <X 
                              className="ml-auto h-3 w-3 hover:text-destructive" 
                              onClick={(e) => { e.stopPropagation(); setDateTo(undefined); }}
                            />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Score Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Min Score</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Max Score</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="100"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Result Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Ergebnis</label>
                  <div className="flex gap-2">
                    <Button
                      variant={resultFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultFilter("all")}
                      className="flex-1 h-9"
                    >
                      Alle
                    </Button>
                    <Button
                      variant={resultFilter === "W" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultFilter("W")}
                      className={cn(
                        "flex-1 h-9 gap-1",
                        resultFilter === "W" && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      <Trophy className="w-3 h-3" />
                      Sieg
                    </Button>
                    <Button
                      variant={resultFilter === "L" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setResultFilter("L")}
                      className={cn(
                        "flex-1 h-9 gap-1",
                        resultFilter === "L" && "bg-red-500 hover:bg-red-600"
                      )}
                    >
                      <Frown className="w-3 h-3" />
                      Niederlage
                    </Button>
                  </div>
                </div>

                {/* Match ID Search */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Match-ID suchen</label>
                  <Input
                    type="text"
                    placeholder="Match-ID eingeben..."
                    value={matchIdSearch}
                    onChange={(e) => setMatchIdSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>

          {/* No results message */}
          {filteredMatches.length === 0 && hasActiveFilters && (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Matches gefunden</p>
              <p className="text-xs mt-1">Versuche andere Filter-Einstellungen.</p>
              <Button variant="link" size="sm" onClick={resetFilters} className="mt-2">
                Filter zurücksetzen
              </Button>
            </div>
          )}

          {/* Match List */}
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const score = match.manual_score ?? match.ai_score ?? 0;
              const metadata = match.metadata as Record<string, unknown> | undefined;
              const hasAIData = metadata && (
                metadata.total_distance_meters !== undefined ||
                metadata.heatmap_zones !== undefined ||
                metadata.stroke_distribution !== undefined
              );

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleMatchClick(match)}
                  className={cn(
                    "border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md",
                    match.result === "W" 
                      ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15" 
                      : match.result === "L" 
                        ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15" 
                        : "bg-background/60 border-border/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        match.result === "W" 
                          ? "bg-green-500/20" 
                          : match.result === "L" 
                            ? "bg-red-500/20" 
                            : "bg-gradient-to-br from-primary/20 to-green-500/20"
                      )}>
                        {match.result === "W" ? (
                          <Trophy className="w-5 h-5 text-green-500" />
                        ) : match.result === "L" ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <Gamepad2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            Match #{match.match_id.slice(0, 8)}
                          </span>
                          {hasAIData && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                              KI
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {match.analyzed_at 
                            ? format(new Date(match.analyzed_at), "dd. MMM yyyy, HH:mm", { locale: de })
                            : format(new Date(match.created_at), "dd. MMM yyyy", { locale: de })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          Skill {match.skill_level_snapshot}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" />
                          Score {score}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30 font-mono">
                          +{match.credits_awarded}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">Points</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Match Detail Drawer */}
      <MatchDetailDrawer
        match={selectedMatch}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}

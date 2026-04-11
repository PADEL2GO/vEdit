import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Zap, Gift, ShoppingBag, RefreshCw, Users,
  TrendingUp, TrendingDown, Loader2, Sparkles, Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { FeedEntry, FeedResponse } from "@/hooks/useP2GPoints";
import type { UseQueryResult } from "@tanstack/react-query";

type FeedFilter = "all" | "booking" | "play" | "redemption";

interface ActivityFeedProps {
  useFeed: (filter?: FeedFilter, limit?: number) => UseQueryResult<FeedResponse, Error>;
}

// Map icon names to components
const iconMap: Record<string, typeof Gift> = {
  gift: Gift,
  zap: Zap,
  calendar: Calendar,
  "shopping-bag": ShoppingBag,
  users: Users,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Gift;
}

function getIconColors(entry: FeedEntry) {
  if (entry.credit_type === "SKILL") {
    return { 
      iconColor: "text-emerald-400", 
      bgColor: "bg-gradient-to-br from-emerald-500/20 to-green-600/10",
      glowColor: "group-hover:shadow-emerald-500/20"
    };
  }
  if (entry.entry_type === "REDEMPTION") {
    return { 
      iconColor: "text-orange-400", 
      bgColor: "bg-gradient-to-br from-orange-500/20 to-amber-600/10",
      glowColor: "group-hover:shadow-orange-500/20"
    };
  }
  return { 
    iconColor: "text-primary", 
    bgColor: "bg-gradient-to-br from-primary/20 to-primary/5",
    glowColor: "group-hover:shadow-primary/20"
  };
}

const filterOptions: { value: FeedFilter; label: string; color: string }[] = [
  { value: "all", label: "Alle", color: "bg-muted" },
  { value: "booking", label: "Booking", color: "bg-blue-500/20 text-blue-400" },
  { value: "play", label: "Play", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "redemption", label: "Einlösung", color: "bg-orange-500/20 text-orange-400" },
];

export function ActivityFeed({ useFeed }: ActivityFeedProps) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [showAll, setShowAll] = useState(false);
  
  const { data, isLoading, refetch } = useFeed(filter, 50);
  
  const entries = data?.entries || [];
  const displayEntries = showAll ? entries : entries.slice(0, 8);

  if (isLoading) {
    return (
      <Card className="border-0 bg-gradient-to-br from-muted/50 via-background to-muted/30">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Lade deine Credit-Historie...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-muted/40 via-background to-primary/5 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              Deine Credit-Historie
            </CardTitle>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()} 
              className="gap-2 hover:bg-primary/10"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Aktualisieren</span>
            </Button>
          </div>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === option.value
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Keine Aktivitäten gefunden</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Spiele Padel um Credits zu verdienen!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Grid Layout for Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {displayEntries.map((entry, index) => {
                  const IconComponent = getIconComponent(entry.icon);
                  const { iconColor, bgColor, glowColor } = getIconColors(entry);
                  const isPositive = entry.delta > 0;
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg ${glowColor}`}
                    >
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${bgColor} shrink-0 transition-transform group-hover:scale-110`}>
                        <IconComponent className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm line-clamp-1">{entry.description}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0.5 shrink-0 ${
                              entry.credit_type === "SKILL" 
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" 
                                : entry.entry_type === "REDEMPTION"
                                  ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                                  : "border-primary/30 text-primary bg-primary/10"
                            }`}
                          >
                            {entry.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                        </p>
                      </div>
                      
                      {/* Delta */}
                      <div className={`flex items-center gap-1.5 font-bold text-base shrink-0 ${
                        isPositive ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {isPositive ? "+" : ""}{entry.delta}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {/* Show more button */}
            {entries.length > 8 && (
              <div className="pt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2 hover:bg-primary/10 hover:border-primary/30"
                >
                  {showAll ? "Weniger anzeigen" : `${entries.length - 8} weitere anzeigen`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

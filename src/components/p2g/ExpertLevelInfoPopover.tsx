import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Trophy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { getExpertLevel, getExpertLevelEmoji, EXPERT_LEVELS } from "@/lib/expertLevels";

interface ExpertLevelInfoPopoverProps {
  currentPlayCredits: number;
}

// Gradient backgrounds for each level card
const CARD_GRADIENTS = [
  "from-zinc-600 via-zinc-500 to-zinc-400",        // Beginner
  "from-amber-600 via-orange-500 to-yellow-400",    // Rookie
  "from-sky-600 via-blue-500 to-cyan-400",          // Player
  "from-emerald-600 via-green-500 to-lime-400",     // Expert
  "from-orange-600 via-red-500 to-rose-400",        // Pro
  "from-violet-600 via-purple-500 to-fuchsia-400",  // Master
  "from-cyan-500 via-blue-500 to-violet-500",       // Champion
  "from-yellow-500 via-lime-400 to-emerald-400",    // Padel Legend
];

// Badge background colors
const BADGE_COLORS = [
  "bg-zinc-700",
  "bg-amber-600",
  "bg-sky-600",
  "bg-emerald-600",
  "bg-orange-600",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-yellow-600",
];

// Points pill background colors
const PILL_BG_COLORS = [
  "bg-zinc-800/80",
  "bg-amber-900/80",
  "bg-sky-900/80",
  "bg-emerald-900/80",
  "bg-orange-900/80",
  "bg-violet-900/80",
  "bg-cyan-900/80",
  "bg-yellow-900/80",
];

const formatPoints = (points: number): string => {
  return points.toLocaleString("de-DE");
};

export function ExpertLevelInfoPopover({ currentPlayCredits }: ExpertLevelInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const { expertLevels, isExpertLevelsLoading } = useP2GPoints();
  const currentLevel = getExpertLevel(currentPlayCredits);
  
  // Use DB levels if available, fallback to hardcoded
  const levels = expertLevels?.length ? expertLevels : EXPERT_LEVELS.map((l, i) => ({
    id: i + 1,
    name: l.name,
    min_points: l.minPoints,
    max_points: l.maxPoints === Infinity ? null : l.maxPoints,
    sort_order: i + 1,
    gradient: l.gradient,
    emoji: getExpertLevelEmoji(l.name),
    description: null,
    created_at: null,
    updated_at: null,
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Level-Info</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[340px] sm:w-[420px] md:w-[560px] p-0 overflow-hidden" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Expert Levels</h3>
              <p className="text-sm text-muted-foreground">8 Stufen von Beginner bis Legend</p>
            </div>
          </div>
        </div>

        {/* Grid of Level Cards */}
        <div className="p-3 max-h-[400px] overflow-y-auto">
          {isExpertLevelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {levels.map((level, index) => {
                const isCurrentLevel = level.name === currentLevel.name;
                
                return (
                  <motion.div
                    key={level.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`relative overflow-hidden rounded-xl p-3 aspect-[4/3] flex flex-col justify-between
                      ${isCurrentLevel ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-60"}`}
                  >
                    {/* Glow Effect for Current Level */}
                    {isCurrentLevel && (
                      <>
                        <motion.div
                          className="absolute -inset-1 rounded-xl bg-primary/40 blur-lg"
                          animate={{ 
                            opacity: [0.4, 0.7, 0.4],
                            scale: [1, 1.02, 1]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <motion.div
                          className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary/50 to-primary/20"
                          animate={{ 
                            opacity: [0.5, 0.8, 0.5]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </>
                    )}
                    
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[index]} rounded-xl`} />
                    
                    {/* Diagonal Stripe Effect */}
                    <div className="absolute inset-0 opacity-20 rounded-xl overflow-hidden">
                      <div className="absolute w-[200%] h-6 bg-white/30 -rotate-12 -translate-y-2 translate-x-[-30%]" />
                    </div>
                    
                    {/* Tier Number Badge */}
                    <div className="relative z-10">
                      <motion.div 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${BADGE_COLORS[index]} 
                          flex items-center justify-center text-sm font-bold text-white shadow-md`}
                        animate={isCurrentLevel ? { 
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(163, 230, 53, 0)",
                            "0 0 15px 3px rgba(163, 230, 53, 0.4)",
                            "0 0 0 0 rgba(163, 230, 53, 0)"
                          ]
                        } : {}}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        {index + 1}
                      </motion.div>
                    </div>
                    
                    {/* Level Name & Points */}
                    <div className="relative z-10 mt-auto">
                      <h3 className="text-white font-bold text-xs sm:text-sm leading-tight drop-shadow-md">
                        {level.name}
                      </h3>
                      <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white/90 ${PILL_BG_COLORS[index]}`}>
                        {formatPoints(level.min_points)}+
                      </div>
                    </div>
                    
                    {/* Current Level Badge */}
                    {isCurrentLevel && (
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-md"
                      >
                        DEIN
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/30 border-t border-border/50 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Sammle Play Points durch Matches um aufzusteigen
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

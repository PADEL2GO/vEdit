import { motion } from "framer-motion";
import { EXPERT_LEVELS, getExpertLevel } from "@/lib/expertLevels";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ExpertLevelsGridProps {
  currentPoints?: number;
}

// Card gradient backgrounds matching the reference design
const CARD_GRADIENTS = [
  "from-zinc-600 via-zinc-500 to-zinc-700", // Beginner - Gray
  "from-orange-500 via-amber-500 to-orange-600", // Rookie - Orange
  "from-cyan-500 via-blue-400 to-cyan-600", // Player - Cyan/Blue
  "from-green-500 via-lime-400 to-green-600", // Expert - Green
  "from-red-500 via-orange-500 to-red-600", // Pro - Red/Orange
  "from-pink-500 via-purple-500 to-pink-600", // Master - Purple/Pink
  "from-violet-500 via-blue-500 to-violet-600", // Champion - Blue/Purple
  "from-lime-400 via-yellow-400 to-lime-500", // Padel Legend - Yellow/Lime
];

// Badge number colors
const BADGE_COLORS = [
  "bg-zinc-500", // Beginner
  "bg-orange-500", // Rookie
  "bg-cyan-400", // Player
  "bg-lime-400", // Expert
  "bg-red-500", // Pro
  "bg-pink-500", // Master
  "bg-yellow-400", // Champion
  "bg-yellow-300", // Padel Legend
];

// Pill/Points badge colors
const PILL_BG_COLORS = [
  "bg-zinc-300/90", // Beginner
  "bg-amber-200/90", // Rookie
  "bg-cyan-200/90", // Player
  "bg-lime-200/90", // Expert
  "bg-orange-200/90", // Pro
  "bg-pink-300/90", // Master
  "bg-blue-200/90", // Champion
  "bg-lime-300/90", // Padel Legend
];

function formatPoints(points: number): string {
  return points.toLocaleString("de-DE");
}

export function ExpertLevelsGrid({ currentPoints = 0 }: ExpertLevelsGridProps) {
  const currentLevel = getExpertLevel(currentPoints);
  
  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Level-Info
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72" side="top">
              <div className="space-y-2">
                <h4 className="font-semibold">Wie steige ich auf?</h4>
                <p className="text-sm text-muted-foreground">
                  Sammle Play Points durch Buchungen, Matches und Events. 
                  Je mehr Punkte du sammelst, desto höher dein Level!
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {EXPERT_LEVELS.map((level, index) => {
          const isCurrentLevel = currentLevel.name === level.name;
          const pointsRange = level.maxPoints === Infinity 
            ? `${formatPoints(level.minPoints)}+ Punkte`
            : `${formatPoints(level.minPoints)} – ${formatPoints(level.maxPoints)} Punkte`;
          
          return (
            <motion.div
              key={level.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-2xl p-4 md:p-5 aspect-[4/3] flex flex-col justify-between
                ${isCurrentLevel ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-60"}`}
            >
              {/* Glow Effect for Current Level */}
              {isCurrentLevel && (
                <>
                  <motion.div
                    className="absolute -inset-1 rounded-2xl bg-primary/40 blur-xl"
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
                    className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/50 to-primary/20"
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
              <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[index]} rounded-2xl`} />
              
              {/* Diagonal Stripe Effect */}
              <div className="absolute inset-0 opacity-20 rounded-2xl overflow-hidden">
                <div className={`absolute w-[200%] h-8 bg-white/30 -rotate-12 -translate-y-4 translate-x-[-30%]`} />
              </div>
              
              {/* Tier Number Badge */}
              <div className="relative z-10">
                <motion.div 
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${BADGE_COLORS[index]} 
                    flex items-center justify-center text-lg md:text-xl font-bold text-white shadow-lg`}
                  animate={isCurrentLevel ? { 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(163, 230, 53, 0)",
                      "0 0 20px 4px rgba(163, 230, 53, 0.4)",
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
              <div className="relative z-10 space-y-2">
                <h4 className="text-white font-bold text-base md:text-lg drop-shadow-md">
                  {level.name}
                </h4>
                <div className={`inline-block px-3 py-1 rounded-full text-xs md:text-sm font-medium
                  ${PILL_BG_COLORS[index]} text-gray-800 shadow-sm
                  -rotate-2 transform`}>
                  {pointsRange}
                </div>
              </div>
              
              {/* Current Level Badge */}
              {isCurrentLevel && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg"
                >
                  DEIN LEVEL
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

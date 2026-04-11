// Expert Level tiers based on PLAY CREDITS (lifetime)
// This is separate from Skill Level (0-10) which is the match score multiplier

export interface ExpertLevel {
  name: string;
  minPoints: number;
  maxPoints: number;
  gradient: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

export const EXPERT_LEVELS: ExpertLevel[] = [
  { 
    name: "Beginner", 
    minPoints: 0, 
    maxPoints: 2999, 
    gradient: "from-zinc-400 to-zinc-500",
    bgGradient: "from-zinc-900/50 to-zinc-800/30",
    borderColor: "border-zinc-500/30",
    textColor: "text-zinc-300"
  },
  { 
    name: "Rookie", 
    minPoints: 3000, 
    maxPoints: 5999, 
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-900/40 to-orange-900/20",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400"
  },
  { 
    name: "Player", 
    minPoints: 6000, 
    maxPoints: 9999, 
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-900/40 to-cyan-900/20",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400"
  },
  { 
    name: "Expert", 
    minPoints: 10000, 
    maxPoints: 14999, 
    gradient: "from-lime-400 to-green-500",
    bgGradient: "from-lime-900/40 to-green-900/20",
    borderColor: "border-lime-500/30",
    textColor: "text-lime-400"
  },
  { 
    name: "Pro", 
    minPoints: 15000, 
    maxPoints: 24999, 
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-900/40 to-red-900/20",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400"
  },
  { 
    name: "Master", 
    minPoints: 25000, 
    maxPoints: 49999, 
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-900/40 to-pink-900/20",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400"
  },
  { 
    name: "Champion", 
    minPoints: 50000, 
    maxPoints: 79999, 
    gradient: "from-cyan-400 to-violet-500",
    bgGradient: "from-cyan-900/40 to-violet-900/20",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-400"
  },
  { 
    name: "Padel Legend", 
    minPoints: 80000, 
    maxPoints: Infinity, 
    gradient: "from-yellow-400 to-lime-400",
    bgGradient: "from-yellow-900/40 to-lime-900/20",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-400"
  },
];

// Legacy compatibility: Export SkillLevel interface and getSkillBadge function
// so components can migrate gradually
export interface SkillLevel {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: string;
}

// Map ExpertLevel to SkillLevel for backwards compatibility
function mapExpertLevelToSkillLevel(level: ExpertLevel): SkillLevel {
  return {
    name: level.name,
    minPoints: level.minPoints,
    maxPoints: level.maxPoints,
    color: level.gradient,
    icon: getExpertLevelEmoji(level.name),
  };
}

// Legacy function for components still using getSkillBadge
export const getSkillBadge = (points: number) => {
  const currentLevel = getExpertLevel(points);
  const nextLevel = getNextExpertLevel(points);
  const progress = getProgressToNextLevel(points);
  
  return {
    current: mapExpertLevelToSkillLevel(currentLevel),
    next: nextLevel ? mapExpertLevelToSkillLevel(nextLevel) : null,
    progress: progress.percentage,
    pointsToNext: progress.remaining,
  };
};

export function getExpertLevel(playCredits: number): ExpertLevel {
  for (let i = EXPERT_LEVELS.length - 1; i >= 0; i--) {
    if (playCredits >= EXPERT_LEVELS[i].minPoints) {
      return EXPERT_LEVELS[i];
    }
  }
  return EXPERT_LEVELS[0];
}

export function getNextExpertLevel(playCredits: number): ExpertLevel | null {
  const currentIndex = EXPERT_LEVELS.findIndex(level => 
    playCredits >= level.minPoints && playCredits <= level.maxPoints
  );
  if (currentIndex === -1 || currentIndex >= EXPERT_LEVELS.length - 1) {
    return null; // Already at max level
  }
  return EXPERT_LEVELS[currentIndex + 1];
}

export function getProgressToNextLevel(playCredits: number): { 
  current: number; 
  target: number; 
  remaining: number; 
  percentage: number;
  nextLevelName: string | null;
} {
  const currentLevel = getExpertLevel(playCredits);
  const nextLevel = getNextExpertLevel(playCredits);
  
  if (!nextLevel) {
    return {
      current: playCredits,
      target: playCredits,
      remaining: 0,
      percentage: 100,
      nextLevelName: null,
    };
  }

  const pointsInCurrentTier = playCredits - currentLevel.minPoints;
  const tierRange = nextLevel.minPoints - currentLevel.minPoints;
  const percentage = Math.min((pointsInCurrentTier / tierRange) * 100, 100);

  return {
    current: playCredits,
    target: nextLevel.minPoints,
    remaining: nextLevel.minPoints - playCredits,
    percentage,
    nextLevelName: nextLevel.name,
  };
}

// Get tier icon/emoji based on level
export function getExpertLevelEmoji(levelName: string): string {
  switch (levelName) {
    case "Beginner": return "🌱";
    case "Rookie": return "🎾";
    case "Player": return "⚡";
    case "Expert": return "🔥";
    case "Pro": return "💎";
    case "Master": return "👑";
    case "Champion": return "🏆";
    case "Padel Legend": return "🌟";
    default: return "🎮";
  }
}

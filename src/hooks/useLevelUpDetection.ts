import { useState, useEffect, useCallback, useRef } from "react";
import { getExpertLevel, ExpertLevel } from "@/lib/expertLevels";

interface UseLevelUpDetectionProps {
  lifetimeCredits: number;
  enabled?: boolean;
}

interface UseLevelUpDetectionResult {
  showLevelUp: boolean;
  newLevel: ExpertLevel | null;
  previousLevel: ExpertLevel | null;
  closeLevelUp: () => void;
  triggerLevelUp: (newCredits: number, oldCredits: number) => void;
}

const STORAGE_KEY = "p2g_last_known_level";

export function useLevelUpDetection({ 
  lifetimeCredits, 
  enabled = true 
}: UseLevelUpDetectionProps): UseLevelUpDetectionResult {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<ExpertLevel | null>(null);
  const [previousLevel, setPreviousLevel] = useState<ExpertLevel | null>(null);
  const hasCheckedRef = useRef(false);
  const lastCreditsRef = useRef<number | null>(null);

  // Check for level up on mount and when credits change
  useEffect(() => {
    if (!enabled || lifetimeCredits <= 0) return;

    const currentLevel = getExpertLevel(lifetimeCredits);
    
    // Get last known level from storage
    const storedLevelName = localStorage.getItem(STORAGE_KEY);
    
    if (storedLevelName && storedLevelName !== currentLevel.name) {
      // Check if this is an upgrade (not downgrade)
      const storedLevel = getExpertLevel(0); // Get beginner as baseline
      const allLevels = ["Beginner", "Rookie", "Player", "Expert", "Pro", "Master", "Champion", "Padel Legend"];
      const storedIndex = allLevels.indexOf(storedLevelName);
      const currentIndex = allLevels.indexOf(currentLevel.name);
      
      if (currentIndex > storedIndex && !hasCheckedRef.current) {
        // Level up detected!
        const previousLevelObj = getExpertLevel(
          storedIndex === 0 ? 0 : 
          storedIndex === 1 ? 1000 : 
          storedIndex === 2 ? 3000 :
          storedIndex === 3 ? 6000 :
          storedIndex === 4 ? 10000 :
          storedIndex === 5 ? 15000 :
          storedIndex === 6 ? 25000 : 0
        );
        
        setPreviousLevel(previousLevelObj);
        setNewLevel(currentLevel);
        setShowLevelUp(true);
        hasCheckedRef.current = true;
      }
    }
    
    // Always update stored level
    localStorage.setItem(STORAGE_KEY, currentLevel.name);
    lastCreditsRef.current = lifetimeCredits;
  }, [lifetimeCredits, enabled]);

  // Manual trigger for level up (e.g., after match)
  const triggerLevelUp = useCallback((newCredits: number, oldCredits: number) => {
    const oldLevel = getExpertLevel(oldCredits);
    const newLevelObj = getExpertLevel(newCredits);
    
    if (newLevelObj.name !== oldLevel.name && newLevelObj.minPoints > oldLevel.minPoints) {
      setPreviousLevel(oldLevel);
      setNewLevel(newLevelObj);
      setShowLevelUp(true);
      localStorage.setItem(STORAGE_KEY, newLevelObj.name);
    }
  }, []);

  const closeLevelUp = useCallback(() => {
    setShowLevelUp(false);
    // Reset after animation
    setTimeout(() => {
      setNewLevel(null);
      setPreviousLevel(null);
    }, 300);
  }, []);

  return {
    showLevelUp,
    newLevel,
    previousLevel,
    closeLevelUp,
    triggerLevelUp,
  };
}

export default useLevelUpDetection;

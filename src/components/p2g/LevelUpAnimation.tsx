import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, X } from "lucide-react";
import { ExpertLevel, getExpertLevelEmoji } from "@/lib/expertLevels";
import { Button } from "@/components/ui/button";

interface LevelUpAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: ExpertLevel;
  previousLevel?: ExpertLevel;
}

export function LevelUpAnimation({ 
  isOpen, 
  onClose, 
  newLevel, 
  previousLevel 
}: LevelUpAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Confetti particles */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${newLevel.gradient.includes('lime') ? '#a3e635' : '#facc15'}, ${newLevel.gradient.includes('purple') ? '#a855f7' : '#22c55e'})`,
                    left: `${Math.random() * 100}%`,
                    top: `-5%`,
                  }}
                  initial={{ y: 0, rotate: 0, opacity: 1 }}
                  animate={{ 
                    y: window.innerHeight + 100, 
                    rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          )}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative z-10 w-full max-w-md"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white z-20"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Card */}
            <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${newLevel.bgGradient} border ${newLevel.borderColor}`}>
              {/* Animated glow background */}
              <div className="absolute inset-0">
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${newLevel.gradient} opacity-20`}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <div className="relative p-8 text-center">
                {/* Trophy icon with animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, damping: 10 }}
                  className="mb-6"
                >
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${newLevel.gradient} mx-auto flex items-center justify-center shadow-2xl`}>
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                </motion.div>

                {/* Level Up Text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg font-semibold text-yellow-400">LEVEL UP!</span>
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>

                  {previousLevel && (
                    <motion.p 
                      className="text-white/60 text-sm mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Von <span className={previousLevel.textColor}>{previousLevel.name}</span> aufgestiegen
                    </motion.p>
                  )}
                </motion.div>

                {/* New Level Display */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">{getExpertLevelEmoji(newLevel.name)}</span>
                    <h2 className={`text-4xl font-bold bg-gradient-to-r ${newLevel.gradient} bg-clip-text text-transparent`}>
                      {newLevel.name}
                    </h2>
                  </div>
                  <p className="text-white/70 text-sm">
                    {newLevel.minPoints.toLocaleString("de-DE")} – {newLevel.maxPoints === Infinity ? "∞" : newLevel.maxPoints.toLocaleString("de-DE")} Credits
                  </p>
                </motion.div>

                {/* Benefits teaser */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-white/5 rounded-xl p-4 mb-6"
                >
                  <p className="text-white/80 text-sm">
                    Du hast jetzt Zugang zu neuen Vorteilen und exklusiven Rewards!
                  </p>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button 
                    onClick={onClose}
                    className={`w-full bg-gradient-to-r ${newLevel.gradient} text-white font-semibold hover:opacity-90`}
                  >
                    Weiter spielen!
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LevelUpAnimation;

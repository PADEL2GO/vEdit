import { motion } from "framer-motion";
import { 
  LogIn, 
  MapPin, 
  Gamepad2, 
  Trophy, 
  Flame, 
  PartyPopper,
  Sparkles,
  Zap
} from "lucide-react";

/**
 * CreditProgressAnimation - Animierte Fortschritts-Grafik für P2G-Credits
 * Zeigt wie Credits durch verschiedene Aktivitäten gesammelt werden
 * mit Skill-Level Multiplikator Erklärung
 */

const progressSteps = [
  { icon: LogIn, label: "Login", credits: 10, cumulative: 10 },
  { icon: MapPin, label: "Buchung", credits: 25, cumulative: 35 },
  { icon: Gamepad2, label: "Match", credits: 170, cumulative: 205, isMatch: true },
  { icon: Trophy, label: "Sieg", credits: 50, cumulative: 255 },
  { icon: Flame, label: "Streak", credits: 30, cumulative: 285 },
  { icon: PartyPopper, label: "Event", credits: 100, cumulative: 385 },
];

const CreditProgressAnimation = () => {
  const maxCredits = 500;
  const exampleSkillLevel = 3.4;
  const exampleMatchScore = 50;
  const calculatedCredits = Math.round(exampleMatchScore * exampleSkillLevel);

  return (
    <div className="w-full space-y-8">
      {/* Skill-Level Multiplikator Erklärung */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-semibold">Match-Score</span>
            <span className="text-2xl font-bold text-primary">{exampleMatchScore}</span>
          </div>
          
          <span className="text-2xl font-bold text-muted-foreground">×</span>
          
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-semibold">Skill-Level</span>
            <span className="text-2xl font-bold text-primary">{exampleSkillLevel}</span>
          </div>
          
          <span className="text-2xl font-bold text-muted-foreground">=</span>
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground">
            <span className="font-bold text-xl">{calculatedCredits} P2G-Credits</span>
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Je höher dein Skill-Level (1-10), desto mehr P2G-Credits verdienst du pro Match!
        </p>
      </motion.div>

      {/* Fortschrittsbalken */}
      <div className="relative">
        {/* Background Bar */}
        <div className="h-4 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "77%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary via-primary to-lime-glow rounded-full"
          />
        </div>
        
        {/* Markers */}
        <div className="absolute top-0 left-0 right-0 h-full flex items-center">
          {progressSteps.map((step, index) => {
            const position = (step.cumulative / maxCredits) * 100;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.15, type: "spring" }}
                className="absolute"
                style={{ left: `${Math.min(position, 100)}%` }}
              >
                <div className="relative -translate-x-1/2">
                  {/* Marker Point */}
                  <div className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                    step.isMatch ? 'bg-lime-glow' : 'bg-primary'
                  }`}>
                    <step.icon className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Scale Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0</span>
          <span>250</span>
          <span>500+</span>
        </div>
      </div>

      {/* Credit Steps Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {progressSteps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border text-center ${
              step.isMatch 
                ? 'bg-primary/10 border-primary/30' 
                : 'bg-card border-border'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
              step.isMatch ? 'bg-lime-glow' : 'bg-primary/10'
            }`}>
              <step.icon className={`w-5 h-5 ${step.isMatch ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
            <p className="text-sm font-medium mb-1">{step.label}</p>
            <p className={`text-lg font-bold ${step.isMatch ? 'text-primary' : 'text-foreground'}`}>
              +{step.credits}
            </p>
            {step.isMatch && (
              <p className="text-xs text-muted-foreground mt-1">
                ×Skill-Level
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CreditProgressAnimation;

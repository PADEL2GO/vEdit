import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface TierData {
  name: string;
  points: string;
  benefits?: string[];
}

interface SkewLevelCardsProps {
  tiers: TierData[];
  showBenefits?: boolean;
}

// Map tier colors from EXPERT_LEVELS gradient classes
const getTierColors = (tierName: string): { from: string; to: string } => {
  const colorMap: Record<string, { from: string; to: string }> = {
    "Beginner": { from: '#71717a', to: '#a1a1aa' },     // zinc
    "Rookie": { from: '#f59e0b', to: '#f97316' },       // amber to orange
    "Player": { from: '#60a5fa', to: '#06b6d4' },       // blue to cyan
    "Expert": { from: '#a3e635', to: '#22c55e' },       // lime to green
    "Pro": { from: '#f97316', to: '#ef4444' },          // orange to red
    "Master": { from: '#a855f7', to: '#ec4899' },       // purple to pink
    "Champion": { from: '#22d3ee', to: '#8b5cf6' },     // cyan to violet
    "Padel Legend": { from: '#facc15', to: '#a3e635' }, // yellow to lime
  };
  return colorMap[tierName] || colorMap["Beginner"];
};

export default function SkewLevelCards({ tiers, showBenefits = true }: SkewLevelCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {tiers.map((tier, idx) => {
        const colors = getTierColors(tier.name);
        const isLegend = tier.name === "Padel Legend";
        const hasBenefits = tier.benefits && tier.benefits.length > 0;
        const isHovered = hoveredIndex === idx;
        const extraPerks = hasBenefits ? tier.benefits!.slice(3) : [];
        
        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`relative group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 ${isLegend ? 'ring-2 ring-primary/50' : ''}`}
            style={{ 
              background: `linear-gradient(135deg, ${colors.from}20, ${colors.to}30)`,
            }}
          >
            {/* Card border with gradient */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-50"
              style={{ 
                background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                padding: '1px',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
                WebkitMaskComposite: 'xor',
              }}
            />
            
            {/* Inner glow effect */}
            <div 
              className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-300"
              style={{ 
                background: `radial-gradient(ellipse at top left, ${colors.from}40, transparent 60%)` 
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col p-6 min-h-[320px]">
              {/* Level Number Badge */}
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg mb-4 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
              >
                {idx + 1}
              </div>

              {/* Name */}
              <h3 className={`text-xl font-bold text-white mb-2 ${isLegend ? 'drop-shadow-[0_0_10px_rgba(199,240,17,0.5)]' : ''}`}>
                {tier.name}
              </h3>

              {/* Points Badge */}
              <span
                className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full text-white mb-4 shadow-md w-fit"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
              >
                {tier.points} Punkte
              </span>

              {/* Benefits */}
              {showBenefits && hasBenefits && (
                <ul className="space-y-2 flex-1">
                  {tier.benefits!.slice(0, 3).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/80" />
                      <span className="text-white/80">{benefit}</span>
                    </li>
                  ))}
                  
                  {/* Expandable extra perks on hover */}
                  <AnimatePresence>
                    {isHovered && extraPerks.length > 0 && extraPerks.map((benefit, i) => (
                      <motion.li
                        key={`extra-${i}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        className="flex items-start gap-2 text-sm overflow-hidden"
                      >
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/80" />
                        <span className="text-white/80">{benefit}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

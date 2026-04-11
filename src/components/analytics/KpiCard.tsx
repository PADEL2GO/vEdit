import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon?: LucideIcon;
  color?: string;
  delay?: number;
  format?: "number" | "time" | "distance";
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

export const KpiCard = ({ label, value, suffix = "", icon: Icon, color = "from-primary to-lime-400", delay = 0, format = "number" }: KpiCardProps) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setAnimatedValue(value);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const displayValue = format === "time" 
    ? formatTime(animatedValue) 
    : format === "distance" 
    ? formatDistance(animatedValue) 
    : animatedValue.toFixed(format === "number" && value % 1 !== 0 ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white relative overflow-hidden`}
    >
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          background: [
            "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 100% 100%, rgba(255,255,255,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10">
        {Icon && <Icon className="w-5 h-5 mb-2 text-white/80" />}
        <p className="text-xs text-white/70 mb-1">{label}</p>
        <p className="text-2xl font-bold">{displayValue}{suffix && !["time", "distance"].includes(format) && <span className="text-base ml-1">{suffix}</span>}</p>
      </div>
    </motion.div>
  );
};

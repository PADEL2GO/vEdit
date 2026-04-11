import { motion } from "framer-motion";

interface GaugeChartProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
}

export const GaugeChart = ({ value, min, max, label, unit = "" }: GaugeChartProps) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="bg-secondary/50 rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-3">{label}</p>
      <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-primary to-red-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-primary"
          initial={{ left: "0%" }}
          animate={{ left: `calc(${percentage}% - 6px)` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <span className="text-primary font-bold text-base">{value}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

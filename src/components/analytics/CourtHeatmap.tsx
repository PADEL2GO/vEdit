import { motion } from "framer-motion";

interface Zone {
  label: string;
  percentage: number;
}

interface CourtHeatmapProps {
  zones: Zone[];
  title: string;
}

export const CourtHeatmap = ({ zones, title }: CourtHeatmapProps) => {
  const getZoneColor = (percentage: number) => {
    if (percentage > 40) return "bg-red-500/60";
    if (percentage > 25) return "bg-orange-500/50";
    if (percentage > 15) return "bg-yellow-500/40";
    return "bg-green-500/30";
  };

  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-3">{title}</p>
      <div className="relative aspect-[3/4] bg-green-800/50 rounded-lg overflow-hidden border-2 border-white/20">
        {/* Court lines */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/30" />
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30" />
        <div className="absolute top-1/4 inset-x-4 h-0.5 bg-white/20" />
        <div className="absolute bottom-1/4 inset-x-4 h-0.5 bg-white/20" />
        
        {/* Heat zones */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-1 p-2">
          {zones.map((zone, i) => (
            <motion.div
              key={zone.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`${getZoneColor(zone.percentage)} rounded flex items-center justify-center`}
            >
              <div className="text-center">
                <p className="text-white font-bold text-lg">{zone.percentage}%</p>
                <p className="text-white/70 text-xs">{zone.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

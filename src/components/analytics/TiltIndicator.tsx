import { motion } from "framer-motion";

interface TiltIndicatorProps {
  vertical: number;
  horizontal: number;
  direction: string;
}

export const TiltIndicator = ({ vertical, horizontal, direction }: TiltIndicatorProps) => {
  const getArrowRotation = () => {
    switch (direction) {
      case "forward-right": return 45;
      case "forward-left": return -45;
      case "backward-right": return 135;
      case "backward-left": return -135;
      default: return 0;
    }
  };

  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-3">Team Tilt</p>
      <div className="relative w-28 h-28 mx-auto bg-green-800/40 rounded-lg border border-white/20">
        {/* Court representation */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        
        {/* Tilt arrow */}
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: getArrowRotation() }}
          transition={{ duration: 0.8, type: "spring" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="w-12 h-1 bg-primary rounded-full relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-primary border-y-4 border-y-transparent" />
          </div>
        </motion.div>
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <span className="text-muted-foreground">V: <span className="text-primary font-bold">{vertical}%</span></span>
        <span className="text-muted-foreground">H: <span className="text-primary font-bold">{horizontal}%</span></span>
      </div>
    </div>
  );
};

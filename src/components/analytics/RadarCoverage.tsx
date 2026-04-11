import { motion } from "framer-motion";

interface RadarCoverageProps {
  vertical: number;
  horizontal: number;
}

export const RadarCoverage = ({ vertical, horizontal }: RadarCoverageProps) => {
  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-3">Court Coverage</p>
      <div className="relative w-32 h-32 mx-auto">
        {/* Background grid */}
        <div className="absolute inset-0 border-2 border-muted/30 rounded-full" />
        <div className="absolute inset-4 border border-muted/20 rounded-full" />
        <div className="absolute inset-8 border border-muted/10 rounded-full" />
        
        {/* Axes */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-muted/30" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-muted/30" />
        
        {/* Coverage indicator */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${horizontal}%`,
            height: `${vertical}%`,
          }}
        >
          <div className="w-full h-full bg-primary/30 border-2 border-primary rounded-full" />
        </motion.div>
        
        {/* Labels */}
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">V: {vertical}%</span>
        <span className="absolute top-1/2 -right-10 -translate-y-1/2 text-xs text-muted-foreground">H: {horizontal}%</span>
      </div>
    </div>
  );
};

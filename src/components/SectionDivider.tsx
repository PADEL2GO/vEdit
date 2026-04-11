import { motion } from "framer-motion";

interface SectionDividerProps {
  variant?: "default" | "glow" | "gradient";
}

const SectionDivider = ({ variant = "default" }: SectionDividerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative py-2"
    >
      {variant === "default" && (
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}
      
      {variant === "glow" && (
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="h-4 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl -mt-2" />
        </div>
      )}
      
      {variant === "gradient" && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-1 rounded-full bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        </div>
      )}
    </motion.div>
  );
};

export default SectionDivider;

import { motion } from "framer-motion";
import { Clock, Users, Sparkles, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  title: string;
  description: string;
  icon?: LucideIcon;
}

export const ComingSoonOverlay = ({
  children,
  title,
  description,
  icon: Icon = Clock,
}: ComingSoonOverlayProps) => {
  return (
    <div className="relative min-h-screen">
      {/* Blurred content behind */}
      <div className="blur-md opacity-15 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Coming Soon overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-start justify-center pt-32 md:pt-40 px-4"
      >
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/95 backdrop-blur-sm border-border shadow-2xl overflow-hidden">
              {/* Decorative top gradient */}
              <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
              
              <CardContent className="pt-10 pb-8 px-8 text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge 
                    variant="outline" 
                    className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/10 text-primary"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Badge>
                </motion.div>

                {/* Icon */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-3xl font-bold text-foreground mb-4"
                >
                  {title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground leading-relaxed max-w-md mx-auto"
                >
                  {description}
                </motion.p>

                {/* Subtle divider with sparkle */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-4 mt-8"
                >
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
                  <Sparkles className="w-4 h-4 text-primary/50" />
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
                </motion.div>

                {/* Bottom text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 text-xs text-muted-foreground/60"
                >
                  Wir arbeiten hart daran, dieses Feature für dich verfügbar zu machen.
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// Smaller card version for use within tabs
interface ComingSoonCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export const ComingSoonCard = ({
  title,
  description,
  icon: Icon = Clock,
}: ComingSoonCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="py-12 px-8 text-center">
          <Badge 
            variant="outline" 
            className="mb-6 px-3 py-1.5 text-xs font-medium border-primary/30 bg-primary/10 text-primary"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Coming Soon
          </Badge>

          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
            <Icon className="w-8 h-8 text-primary" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {title}
          </h3>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

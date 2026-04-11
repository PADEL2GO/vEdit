import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Instagram } from "lucide-react";

const stats = [
  { value: "2.500+", label: "Aktive Spieler" },
  { value: "98%", label: "Zufriedenheit" },
  { value: "4.8", label: "App Rating" },
];

const CommunitySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="community" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div ref={ref} className="text-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto mb-12"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
              Community
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Werde Teil der{" "}
              <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span> Familie
            </h2>
            <p className="text-lg text-muted-foreground">
              Padel ist mehr als nur ein Sport – es ist eine Community. Triff Gleichgesinnte, 
              verbessere dein Spiel und erlebe unvergessliche Momente auf dem Court.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-2xl mx-auto mb-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="p-4 md:p-6">
                <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-gradient-lime mb-2">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl mx-auto p-8 rounded-3xl bg-card border border-border relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            
            <h3 className="text-2xl font-bold mb-4 relative z-10">
              Bereit für Padel?
            </h3>
            <p className="text-muted-foreground mb-6 relative z-10">
              Lade dir die PADEL2GO App herunter und buche deinen ersten Court. 
              Dein erstes Spiel geht auf uns!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button variant="hero" size="lg" className="group">
                Jetzt loslegen
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border relative z-10">
              <a
                href="https://www.instagram.com/padel2go.official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
                <span className="text-sm">@PADEL2GO</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

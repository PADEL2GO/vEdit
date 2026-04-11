import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Target, Gift, Trophy, Video, Brain } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Smart Booking",
    description: "Finde den perfekten Court in Sekunden – mit Echtzeit-Verfügbarkeit und flexiblen Buchungsoptionen.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Gift,
    title: "P2G Rewards",
    description: "Jede Buchung zählt. Sammle Punkte, steige in Tiers auf und sichere dir exklusive Rewards.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Trophy,
    title: "Leagues & Circuit",
    description: "Von der Open League bis zum Circuit – spiele Turniere auf deinem Level und darüber hinaus.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Video,
    title: "Video Highlights",
    description: "Teile deine besten Momente automatisch – mit AI-generierten Highlights.",
    tag: "Coming Soon",
    color: "from-primary to-primary/60",
  },
  {
    icon: Brain,
    title: "AI Stats",
    description: "Verstehe dein Spiel mit detaillierten Statistiken und personalisierten Verbesserungstipps.",
    tag: "Coming Soon",
    color: "from-primary to-primary/60",
  },
  {
    icon: Sparkles,
    title: "Community Events",
    description: "Pop-Up Events, Social Nights und After-Work Sessions – Padel ist mehr als nur ein Spiel.",
    color: "from-primary to-primary/60",
  },
];

const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <div ref={ref}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
              Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Alles, was du für{" "}
              <span className="text-gradient-lime">Padel brauchst</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Von der Buchung bis zur Auswertung – unsere Plattform macht Padel 
              einfacher, sozialer und aufregender.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="group relative p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border hover:border-primary/30 transition-all duration-500 overflow-hidden"
              >
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Tag */}
                {feature.tag && (
                  <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {feature.tag}
                  </span>
                )}

                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 mb-5`}>
                    <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

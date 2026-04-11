import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Smartphone, Star, Users, Zap, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Smartphone,
    title: "Einfach buchen",
    description: "Court finden, buchen und spielen – alles in einer App.",
  },
  {
    icon: Star,
    title: "P2G Rewards",
    description: "Sammle Punkte mit jeder Buchung und sichere dir exklusive Rewards.",
  },
  {
    icon: Users,
    title: "Community Events",
    description: "Triff Gleichgesinnte bei Turnieren, Leagues und Social Events.",
  },
  {
    icon: TrendingUp,
    title: "Skill Tracking",
    description: "Verfolge deine Entwicklung mit AI-gestützten Stats.",
  },
  {
    icon: Award,
    title: "Open League",
    description: "Spiele standortübergreifend in der PADEL2GO League.",
  },
  {
    icon: Zap,
    title: "Instant Match",
    description: "Finde sofort Spielpartner auf deinem Level.",
  },
];

const ForPlayersSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="spieler" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div ref={ref}>
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mb-16"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
              Für Spieler
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Dein Padel-Erlebnis.{" "}
              <span className="text-gradient-lime">Next Level.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Vom ersten Aufschlag bis zum Turniersieg – wir begleiten dich auf deiner 
              Padel-Reise mit allem, was du brauchst.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button variant="lime" size="lg">
              App herunterladen
            </Button>
            <Button variant="outline" size="lg">
              Mehr erfahren
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ForPlayersSection;

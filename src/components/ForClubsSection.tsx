import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, TrendingUp, Shield, Wrench, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Shield,
    title: "Null Investition",
    description: "Wir stellen die Courts – ihr stellt die Fläche. Kein finanzielles Risiko.",
  },
  {
    icon: TrendingUp,
    title: "Neue Einnahmen",
    description: "Attraktive Umsatzbeteiligung ohne eigene Kosten.",
  },
  {
    icon: Users,
    title: "Mitgliederbindung",
    description: "Bietet euren Mitgliedern eine der am schnellsten wachsenden Sportarten.",
  },
  {
    icon: Calendar,
    title: "Event-Support",
    description: "Wir organisieren Turniere und Events – ihr profitiert vom Zulauf.",
  },
  {
    icon: Wrench,
    title: "Full-Service",
    description: "Wartung, Booking-System und Marketing – alles inklusive.",
  },
  {
    icon: Building2,
    title: "Flexible Lösungen",
    description: "Mobile Courts für Sandplätze, Parkplätze oder Freiflächen.",
  },
];

const ForClubsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section id="vereine" className="py-24 md:py-32 bg-card/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-40 h-40 border border-primary rounded-full" />
        <div className="absolute bottom-40 right-20 w-60 h-60 border border-primary rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-20 h-20 border border-primary rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div ref={ref} className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
              Für Vereine
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Padel für euren Verein.{" "}
              <span className="text-gradient-lime">Ohne Risiko.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Als Europas am schnellsten wachsende Sportart begeistert Padel Menschen aller 
              Altersgruppen und Spielstärken. Mit Padel2Go bringt ihr diesen Trend zu euren 
              Mitgliedern – komplett ohne eigene Investition.
            </p>

            <div className="space-y-4 mb-8">
              {["Komplette Court-Installation", "Digitales Buchungssystem", "Marketing & Events", "Vending Machines für Equipment"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="lime" size="lg" onClick={() => navigate("/faq-kontakt?reason=verein")}>
                Partnerschaft anfragen
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/faq-kontakt?reason=verein")}>
                Info-Paket anfordern
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Benefits Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-all duration-300"
              >
                <benefit.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForClubsSection;

import { motion } from "framer-motion";
import { MapPin, ShoppingCart, Smartphone, Brain } from "lucide-react";

const concepts = [
  {
    icon: MapPin,
    title: "Mobile Courts (Try-and-Buy)",
    description: "Schnelle Installation auf bestehenden Flächen in Vereinen – ohne eigene Investition. Pop-Up-Courts als Event-Magnet und Einstiegsformat.",
  },
  {
    icon: ShoppingCart,
    title: "Automatisiertes Retail (Vending)",
    description: "24/7 Versorgung direkt am Court – Schläger, Bälle, Grips, Drinks. Cashless, datenbasiert, ohne Personal.",
  },
  {
    icon: Smartphone,
    title: "App-Ökosystem",
    description: "Booking, Payment, Community, Rewards, League – alles in einer Plattform. Spieler binden sich digital an den Sport und an die Marke.",
  },
  {
    icon: Brain,
    title: "KI-Performance & Content",
    description: "Automatische Highlights, Shot-Tracking, Analytics und Coaching-Insights. Content-Generierung für Social Media direkt vom Court.",
  },
];

export const PartnerConceptSection = () => (
  <section className="py-24 bg-card/30">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          <span className="text-foreground">PADEL</span>
          <span className="text-primary">2</span>
          <span className="text-foreground">GO</span>
          {" – "}
          <span className="text-gradient-lime">Das Konzept</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Vier Säulen, ein Ökosystem – physisch und digital verbunden.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {concepts.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <item.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-muted-foreground">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { 
  Gift, ArrowRight, Sparkles, Ticket, ShoppingBag, Gem, Coins, Download,
  Calendar, CircleDollarSign
} from "lucide-react";

const redeemOptions = [
  {
    category: "Gratis Equipment",
    icon: ShoppingBag,
    highlight: true,
    items: ["Padel-Schläger", "Bälle & Grips", "Sporttaschen", "Premium Ausrüstung"]
  },
  {
    category: "Vending Machine",
    icon: CircleDollarSign,
    highlight: true,
    items: ["Mit Credits bezahlen", "Drinks & Snacks", "Equipment vor Ort", "Nutrition-Produkte"]
  },
  {
    category: "Court-Credits",
    icon: Calendar,
    items: ["Gratis-Stunden", "Rabatt-Gutscheine", "Off-Peak Buchungen"]
  },
  {
    category: "Event-Tickets",
    icon: Ticket,
    items: ["League-Finals Tickets", "Circuit-Events", "Community-Nights"]
  },
  {
    category: "Partner-Rewards",
    icon: Gift,
    items: ["Equipment-Gutscheine", "Nutrition-Produkte", "Lifestyle-Rewards"]
  },
  {
    category: "Merchandise",
    icon: Gem,
    items: ["P2G Apparel", "Limited Editions", "Co-Branded Items"]
  }
];

export function RedeemOptionsSection() {
  return (
    <section className="py-16 md:py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Dafür kannst du deine <span className="text-gradient-lime">Credits einlösen</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Von Equipment über Vending Machine bis zu exklusiven Events – deine Credits haben echten Wert!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {redeemOptions.map((option, index) => (
            <motion.div
              key={option.category}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                option.highlight 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10' 
                  : 'bg-background border-border hover:border-primary/30'
              }`}
            >
              {option.highlight && (
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">Highlight</span>
                </div>
              )}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                option.highlight ? 'bg-primary' : 'bg-primary/10'
              }`}>
                <option.icon className={`w-7 h-7 ${option.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <h3 className="text-xl font-bold mb-4">{option.category}</h3>
              <ul className="space-y-2">
                {option.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="hero" size="lg" className="group" asChild>
            <NavLink to="/app-booking">
              <Download className="mr-2 h-5 w-5" />
              App herunterladen & Rewards entdecken
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
}

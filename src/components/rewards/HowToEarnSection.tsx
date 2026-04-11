import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { 
  Sparkles, Calendar, Target, CheckCircle, UserPlus, Ticket, Trophy, Award,
  ArrowRight, Coins, Download
} from "lucide-react";

const earnWays = [
  { action: "App-Login (täglich)", points: "+5 Punkte", icon: Sparkles },
  { action: "Court-Buchung", points: "+50 Punkte", icon: Calendar },
  { action: "Match gespielt", points: "+30 Punkte", icon: Target },
  { action: "Score eingegeben", points: "+10 Punkte", icon: CheckCircle },
  { action: "Freund:in eingeladen", points: "+100 Punkte", icon: UserPlus },
  { action: "Event-Teilnahme", points: "+75 Punkte", icon: Ticket },
  { action: "League-Match", points: "+60 Punkte", icon: Trophy },
  { action: "Circuit-Turnier", points: "+150 Punkte", icon: Award }
];

export function HowToEarnSection() {
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
            So sammelst du <span className="text-gradient-lime">Credits</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Jede Aktivität wird belohnt – je aktiver du bist, desto schneller steigst du auf!
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {earnWays.map((way, index) => (
            <motion.div
              key={way.action}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 rounded-2xl bg-background border border-border text-center hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer"
            >
              <motion.div 
                className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <way.icon className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-sm mb-2">{way.action}</h3>
              <span className="text-primary font-bold flex items-center justify-center gap-1">
                <Coins className="w-4 h-4" />
                {way.points}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="outline" size="lg" className="group" asChild>
            <NavLink to="/app-booking">
              <Download className="mr-2 h-5 w-5" />
              App herunterladen
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
}

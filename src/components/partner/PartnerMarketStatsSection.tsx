import { motion } from "framer-motion";

const stats = [
  { value: "~70k", label: "Padel-Courts global (2026)", sub: "~60k in 2024" },
  { value: "35 Mio.", label: "Aktive Spieler weltweit" },
  { value: "24.000+", label: "Clubs weltweit" },
  { value: "50–70%", label: "Court-Auslastung Jahr 1" },
  { value: "70–90%", label: "Court-Auslastung ab Jahr 2" },
  { value: ">50%", label: "Einsteiger-Anteil" },
  { value: "~6 Mrd. €", label: "Marktpotenzial bis 2026" },
];

export const PartnerMarketStatsSection = () => (
  <section className="py-24 bg-card/30">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto mb-6"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Padel-Nachfrage & <span className="text-gradient-lime">Court-Auslastung</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Der Markt wächst rasant – Padel ist in der frühen Wachstumsphase.
        </p>
      </motion.div>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto mb-16 text-center"
      >
        <blockquote className="text-xl md:text-2xl italic text-primary font-medium border-l-4 border-primary pl-6 text-left">
          „Padel ist in der frühen Wachstumsphase – vergleichbar mit dem E-Bike-Markt 2015."
        </blockquote>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 }}
            className="text-center p-6 rounded-2xl bg-card border border-border"
          >
            <p className="text-3xl md:text-4xl font-bold text-gradient-lime mb-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {stat.sub && <p className="text-xs text-muted-foreground/60 mt-1">{stat.sub}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

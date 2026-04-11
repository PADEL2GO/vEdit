import { motion } from "framer-motion";
import { Repeat, BarChart3, ShoppingCart, Heart, TrendingUp } from "lucide-react";

const kpis = [
  {
    icon: Repeat,
    value: "~92%",
    label: "Customer Retention",
    description: "Return Rate durch Gamification, Loyalty & Community-Effekte",
    color: "from-primary to-lime-400",
  },
  {
    icon: BarChart3,
    value: "KPI-driven",
    label: "Messbare Markenwirkung",
    description: "Datenbasierte Insights zu Reichweite, Engagement & Conversions – skalierbar",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: ShoppingCart,
    value: "Point of Play",
    label: "Direkter Commerce",
    description: "Vending-Integration & Rewards sorgen für Kaufimpulse direkt am Court",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Heart,
    value: "Social",
    label: "Community Impact",
    description: "Kooperationen mit Stiftungen, Jugendhilfe & lokalen Vereinen",
    color: "from-rose-500 to-pink-400",
  },
  {
    icon: TrendingUp,
    value: "PE / VC",
    label: "Marktsignal 2025",
    description: "Padel wird institutionalisiert – Private Equity & Venture Capital steigen ein",
    color: "from-amber-500 to-orange-400",
  },
];

export const PartnerBenchmarksSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Warum <span className="text-gradient-lime">PADEL2GO</span>?
        </h2>
        <p className="text-lg text-muted-foreground">
          Markt-Benchmarks, die für sich sprechen.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-6 text-white relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
            <div className="relative z-10">
              <kpi.icon className="w-6 h-6 mb-3 text-white/80" />
              <p className="text-3xl font-bold mb-1">{kpi.value}</p>
              <p className="text-sm font-semibold text-white/90 mb-2">{kpi.label}</p>
              <p className="text-xs text-white/70 leading-relaxed">{kpi.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

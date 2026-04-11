import { motion } from "framer-motion";

const benchmarks = [
  { label: "Sport E-Commerce CVR", value: "1,3–2,0%", percent: 15 },
  { label: "Affiliate CVR (Padel-Point)", value: "9–11%", percent: 80 },
  { label: "Instagram CTR", value: "0,2–0,4%", percent: 8 },
  { label: "TikTok CTR", value: "0,8–1,0%", percent: 18 },
  { label: "LinkedIn CTR", value: "0,35–0,65%", percent: 12 },
];

const highlights = [
  { value: "~100 €", label: "Ø Warenkorbwert" },
  { value: "66,1%", label: "Mobile Sales-Anteil" },
];

export const PartnerEcommerceSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          E-Commerce & <span className="text-gradient-lime">Affiliate Benchmarks</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Conversion-Raten und Click-Through im Sport-Segment.
        </p>
      </motion.div>

      <div className="max-w-4xl mx-auto grid lg:grid-cols-[1fr_auto] gap-12 items-start">
        {/* Progress bars */}
        <div className="space-y-5">
          {benchmarks.map((b, index) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium">{b.label}</span>
                <span className="text-sm font-bold text-primary">{b.value}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${b.percent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-lime-400"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Highlight cards */}
        <div className="flex lg:flex-col gap-4">
          {highlights.map((h, i) => (
            <motion.div
              key={h.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex-1 p-6 rounded-2xl bg-card border border-border text-center min-w-[140px]"
            >
              <p className="text-3xl font-bold text-gradient-lime mb-1">{h.value}</p>
              <p className="text-xs text-muted-foreground">{h.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

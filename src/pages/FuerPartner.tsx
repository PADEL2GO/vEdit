import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LogoCloud } from "@/components/ui/logo-cloud";
import {
  ArrowRight, Package, Apple, GlassWater, Sparkles,
  TrendingUp, Handshake, Monitor, MapPin, Trophy, Gift, Zap,
  BarChart3, Repeat, ShoppingCart, Heart, ChevronRight,
  Building2, Users, Target, Megaphone,
} from "lucide-react";
import {
  PartnerConceptSection,
  PartnerBenchmarksSection,
  TouchpointCarousel,
} from "@/components/partner";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { usePartnerTouchpoints } from "@/hooks/usePartnerTouchpoints";
import BrandName from "@/components/BrandName";

const CONTAINER = "container mx-auto px-4 sm:px-6";
const CONTENT = "max-w-6xl mx-auto";
const SECTION = "py-20 md:py-28";

const useCases = [
  {
    icon: Package,
    title: "Sport-Retail & Equipment",
    description: "Schläger, Bälle, Grips & Bags als Standard-Rewards im P2G Rewards Store und als Merchandise an unseren Locations.",
    accent: "#C7F011",
    glow: "rgba(199,240,17,0.12)",
    border: "rgba(199,240,17,0.25)",
  },
  {
    icon: Apple,
    title: "Nutrition & Supplements",
    description: "Recovery-Drinks, Riegel & Supplements in Vending-Machines, als Event-Sampling und als Rewards.",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
  },
  {
    icon: GlassWater,
    title: "Getränke-Marken",
    description: "Branding der Pop-Up-Events, Court-Branding, Sponsored Open-Play-Nights, League-Finals.",
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.25)",
  },
  {
    icon: Sparkles,
    title: "Lifestyle-Brands",
    description: "Co-Branded Capsule Collections, Turnier-Series, Social-Content-Serien rund um Padel & Lifestyle.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.25)",
  },
];

const touchpoints = [
  { icon: MapPin, label: "Branding am Court", accent: "#C7F011" },
  { icon: Monitor, label: "In-App-Präsenz", accent: "#38bdf8" },
  { icon: Gift, label: "P2G Rewards", accent: "#fbbf24" },
  { icon: Zap, label: "Vending-Machines", accent: "#fb923c" },
  { icon: Trophy, label: "Events & League", accent: "#a78bfa" },
];

const kpiCards = [
  { icon: Repeat, value: "~92%", label: "Customer Retention", desc: "Return Rate durch Gamification & Community", accent: "#C7F011", glow: "rgba(199,240,17,0.15)", border: "rgba(199,240,17,0.3)" },
  { icon: BarChart3, value: "KPI-driven", label: "Messbare Wirkung", desc: "Datenbasierte Insights zu Reichweite & Conversions", accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  { icon: ShoppingCart, value: "~100 €", label: "Ø Warenkorbwert", desc: "Hohe Kaufbereitschaft bei aktiven Spielern", accent: "#fbbf24", glow: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  { icon: Heart, value: "70–90%", label: "Court-Auslastung", desc: "Ab Jahr 2 — maximale Brand-Exposure", accent: "#f472b6", glow: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.25)" },
  { icon: Users, value: "35 Mio.", label: "Spieler weltweit", desc: "Aktive Padel-Community als Zielgruppe", accent: "#34d399", glow: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
  { icon: TrendingUp, value: "~6 Mrd. €", label: "Marktpotenzial 2026", desc: "Europaweit am schnellsten wachsende Sportart", accent: "#fb923c", glow: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.25)" },
];

const FuerPartner = () => {
  const { data: partnerTiles } = usePartnerTiles();
  const { data: touchpointSlides = [] } = usePartnerTouchpoints();

  const partnerLogos = (partnerTiles || [])
    .filter(t => t.logo_url)
    .map(t => ({ src: t.logo_url!, alt: t.name }));

  return (
    <>
      <Helmet>
        <title>Für Partner & Sponsoren | PADEL2GO – Sichtbarkeit direkt am Court</title>
        <meta name="description" content="Erreiche aktive, sportliche Communities dort, wo sie ihre Quality-Time verbringen – auf dem Padel-Court, in der App und bei Events." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 overflow-x-hidden">

        {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-background to-background z-0" />
          {/* Radial lime glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] z-[1] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.14) 0%, transparent 65%)" }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          />

          <div className={`${CONTAINER} relative z-10 w-full py-24`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center max-w-4xl mx-auto"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/15 border border-[#C7F011]/35 text-[#C7F011] mb-8"
                >
                  <Handshake className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-widest uppercase">Für Partner & Marken</span>
                </motion.div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-7 text-white">
                  Deine Marke.{" "}
                  <span className="text-[#C7F011]">Direkt am Court.</span>
                  <br />
                  Messbar.
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                  Erreiche aktive, kaufkräftige Communities genau dort, wo sie ihre Quality-Time
                  verbringen — auf dem Padel-Court, in der App und bei Events.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                  <a
                    href="#calendly"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all min-h-[52px] shadow-[0_0_40px_rgba(199,240,17,0.4)] hover:shadow-[0_0_60px_rgba(199,240,17,0.6)] w-full sm:w-auto"
                  >
                    <Megaphone className="w-5 h-5" />
                    Jetzt Termin buchen
                    <ArrowRight className="w-5 h-5" />
                  </a>
                  <NavLink
                    to="/faq-kontakt?reason=partner"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold text-base backdrop-blur-sm min-h-[52px] w-full sm:w-auto"
                  >
                    Partner-Deck anfragen
                  </NavLink>
                </div>

                {/* Trust chips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  {[
                    { icon: Building2, text: "Vereine & Clubs" },
                    { icon: TrendingUp, text: "Messbare KPIs" },
                    { icon: Users, text: "35 Mio. Spieler" },
                    { icon: Trophy, text: "EU-weite Liga" },
                  ].map(c => (
                    <span
                      key={c.text}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/12 text-white/55 text-xs font-medium backdrop-blur-sm"
                    >
                      <c.icon className="w-3.5 h-3.5 text-[#C7F011]" />
                      {c.text}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ UNSERE PARTNER ═════════════════════════════════════════════════ */}
        <section className="py-12 border-y border-white/8 overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%)" }}>
          <div className={`${CONTAINER} mb-8 text-center`}>
            <p className="text-white/35 text-xs font-bold tracking-widest uppercase">Unsere Partner</p>
          </div>
          {partnerLogos.length > 0 ? (
            <LogoCloud logos={partnerLogos} variant="dark" />
          ) : (
            <div className="flex justify-center gap-10 opacity-20 px-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-24 rounded bg-white/20" />
              ))}
            </div>
          )}
        </section>

        {/* ═══ TOUCHPOINTS – 5 PILL ICONS ════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Brand Touchpoints</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  Wo deine Marke auf{" "}
                  <span className="text-[#C7F011]">PADEL2GO</span> trifft
                </h2>
                <p className="text-white/50 text-lg">Physisch am Court, digital in der App und live bei Events.</p>
              </motion.div>

              {/* Touchpoint pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-14">
                {touchpoints.map((t, i) => (
                  <motion.div
                    key={t.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-sm transition-all duration-300"
                    style={{ borderColor: t.accent + "40", background: t.accent + "0f" }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <t.icon className="w-5 h-5" style={{ color: t.accent }} />
                    <span className="font-semibold text-white text-sm">{t.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Carousel */}
              <TouchpointCarousel slides={touchpointSlides} />
            </div>
          </div>
        </section>

        {/* ═══ USE CASES ══════════════════════════════════════════════════════ */}
        <section className={`${SECTION} relative`}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.03) 50%, transparent 100%)" }}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  Beispiele für{" "}
                  <span className="text-[#C7F011]">Partnerschaften</span>
                </h2>
                <p className="text-white/50 text-lg">Vom Equipment-Brand bis zur Lifestyle-Marke.</p>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-5">
                {useCases.map((u, i) => (
                  <motion.div
                    key={u.title}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group"
                    style={{ background: `linear-gradient(135deg, ${u.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: u.border }}
                    whileHover={{ boxShadow: `0 8px 40px ${u.glow}` }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: u.accent + "18", border: `1px solid ${u.accent}30` }}
                    >
                      <u.icon className="w-7 h-7" style={{ color: u.accent }} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{u.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{u.description}</p>
                    <ChevronRight
                      className="absolute bottom-6 right-6 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: u.accent }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CONCEPT ════════════════════════════════════════════════════════ */}
        <PartnerConceptSection />

        {/* ═══ KPI GRID ═══════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Warum PADEL2GO</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  Die{" "}
                  <span className="text-[#C7F011]">Zahlen</span>{" "}
                  sprechen
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {kpiCards.map((k, i) => (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    style={{ background: `linear-gradient(135deg, ${k.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: k.border }}
                    whileHover={{ boxShadow: `0 8px 40px ${k.glow}` }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: k.accent + "18", border: `1px solid ${k.accent}30` }}
                    >
                      <k.icon className="w-6 h-6" style={{ color: k.accent }} />
                    </div>
                    <div className="text-3xl font-black text-white mb-1" style={{ color: k.accent }}>{k.value}</div>
                    <div className="text-sm font-bold text-white mb-2">{k.label}</div>
                    <p className="text-white/45 text-xs leading-relaxed">{k.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CALENDLY CTA ═══════════════════════════════════════════════════ */}
        <section id="calendly" className={`${SECTION} relative overflow-hidden`}>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.1) 0%, transparent 65%)" }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-3xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Let's Talk</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  Padel als neuen{" "}
                  <span className="text-[#C7F011]">Brand-Channel</span>{" "}
                  öffnen
                </h2>
                <p className="text-white/55 text-lg leading-relaxed">
                  Lass uns gemeinsam prüfen, wie PADEL2GO in deine Markenstrategie passt —
                  von nationaler Sichtbarkeit bis hyperlokalen Aktivierungen.
                </p>
              </motion.div>

              {/* Calendly embed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl overflow-hidden border border-white/12 mb-10 shadow-[0_0_60px_rgba(199,240,17,0.06)]"
              >
                <iframe
                  src="https://calendly.com/fsteinfelder-padel2go/marketing-padel2go"
                  width="100%"
                  height="700"
                  frameBorder="0"
                  title="Termin buchen"
                />
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <NavLink
                  to="/faq-kontakt?reason=partner"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all shadow-[0_0_30px_rgba(199,240,17,0.3)] w-full sm:w-auto"
                >
                  Partner-Deck anfragen
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
                <NavLink
                  to="/faq-kontakt?reason=partner"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold w-full sm:w-auto"
                >
                  Direkt Kontakt aufnehmen
                </NavLink>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default FuerPartner;

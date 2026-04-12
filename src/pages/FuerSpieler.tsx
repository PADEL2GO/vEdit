import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BrandName from "@/components/BrandName";
import { NavLink } from "@/components/NavLink";
import { EXPERT_LEVELS } from "@/lib/expertLevels";
import fuerSpielerHero from "@/assets/fuer-spieler-hero.png";
import { Badge } from "@/components/ui/badge";
import { useSiteVisual } from "@/hooks/useSiteVisuals";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import {
  ArrowRight, Smartphone, MapPin, Zap, Calendar,
  Gift, Coins, BarChart3, Sparkles,
  Wallet, ShoppingBag, Target, Brain, Flame, Award,
  Activity, Video, Dumbbell, LineChart, Users,
  Camera, UserPlus, Trophy, CreditCard, Play,
  CheckCircle, Star, ChevronRight
} from "lucide-react";

// ─── Hero background: video URL → autoplay iframe/video; image URL → img; fallback → static asset ─
const HeroBackground = ({ fallbackSrc }: { fallbackSrc: string }) => {
  const { data: videoVisual } = useSiteVisual("fuer-spieler.hero.video");
  const { data: imageVisual } = useSiteVisual("fuer-spieler.hero.image");

  const videoUrl = videoVisual?.image_url;
  const imageUrl = imageVisual?.image_url;

  if (videoUrl) {
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
    const vmMatch = videoUrl.match(/vimeo\.com\/(\d+)/);

    if (ytMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&rel=0&modestbranding=1&playsinline=1`}
          allow="autoplay; encrypted-media"
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
          style={{ transform: "scale(1.1)" }}
          title="Hero background"
        />
      );
    }
    if (vmMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vmMatch[1]}?background=1&autoplay=1&loop=1&muted=1`}
          allow="autoplay"
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
          style={{ transform: "scale(1.1)" }}
          title="Hero background"
        />
      );
    }
    // Direct video URL (.mp4 etc.)
    return (
      <video
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />
    );
  }

  // Image fallback (admin-uploaded or static asset)
  return (
    <img
      src={imageUrl || fallbackSrc}
      alt=""
      className="absolute inset-0 w-full h-full object-cover object-[center_30%] z-0"
    />
  );
};

// ─── Inline video player – YouTube / Vimeo / image fallback ──────────────────
const VideoEmbed = ({ visualKey, title }: { visualKey: string; title: string }) => {
  const { data: visual } = useSiteVisual(visualKey);
  const url = visual?.image_url;

  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 bg-white/3">
        <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Play className="w-9 h-9 text-primary ml-1" />
        </div>
        <p className="text-white/50 text-xs text-center font-medium">
          Video konfigurierbar im Admin-Panel
        </p>
      </div>
    );
  }

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&color=white`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    );
  }
  if (vmMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vmMatch[1]}?color=C7F011`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    );
  }
  return <img src={url} alt={title} className="w-full h-full object-cover" />;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const expertLevels = EXPERT_LEVELS.map(level => ({
  name: level.name,
  points: level.maxPoints === Infinity
    ? `${level.minPoints.toLocaleString("de-DE")}+`
    : `${level.minPoints.toLocaleString("de-DE")} – ${level.maxPoints.toLocaleString("de-DE")}`,
  gradient: level.gradient,
  emoji: level.name === "Beginner" ? "🌱"
    : level.name === "Rookie" ? "🎾"
    : level.name === "Player" ? "⚡"
    : level.name === "Expert" ? "🔥"
    : level.name === "Pro" ? "💎"
    : level.name === "Master" ? "👑"
    : level.name === "Champion" ? "🏆" : "🌟",
}));

const p2gCreditCards = [
  {
    icon: Calendar,
    title: "Punkte bei jeder Buchung",
    description: "Automatisch P2G Points bei jeder Court-Buchung – ohne extra Aufwand.",
    accent: "text-[#C7F011]",
    glow: "shadow-[0_0_30px_rgba(199,240,17,0.15)]",
    border: "border-[#C7F011]/20 hover:border-[#C7F011]/50",
    iconBg: "bg-[#C7F011]/10",
  },
  {
    icon: Flame,
    title: "Buchungsstreaks",
    description: "Buche regelmäßig und erhalte Bonus-Points durch Streaks.",
    accent: "text-orange-400",
    glow: "shadow-[0_0_30px_rgba(251,146,60,0.12)]",
    border: "border-orange-500/20 hover:border-orange-500/50",
    iconBg: "bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Freunde & Matches",
    description: "Lade Freunde ein und verdiene Points durch gemeinsame Spiele.",
    accent: "text-violet-400",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.12)]",
    border: "border-violet-500/20 hover:border-violet-500/50",
    iconBg: "bg-violet-500/10",
  },
];

const marketplaceItems = [
  { icon: Calendar, title: "Court-Buchungen", sub: "Spielzeit einlösen", accent: "text-[#C7F011]", bg: "bg-[#C7F011]/8", border: "border-[#C7F011]/20" },
  { icon: Dumbbell, title: "Equipment", sub: "Schläger, Bälle, Zubehör", accent: "text-sky-400", bg: "bg-sky-500/8", border: "border-sky-500/20" },
  { icon: Gift, title: "Partner-Rewards", sub: "Getränke, Snacks, Rabatte", accent: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  { icon: Award, title: "Events", sub: "Exklusive Turnier-Zugänge", accent: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/20" },
];

const kiStats = [
  { value: "2×", label: "Kameras pro Court" },
  { value: "100%", label: "Automatisch" },
  { value: "Live", label: "Echtzeit-Analyse" },
];

const kiFeatures = [
  { icon: Activity, title: "Echtzeit-Tracking", desc: "Jeder Move live erfasst", color: "text-[#C7F011]" },
  { icon: LineChart, title: "Match-Statistiken", desc: "Detaillierte Auswertung", color: "text-sky-400" },
  { icon: Target, title: "Schwächen erkennen", desc: "Gezielte Verbesserung", color: "text-orange-400" },
  { icon: Video, title: "Video-Highlights", desc: "Beste Momente gespeichert", color: "text-violet-400" },
  { icon: Brain, title: "Training-Tipps", desc: "Personalisierte Empfehlungen", color: "text-pink-400" },
  { icon: LineChart, title: "Fortschritt", desc: "Entwicklung über Zeit", color: "text-amber-400" },
];

const appFeatures = [
  { icon: Calendar, title: "Court-Buchung", desc: "Echtzeit-Verfügbarkeit, sofort buchen.", comingSoon: false, color: "text-[#C7F011]", bg: "bg-[#C7F011]/8", border: "border-[#C7F011]/20" },
  { icon: Target, title: "Score & KI-Analyse", desc: "Spielergebnisse und Performance-Daten.", comingSoon: false, color: "text-sky-400", bg: "bg-sky-500/8", border: "border-sky-500/20" },
  { icon: Users, title: "Spielerprofile", desc: "Spielhistorie, Stats, Skill-Level.", comingSoon: false, color: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/20" },
  { icon: Trophy, title: "Liga", desc: "EU-weite Ranglisten und Spielpaarungen.", comingSoon: true, color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  { icon: Wallet, title: "P2G Wallet", desc: "Points-Überblick und Prämien einlösen.", comingSoon: false, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
  { icon: UserPlus, title: "Matching-Tool", desc: "Mitspieler finden, automatisch gematcht.", comingSoon: true, color: "text-pink-400", bg: "bg-pink-500/8", border: "border-pink-500/20" },
];

const aiFeatures = [
  { icon: Camera, title: "Live-Kamera-Tracking", desc: "Automatisch erfasst – keine manuelle Eingabe." },
  { icon: Activity, title: "Distance Tracking", desc: "Gelaufene Distanz pro Match." },
  { icon: BarChart3, title: "Zonen-Coverage", desc: "Court-Positionierung visualisiert." },
  { icon: Video, title: "Video-Highlights", desc: "Beste Ballwechsel automatisch geclippt." },
  { icon: Brain, title: "KI-Spielanalyse", desc: "Persönliche Tipps aus deinen Match-Daten." },
  { icon: Target, title: "Schlaganalyse", desc: "Aufschläge, Bandeja, Lobs ausgewertet." },
];

const bookingSteps = [
  { step: "01", icon: MapPin, title: "Standort wählen", desc: "Court in der Nähe finden." },
  { step: "02", icon: Calendar, title: "Slot sichern", desc: "Datum, Uhrzeit, Dauer." },
  { step: "03", icon: CreditCard, title: "Bezahlen & spielen", desc: "Apple Pay, Google Pay, Karte." },
];

// ─── Marketplace banner – admin-uploadable image with fallback placeholder ────
const MarketplaceBanner = () => {
  const { data: visual } = useSiteVisual("fuer-spieler.marketplace.banner");
  if (!visual?.image_url) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 w-full h-40 rounded-3xl border border-amber-500/20 flex items-center justify-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 100%)" }}
      >
        <ShoppingBag className="w-8 h-8 text-amber-400/30" />
        <span className="text-amber-400/30 text-sm font-medium">Marketplace Banner — im Admin-Panel hochladen</span>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12 w-full rounded-3xl overflow-hidden border border-amber-500/20"
      style={{ maxHeight: 200 }}
    >
      <img src={visual.image_url} alt="Marketplace" className="w-full h-full object-cover" />
    </motion.div>
  );
};

// ─── KI App Screenshot – shown next to Wingfield action shot ─────────────────
const WingfieldActionVisual = () => {
  const { data: visual } = useSiteVisual("fuer-spieler.wingfield.action");
  if (!visual?.image_url) {
    return (
      <div className="w-full aspect-video rounded-2xl border border-dashed border-emerald-500/25 flex flex-col items-center justify-center gap-3"
        style={{ background: "rgba(63,187,125,0.04)" }}>
        <Camera className="w-10 h-10 text-emerald-400/25" />
        <span className="text-emerald-400/30 text-xs font-medium text-center px-4">Wingfield Action-Shot<br/>im Admin-Panel hochladen</span>
      </div>
    );
  }
  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-emerald-500/20">
      <img src={visual.image_url} alt="Wingfield Court" className="w-full h-full object-cover" />
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const SECTION = "py-20 md:py-28";
const CONTAINER = "container mx-auto px-4 sm:px-6";
const CONTENT = "max-w-6xl mx-auto";
const HEADING_CENTER = "max-w-2xl mx-auto text-center";

const FuerSpieler = () => {
  const { data: partnerTiles } = usePartnerTiles(true);
  const wingfield = partnerTiles?.find(t => t.slug === "wingfield");

  return (
    <>
      <Helmet>
        <title>Für Spieler | PADEL2GO – Buche Courts, sammle P2G-Credits, löse Rewards ein</title>
        <meta name="description" content="Mit PADEL2GO buchst du Courts in Sekunden, sammelst P2G-Credits und löst sie im Marketplace ein." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 overflow-x-hidden">

        {/* ═══════════════════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background – video or image, admin-manageable */}
          <HeroBackground fallbackSrc={fuerSpielerHero} />
          {/* Dark + lime gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black z-[1]" />
          {/* Radial lime glow – top-center */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] z-[2] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.18) 0%, transparent 65%)" }}
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
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-widest uppercase">Für Spieler</span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-7 text-white">
                  Dein Spiel.{" "}
                  <span className="text-[#C7F011]">Deine Daten.</span>
                  <br />
                  Deine Rewards.
                </h1>

                <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                  Court buchen in Sekunden, KI analysiert dein Match,
                  P2G Points landen automatisch in deinem Wallet —
                  einlösbar für Equipment, Spielzeit und mehr.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                  <NavLink
                    to="/booking"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all min-h-[52px] shadow-[0_0_40px_rgba(199,240,17,0.45)] hover:shadow-[0_0_60px_rgba(199,240,17,0.6)] w-full sm:w-auto"
                  >
                    <MapPin className="w-5 h-5" />
                    Court buchen
                    <ArrowRight className="w-5 h-5" />
                  </NavLink>
                  <NavLink
                    to="/app-booking"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold text-base backdrop-blur-sm min-h-[52px] w-full sm:w-auto"
                  >
                    <Smartphone className="w-5 h-5" />
                    App herunterladen
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
                    { icon: CheckCircle, text: "Kostenlose Registrierung" },
                    { icon: Zap, text: "Buchung in < 30 Sek." },
                    { icon: Star, text: "EU-weite P2G Liga" },
                    { icon: Gift, text: "Marketplace & Rewards" },
                  ].map((c) => (
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

        {/* ═══════════════════════════════════════════════════════════════════
            ÖKOSYSTEM – 3 STEPS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-16`}
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Das Ökosystem</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  Vom Match zur{" "}
                  <span className="text-[#C7F011]">Belohnung</span>
                </h2>
                <p className="text-white/55 text-lg">Jede Buchung, jedes Match, jeder Punkt zählt – automatisch.</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    num: "01", icon: Calendar, tag: "Buchen",
                    title: "Court in Sekunden buchen",
                    desc: "Standort wählen, Slot sichern, bezahlen — alles in der App oder im Browser.",
                    accent: "#C7F011",
                    glow: "rgba(199,240,17,0.12)",
                    border: "rgba(199,240,17,0.25)",
                  },
                  {
                    num: "02", icon: Camera, tag: "Analysieren",
                    title: "KI erfasst dein Spiel",
                    desc: "Wingfield-Kameras tracken Heatmap, Schläge und Match-Score — live, automatisch.",
                    accent: "#38bdf8",
                    glow: "rgba(56,189,248,0.12)",
                    border: "rgba(56,189,248,0.25)",
                  },
                  {
                    num: "03", icon: Coins, tag: "Verdienen",
                    title: "P2G Points sammeln",
                    desc: "Je besser du spielst, desto mehr Points. Einlösbar für Equipment, Spielzeit und Events.",
                    accent: "#fbbf24",
                    glow: "rgba(251,191,36,0.12)",
                    border: "rgba(251,191,36,0.25)",
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.num}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(135deg, ${s.glow} 0%, rgba(255,255,255,0.02) 100%)`,
                      borderColor: s.border,
                      boxShadow: `0 0 0 0 transparent`,
                    }}
                    whileHover={{ boxShadow: `0 8px 40px ${s.glow}` }}
                  >
                    {/* Background number */}
                    <span
                      className="absolute top-5 right-6 text-6xl font-black leading-none select-none"
                      style={{ color: `${s.accent}08` }}
                    >
                      {s.num}
                    </span>

                    {/* Icon */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: `${s.accent}18`, border: `1px solid ${s.accent}30` }}
                    >
                      <s.icon className="w-7 h-7" style={{ color: s.accent }} />
                    </div>

                    {/* Tag */}
                    <span
                      className="text-xs font-bold tracking-widest uppercase block mb-2"
                      style={{ color: s.accent }}
                    >
                      {s.tag}
                    </span>

                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>

                    {i < 2 && (
                      <ChevronRight
                        className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 z-10"
                        style={{ color: s.accent, opacity: 0.4 }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            APP HUB
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="booking" className={`${SECTION} relative overflow-hidden`}
          style={{ background: "linear-gradient(180deg, #000 0%, #030a00 50%, #000 100%)" }}
        >
          {/* Radial glow – left for text, right for phone */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 75% 50%, rgba(199,240,17,0.07) 0%, transparent 55%)" }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(199,240,17,0.04) 0%, transparent 45%)" }} />

          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

                {/* LEFT */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="order-2 lg:order-1"
                >
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wider uppercase">Alles in einer App</span>
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                    Dein{" "}
                    <span className="text-[#C7F011]">All-in-one</span>
                    <br />Padel-Hub
                  </h2>
                  <p className="text-white/55 leading-relaxed mb-10 text-lg">
                    Courts buchen, Stats tracken, Rewards einlösen — alles an einem Ort.
                  </p>

                  {/* Feature grid — 3 rows, icon + title + desc */}
                  <div className="space-y-4 mb-10">
                    {[
                      {
                        icon: Calendar,
                        title: "Buchen in unter 30 Sekunden",
                        desc: "Standort wählen, Slot sichern, bezahlen — direkt in der App oder im Browser.",
                        color: "text-[#C7F011]", bg: "bg-[#C7F011]/10", border: "border-[#C7F011]/20",
                      },
                      {
                        icon: BarChart3,
                        title: "Stats, Heatmaps & Match-Analyse",
                        desc: "KI-Kameras erfassen dein Spiel automatisch — nach dem Match direkt in deinem Profil.",
                        color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20",
                      },
                      {
                        icon: Coins,
                        title: "P2G Points & Rewards",
                        desc: "Jede Buchung bringt Credits. Einlösbar für Equipment, Spielzeit und Turnier-Zugänge.",
                        color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20",
                      },
                    ].map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                        className={`flex items-start gap-4 p-4 rounded-2xl border ${f.border} transition-all hover:bg-white/3`}
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <f.icon className={`w-5 h-5 ${f.color}`} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                          <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <NavLink
                      to="/booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#C7F011] text-black font-black hover:bg-[#d4f530] transition-all shadow-[0_0_30px_rgba(199,240,17,0.35)] hover:shadow-[0_0_50px_rgba(199,240,17,0.5)]"
                    >
                      Jetzt buchen <ArrowRight className="w-5 h-5" />
                    </NavLink>
                    <NavLink
                      to="/app-booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/15 hover:border-white/30 text-white transition-all font-semibold"
                    >
                      <Smartphone className="w-5 h-5" /> App herunterladen
                    </NavLink>
                  </div>
                </motion.div>

                {/* RIGHT – Phone Mockup + floating cards */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="order-1 lg:order-2 flex justify-center"
                >
                  <div className="relative w-[300px] md:w-[340px]">
                    {/* Glow behind phone */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none"
                      style={{ background: "rgba(199,240,17,0.10)" }} />

                    {/* Phone shell */}
                    <div className="relative w-60 md:w-[272px] h-[520px] md:h-[570px] rounded-[3.5rem] border-[3px] overflow-hidden shadow-2xl mx-auto"
                      style={{ background: "linear-gradient(180deg, #111 0%, #080808 100%)", borderColor: "#242424", boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)" }}>
                      {/* Notch */}
                      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[72px] h-[22px] rounded-full z-10"
                        style={{ background: "#060606", border: "1px solid #1e1e1e" }} />
                      {/* Status bar */}
                      <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-end justify-between px-6 pb-1.5">
                        <span className="text-[9px] font-bold text-white/30">9:41</span>
                        <div className="flex gap-1 items-center">
                          <div className="w-3 h-1.5 rounded-sm bg-white/20" />
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                        </div>
                      </div>

                      <div className="p-4 pt-14 h-full flex flex-col gap-3">
                        {/* App header */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-black tracking-tight">
                            PADEL<span className="text-[#C7F011]">2</span>GO
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-black bg-[#C7F011] px-2 py-0.5 rounded-full font-stat">247 pts</span>
                          </div>
                        </div>

                        {/* Search bar */}
                        <div className="h-11 rounded-2xl flex items-center px-4 gap-3"
                          style={{ background: "#C7F011" }}>
                          <MapPin className="w-4 h-4 text-black shrink-0" />
                          <span className="text-xs font-bold text-black flex-1">Standort suchen...</span>
                          <div className="w-7 h-7 rounded-xl bg-black/15 flex items-center justify-center">
                            <ArrowRight className="w-3.5 h-3.5 text-black" />
                          </div>
                        </div>

                        {/* Court availability card */}
                        <div className="p-4 rounded-2xl" style={{ background: "#141414", border: "1px solid #252525" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(199,240,17,0.15)" }}>
                                <Zap className="w-4 h-4 text-[#C7F011]" />
                              </div>
                              <div>
                                <p className="font-black text-white text-[11px]">
                                  P2GO <span className="text-[#C7F011]">München</span>
                                </p>
                                <p className="text-[9px] text-white/35">3 Courts frei</p>
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-[#C7F011] animate-pulse" />
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { t: "10:00", active: false },
                              { t: "11:30", active: true },
                              { t: "14:00", active: false },
                              { t: "16:30", active: false },
                            ].map(({ t, active }) => (
                              <div key={t} className="py-2 rounded-xl text-[10px] font-black text-center transition-all"
                                style={active
                                  ? { background: "#C7F011", color: "#000", boxShadow: "0 0 12px rgba(199,240,17,0.4)" }
                                  : { background: "#1c1c1c", color: "#555" }
                                }
                              >
                                {t}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats mini */}
                        <div className="p-3.5 rounded-2xl" style={{ background: "#141414", border: "1px solid #252525" }}>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-white text-[11px] font-bold">Deine Woche</span>
                            <BarChart3 className="w-3.5 h-3.5 text-[#C7F011]" />
                          </div>
                          <div className="flex items-end gap-1.5 h-10">
                            {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                              <div key={i} className="flex-1 rounded-sm transition-all"
                                style={{
                                  height: `${h}%`,
                                  background: i === 5 ? "#C7F011" : "rgba(199,240,17,0.2)",
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between mt-1.5">
                            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, i) => (
                              <span key={d} className="text-[8px] font-medium flex-1 text-center"
                                style={{ color: i === 5 ? "#C7F011" : "#444" }}>{d}</span>
                            ))}
                          </div>
                        </div>

                        {/* CTA button */}
                        <div className="h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-black text-sm mt-auto"
                          style={{ background: "linear-gradient(135deg, #C7F011 0%, #a8d00f 100%)", boxShadow: "0 4px 20px rgba(199,240,17,0.3)" }}>
                          <Calendar className="w-4 h-4" /> Court buchen
                        </div>
                      </div>
                    </div>

                    {/* Floating notification card — top right */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, x: 10 }}
                      whileInView={{ opacity: 1, y: 0, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="absolute -top-4 -right-6 md:-right-10 p-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-xl z-20"
                      style={{ background: "rgba(20,20,20,0.92)", minWidth: 150 }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#C7F011]/15 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-[#C7F011]" />
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-bold font-stat">+50 P2G Points!</p>
                          <p className="text-white/40 text-[9px]">Match abgeschlossen</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Floating stats card — bottom left */}
                    <motion.div
                      initial={{ opacity: 0, y: 10, x: -10 }}
                      whileInView={{ opacity: 1, y: 0, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.65, duration: 0.5 }}
                      className="absolute -bottom-4 -left-6 md:-left-10 p-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-xl z-20"
                      style={{ background: "rgba(20,20,20,0.92)", minWidth: 140 }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-sky-400" />
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-bold">Skill: Expert</p>
                          <p className="text-white/40 text-[9px]">↑ 3 Plätze diese Woche</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            P2G POINTS
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="p2g-points" className={`${SECTION} relative overflow-hidden`}
          style={{ background: "linear-gradient(180deg, #000 0%, #0a0f00 50%, #000 100%)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(199,240,17,0.06) 0%, transparent 65%)" }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-16`}
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">P2G Points</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  Sammle <span className="text-[#C7F011]">P2G-Credits</span>
                  <br />mit jedem Match
                </h2>
                <p className="text-white/55 text-lg leading-relaxed">
                  Dein Belohnungssystem — automatisch bei jeder Buchung,
                  jedem Match und jedem Streak gutgeschrieben.
                </p>
              </motion.div>

              {/* Earn cards */}
              <div className="grid md:grid-cols-3 gap-5 mb-16">
                {p2gCreditCards.map((c, i) => (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    className={`p-8 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${c.border} text-center`}
                    style={{ background: "rgba(255,255,255,0.03)" }}
                    whileHover={{ boxShadow: c.glow.replace("shadow-[", "").replace("]", "") }}
                  >
                    <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center mx-auto mb-6`}>
                      <c.icon className={`w-8 h-8 ${c.accent}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{c.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{c.description}</p>
                  </motion.div>
                ))}
              </div>

              {/* Expert Level Tiers */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl border border-white/8"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Dein Expert-Level bestimmt deinen{" "}
                    <span className="text-[#C7F011]">Multiplikator</span>
                  </h3>
                  <p className="text-white/45 text-sm">Von Beginner bis Padel Legend – jede Stufe bringt mehr Points.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
                  {expertLevels.map((lvl, i) => (
                    <motion.div
                      key={lvl.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.08, y: -2 }}
                      className={`p-3 md:p-4 rounded-2xl bg-gradient-to-br ${lvl.gradient} text-center cursor-default`}
                    >
                      <span className="text-2xl md:text-3xl block mb-1">{lvl.emoji}</span>
                      <p className="text-xs md:text-sm font-bold text-white">{lvl.name}</p>
                      <p className="text-[9px] md:text-[10px] text-white/60 mt-0.5 font-stat">{lvl.points}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <NavLink
                    to="/rewards"
                    className="inline-flex items-center gap-2 text-[#C7F011] text-sm font-bold hover:gap-3 transition-all"
                  >
                    Mehr über P2G Points erfahren <ArrowRight className="w-4 h-4" />
                  </NavLink>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MARKETPLACE
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="marketplace" className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-16`}
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-400 mb-6">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Marketplace</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  Points einlösen —{" "}
                  <span className="text-amber-400">echter Wert</span>
                </h2>
                <p className="text-white/55 text-lg">Von Court-Zeit bis zu exklusivem Equipment.</p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                {marketplaceItems.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className={`p-8 rounded-3xl ${item.bg} border ${item.border} hover:border-opacity-60 transition-all duration-300 text-center`}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5`}>
                      <item.icon className={`w-8 h-8 ${item.accent}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-white/45 text-sm">{item.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Marketplace Banner Visual */}
              <MarketplaceBanner />

              <div className="text-center">
                <NavLink
                  to="/dashboard/marketplace"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-amber-400 text-black font-black hover:bg-amber-300 transition-all shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)]"
                >
                  Zum Marketplace <ArrowRight className="w-5 h-5" />
                </NavLink>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            KI-ANALYSE
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="ki-analyse" className={`${SECTION} relative overflow-hidden`}
          style={{ background: "linear-gradient(180deg, #000 0%, #00050f 50%, #000 100%)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(56,189,248,0.06) 0%, transparent 60%)" }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <div className="grid lg:grid-cols-2 gap-14 items-start">

                {/* LEFT – heading + stats */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                >
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-500/12 border border-sky-500/25 text-sky-400 mb-6">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wider uppercase">KI-Analyse</span>
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">
                    Deine Performance.
                    <br />
                    <span className="text-sky-400">Live analysiert.</span>
                  </h2>
                  <p className="text-white/55 leading-relaxed mb-8 text-lg">
                    Wingfield KI-Kameras erfassen jeden deiner Moves.
                    Nach dem Match: detaillierte Statistiken, Heatmaps und
                    personalisierte Empfehlungen — direkt in der App.
                  </p>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {kiStats.map(s => (
                      <div key={s.label} className="p-4 rounded-2xl border border-sky-500/15 text-center"
                        style={{ background: "rgba(56,189,248,0.05)" }}>
                        <p className="text-2xl font-black text-sky-400 mb-1 font-stat">{s.value}</p>
                        <p className="text-white/45 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Training card */}
                  <div className="p-6 rounded-2xl border border-sky-500/20"
                    style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.02) 100%)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-sky-400" />
                      </div>
                      <h3 className="text-base font-bold text-white">Konkrete Verbesserungsvorschläge</h3>
                    </div>
                    <p className="text-white/45 text-sm leading-relaxed mb-4">
                      Nicht Bauchgefühl, sondern Daten. Die KI zeigt dir genau,
                      was du trainieren musst.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {["Schlaganalyse", "Heatmaps", "Laufwege", "Reaktionszeit"].map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <NavLink
                      to="/auth"
                      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-sky-400 text-black font-black text-sm hover:bg-sky-300 transition-all shadow-[0_0_25px_rgba(56,189,248,0.35)] hover:shadow-[0_0_40px_rgba(56,189,248,0.5)]"
                    >
                      Jetzt registrieren <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </div>
                </motion.div>

                {/* RIGHT – feature grid */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {kiFeatures.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="p-5 rounded-2xl border border-white/6 hover:border-white/15 transition-all group"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-white/8 flex items-center justify-center mb-3 transition-colors">
                        <f.icon className={`w-5 h-5 ${f.color}`} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                      <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            APP FEATURES
        ═══════════════════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-16`}
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-violet-500/12 border border-violet-500/25 text-violet-400 mb-6">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Die App</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  Was die <BrandName /> App{" "}
                  <span className="text-violet-400">kann</span>
                </h2>
                <p className="text-white/55 text-lg">Buchung, Stats, Loyalty — manche Features kommen bald.</p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
                {appFeatures.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                      f.comingSoon
                        ? "border-white/6 opacity-60"
                        : `${f.border} hover:scale-[1.02] hover:-translate-y-1`
                    } ${f.bg}`}
                  >
                    {f.comingSoon && (
                      <Badge
                        variant="secondary"
                        className="absolute top-4 right-4 text-[10px] font-bold bg-white/8 text-white/50 border-white/10"
                      >
                        Coming Soon
                      </Badge>
                    )}
                    <div className={`w-12 h-12 rounded-xl ${f.comingSoon ? "bg-white/5" : "bg-white/8"} flex items-center justify-center mb-4`}>
                      <f.icon className={`w-6 h-6 ${f.comingSoon ? "text-white/25" : f.color}`} />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${f.comingSoon ? "text-white/35" : "text-white"}`}>{f.title}</h3>
                    <p className={`text-sm leading-relaxed ${f.comingSoon ? "text-white/25" : "text-white/50"}`}>{f.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Booking Flow */}
              <div className="p-8 rounded-3xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <h3 className="text-xl font-bold text-white text-center mb-8">
                  Court buchen in{" "}
                  <span className="text-[#C7F011]">3 Schritten</span>
                </h3>
                <div className="grid md:grid-cols-3 gap-5">
                  {bookingSteps.map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className="relative text-center p-6 rounded-2xl border border-white/6 hover:border-[#C7F011]/25 transition-all"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      {i < bookingSteps.length - 1 && (
                        <div className="hidden md:block absolute top-10 left-[62%] w-[76%] h-px"
                          style={{ background: "linear-gradient(90deg, rgba(199,240,17,0.3), transparent)" }} />
                      )}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-black text-base"
                        style={{ background: "#C7F011", boxShadow: "0 0 20px rgba(199,240,17,0.4)" }}
                      >
                        {s.step}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center mx-auto mb-3">
                        <s.icon className="w-5 h-5 text-[#C7F011]" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                      <p className="text-white/40 text-sm">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="text-center mt-10">
                <NavLink
                  to="/app-booking"
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full bg-violet-500 text-white font-black hover:bg-violet-400 transition-all shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)]"
                >
                  <Smartphone className="w-5 h-5" />
                  App herunterladen
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            WINGFIELD KI-KAMERAS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className={`${SECTION} relative overflow-hidden`}
          style={{ background: "linear-gradient(180deg, #000 0%, #001a0d 50%, #000 100%)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(63,187,125,0.08) 0%, transparent 60%)" }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-12`}
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 mb-5">
                  <Camera className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">Coming Soon</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  <span className="text-emerald-400">KI-Kamera</span> Analyse
                </h2>
                <p className="text-white/55 mb-7 text-lg leading-relaxed">
                  Vollautomatische Spielanalyse auf dem Court —
                  ohne Sensoren, ohne manuelle Eingabe.
                </p>
                {/* Wingfield badge */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-white/40">Powered by</span>
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{ background: wingfield?.bg_color || "#3FBB7D" }}
                  >
                    {wingfield?.logo_url && (
                      <img src={wingfield.logo_url} alt="Wingfield" className="h-5 w-auto object-contain" />
                    )}
                    <span className="text-xs font-bold text-white">Wingfield</span>
                  </div>
                </div>
              </motion.div>

              {/* Video carousel */}
              <div className="grid md:grid-cols-2 gap-5 mb-12">
                {(["fuer-spieler.ki.video-1", "fuer-spieler.ki.video-2"] as const).map((key, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="aspect-video rounded-2xl overflow-hidden border"
                    style={{
                      borderColor: "rgba(63,187,125,0.25)",
                      background: "#0a1a0f",
                      boxShadow: "0 0 40px rgba(63,187,125,0.08)",
                    }}
                  >
                    <VideoEmbed visualKey={key} title={`KI-Kamera Demo ${i + 1}`} />
                  </motion.div>
                ))}
              </div>

              {/* AI features */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {aiFeatures.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="p-5 rounded-2xl border border-dashed border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/4 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/18 flex items-center justify-center shrink-0 transition-colors">
                        <f.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                        <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* How it works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl border border-emerald-500/20"
                style={{ background: "linear-gradient(135deg, rgba(63,187,125,0.07) 0%, rgba(63,187,125,0.02) 100%)" }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Camera className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">So funktioniert's</h3>
                </div>
                <p className="text-white/50 leading-relaxed">
                  An unseren Standorten werden Wingfield-Kameras installiert, die dein Spiel automatisch erfassen.
                  Die KI läuft im Hintergrund und liefert dir nach jedem Match detaillierte Statistiken,
                  Heatmaps und personalisierte Verbesserungsvorschläge direkt in der App —
                  einfach spielen und lernen.
                </p>
              </motion.div>

              {/* Wingfield court action shot */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-8"
              >
                <WingfieldActionVisual />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center mt-10"
              >
                <NavLink
                  to="/faq-kontakt"
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full border border-emerald-500/40 bg-emerald-500/8 text-emerald-400 font-black text-sm hover:bg-emerald-500/18 hover:border-emerald-500/60 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Benachrichtigt werden
                  <ArrowRight className="w-4 h-4" />
                </NavLink>
                <p className="text-white/30 text-xs mt-3">Wir informieren dich, sobald KI-Analyse an deinem Standort live geht.</p>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default FuerSpieler;

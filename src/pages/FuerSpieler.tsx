import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
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
  CheckCircle, Star, ChevronRight, Apple
} from "lucide-react";
import p2gAppIcon from "@/assets/p2g-app-icon.png";
import iphoneMockup from "@/assets/iphone-mockup.png";

// ─── Hero background: video URL → autoplay iframe/video; image URL → img; fallback → static asset ─
const HeroBackground = ({ fallbackSrc }: { fallbackSrc: string }) => {
  const { t } = useTranslation("spieler");
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
          title={t("video.heroTitle")}
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
          title={t("video.heroTitle")}
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

// ─── KI-Analyse section background video (ki.video-1, autoplay muted loop) ───
const KiSectionBackground = () => {
  const { t } = useTranslation("spieler");
  const { data: visual } = useSiteVisual("fuer-spieler.ki.video-1");
  const url = visual?.image_url;
  if (!url) return null;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&rel=0&modestbranding=1&playsinline=1`}
        allow="autoplay; encrypted-media"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scale(1.15)" }}
        title={t("video.kiTitle")}
      />
    );
  }
  if (vmMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vmMatch[1]}?background=1&autoplay=1&loop=1&muted=1`}
        allow="autoplay"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scale(1.15)" }}
        title={t("video.kiTitle")}
      />
    );
  }
  return (
    <video
      src={url}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover object-center"
    />
  );
};

// ─── Inline video player – YouTube / Vimeo / image fallback ──────────────────
const VideoEmbed = ({ visualKey, title }: { visualKey: string; title: string }) => {
  const { t } = useTranslation("spieler");
  const { data: visual } = useSiteVisual(visualKey);
  const url = visual?.image_url;

  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 bg-white/3">
        <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Play className="w-9 h-9 text-primary ml-1" />
        </div>
        <p className="text-white/50 text-xs text-center font-medium">
          {t("video.placeholder")}
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

const p2gCreditCardStyles = [
  {
    icon: Calendar,
    accent: "text-[#C7F011]",
    glow: "shadow-[0_0_30px_rgba(199,240,17,0.15)]",
    border: "border-[#C7F011]/20 hover:border-[#C7F011]/50",
    iconBg: "bg-[#C7F011]/10",
  },
  {
    icon: Flame,
    accent: "text-orange-400",
    glow: "shadow-[0_0_30px_rgba(251,146,60,0.12)]",
    border: "border-orange-500/20 hover:border-orange-500/50",
    iconBg: "bg-orange-500/10",
  },
  {
    icon: Users,
    accent: "text-violet-400",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.12)]",
    border: "border-violet-500/20 hover:border-violet-500/50",
    iconBg: "bg-violet-500/10",
  },
];

const marketplaceItemStyles = [
  { icon: Calendar, accent: "text-[#C7F011]", bg: "bg-[#C7F011]/8", border: "border-[#C7F011]/20" },
  { icon: Dumbbell, accent: "text-sky-400", bg: "bg-sky-500/8", border: "border-sky-500/20" },
  { icon: Gift, accent: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  { icon: Award, accent: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/20" },
];

const kiFeatureStyles = [
  { icon: Activity,   color: "text-[#C7F011]" },
  { icon: Target,     color: "text-sky-400" },
  { icon: LineChart,  color: "text-orange-400" },
  { icon: Brain,      color: "text-violet-400" },
  { icon: Video,      color: "text-pink-400" },
  { icon: Trophy,     color: "text-amber-400" },
];

const ecosystemStepStyles = [
  { icon: Calendar, accent: "#C7F011", glow: "rgba(199,240,17,0.12)", border: "rgba(199,240,17,0.25)" },
  { icon: Camera,   accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  { icon: Coins,    accent: "#fbbf24", glow: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
];

const appHubFeatureStyles = [
  { icon: Calendar,  color: "text-[#C7F011]", bg: "bg-[#C7F011]/10", border: "border-[#C7F011]/20" },
  { icon: BarChart3, color: "text-sky-400",   bg: "bg-sky-500/10",   border: "border-sky-500/20" },
  { icon: Coins,     color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
];

// ─── Marketplace banner – admin-uploadable image with fallback placeholder ────
const MarketplaceBanner = () => {
  const { t } = useTranslation("spieler");
  const { data: visual } = useSiteVisual("fuer-spieler.marketplace.banner");
  if (!visual?.image_url) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 w-full h-72 rounded-3xl border border-amber-500/20 flex items-center justify-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 100%)" }}
      >
        <ShoppingBag className="w-8 h-8 text-amber-400/30" />
        <span className="text-amber-400/30 text-sm font-medium">{t("marketplace.bannerPlaceholder")}</span>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12 w-full rounded-3xl overflow-hidden border border-amber-500/20"
      style={{ maxHeight: 260 }}
    >
      <img src={visual.image_url} alt={t("marketplace.bannerAlt")} className="w-full h-full object-cover" />
    </motion.div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const SECTION = "py-20 md:py-28";
const CONTAINER = "container mx-auto px-4 sm:px-6";
const CONTENT = "max-w-6xl mx-auto";
const HEADING_CENTER = "max-w-2xl mx-auto text-center";

const FuerSpieler = () => {
  const { t } = useTranslation("spieler");
  const { data: partnerTiles } = usePartnerTiles(true);
  const wingfield = partnerTiles?.find(t => t.slug === "wingfield");

  const heroChips = t("hero.chips", { returnObjects: true }) as Array<{ text: string }>;
  const heroChipIcons = [CheckCircle, Zap, Star, Gift];

  const ecosystemSteps = t("ecosystem.steps", { returnObjects: true }) as Array<{
    num: string; tag: string; title: string; desc: string;
  }>;

  const appHubFeatures = t("appHub.features", { returnObjects: true }) as Array<{
    title: string; desc: string;
  }>;

  const phoneDays = t("appHub.phone.days", { returnObjects: true }) as string[];

  const pointsCards = t("points.cards", { returnObjects: true }) as Array<{
    title: string; description: string;
  }>;

  const marketplaceItems = t("marketplace.items", { returnObjects: true }) as Array<{
    title: string; sub: string;
  }>;

  const kiStats = t("ki.stats", { returnObjects: true }) as Array<{
    value: string; label: string;
  }>;

  const kiFeatures = t("ki.features", { returnObjects: true }) as Array<{
    title: string; desc: string;
  }>;

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
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
                  <span className="text-sm font-bold tracking-widest uppercase">{t("hero.badge")}</span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-7 text-white">
                  {t("hero.titleLine1")}{" "}
                  <span className="text-[#C7F011]">{t("hero.titleHighlight")}</span>
                  <br />
                  {t("hero.titleLine2")}
                </h1>

                <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                  {t("hero.description")}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                  <NavLink
                    to="/booking"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all min-h-[52px] shadow-[0_0_40px_rgba(199,240,17,0.45)] hover:shadow-[0_0_60px_rgba(199,240,17,0.6)] w-full sm:w-auto"
                  >
                    <MapPin className="w-5 h-5" />
                    {t("hero.primaryCta")}
                    <ArrowRight className="w-5 h-5" />
                  </NavLink>
                  <NavLink
                    to="/app-booking"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold text-base backdrop-blur-sm min-h-[52px] w-full sm:w-auto"
                  >
                    <Smartphone className="w-5 h-5" />
                    {t("hero.secondaryCta")}
                  </NavLink>
                </div>

                {/* Trust chips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  {heroChips.map((c, i) => {
                    const Icon = heroChipIcons[i] ?? CheckCircle;
                    return (
                      <span
                        key={c.text}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/12 text-white/55 text-xs font-medium backdrop-blur-sm"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#C7F011]" />
                        {c.text}
                      </span>
                    );
                  })}
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
                  <span className="text-sm font-bold tracking-wider uppercase">{t("ecosystem.badge")}</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("ecosystem.titlePrefix")}{" "}
                  <span className="text-[#C7F011]">{t("ecosystem.titleHighlight")}</span>
                </h2>
                <p className="text-white/55 text-lg">{t("ecosystem.subtitle")}</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {ecosystemSteps.map((s, i) => {
                  const style = ecosystemStepStyles[i];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={s.num}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                      style={{
                        background: `linear-gradient(135deg, ${style.glow} 0%, rgba(255,255,255,0.02) 100%)`,
                        borderColor: style.border,
                        boxShadow: `0 0 0 0 transparent`,
                      }}
                      whileHover={{ boxShadow: `0 8px 40px ${style.glow}` }}
                    >
                      {/* Background number */}
                      <span
                        className="absolute top-5 right-6 text-6xl font-black leading-none select-none"
                        style={{ color: `${style.accent}08` }}
                      >
                        {s.num}
                      </span>

                      {/* Icon */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                        style={{ background: `${style.accent}18`, border: `1px solid ${style.accent}30` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: style.accent }} />
                      </div>

                      {/* Tag */}
                      <span
                        className="text-xs font-bold tracking-widest uppercase block mb-2"
                        style={{ color: style.accent }}
                      >
                        {s.tag}
                      </span>

                      <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>

                      {i < 2 && (
                        <ChevronRight
                          className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 z-10"
                          style={{ color: style.accent, opacity: 0.4 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
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
                    <span className="text-sm font-bold tracking-wider uppercase">{t("appHub.badge")}</span>
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                    {t("appHub.titlePrefix")}{" "}
                    <span className="text-[#C7F011]">{t("appHub.titleHighlight")}</span>
                    <br />{t("appHub.titleSuffix")}
                  </h2>
                  <p className="text-white/55 leading-relaxed mb-10 text-lg">
                    {t("appHub.subtitle")}
                  </p>

                  {/* Feature grid — 3 rows, icon + title + desc */}
                  <div className="space-y-4 mb-10">
                    {appHubFeatures.map((f, i) => {
                      const style = appHubFeatureStyles[i];
                      const Icon = style.icon;
                      return (
                        <motion.div
                          key={f.title}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                          className={`flex items-start gap-4 p-4 rounded-2xl border ${style.border} transition-all hover:bg-white/3`}
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          <div className={`w-11 h-11 rounded-xl ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`w-5 h-5 ${style.color}`} />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                            <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <NavLink
                      to="/booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#C7F011] text-black font-black hover:bg-[#d4f530] transition-all shadow-[0_0_30px_rgba(199,240,17,0.35)] hover:shadow-[0_0_50px_rgba(199,240,17,0.5)]"
                    >
                      {t("appHub.primaryCta")} <ArrowRight className="w-5 h-5" />
                    </NavLink>
                    <NavLink
                      to="/app-booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/15 hover:border-white/30 text-white transition-all font-semibold"
                    >
                      <Smartphone className="w-5 h-5" /> {t("appHub.secondaryCta")}
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
                            <span className="text-[10px] font-black text-black bg-[#C7F011] px-2 py-0.5 rounded-full font-stat">{t("appHub.phone.points")}</span>
                          </div>
                        </div>

                        {/* Search bar */}
                        <div className="h-11 rounded-2xl flex items-center px-4 gap-3"
                          style={{ background: "#C7F011" }}>
                          <MapPin className="w-4 h-4 text-black shrink-0" />
                          <span className="text-xs font-bold text-black flex-1">{t("appHub.phone.search")}</span>
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
                                  P2GO <span className="text-[#C7F011]">{t("appHub.phone.city")}</span>
                                </p>
                                <p className="text-[9px] text-white/35">{t("appHub.phone.freeCourts")}</p>
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
                            <span className="text-white text-[11px] font-bold">{t("appHub.phone.week")}</span>
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
                            {phoneDays.map((d, i) => (
                              <span key={d} className="text-[8px] font-medium flex-1 text-center"
                                style={{ color: i === 5 ? "#C7F011" : "#444" }}>{d}</span>
                            ))}
                          </div>
                        </div>

                        {/* CTA button */}
                        <div className="h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-black text-sm mt-auto"
                          style={{ background: "linear-gradient(135deg, #C7F011 0%, #a8d00f 100%)", boxShadow: "0 4px 20px rgba(199,240,17,0.3)" }}>
                          <Calendar className="w-4 h-4" /> {t("appHub.phone.ctaButton")}
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
                          <p className="text-white text-[10px] font-bold font-stat">{t("appHub.phone.notification.title")}</p>
                          <p className="text-white/40 text-[9px]">{t("appHub.phone.notification.subtitle")}</p>
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
                          <p className="text-white text-[10px] font-bold">{t("appHub.phone.skill.title")}</p>
                          <p className="text-white/40 text-[9px]">{t("appHub.phone.skill.subtitle")}</p>
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
                  <span className="text-sm font-bold tracking-wider uppercase">{t("points.badge")}</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  {t("points.titlePrefix")} <span className="text-[#C7F011]">{t("points.titleHighlight")}</span>
                  <br />{t("points.titleSuffix")}
                </h2>
                <p className="text-white/55 text-lg leading-relaxed">
                  {t("points.subtitle")}
                </p>
              </motion.div>

              {/* Earn cards */}
              <div className="grid md:grid-cols-3 gap-5 mb-16">
                {pointsCards.map((c, i) => {
                  const style = p2gCreditCardStyles[i];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={c.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className={`p-8 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${style.border} text-center`}
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      whileHover={{ boxShadow: style.glow.replace("shadow-[", "").replace("]", "") }}
                    >
                      <div className={`w-16 h-16 rounded-2xl ${style.iconBg} flex items-center justify-center mx-auto mb-6`}>
                        <Icon className={`w-8 h-8 ${style.accent}`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{c.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{c.description}</p>
                    </motion.div>
                  );
                })}
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
                    {t("points.levelsTitle")}{" "}
                    <span className="text-[#C7F011]">{t("points.levelsTitleHighlight")}</span>
                  </h3>
                  <p className="text-white/45 text-sm">{t("points.levelsSubtitle")}</p>
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
                  <span className="text-sm font-bold tracking-wider uppercase">{t("marketplace.badge")}</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  {t("marketplace.titlePrefix")}{" "}
                  <span className="text-amber-400">{t("marketplace.titleHighlight")}</span>
                </h2>
                <p className="text-white/55 text-lg">{t("marketplace.subtitle")}</p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                {marketplaceItems.map((item, i) => {
                  const style = marketplaceItemStyles[i];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className={`p-8 rounded-3xl ${style.bg} border ${style.border} hover:border-opacity-60 transition-all duration-300 text-center`}
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5`}>
                        <Icon className={`w-8 h-8 ${style.accent}`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-white/45 text-sm">{item.sub}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Marketplace Banner Visual */}
              <MarketplaceBanner />

              <div className="text-center">
                <NavLink
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-amber-400 text-black font-black hover:bg-amber-300 transition-all shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)]"
                >
                  {t("marketplace.cta")} <ArrowRight className="w-5 h-5" />
                </NavLink>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            KI-ANALYSE — DEINE PERFORMANCE (merged with Wingfield section)
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="ki-analyse" className={`${SECTION} relative overflow-hidden`}>
          <KiSectionBackground />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,5,15,0.80) 50%, rgba(0,0,0,0.85) 100%)" }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 60%)" }} />

          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>

              {/* HEADING */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${HEADING_CENTER} mb-4`}
              >
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-500/12 border border-sky-500/25 text-sky-400">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wider uppercase">{t("ki.badge")}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/12 border border-amber-500/30 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-bold tracking-wider uppercase">{t("ki.comingSoon")}</span>
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                  {t("ki.titlePrefix")}{" "}
                  <span className="text-sky-400">{t("ki.titleHighlight")}</span>
                </h2>
                <p className="text-white/55 text-lg leading-relaxed mb-7 max-w-2xl mx-auto">
                  {t("ki.description")}
                </p>
                <div className="flex items-center justify-center gap-3 mb-10">
                  <span className="text-sm text-white/40">{t("ki.poweredBy")}</span>
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

              {/* STATS */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-14">
                {kiStats.map(s => (
                  <div key={s.label} className="p-4 rounded-2xl border border-sky-500/15 text-center"
                    style={{ background: "rgba(56,189,248,0.05)" }}>
                    <p className="text-2xl font-black text-sky-400 mb-1 font-stat">{s.value}</p>
                    <p className="text-white/45 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* FEATURE CARDS */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {kiFeatures.map((f, i) => {
                  const style = kiFeatureStyles[i];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                      className="p-5 rounded-2xl border border-white/6 hover:border-sky-500/25 hover:bg-sky-500/3 transition-all group"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/18 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className={`w-5 h-5 ${style.color}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                          <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* HOW IT WORKS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl border border-sky-500/20 mb-8"
                style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(56,189,248,0.02) 100%)" }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/15 flex items-center justify-center shrink-0">
                    <Camera className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{t("ki.howItWorksTitle")}</h3>
                </div>
                <p className="text-white/50 leading-relaxed">
                  {t("ki.howItWorksText")}
                </p>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center mt-10"
              >
                <NavLink
                  to="/faq-kontakt"
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full border border-sky-500/40 bg-sky-500/8 text-sky-400 font-black text-sm hover:bg-sky-500/18 hover:border-sky-500/60 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  {t("ki.ctaButton")}
                  <ArrowRight className="w-4 h-4" />
                </NavLink>
                <p className="text-white/30 text-xs mt-3">{t("ki.ctaNote")}</p>
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

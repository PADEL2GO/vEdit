import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { localized } from "@/lib/localized";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { CourtGridBackdrop } from "@/components/CourtGridBackdrop";
import { NavLink } from "@/components/NavLink";
import { SiteVisual } from "@/components/SiteVisual";
import BrandName from "@/components/BrandName";
import partnerP2GLogo from "@/assets/partners/p2g-logo-vereine.png";
import {
  WhatsAppIcon,
  useWhatsAppUrl,
} from "@/components/WhatsAppBusiness";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { useSkyPadelGallery } from "@/hooks/useSkyPadelGallery";
import { useLocationTeasers } from "@/hooks/useLocationTeasers";
import tennisPadelAerial from "@/assets/courts/tennis-padel-aerial.jpg";
import padelNorway from "@/assets/courts/padel-norway.webp";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Smartphone,
  Trophy,
  TrendingUp,
  Users,
  Megaphone,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  Mail,
  Video,
  QrCode,
  Brain,
  Coins,
  ShoppingBag,
  CircleCheck,
  Wrench,
  Shield,
  Handshake,
  Package,
  Briefcase,
  LayoutGrid,
  Gem,
  Star,
  MapPin,
  ExternalLink,
  Clock,
  Search,
  FileCheck,
  Wifi,
  PartyPopper,
  Settings,
} from "lucide-react";

const AnimatedIcon = ({
  children,
  animation = "pulse",
}: {
  children: React.ReactNode;
  animation?: "pulse" | "spin" | "bounce" | "glow" | "blink";
}) => {
  const animations = {
    pulse:  { scale: [1, 1.15, 1],      transition: { duration: 2, repeat: Infinity } },
    spin:   { rotate: [0, 360],          transition: { duration: 8, repeat: Infinity, ease: "linear" as const } },
    bounce: { y: [0, -5, 0],            transition: { duration: 1.5, repeat: Infinity } },
    glow:   { opacity: [0.6, 1, 0.6],   transition: { duration: 2, repeat: Infinity } },
    blink:  { opacity: [1, 0.3, 1],     transition: { duration: 0.8, repeat: Infinity } },
  };
  return (
    <motion.div animate={animations[animation]} className="inline-flex">
      {children}
    </motion.div>
  );
};




const CourtImageCarousel = ({ carouselAlt }: { carouselAlt: string }) => {
  const { data: galleryImages, isLoading } = useSkyPadelGallery(true);
  const { i18n } = useTranslation("vereine");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {emblaApi.off("select", onSelect);};
  }, [emblaApi, onSelect]);

  if (isLoading || !galleryImages?.length) return null;

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {galleryImages.map((img, i) =>
          <div key={img.id} className="flex-[0_0_100%] min-w-0">
              <img
              src={img.image_url}
              alt={localized(img, "alt_text", i18n.language) || `${carouselAlt} ${i + 1}`}
              className="w-full aspect-video object-cover" />

            </div>
          )}
        </div>
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors min-h-[44px] min-w-[44px]">

          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors min-h-[44px] min-w-[44px]">

          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {galleryImages.map((_, i) =>
        <button
          key={i}
          onClick={() => emblaApi?.scrollTo(i)}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
          i === selectedIndex ? "bg-primary" : "bg-muted-foreground/30"}`
          } />

        )}
      </div>
    </div>);

};

type HeroStat = { value: string; label: string };
type StepItem = { title: string; desc: string };
type ServiceItem = { title: string; description: string };
type CourtFeature = { title: string; description: string };
type CuriosityItem = { label: string; sub: string };

const FuerVereine = () => {
  const { t, i18n } = useTranslation("vereine");
  const { data: partnerTiles } = usePartnerTiles(true);
  const { data: clubTeasers = [] } = useLocationTeasers();

  const whatsappUrl = useWhatsAppUrl(t("whatsapp.message"));

  const heroStats = t("hero.stats", { returnObjects: true }) as HeroStat[];
  const stepIcons = [Search, FileCheck, Wrench, Wifi, PartyPopper, Settings];
  const stepAnimations = ["pulse", "blink", "bounce", "glow", "bounce", "spin"] as const;
  const stepVisualKeys = [
    "home.verein-steps.step-1",
    "home.verein-steps.step-2",
    "home.verein-steps.step-3",
    "home.verein-steps.step-4",
    "home.verein-steps.step-5",
    "home.verein-steps.step-6",
  ];
  const stepItems = t("steps.items", { returnObjects: true }) as StepItem[];

  const serviceIcons = [Wrench, Smartphone, Megaphone];
  const serviceItems = t("services.items", { returnObjects: true }) as ServiceItem[];

  const courtProperties = t("courts.properties", { returnObjects: true }) as string[];
  const courtFeatureIcons = [Building2, Zap, Wrench, Shield];
  const courtFeatures = t("courts.features", { returnObjects: true }) as CourtFeature[];

  const curiosityIcons = [TrendingUp, Users, Gem];
  const curiosityItems = t("curiosity.items", { returnObjects: true }) as CuriosityItem[];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="relative min-h-screen bg-background">
        {/* Court-Grid als Hintergrund der ganzen Seite */}
        <CourtGridBackdrop />
        <div className="relative z-[1]">

        {/* SEKTION 1: Hero */}
        <section
          className="relative grid items-center"
          style={{ minHeight: "max(560px, min(92vh, 900px))" }}>

          <div className="relative mx-auto w-full max-w-[1240px] px-[clamp(24px,5vw,64px)] pb-16 pt-28 md:pb-20 md:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>

              <p className="mb-[clamp(18px,2.4vw,28px)] text-[clamp(11px,1.05vw,13px)] font-semibold uppercase tracking-[0.2em] text-white/40">
                {t("hero.badge")}
              </p>

              <h1 className="max-w-[17ch] text-[clamp(34px,6.4vw,88px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-white">
                {t("hero.title")}{" "}
                <span className="text-gradient-lime">{t("hero.highlightedText")}</span>
              </h1>

              <p className="mt-[clamp(20px,2.6vw,32px)] max-w-[46ch] text-[clamp(15px,1.35vw,19px)] font-medium leading-[1.55] text-white/70">
                {t("hero.description")}
              </p>
              <p className="mt-3 max-w-[46ch] text-base md:text-lg font-semibold text-primary">
                {t("hero.highlight")}
              </p>

              <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-9 inline-flex items-center gap-3 px-8 md:px-10 py-4 rounded-full bg-[#25D366] text-white hover:bg-[#1FB855] transition-colors font-semibold text-base md:text-lg shadow-lg shadow-[#25D366]/40 min-h-[48px]">
                <WhatsAppIcon className="w-5 h-5" />
                <span>{t("hero.cta")}</span>
              </motion.a>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">

                {(() => {
                  const statIcons = [Shield, Wrench, Target];
                  return heroStats.map((stat, i) => {
                    const Icon = statIcons[i];
                    return (
                      <div
                        key={stat.label}
                        className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                        <Icon className="w-6 h-6 mb-2 text-primary" />
                        <div className="text-3xl md:text-4xl font-extrabold text-white">{stat.value}</div>
                        <div className="text-sm font-medium text-white/50 mt-1">{stat.label}</div>
                      </div>
                    );
                  });
                })()}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── SO KOMMT PADEL IN EUREN VEREIN ────────────────────── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-14"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t("steps.badge")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                {t("steps.title")}{" "}
                <span className="text-gradient-lime">{t("steps.titleHighlight")}</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("steps.intro")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {stepItems.map((item, index) => {
                const Icon = stepIcons[index];
                const animation = stepAnimations[index];
                const visualKey = stepVisualKeys[index];
                const step = index + 1;
                return (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.08 * index }}
                    className="group relative"
                  >
                    <div className="overflow-hidden rounded-2xl mb-5 bg-card border border-border/50 h-36 md:h-44">
                      <SiteVisual
                        visualKey={visualKey}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        fallbackClassName="w-full h-full bg-card"
                      />
                    </div>
                    <div className="text-center px-2">
                      <div className="relative inline-block mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
                          <AnimatedIcon animation={animation}>
                            <Icon className="w-6 h-6 text-primary-foreground" />
                          </AnimatedIcon>
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-card border border-border rounded-full flex items-center justify-center text-xs font-bold">
                          {step}
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] text-white hover:bg-[#1FB855] transition-colors font-semibold text-base shadow-lg shadow-[#25D366]/40">
                <WhatsAppIcon className="w-5 h-5" />
                {t("steps.cta")}
              </a>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ═══ CLUB TEASERS — only rendered when at least one active teaser exists ══ */}
        {clubTeasers.length > 0 && (
          <section className="py-20 md:py-28 relative overflow-hidden"
            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.03) 50%, transparent 100%)" }}>
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center max-w-2xl mx-auto mb-14"
                >
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wider uppercase">{t("clubs.badge")}</span>
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                    {t("clubs.title")}{" "}
                    <span className="text-[#C7F011]">{t("clubs.titleHighlight")}</span>
                  </h2>
                  <p className="text-white/50 text-lg">
                    {t("clubs.intro")}
                  </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {clubTeasers.map((club, i) => (
                    <motion.div
                      key={club.id}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-[#C7F011]/30 hover:bg-[#C7F011]/[0.04] transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Image */}
                      {club.image_url ? (
                        <div className="h-44 overflow-hidden">
                          <img
                            src={club.image_url}
                            alt={localized(club, "title", i18n.language)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="h-44 bg-white/[0.04] flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-white/15" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-white mb-1 leading-snug">{localized(club, "title", i18n.language)}</h3>

                        {localized(club, "city", i18n.language) && (
                          <div className="flex items-center gap-1.5 text-[#C7F011] text-sm font-medium mb-3">
                            <MapPin className="w-3.5 h-3.5" />
                            {localized(club, "city", i18n.language)}
                          </div>
                        )}

                        {localized(club, "description", i18n.language) && (
                          <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-3">
                            {localized(club, "description", i18n.language)}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                          {localized(club, "expected_date", i18n.language) && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-white/35 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {localized(club, "expected_date", i18n.language)}
                            </span>
                          )}
                          {club.club_url && (
                            <a
                              href={club.club_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#C7F011]/70 hover:text-[#C7F011] transition-colors font-medium"
                            >
                              {t("clubs.clubLinkLabel")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

              </div>
            </div>
          </section>
        )}

          {/* SEKTION: P2G als Full-Service Partner */}
          <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={tennisPadelAerial}
                alt={t("courts.aerialAlt")}
                className="w-full h-full object-cover" />

              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
            </div>

            <div className="container mx-auto px-4 relative z-10 py-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto text-center mb-16">

                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  <BrandName inline /> {t("services.titlePrefix")} <span className="text-gradient-lime">{t("services.titleHighlight")}</span> {t("services.titleSuffix")}
                </h2>
              </motion.div>

              {/* 3 Service Buckets */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {serviceItems.map((item, i) => {
                  const Icon = serviceIcons[i];
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className="p-6 rounded-2xl bg-card/80 backdrop-blur-md border border-border hover:border-primary/30 transition-colors">

                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SEKTION: Unser Angebot – SkyPadel Courts */}
          <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={padelNorway}
                alt={t("courts.imageAlt")}
                className="w-full h-full object-cover" />

              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
            </div>

            <div className="container mx-auto px-4 relative z-10 py-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto">

                <div className="text-center mb-12">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-foreground text-sm font-medium mb-4">
                    <Star className="w-4 h-4 text-primary" />
                    {t("courts.badge")}
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                    {t("courts.title")} <span className="text-gradient-lime">{t("courts.titleHighlight")}</span>
                  </h2>
                </div>

                {/* Court Image Gallery */}
                <CourtImageCarousel carouselAlt={t("courts.carouselAlt")} />

                {/* SkyPadel Logo + Properties */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-10 p-6 md:p-8 rounded-2xl bg-card border border-border">
                  {(() => {
                    const skyPadel = partnerTiles?.find(t => t.slug === 'skypadel');
                    return (
                      <div
                        className="rounded-2xl p-3 md:p-6 h-20 md:h-36 w-36 md:w-56 flex items-center justify-center shrink-0 border border-border/30"
                        style={{ backgroundColor: skyPadel?.bg_color || '#156184' }}
                      >
                        {skyPadel?.logo_url ? (
                          <img src={skyPadel.logo_url} alt="SkyPadel" className="h-10 md:h-20 w-auto object-contain" />
                        ) : (
                          <span className="font-bold text-white text-xl">SkyPadel</span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {courtProperties.map((prop) =>
                    <span
                      key={prop}
                      className="px-4 py-2 rounded-full border-2 border-primary text-primary font-semibold text-sm bg-primary/5">

                        {prop}
                      </span>
                    )}
                  </div>
                </div>

                {/* Court Feature Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {courtFeatures.map((feature, index) => {
                    const Icon = courtFeatureIcons[index];
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 group">

                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-bold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </section>


          <SectionDivider variant="glow" />

          {/* SEKTION: Curiosity CTA */}
          <section className="py-14 md:py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto text-center">

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                  <Coins className="w-4 h-4" />
                  {t("curiosity.badge")}
                </span>

                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  {t("curiosity.titleLine1")}<br />
                  <span className="text-gradient-lime">{t("curiosity.titleHighlight")}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                  {t("curiosity.intro")}
                </p>

                <div className="grid sm:grid-cols-3 gap-4 mb-12">
                  {curiosityItems.map((item, i) => {
                    const Icon = curiosityIcons[i];
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-bold text-base mb-1">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.sub}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] text-white hover:bg-[#1FB855] transition-colors font-semibold text-lg group shadow-lg shadow-[#25D366]/40">
                  <WhatsAppIcon className="w-5 h-5" />
                  {t("curiosity.cta")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="text-sm text-muted-foreground mt-4">{t("curiosity.footnote")}</p>
              </motion.div>
            </div>
          </section>

        </div>
      </main>

      <Footer />

    </>);

};

export default FuerVereine;

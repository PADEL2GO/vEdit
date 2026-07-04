import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { localized } from "@/lib/localized";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { SiteVisual } from "@/components/SiteVisual";
import { Button } from "@/components/ui/button";
import SyntheticHero from "@/components/ui/synthetic-hero";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";
import { LocationTeasersSection } from "@/components/LocationTeasersSection";
import { ArticleFeed } from "@/components/news/ArticleFeed";
import {
  ArrowRight,
  Building2,
  Calendar,
  MapPin,
  ClipboardCheck,
  Hammer,
  Smartphone,
  PartyPopper,
  Settings,
  Coins,
  ShoppingBag,
  Banknote,
  Zap,
  User,
  Megaphone,
} from "lucide-react";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import skypadelOutdoor from "@/assets/courts/skypadel-outdoor.jpg";
import eventsHero from "@/assets/events-hero.jpg";
import fuerVereineHero from "@/assets/fuer-vereine-hero.jpg";

// ── Animated icon helper (spinning gear in the Verein steps) ──────────────────
const AnimatedIcon = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
    className="inline-flex"
  >
    {children}
  </motion.div>
);

// ── Reveal wrapper (fade + rise on scroll) ────────────────────────────────────
const revealProps = (delay = 0) => ({
  initial: { opacity: 0, y: 28, filter: "blur(4px)" as const },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" as const },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// ── Partner components (admin-managed via partner_tiles table) ────────────────
const PartnerGrid = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
    {tiles.map((tile, index) => {
      const card = (
        <motion.div
          key={tile.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className={`flex items-center justify-center h-24 p-3 rounded-2xl overflow-hidden transition-transform duration-200 ${
            tile.website_url ? "hover:scale-[1.03] cursor-pointer" : ""
          }`}
          style={{ backgroundColor: tile.bg_color || "#F5F5F3" }}
        >
          {tile.logo_url ? (
            <img src={tile.logo_url} alt={tile.name} className="max-h-16 w-auto object-contain" />
          ) : (
            <span className="text-sm font-medium text-gray-600">{tile.name}</span>
          )}
        </motion.div>
      );
      return tile.website_url ? (
        <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">{card}</a>
      ) : (
        <div key={tile.id}>{card}</div>
      );
    })}
  </div>
);

const LocalPartnerSection = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => {
  const { t, i18n } = useTranslation("index");
  if (!tiles.length) return null;
  const fallback = t("partners.regionFallback");
  return (
    <div className="w-full flex flex-col gap-4">
      {tiles.map((tile, index) => {
        const region = tile.region || fallback;
        const description = localized(tile, "description", i18n.language);
        const inner = (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-4 flex-wrap rounded-2xl border border-border/60 bg-gradient-card p-5 transition-colors duration-200 ${
              tile.website_url ? "hover:border-primary/30 cursor-pointer" : ""
            }`}
          >
            <span className="flex-none font-stat text-[11px] uppercase tracking-[0.12em] text-primary bg-primary/10 border border-primary/25 rounded-full px-3 py-1.5">
              {region}
            </span>
            <div className="flex-1 min-w-[200px] flex flex-col gap-0.5">
              <span className="text-base font-semibold text-foreground">{tile.name}</span>
              {description && (
                <span className="text-sm text-muted-foreground line-clamp-2">{description}</span>
              )}
            </div>
            <ArrowRight className="w-[18px] h-[18px] text-muted-foreground/60" />
          </motion.div>
        );
        return tile.website_url ? (
          <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">{inner}</a>
        ) : (
          <div key={tile.id}>{inner}</div>
        );
      })}
    </div>
  );
};

const PartnerSections = () => {
  const { t } = useTranslation("index");
  const { data: tiles, isLoading } = usePartnerTiles();
  const equipmentTiles = tiles?.filter((tile) => tile.partner_type !== "local") || [];
  const localTiles = tiles?.filter((tile) => tile.partner_type === "local") || [];
  const partnerTitlePart2 = t("partners.titlePart2");

  return (
    <section id="partner" className="py-16 md:py-24 bg-background">
      <div className="mx-auto max-w-[1200px] px-5 flex flex-col items-center">
        {/* Equipment partners */}
        <motion.div {...revealProps()} className="flex flex-col items-center gap-3.5 text-center mb-11">
          <span className="font-stat text-xs uppercase tracking-[0.2em] text-primary">{t("partners.kicker")}</span>
          <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground max-w-2xl" style={{ lineHeight: 1.15 }}>
            {t("partners.titlePart1")} <BrandName />
            {partnerTitlePart2 ? ` ${partnerTitlePart2}` : ""}
          </h3>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : equipmentTiles.length > 0 ? (
          <PartnerGrid tiles={equipmentTiles} />
        ) : null}

        <motion.div {...revealProps()} className="mt-9">
          <Button variant="heroOutline" size="lg" asChild>
            <NavLink to="/fuer-partner">
              {t("partners.becomePartner")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </NavLink>
          </Button>
        </motion.div>

        {/* Local / location partners */}
        {localTiles.length > 0 && (
          <motion.div {...revealProps()} className="w-full mt-20 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="font-stat text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("partners.localKicker")}</span>
              <h4 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t("partners.localTitle")}</h4>
            </div>
            <LocalPartnerSection tiles={localTiles} />
          </motion.div>
        )}
      </div>
    </section>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Index = () => {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation("index");

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const vereinStepsCopy = t("vereinSteps.steps", { returnObjects: true }) as { title: string; desc: string }[];
  const audienceCopy = t("audience.cards", { returnObjects: true }) as { title: string; desc: string; highlight: string; cta: string }[];

  // Verein steps — icon + tile animation per design (float / pulse-glow / spin)
  const vereinSteps = [
    { icon: MapPin, anim: "float" as const },
    { icon: ClipboardCheck, anim: "float" as const },
    { icon: Hammer, anim: "float" as const },
    { icon: Smartphone, anim: "float" as const },
    { icon: PartyPopper, anim: "pulse-glow" as const },
    { icon: Settings, anim: "spin" as const },
  ];

  const audienceConfig = [
    { icon: User, href: "/fuer-spieler" },
    { icon: Building2, href: "/fuer-vereine" },
    { icon: Megaphone, href: "/fuer-partner" },
  ];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <SyntheticHero
          title={t("hero.title")}
          description={
            <>
              {t("hero.descriptionLine1")}
              <br />
              {t("hero.descriptionLine2")}
            </>
          }
          badgeLabel={t("hero.badgeLabel")}
          badgeText={t("hero.badgeText")}
          showCountdown={true}
          countdownTargetDate={new Date("2026-07-01T00:00:00")}
          showLogo={true}
        >
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8">
            <Button size="xl" variant="hero" className="w-full sm:w-auto min-h-[48px]" asChild>
              <NavLink to="/booking">
                <Calendar className="w-5 h-5 mr-2" />
                {t("hero.ctaPrimary")}
              </NavLink>
            </Button>
            <Button size="xl" variant="heroOutline" className="w-full sm:w-auto min-h-[48px]" asChild>
              <NavLink to="/fuer-vereine">
                <Building2 className="w-5 h-5 mr-2" />
                {t("hero.ctaSecondary")}
              </NavLink>
            </Button>
          </div>
        </SyntheticHero>

        {/* ── SO KOMMT PADEL IN EUREN VEREIN ────────────────────── */}
        <section id="vereine" className="py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <motion.div {...revealProps()} className="flex flex-col items-center gap-4 text-center max-w-3xl mx-auto mb-14">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
                <Building2 className="w-3.5 h-3.5" />
                {t("vereinSteps.badge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground" style={{ lineHeight: 1.1 }}>
                {t("vereinSteps.titlePart1")}{" "}
                <span className="text-gradient-lime">{t("vereinSteps.titlePart2")}</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl">{t("vereinSteps.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vereinSteps.map((cfg, index) => {
                const Icon = cfg.icon;
                const step = index + 1;
                const tileAnim = cfg.anim === "float" ? "animate-float" : cfg.anim === "pulse-glow" ? "animate-pulse-glow" : "";
                return (
                  <motion.div
                    key={step}
                    {...revealProps(0.08 * index)}
                    className="group flex flex-col gap-3.5 p-6 rounded-2xl bg-gradient-card border border-border/60 hover:border-primary/30 transition-colors duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-[54px] h-[54px] rounded-[14px] border border-primary/35 flex items-center justify-center bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))] ${tileAnim}`}
                        style={cfg.anim === "float" ? { animationDelay: `${index * 0.4}s` } : undefined}
                      >
                        {cfg.anim === "spin" ? (
                          <AnimatedIcon><Icon className="w-6 h-6 text-primary" /></AnimatedIcon>
                        ) : (
                          <Icon className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <span className="font-stat text-xs text-primary bg-primary/10 border border-primary/25 rounded-full px-3 py-1">
                        {String(step).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground font-display" style={{ lineHeight: 1.2 }}>
                      {vereinStepsCopy[index].title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{vereinStepsCopy[index].desc}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div {...revealProps()} className="flex justify-center mt-11">
              <Button size="lg" variant="hero" asChild>
                <NavLink to="/fuer-vereine">
                  <Building2 className="w-5 h-5 mr-2" />
                  {t("vereinSteps.cta")}
                </NavLink>
              </Button>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── LOCATION ROLLOUT (backend: location_teasers) ──────── */}
        <LocationTeasersSection />

        {/* ── NEWS / ARTICLES (backend: articles) ───────────────── */}
        <ArticleFeed surface="logged_out" placement="public" />

        <SectionDivider variant="glow" />

        {/* ── EIN NETWORK. ALLE VORTEILE. (Bento) ───────────────── */}
        <section id="plattform" className="py-16 md:py-24 relative overflow-hidden bg-gradient-hero">
          <div className="mx-auto max-w-[1200px] px-5">
            <motion.div {...revealProps()} className="flex flex-col items-center gap-4 text-center max-w-2xl mx-auto mb-14">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
                <Zap className="w-3.5 h-3.5" />
                {t("network.badge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground" style={{ lineHeight: 1.1 }}>
                {t("network.titlePart1")} <span className="text-gradient-lime">{t("network.titlePart2")}</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl">{t("network.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Courts — image tile */}
              <motion.div {...revealProps()} className="lg:col-span-7 relative min-h-[400px] rounded-2xl overflow-hidden border border-border/60">
                <div className="absolute inset-0">
                  <SiteVisual visualKey="home.network.courts" alt={t("network.courtsTitle")} className="w-full h-full" fallbackSrc={skypadelOutdoor} />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(200deg,hsl(0_0%_0%/0.1),hsl(0_0%_0%/0.9)_78%)]" />
                <span className="absolute top-[18px] left-[18px] font-stat text-[11px] uppercase tracking-[0.14em] text-foreground bg-background/60 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5">
                  {t("network.courtsBadge")}
                </span>
                <div className="relative h-full flex flex-col justify-end gap-2.5 p-7">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-stat text-xs uppercase tracking-[0.12em] text-primary">{t("network.courtsEyebrow")}</span>
                  </div>
                  <h3 className="font-display text-2xl md:text-4xl font-bold text-foreground" style={{ lineHeight: 1.08 }}>
                    {t("network.courtsTitle")}
                  </h3>
                  <p className="text-[15.5px] text-foreground/80 max-w-md">{t("network.courtsDescription")}</p>
                </div>
              </motion.div>

              {/* Payback +250 */}
              <motion.div {...revealProps(0.1)} className="lg:col-span-5 relative overflow-hidden min-h-[400px] flex flex-col justify-between gap-7 p-7 rounded-2xl bg-gradient-card border border-border/60 hover:border-primary/30 transition-colors duration-300">
                <div className="pointer-events-none absolute -right-24 -top-24 w-64 h-64 rounded-full bg-[radial-gradient(circle,hsl(71_91%_51%/0.14),transparent_70%)]" />
                <div className="relative w-[54px] h-[54px] rounded-[14px] border border-primary/35 flex items-center justify-center bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))] animate-float">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-stat font-bold text-6xl md:text-7xl text-primary leading-none" style={{ textShadow: "0 0 40px hsl(71 91% 51% / 0.35)" }}>
                      {t("network.paybackPoints")}
                    </span>
                    <span className="font-stat text-sm tracking-[0.12em] text-muted-foreground">{t("network.paybackPointsLabel")}</span>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-bold text-foreground" style={{ lineHeight: 1.15 }}>
                    {t("network.paybackTitle")}
                  </h3>
                  <p className="text-[15px] text-muted-foreground">{t("network.paybackDescription")}</p>
                </div>
              </motion.div>

              {/* Marketplace */}
              <motion.div {...revealProps(0.15)} className="lg:col-span-5 relative overflow-hidden min-h-[360px] flex flex-col justify-between gap-7 p-7 rounded-2xl bg-gradient-card border border-border/60 hover:border-primary/30 transition-colors duration-300">
                <div className="w-[54px] h-[54px] rounded-[14px] border border-primary/35 flex items-center justify-center bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))] animate-float" style={{ animationDelay: "0.5s" }}>
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col gap-3.5">
                  <h3 className="font-display text-xl md:text-2xl font-bold text-foreground" style={{ lineHeight: 1.15 }}>
                    {t("network.marketTitle")}
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/80 bg-white/5 border border-border rounded-full px-4 py-2">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                      {t("network.marketTagMoney")}
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 border border-primary/35 rounded-full px-4 py-2">
                      <Zap className="w-4 h-4" />
                      {t("network.marketTagPoints")}
                    </span>
                  </div>
                  <p className="text-[15px] text-muted-foreground">{t("network.marketDescription")}</p>
                </div>
              </motion.div>

              {/* Events — image tile */}
              <motion.div {...revealProps(0.2)} className="lg:col-span-7 relative min-h-[360px] rounded-2xl overflow-hidden border border-border/60">
                <div className="absolute inset-0">
                  <SiteVisual visualKey="home.network.events" alt={t("network.eventsTitle")} className="w-full h-full" fallbackSrc={eventsHero} />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(200deg,hsl(0_0%_0%/0.2),hsl(0_0%_0%/0.92)_78%)]" />
                <span className="absolute top-[18px] left-[18px] font-stat text-[11px] uppercase tracking-[0.14em] text-primary bg-background/60 backdrop-blur-md border border-primary/35 rounded-full px-3.5 py-1.5">
                  {t("network.eventsBadge")}
                </span>
                <div className="relative h-full flex flex-col items-start justify-end gap-3 p-7">
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground" style={{ lineHeight: 1.1 }}>
                    {t("network.eventsTitle")}
                  </h3>
                  <p className="text-[15.5px] text-foreground/80">{t("network.eventsDescription")}</p>
                  <Button size="lg" variant="hero" className="mt-1.5" asChild>
                    <NavLink to="/fuer-spieler">{t("network.eventsCta")}</NavLink>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── FÜR WEN IST PADEL2GO ──────────────────────────────── */}
        <section id="zielgruppen" className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <SiteVisual
              visualKey="home.fuer-wen.background"
              alt="Hintergrund"
              className="w-full h-full object-cover opacity-10"
              fallbackSrc={fuerVereineHero}
            />
          </div>
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background via-background/60 to-background" />

          <div className="mx-auto max-w-[1200px] px-5 relative z-10">
            <motion.div {...revealProps()} className="flex flex-col items-center gap-4 text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
                <User className="w-3.5 h-3.5" />
                {t("audience.badge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground" style={{ lineHeight: 1.1 }}>
                {t("audience.titlePart1")} <BrandName />?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">{t("audience.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {audienceConfig.map((cfg, i) => {
                const copy = audienceCopy[i];
                const Icon = cfg.icon;
                const highlight = copy.highlight || null;
                return (
                  <motion.div
                    key={copy.title}
                    {...revealProps(0.1 * (i + 1))}
                    className="group flex flex-col gap-4 p-6 md:p-8 rounded-2xl bg-gradient-card border border-border/60 hover:border-primary/30 transition-colors duration-300"
                  >
                    <div
                      className="w-[54px] h-[54px] rounded-[14px] border border-primary/35 flex items-center justify-center bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))] animate-float"
                      style={{ animationDelay: `${i * 0.4}s` }}
                    >
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground font-display">{copy.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {copy.desc.split(highlight ?? "___NOMATCH___").map((part, j, arr) =>
                        j < arr.length - 1 ? (
                          <span key={j}>
                            {part}
                            <span className="text-primary font-semibold">{highlight}</span>
                          </span>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                    <Button variant="outline" className="w-full mt-auto" asChild>
                      <NavLink to={cfg.href}>
                        {copy.cta}
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </NavLink>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── PARTNERS (backend: partner_tiles) ─────────────────── */}
        <PartnerSections />

      </main>

      <Footer />
    </>
  );
};

export default Index;

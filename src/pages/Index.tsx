import { motion, useScroll, useTransform } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useRef } from "react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { SiteVisual } from "@/components/SiteVisual";
import { Button } from "@/components/ui/button";
import SyntheticHero from "@/components/ui/synthetic-hero";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";
import { LocationTeasersSection } from "@/components/LocationTeasersSection";
import { ArrowRight, Users, Building2, Handshake, MapPin, Smartphone, Trophy, Gift, CheckCircle, Calendar, Sparkles, Zap, Flame, Gamepad2, TrendingUp, Truck, Radio, Swords, Target, Download, ChevronRight, Brain, Search, FileCheck, Wrench, Wifi, PartyPopper, Settings } from "lucide-react";
import gamificationMockupFallback from "@/assets/gamification-app-mockup.png";
import wingfieldLogo from "@/assets/partners/wingfield.png";
import p2gAppIcon from "@/assets/p2g-app-icon.png";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { Skeleton } from "@/components/ui/skeleton";
import badgeAppStore from "@/assets/badge-app-store.png";
import badgeGooglePlay from "@/assets/badge-google-play.png";
import { EXPERT_LEVELS, getExpertLevelEmoji } from "@/lib/expertLevels";
// AnimatedIcon-Komponente für dynamische Animationen
const AnimatedIcon = ({
  children,
  animation = "pulse"
}: {
  children: React.ReactNode;
  animation?: "pulse" | "spin" | "bounce" | "glow" | "blink";
}) => {
  const animations = {
    pulse: {
      scale: [1, 1.15, 1],
      transition: {
        duration: 2,
        repeat: Infinity
      }
    },
    spin: {
      rotate: [0, 360],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "linear" as const
      }
    },
    bounce: {
      y: [0, -5, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity
      }
    },
    glow: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 2,
        repeat: Infinity
      }
    },
    blink: {
      opacity: [1, 0.3, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity
      }
    }
  };
  return <motion.div animate={animations[animation]} className="inline-flex">{children}</motion.div>;
};
const PartnerGrid = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
      {tiles.map((tile, index) => {
        const content = (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-2xl p-3 md:p-6 h-20 md:h-36 flex items-center justify-center border border-border/30 transition-all duration-200 ${tile.website_url ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}`}
            style={{ backgroundColor: tile.bg_color || '#FFFFFF' }}
          >
            {tile.logo_url ? (
              <img src={tile.logo_url} alt={tile.name} className="h-10 md:h-20 w-auto object-contain" />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{tile.name}</span>
            )}
          </motion.div>
        );
        return tile.website_url ? (
          <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        ) : (
          <div key={tile.id}>{content}</div>
        );
      })}
    </div>
  );
};

const LocalPartnerSection = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => {
  if (!tiles.length) return null;

  // Group by region
  const grouped = tiles.reduce<Record<string, typeof tiles>>((acc, tile) => {
    const region = tile.region || "Weitere";
    if (!acc[region]) acc[region] = [];
    acc[region].push(tile);
    return acc;
  }, {});

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {Object.entries(grouped).map(([region, regionTiles]) => (
        <div key={region}>
          <h4 className="text-lg font-semibold text-muted-foreground mb-4">Region {region}</h4>
          <div className="grid gap-4">
            {regionTiles.map((tile, index) => {
              const inner = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border border-border/30 p-4 transition-all duration-200 ${tile.website_url ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : ''}`}
                >
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: tile.bg_color || '#FFFFFF' }}
                  >
                    {tile.logo_url ? (
                      <img src={tile.logo_url} alt={tile.name} className="h-12 sm:h-16 w-auto object-contain" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{tile.name}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="font-semibold text-foreground">{tile.name}</p>
                    {tile.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{tile.description}</p>
                    )}
                  </div>
                </motion.div>
              );
              return tile.website_url ? (
                <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <div key={tile.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const PartnerSections = () => {
  const { data: tiles, isLoading } = usePartnerTiles();

  const equipmentTiles = tiles?.filter(t => t.partner_type !== 'local') || [];
  const localTiles = tiles?.filter(t => t.partner_type === 'local') || [];

  return (
    <>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm text-muted-foreground mb-2">Bereits dabei</p>
            <h3 className="text-xl md:text-3xl font-bold">
              Mit diesen Partnern realisieren wir <BrandName />
            </h3>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 md:h-36 rounded-2xl" />
              ))}
            </div>
          ) : equipmentTiles.length > 0 ? (
            <PartnerGrid tiles={equipmentTiles} />
          ) : null}

          <div className="text-center mt-10">
            <Button variant="outline" size="lg" asChild>
              <NavLink to="/fuer-partner">
                Du möchtest Partner werden?
              </NavLink>
            </Button>
          </div>
        </div>
      </section>

      {localTiles.length > 0 && (
        <section className="py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <p className="text-sm text-muted-foreground mb-2">Lokal vernetzt</p>
              <h3 className="text-2xl md:text-3xl font-bold">
                Unsere Standortpartner
              </h3>
            </motion.div>
            <LocalPartnerSection tiles={localTiles} />
          </div>
        </section>
      )}
    </>
  );
};

const Index = () => {
  return <>
      <Helmet>
        <title>PADEL2GO – Der Game-Changer für Padel in Europa | Schnellst wachsende Plattform</title>
        <meta name="description" content="PADEL2GO ist die schnellst wachsende Padel-Plattform Europas. Mobile Courts, smarte App, League, P2G-Credits & Community – 5.000+ Spieler vertrauen uns. Jetzt mitmachen!" />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background">
        {/* SEKTION 1: Hero mit WebGL Shader + Launch Countdown */}
        <SyntheticHero 
          title="Dein Padel. Dein Level. Dein Spiel." 
          description={<>Mobile Courts. Smarte App. League. P2G-Credits.<br />Community – alles aus einer Hand.</>}
          badgeLabel="Launch" 
          badgeText="1. Mai 2026" 
          showCountdown={true}
          countdownTargetDate={new Date("2026-05-01T00:00:00")}
          showLogo={true}
        >
          {/* Hero CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8">
            <Button size="lg" className="w-full sm:w-auto text-base px-6 py-4 md:text-lg md:px-8 md:py-6 min-h-[48px]" asChild>
              <NavLink to="/booking">
                <Calendar className="w-5 h-5 mr-2" />
                Jetzt Court buchen
              </NavLink>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6 py-4 md:text-lg md:px-8 md:py-6 min-h-[48px]" asChild>
              <NavLink to="/fuer-vereine">
                <Building2 className="w-5 h-5 mr-2" />
                Vereine
              </NavLink>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6 py-4 md:text-lg md:px-8 md:py-6 min-h-[48px]" asChild>
              <NavLink to="/fuer-partner">
                <Handshake className="w-5 h-5 mr-2" />
                Partner
              </NavLink>
            </Button>
          </div>
        </SyntheticHero>

        <LocationTeasersSection />

        {/* NEUE SEKTION: Vision Statement */}
        <section className="py-12 md:py-28 relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          <motion.div 
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Section Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Warum wir das tun</span>
              </motion.div>
              
              <h2 className="text-2xl md:text-5xl font-bold text-foreground mb-4">
                Unsere Mission:
              </h2>
              <p className="text-xl md:text-3xl text-gradient-lime font-semibold mb-6">
                Padel verfügbar machen – in jedem Verein.
              </p>

              {/* Supporting text */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12"
              >
                Wir bringen mobile Padel Courts, smarte Technologien (KI-Performance-Analyse) und eine aktive Community zusammen, damit Padel überall gespielt werden kann.
              </motion.p>

              {/* 3 Feature Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {[
                  { icon: <MapPin className="w-6 h-6 md:w-8 md:h-8 text-primary" />, title: "Mobile Courts", desc: "Pop-Up Padel Courts für jeden Verein – flexibel, schnell aufgebaut, sofort bespielbar." },
                  { icon: <Brain className="w-6 h-6 md:w-8 md:h-8 text-primary" />, title: "KI-Analyse", desc: "Spielerkennung, Performance-Daten und personalisierte Verbesserungstipps in Echtzeit." },
                  { icon: <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />, title: "Community", desc: "Finde Mitspieler, tritt Leagues bei und werde Teil der wachsenden Padel-Bewegung." },
                ].map((tile, i) => (
                  <motion.div
                    key={tile.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="group p-5 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-all duration-500"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6 mx-auto group-hover:bg-primary/20 transition-colors">
                      {tile.icon}
                    </div>
                    <h4 className="text-xl md:text-2xl font-bold mb-4">{tile.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{tile.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Partner Section */}
        <PartnerSections />

        <SectionDivider variant="glow" />

        {/* SEKTION 2: Drei Einstiege mit animierten Icons */}
        <section className="py-16 md:py-20 bg-card/30 relative overflow-hidden">
          {/* Hintergrundbild */}
          <div className="absolute inset-0 z-0">
            <SiteVisual visualKey="home.fuer-wen.background" alt="Hintergrund" className="w-full h-full object-cover opacity-10" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-card/80 to-card/80 z-[1]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-2xl mx-auto mb-12">
              {/* Section Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Für jeden etwas dabei</span>
              </motion.div>
              
              <h2 className="text-2xl md:text-5xl font-bold mb-4">
                Für wen ist <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span>?
              </h2>
              <p className="text-lg text-muted-foreground">Dein Einstieg in die P2G-Welt</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Kachel 1 - Spieler mit Gamepad2 Icon */}
              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: 0.1
            }} className="group p-5 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-all duration-500">
                <motion.div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors" whileHover={{
                scale: 1.1,
                rotate: 5
              }}>
                   <AnimatedIcon animation="bounce">
                    <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </AnimatedIcon>
                </motion.div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Für Spieler:innen</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Buche in Sekunden, sammle <span className="text-primary font-semibold">P2G-Credits</span>, spiel in der schnellsten Online-Liga und dominiere das Ranking. <span className="text-foreground font-medium">Deine Freunde warten.</span>
                </p>
                <Button variant="outline" className="w-full group" asChild>
                  <NavLink to="/fuer-spieler">
                    <AnimatedIcon animation="glow">
                      <Zap className="w-4 h-4 mr-2" />
                    </AnimatedIcon>
                    Jetzt Punkte sammeln
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
              </motion.div>

              {/* Kachel 2 - Vereine */}
              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: 0.2
            }} className="group p-5 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-all duration-500">
                <motion.div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors" whileHover={{
                scale: 1.1,
                rotate: 5
              }}>
                   <AnimatedIcon animation="pulse">
                    <Building2 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </AnimatedIcon>
                </motion.div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Für Vereine & Clubs</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Wir stellen mobile Padel-Courts, Buchungssystem, Marketing und Community-Konzept. <span className="text-foreground font-medium">Ohne Capex, mit Revenue-Share.</span>
                </p>
                <Button variant="outline" className="w-full group" asChild>
                  <NavLink to="/fuer-vereine">
                    Padel ohne Investment starten
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
              </motion.div>

              {/* Kachel 3 - Partner */}
              <motion.div initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: 0.3
            }} className="group p-5 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-all duration-500">
                <motion.div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors" whileHover={{
                scale: 1.1,
                rotate: 5
              }}>
                   <AnimatedIcon animation="glow">
                    <Handshake className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </AnimatedIcon>
                </motion.div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Für Marken & Partner</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Erreiche eine hochaffine, sportliche Zielgruppe direkt am Court, in der App und an unseren Touchpoints.
                </p>
                <Button variant="outline" className="w-full group" asChild>
                  <NavLink to="/fuer-partner">
                    Reichweite am Court nutzen
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* SEKTION 3: So kommt Padel in euren Verein */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto mb-16">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Für Vereine</span>
              </motion.div>
              
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                So kommt Padel in{" "}
                <span className="text-gradient-lime">euren Verein</span>
              </h2>
              <p className="text-lg text-muted-foreground">In 6 Schritten vom ersten Gespräch bis zum ersten Match</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Search,
                  animation: "pulse" as const,
                  visualKey: "home.verein-steps.step-1",
                  step: 1,
                  title: "Vor-Ort Termin",
                  desc: "Standortcheck mit Flächenanalyse und Drohnen-Luftaufnahme – wir prüfen, welche Flächen für Padel Courts geeignet sind.",
                },
                {
                  icon: FileCheck,
                  animation: "blink" as const,
                  visualKey: "home.verein-steps.step-2",
                  step: 2,
                  title: "Bauantrag & Genehmigung",
                  desc: "Wir übernehmen die Planung und unterstützen beim Bauantrag – inklusive aller technischen Unterlagen und Behördenkommunikation.",
                },
                {
                  icon: Wrench,
                  animation: "bounce" as const,
                  visualKey: "home.verein-steps.step-3",
                  step: 3,
                  title: "Court-Aufbau & Installation",
                  desc: "Professionelle Montage der mobilen Padel Courts auf eurer Fläche – schlüsselfertig und spielbereit.",
                },
                {
                  icon: Wifi,
                  animation: "glow" as const,
                  visualKey: "home.verein-steps.step-4",
                  step: 4,
                  title: "Digitales Setup",
                  desc: "App-Anbindung, Booking-System, KI-Kameras und Beleuchtung – der Court wird vollständig digitalisiert.",
                },
                {
                  icon: PartyPopper,
                  animation: "bounce" as const,
                  visualKey: "home.verein-steps.step-5",
                  step: 5,
                  title: "Eröffnung & Spielstart",
                  desc: "Feierliche Eröffnung mit Event, Marketing-Support und den ersten gebuchten Matches eurer Mitglieder.",
                },
                {
                  icon: Settings,
                  animation: "spin" as const,
                  visualKey: "home.verein-steps.step-6",
                  step: 6,
                  title: "Laufender Betrieb",
                  desc: "Wartung, Saisonmanagement und technischer Support – wir kümmern uns, ihr kassiert Umsatzbeteiligung.",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  className="relative group"
                >
                  <div className="overflow-hidden rounded-2xl mb-6">
                    <SiteVisual visualKey={item.visualKey} alt={item.title} className="w-full h-36 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                        <AnimatedIcon animation={item.animation}>
                          <item.icon className="w-7 h-7 text-primary-foreground" />
                        </AnimatedIcon>
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-xs font-bold">{item.step}</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Button size="lg" variant="lime" asChild>
                <NavLink to="/fuer-vereine">
                  <Building2 className="w-5 h-5 mr-2" />
                  Mehr erfahren
                </NavLink>
              </Button>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* SEKTION 4: Gamification & App mit iPhone-Mockup */}
        <section className="py-14 md:py-24 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2" />
          
          <div className="container mx-auto px-4 relative z-10">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Gamepad2 className="w-4 h-4" />
                <span className="text-sm font-medium">Gamification trifft Padel</span>
              </motion.div>
              
              <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-6">
                Spiel gegen Spieler:innen weltweit –{" "}
                <span className="text-gradient-lime block mt-2">dein Match, dein Ranking.</span>
              </h2>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Side - Content */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="space-y-6 text-lg text-muted-foreground mb-8 overflow-hidden break-words">
                  <p className="leading-relaxed">
                    <span className="text-foreground font-semibold">Tritt an gegen alle Spieler:innen auf P2G-Courts weltweit.</span> Deine Performance wird per KI analysiert – und du misst dich im globalen Ranking. Jedes Match zählt.
                  </p>
                </div>

                {/* Feature-Badges */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {[
                    { icon: Zap, label: "Instant Booking" },
                    { icon: TrendingUp, label: "Live-Rankings" },
                    { icon: Gift, label: "P2G Rewards" },
                    { icon: Users, label: "Freundes-Challenges" },
                  ].map((feature) => (
                    <motion.div 
                      key={feature.label}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      <feature.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{feature.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Wingfield KI-Tracking Box - STATISCH */}
                <motion.div 
                  className="p-6 rounded-2xl bg-gradient-to-r from-card to-card/50 border border-destructive/20 hover:border-destructive/40 transition-colors mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl bg-card flex items-center justify-center p-2 md:p-3 shadow-lg border border-border">
                      <img src={wingfieldLogo} alt="Wingfield" className="w-full h-auto object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Radio className="w-5 h-5 text-destructive" />
                        <span className="text-lg font-bold">KI-Tracking</span>
                        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">LIVE</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Powered by Wingfield – automatische Spielanalyse & Stats in Echtzeit
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Expert Levels - AUTO-SCROLL SLIDER */}
                <motion.div 
                  className="mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-lg md:text-2xl font-bold mb-6">
                    Dein Weg zur <span className="text-gradient-lime">Padel Legend</span>
                  </h3>
                  <InfiniteSlider duration={25} gap={16} className="py-2 [--slider-mask:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
                    {EXPERT_LEVELS.map((level) => (
                      <div 
                        key={level.name} 
                        className={`px-4 py-2 rounded-xl bg-gradient-to-r ${level.gradient} text-white shadow-lg flex items-center gap-2 shrink-0`}
                      >
                        <span className="text-xl">{getExpertLevelEmoji(level.name)}</span>
                        <span className="text-xs font-semibold whitespace-nowrap">{level.name}</span>
                      </div>
                    ))}
                  </InfiniteSlider>
                </motion.div>
              </motion.div>

              {/* Right Side - App Mockup KLEINER */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative flex justify-center"
              >
                <div className="relative">
                  {/* Glow-Effekt hinter dem Mockup */}
                  <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-75" />
                  <motion.div 
                    className="relative z-10 w-48 md:w-80 lg:w-96 drop-shadow-2xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <SiteVisual 
                      visualKey="home.gamification.app-mockup" 
                      alt="PADEL2GO App Gamification" 
                      className="w-full h-auto" 
                      fallbackSrc={gamificationMockupFallback} 
                    />
                  </motion.div>
                </div>
              </motion.div>
            </div>

          </div>
        </section>

        {/* KI-Analyse Videos - DIREKT NACH GAMIFICATION OHNE DIVIDER */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-background to-card/30 overflow-hidden">
          <div className="container mx-auto px-4 mb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h3 className="text-xl md:text-3xl lg:text-5xl font-bold mb-3">
                KI-Analyse <span className="text-gradient-lime">in Aktion</span>
              </h3>
              <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-2">
                <span>Powered by</span>
                <img src={wingfieldLogo} alt="Wingfield" className="h-5 inline-block" />
                <span>– Automatische Spielanalyse & Highlights</span>
              </p>
            </motion.div>
          </div>
          
          <InfiniteSlider duration={60} gap={24}>
            {(() => {
              const videos = [
                { src: "/videos/highlights_padel_1080p_1.mp4", label: "Padel Highlights" },
                { src: "/videos/highlights_picklr.mp4", label: "Picklr Analysis" },
                { src: "/videos/highlights_pickleball_1080p.mp4", label: "Pickleball Tracking" },
                { src: "/videos/highlights_rg.mp4", label: "Match Analysis" },
                { src: "/videos/highlights_rna.mp4", label: "Player Tracking" },
              ];
              return [...videos, ...videos, ...videos];
            })().map((video, idx) => (
              <motion.div 
                key={idx}
                className="w-48 md:w-80 h-32 md:h-52 rounded-2xl overflow-hidden border border-border/50 shadow-xl relative group flex-shrink-0"
                whileHover={{ scale: 1.02 }}
              >
                <video 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={video.src} type="video/mp4" />
                </video>
                {/* Subtle overlay with Wingfield badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <img src={wingfieldLogo} alt="Wingfield" className="h-3" />
                  <span className="text-white text-xs">KI-Tracking</span>
                </div>
              </motion.div>
            ))}
          </InfiniteSlider>
        </section>

        <SectionDivider variant="glow" />

        {/* NEUE SECTION: App Download CTA */}
        <section className="py-14 md:py-24 bg-gradient-to-b from-background via-primary/5 to-background">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto"
            >
              {/* App Icon */}
              <motion.div 
                className="mb-8 flex justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <img 
                  src={p2gAppIcon} 
                  alt="PADEL2GO App" 
                  className="w-20 h-20 md:w-36 md:h-36 rounded-3xl shadow-2xl"
                />
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Hol dir die <BrandName /> App
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Buche Courts, sammle P2G-Credits und steige im Ranking auf – alles in einer App.
              </p>

              {/* Store Badges */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <motion.button
                  onClick={() => toast.info("App Store — App coming soon!", { description: "Die App wird in Kürze verfügbar sein." })}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer"
                >
                  <img
                    src={badgeAppStore}
                    alt="Download on the App Store"
                    className="h-12 sm:h-16 md:h-20 lg:h-28 w-auto"
                  />
                </motion.button>

                <motion.button
                  onClick={() => toast.info("Google Play — App coming soon!", { description: "Die App wird in Kürze verfügbar sein." })}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer"
                >
                  <img
                    src={badgeGooglePlay}
                    alt="Get it on Google Play"
                    className="h-12 sm:h-16 md:h-20 lg:h-28 w-auto"
                  />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>


      </main>

      <Footer />
    </>;
};
export default Index;
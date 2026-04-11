import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useState, useCallback, useEffect } from "react";
import { GalaxyHero } from "@/components/ui/galaxy-hero";
import fuerVereineHero from "@/assets/fuer-vereine-hero.jpg";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LockedContentOverlay } from "@/components/LockedContentOverlay";
import { PinGate } from "@/components/PinGate";
import { usePinAccess } from "@/hooks/usePinAccess";
import { SiteVisual } from "@/components/SiteVisual";
import BrandName from "@/components/BrandName";
import partnerTennisPointLogo from "@/assets/partners/tennis-point-vereine.png";
import partnerPadelPointLogo from "@/assets/partners/padel-point-vereine.png";
import partnerP2GLogo from "@/assets/partners/p2g-logo-vereine.png";
import p2gIconLogo from "@/assets/p2g-icon-clean.png";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkyPadelGallery } from "@/hooks/useSkyPadelGallery";
import tennisPadelAerial from "@/assets/courts/tennis-padel-aerial.jpg";
import padelNorway from "@/assets/courts/padel-norway.webp";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowRight,
  Building2,
  MapPin,
  Smartphone,
  PieChart,
  Trophy,
  CheckCircle,
  TrendingUp,
  Users,
  Megaphone,
  Zap,
  Target,
  BarChart3,
  Lightbulb,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Video,
  QrCode,
  Brain,
  Coins,
  ShoppingBag,
  CircleCheck,
  Wrench,
  Shield,
  Quote,
  Handshake,
  Snowflake,
  RotateCcw,
  Gift,
  Package,
  Percent,
  Briefcase,
  LayoutGrid,
  Gem,
  Star } from
"lucide-react";

// KI-Kamera Features
const kiKameraFeatures = [
{
  icon: Video,
  title: "2 Kameras pro Court",
  description: "KI-Kamerasystem mit zwei Kameras für vollständige Court-Abdeckung. Automatisierte Spieleanalyse in Echtzeit – Ballbewegungen, Laufwege und Schlagdaten werden erfasst."
},
{
  icon: QrCode,
  title: "Start per QR-Code",
  description: "Spieler scannen einfach den QR-Code am Court-Eingang, melden sich in der App an – und die Aufzeichnung startet automatisch. Keine komplizierte Technik, kein manuelles Setup."
},
{
  icon: Brain,
  title: "Match-Insights",
  description: "Nach dem Spiel erhalten Spieler optional eine KI-gestützte Auswertung: Schlagstatistiken, Heatmaps, Ballverteilung und individuelle Verbesserungsvorschläge."
},
{
  icon: Trophy,
  title: "Punkte & Progress",
  description: "Jedes Spiel zählt: Spieler sammeln automatisch Punkte basierend auf Aktivität, Spielhäufigkeit und Performance – sichtbar in ihrem persönlichen Spielerprofil."
},
{
  icon: Coins,
  title: "P2G-Credits",
  description: "Credits werden nach jeder Session berechnet: Skill-Level × Match-Score = Credits. Je besser dein Spiel, desto mehr verdienst du."
},
{
  icon: ShoppingBag,
  title: "Einlösen im Ökosystem",
  description: "Credits können im Marketplace für Equipment, Schläger, Bälle und Nutrition eingelöst werden – oder für vergünstigte Buchungen."
},
{
  icon: TrendingUp,
  title: "League",
  description: "Ihre Anlage wird Teil des Netzwerks: Spieler können an überregionalen Ligen und saisonalen Challenges teilnehmen – direkt auf Ihren Courts."
},
{
  icon: CircleCheck,
  title: "Komplett optional",
  description: "Das System ist ein Zusatzangebot: Wer nur spielen möchte, spielt normal. Wer tracken, analysieren und Credits sammeln möchte, aktiviert das Feature per App."
}];


// Digitales Ökosystem Features
const digitalFeatures = [
{ icon: Smartphone, label: "App-Booking", visualKey: "fuer-vereine.oekosystem.app-booking" },
{ icon: BarChart3, label: "Score-Tracking", visualKey: "fuer-vereine.oekosystem.score-tracking" },
{ icon: Trophy, label: "League", visualKey: "fuer-vereine.oekosystem.league-circuit" },
{ icon: Target, label: "Loyalty & Rewards", visualKey: "fuer-vereine.oekosystem.loyalty-rewards" }];


// Angebot-Punkte
const angebotItems = [
{
  icon: Shield,
  title: "Wir übernehmen die Kosten",
  description: "Courts, Aufbau, Software, Marketing, Montage – alles inklusive, €0 für euren Verein.",
  model: "both"
},
{
  icon: TrendingUp,
  title: "Betreibermodell",
  description: "Zusatzerlöse bereits ab Tag 1 – ihr erhaltet x% des Gesamtergebnisses, P2G ist Betreiber.",
  model: "betreiber"
},
{
  icon: Handshake,
  title: "Amortisationsmodell",
  description: "Nach 5-6 Jahren gehören euch die Courts – nachhaltiger Vermögensaufbau ohne Kapitalbindung.",
  model: "amortisation"
},
{
  icon: Coins,
  title: "Keine laufenden Kosten",
  description: "PADEL2GO bleibt euer Partner für App, Buchung und Service – ohne versteckte Gebühren.",
  model: "both"
},
{
  icon: Snowflake,
  title: "Indoor-Option",
  description: "Court kann auch in der Wintersaison genutzt werden – ganzjährig Padel spielen.",
  model: "both"
},
{
  icon: RotateCcw,
  title: "Risikolos",
  description: "Sollte Padel nichts für euren Verein sein, bauen wir kostenlos zurück.",
  model: "both"
}];


const CourtImageCarousel = () => {
  const { data: galleryImages, isLoading } = useSkyPadelGallery(true);
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
              alt={img.alt_text || `SkyPadel Court ${i + 1}`}
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

const FuerVereine = () => {
  const { isUnlocked, isLoading, validatePin } = usePinAccess("vereine");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const { data: partnerTiles, isLoading: partnerTilesLoading } = usePartnerTiles(true);

  return (
    <>
      <Helmet>
        <title>Für Vereine | PADEL2GO – Padel ohne Investition für Ihren Club</title>
        <meta name="description" content="PADEL2GO bringt den Court, die Technik, das Marketing und die Community – Sie bringen nur die Fläche. Ohne Capex, mit Revenue-Share." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background">
        {/* SEKTION 1: Hero */}
        <GalaxyHero
          backgroundImage={fuerVereineHero}
          title="Padel boomt – aber der Aufbau ist komplex."
          highlightedText="Wir lösen das.">
          
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-white mb-8">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Für Tennis- & Sportvereine</span>
          </span>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-10 max-w-4xl mx-auto">
            
            <div className="p-5 md:p-6 rounded-2xl bg-white/10 border-2 border-primary/50 backdrop-blur-sm text-center">
              <Shield className="w-7 h-7 mx-auto mb-2 text-primary" />
              <div className="text-2xl md:text-5xl lg:text-6xl font-bold text-white">€0</div>
              <div className="text-sm md:text-base font-semibold text-white/90 mt-2">Investment</div>
            </div>
            <div className="p-5 md:p-6 rounded-2xl bg-white/10 border-2 border-primary/50 backdrop-blur-sm text-center">
              <Wrench className="w-7 h-7 mx-auto mb-2 text-primary" />
              <div className="text-2xl md:text-5xl lg:text-6xl font-bold text-white">0</div>
              <div className="text-sm md:text-base font-semibold text-white/90 mt-2">Organisation für den Verein</div>
            </div>
            <div className="p-5 md:p-6 rounded-2xl bg-white/10 border-2 border-primary/50 backdrop-blur-sm text-center">
              <Target className="w-7 h-7 mx-auto mb-2 text-primary" />
              <div className="text-2xl md:text-5xl lg:text-6xl font-bold text-white">100%</div>
              <div className="text-sm md:text-base font-semibold text-white/90 mt-2">Padel</div>
            </div>
          </motion.div>

          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto mb-10">
            Wir bringen den Court, die Technik, das Marketing und die Community – ihr bringt nur die Fläche und die Zustimmung.
          </p>

          <motion.a
            href="mailto:contact@padel2go.eu?subject=Anfrage%20für%20Vereine"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors">
            
            <Mail className="w-5 h-5" />
            <span className="font-medium text-lg">Tritt mit uns in Kontakt</span>
          </motion.a>
        </GalaxyHero>


        {/* GESPERRTER BEREICH */}
        <LockedContentOverlay
          isLocked={!isUnlocked && !isLoading}
          onRequestPin={() => setShowPinDialog(true)}
          contactReason="vereine">
          

          {/* SEKTION: P2G als Full-Service Partner */}
          <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={tennisPadelAerial}
                alt="Tennisplatz und Padel-Court Luftaufnahme"
                className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
            </div>

            <div className="container mx-auto px-4 relative z-10 py-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto text-center mb-16">
                
                <h2 className="text-2xl md:text-5xl lg:text-6xl font-bold mb-6">
                  <BrandName inline /> als <span className="text-gradient-lime">Full-Service Partner</span> für euren Verein
                </h2>
                <p className="text-base md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                  Wir übernehmen Court-Bau, Buchungssystem, Marketing und Community-Aufbau – ihr profitiert von einem
                  verjüngten Mitglieder-Mix, zusätzlichen Einnahmen und einem attraktiven neuen Sportangebot.
                  Kein finanzielles Risiko, keine Bausorgen.
                </p>
              </motion.div>

              {/* 3 Service Buckets */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                {
                  icon: Wrench,
                  title: "Court-Aufbau & Wartung",
                  description: "Wir liefern, installieren und warten die Premium-Courts auf eurer Fläche. Ihr müsst euch um nichts kümmern."
                },
                {
                  icon: Smartphone,
                  title: "Digitaler Betrieb",
                  description: "Buchungssystem, Zahlungsabwicklung, KI-Kameraanalyse – der gesamte Court-Betrieb läuft über unsere Plattform."
                },
                {
                  icon: Megaphone,
                  title: "Marketing & Community",
                  description: "Events, Turniere, Social Media und lokale Vermarktung – wir bringen Spieler auf eure Courts."
                }].
                map((item, i) =>
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="p-6 rounded-2xl bg-card/80 backdrop-blur-md border border-border hover:border-primary/30 transition-colors">
                  
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* SEKTION: Unser Angebot – SkyPadel Courts */}
          <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={padelNorway}
                alt="Padel Court in Vereinsumgebung"
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
                    Unser Angebot
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold mb-4">
                    Premium Courts von <span className="text-gradient-lime">SkyPadel</span>
                  </h2>
                </div>

                {/* Court Image Gallery */}
                <CourtImageCarousel />

                {/* SkyPadel Logo + Properties */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-10 p-6 md:p-8 rounded-2xl bg-card border border-border">
                  {(() => {
                    const skyPadel = partnerTiles?.find(t => t.slug === 'skypadel');
                    return (
                      <div className="rounded-xl p-4 flex items-center justify-center shrink-0 w-48 md:w-56" style={{ backgroundColor: skyPadel?.bg_color || '#156184' }}>
                        {skyPadel?.logo_url ? (
                          <img src={skyPadel.logo_url} alt="SkyPadel" className="max-h-16 w-auto object-contain" />
                        ) : (
                          <span className="font-bold text-white text-xl">SkyPadel</span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {["Premium Courts", "Mobil", "Witterungsbeständig", "Wartungsarm"].map((prop) =>
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
                  {[
                  {
                    icon: Building2,
                    title: "Außenansicht",
                    description: "Professionelle Stahlkonstruktion – repräsentativ für euren Verein und sofort ins Auge fallend."
                  },
                  {
                    icon: Zap,
                    title: "Court-Beleuchtung",
                    description: "LED-Flutlicht für Abend- und Nachtbetrieb. Maximale Spielzeiten, auch im Winter."
                  },
                  {
                    icon: Wrench,
                    title: "Bodenaufbau",
                    description: "Hochwertiger Kunstrasenboden mit optimaler Dämpfung – spielt sich wie ein Profi-Court."
                  },
                  {
                    icon: Shield,
                    title: "Drainage",
                    description: "Integriertes Drainagesystem für schnellen Wasserablauf – auch nach starkem Regen sofort spielbereit."
                  }].
                  map((feature, index) =>
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 group">
                    
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-bold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: Technologie-Partner */}
          <section className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto">
                
                <div className="text-center mb-12">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-foreground text-sm font-medium mb-4">
                    <LayoutGrid className="w-4 h-4" />
                    Unsere Partner
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold">
                    Erstklassige <span className="text-gradient-lime">Equipment-Partner</span>
                  </h2>
                </div>

                {/* Equipment Partners – 3-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partnerTilesLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-background border border-border">
                        <Skeleton className="w-full h-20 rounded-xl mb-4" />
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : (
                    partnerTiles?.filter(t => t.partner_type !== 'local').map((tile, index) => {
                      const card = (
                        <motion.div
                          key={tile.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.08 }}
                          className={`flex flex-col items-center text-center p-6 rounded-2xl bg-background border border-border hover:border-primary/30 transition-all duration-300 ${tile.website_url ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''}`}>
                          
                          <div
                            className="rounded-xl p-3 flex items-center justify-center w-full h-20 mb-4"
                            style={{ backgroundColor: tile.bg_color || '#FFFFFF' }}>
                            {tile.logo_url ? (
                              <img src={tile.logo_url} alt={tile.name} className="max-h-12 max-w-[120px] w-auto object-contain" />
                            ) : (
                              <span className="font-bold text-lg tracking-tight">{tile.name}</span>
                            )}
                          </div>
                          <p className="text-lg font-semibold text-foreground mb-1">{tile.name}</p>
                          {tile.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{tile.description}</p>
                          )}
                        </motion.div>
                      );

                      return tile.website_url ? (
                        <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">
                          {card}
                        </a>
                      ) : (
                        <div key={tile.id}>{card}</div>
                      );
                    })
                  )}
                </div>

                {/* Local / Standortpartner */}
                {(() => {
                  const localTiles = partnerTiles?.filter(t => t.partner_type === 'local') || [];
                  if (partnerTilesLoading || localTiles.length === 0) return null;

                  const grouped: Record<string, typeof localTiles> = {};
                  localTiles.forEach(t => {
                    const region = t.region || 'Weitere';
                    if (!grouped[region]) grouped[region] = [];
                    grouped[region].push(t);
                  });

                  return (
                    <div className="mt-16">
                      <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-4xl font-bold">
                          Unsere <span className="text-gradient-lime">Standortpartner</span>
                        </h2>
                      </div>

                      <div className="space-y-10">
                        {Object.entries(grouped).map(([region, tiles]) => (
                          <div key={region}>
                            <div className="flex items-center gap-2 mb-4">
                              <MapPin className="w-5 h-5 text-primary" />
                              <h3 className="text-xl font-bold text-foreground">Region {region}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {tiles.map((tile, index) => {
                                const card = (
                                  <motion.div
                                    key={tile.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.08 }}
                                    className={`flex flex-col items-center text-center p-6 rounded-2xl bg-background border border-border hover:border-primary/30 transition-all duration-300 ${tile.website_url ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''}`}>
                                    
                                    <div
                                      className="rounded-xl p-3 flex items-center justify-center w-full h-20 mb-4"
                                      style={{ backgroundColor: tile.bg_color || '#FFFFFF' }}>
                                      {tile.logo_url ? (
                                        <img src={tile.logo_url} alt={tile.name} className="max-h-12 max-w-[120px] w-auto object-contain" />
                                      ) : (
                                        <span className="font-bold text-lg tracking-tight">{tile.name}</span>
                                      )}
                                    </div>
                                    <p className="text-lg font-semibold text-foreground mb-1">{tile.name}</p>
                                    {tile.description && (
                                      <p className="text-sm text-muted-foreground leading-relaxed">{tile.description}</p>
                                    )}
                                  </motion.div>
                                );

                                return tile.website_url ? (
                                  <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">
                                    {card}
                                  </a>
                                ) : (
                                  <div key={tile.id}>{card}</div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: Zwei starke Partner – Equipment */}
          <section className="py-14 md:py-20 bg-background">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto">
                
                <div className="text-center mb-12">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-foreground text-sm font-medium mb-4">
                    <Handshake className="w-4 h-4" />
                    Starke Partner
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold mb-4">
                    Zwei starke Partner – <span className="text-gradient-lime">volle Ausstattung</span> für euren Verein
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Wir sind stolz auf unsere Partnerschaft mit Padel Point und Tennis Point.
                    Damit profitiert euer Verein von Tag 1 an von professionellem Equipment – ohne eigene Kosten.
                  </p>
                </div>

                {/* Logo-Trio */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-12 mb-16">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border flex items-center justify-center h-20 md:h-28 w-28 md:w-40 lg:w-52">
                    
                    <img src={partnerTennisPointLogo} alt="Tennis Point" className="max-h-14 md:max-h-16 w-auto object-contain" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-card rounded-2xl p-4 md:p-6 shadow-lg border-2 border-primary/30 flex items-center justify-center h-24 md:h-32 w-32 md:w-44 lg:w-56">
                    
                    <img src={partnerP2GLogo} alt="PADEL2GO" className="max-h-16 md:max-h-20 w-auto object-contain" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border flex items-center justify-center h-20 md:h-28 w-28 md:w-40 lg:w-52">
                    
                    <img src={partnerPadelPointLogo} alt="Padel Point" className="max-h-14 md:max-h-16 w-auto object-contain" />
                  </motion.div>
                </div>

                {/* Vorteile Grid */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="p-5 md:p-8 rounded-2xl bg-card border border-border">
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                        <img src={partnerPadelPointLogo} alt="Padel Point" className="w-8 h-8 object-contain" />
                      </div>
                      <h3 className="text-xl font-bold">Padel Point</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-5">
                      <span className="font-semibold text-foreground">Volle Ausstattung ab Tag 1:</span> Padel Point stellt eurem Verein das komplette Equipment zur Verfügung.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Testschläger-Set für jeden Verein</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <CircleCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Bälle inklusive</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Kostenlos für den Verein</span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="p-5 md:p-8 rounded-2xl bg-card border border-border">
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                        <img src={partnerTennisPointLogo} alt="Tennis Point" className="w-8 h-8 object-contain" />
                      </div>
                      <h3 className="text-xl font-bold">Tennis Point</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-5">
                      <span className="font-semibold text-foreground">Günstiges Equipment für eure Mitglieder:</span> Über Tennis Point erhalten eure Vereinsmitglieder exklusive Konditionen.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <ShoppingBag className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Vergünstigtes Padel- & Tennis-Equipment</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Percent className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Exklusive Konditionen für Vereinsmitglieder</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Package className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>Schläger, Bälle und Zubehör</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: Nutzen für euren Verein und eure Mitglieder */}
          <section className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto">
                
                <div className="text-center mb-14">
                  <h2 className="text-2xl md:text-5xl font-bold">
                    Nutzen für euren <span className="text-gradient-lime">Verein</span> und eure <span className="text-gradient-lime">Mitglieder</span>
                  </h2>
                </div>

                {/* 6-Punkte-Raster mit zentralem Logo */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  {/* Linke Spalte */}
                  <div className="space-y-4">
                    {[
                    { icon: Briefcase, title: "Keine Investitionskosten", description: "0€ für euren Verein – P2G trägt alle Kosten für Court, Aufbau und Betrieb." },
                    { icon: LayoutGrid, title: "Keine eigene Organisation", description: "Buchungen, Wartung, Marketing – wir kümmern uns. Euer Verein konzentriert sich aufs Wesentliche." },
                    { icon: Coins, title: "Zusätzliche Einnahmen", description: "Attraktive Umsatzbeteiligung – direkt auf euer Vereinskonto." }].
                    map((item, index) =>
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-all group">
                      
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Zentrales Logo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center py-8 lg:py-0">
                    
                    <div className="relative">
                      <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center shadow-2xl">
                        <img src={p2gIconLogo} alt="PADEL2GO" className="w-36 h-36 md:w-48 md:h-48 object-contain" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 scale-110 animate-pulse" />
                    </div>
                  </motion.div>

                  {/* Rechte Spalte */}
                  <div className="space-y-4">
                    {[
                    { icon: Users, title: "Stärkung der Jugendarbeit", description: "Padel begeistert junge Menschen und stärkt eure Jugendabteilung nachhaltig." },
                    { icon: TrendingUp, title: "Mitgliederzuwachs", description: "Vereine mit Padel berichten von bis zu 50% Mitgliederzuwachs – neue Zielgruppen erschließen." },
                    { icon: Gem, title: "Alleinstellungsmerkmal", description: "Positioniert euren Verein als modernen, innovativen Sportverein in der Region." }].
                    map((item, index) =>
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-all group">
                      
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: Betreibermodell & Amortisationsmodell */}
          <section className="py-14 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-6xl mx-auto">
                
                <div className="text-center mb-12">
                  <h2 className="text-2xl md:text-5xl font-bold mb-4">
                    Zwei Modelle – <span className="text-gradient-lime">Maximaler Outcome</span>
                  </h2>
                  <p className="text-lg text-muted-foreground">Ihr testet und entscheidet selbst.</p>
                </div>

                {/* Konservative Auslastung Banner – vollflächig Amber */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-8 p-4 rounded-xl bg-amber-400 text-center">
                  
                  <span className="font-bold text-xl text-black">
                    Konservative Auslastung ~27%
                  </span>
                </motion.div>

                {/* Zwei Modell-Spalten */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Betreibermodell – Grün */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border-2 border-primary/50 overflow-hidden flex flex-col">
                    
                    <div className="bg-primary/10 px-6 py-5 border-b border-primary/20 text-center">
                      <h3 className="text-2xl md:text-3xl font-bold text-primary">Betreibermodell</h3>
                      <p className="text-base text-muted-foreground mt-1">Ausschüttung ab Start</p>
                    </div>
                    <div className="p-6 md:p-8 bg-card flex flex-col flex-1">
                      {/* Eckpunkte */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        {["P2G ist Betreiber", "Verein erhält x% Gesamtergebnis", "Courts gehören P2G"].map((tag) =>
                        <span key={tag} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm font-medium text-primary">
                            {tag}
                          </span>
                        )}
                      </div>
                      {/* Icons */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                        { icon: Shield, label: "0€ Investition" },
                        { icon: LayoutGrid, label: "Keine Organisation" },
                        { icon: Wrench, label: "Kein Wartungsaufwand" }].
                        map((item) =>
                        <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <item.icon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm text-center font-medium">{item.label}</span>
                          </div>
                        )}
                      </div>
                      {/* Vorteile */}
                      <div className="mb-6">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Eure Vorteile</p>
                        <div className="flex flex-wrap gap-2">
                          {["Zusatzertrag", "Keine Kapitalbindung", "Alle Kosten trägt P2G", "Festes Kontingent", "Vergünstigte Preise für Mitglieder", "Kostenloses Equipment"].map((v) =>
                          <span key={v} className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                              {v}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Fazit */}
                      <div className="mt-auto pt-5 border-t border-border">
                        <div className="p-4 rounded-xl bg-primary text-primary-foreground">
                          <p className="text-base font-bold text-center">
                            ✓ Direkter Cashflow – ohne operative Verantwortung. Kein Risiko.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Amortisationsmodell – Orange */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border-2 border-amber-500/50 overflow-hidden flex flex-col">
                    
                    <div className="bg-amber-500/10 px-6 py-5 border-b border-amber-500/20 text-center">
                      <h3 className="text-2xl md:text-3xl font-bold text-amber-500">Amortisationsmodell</h3>
                      <p className="text-base text-muted-foreground mt-1">Nach 5-6 Jahren in eurem Besitz</p>
                    </div>
                    <div className="p-6 md:p-8 bg-card flex flex-col flex-1">
                      {/* Eckpunkte */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        {["P2G ist Betreiber", "Verein erhält keinen Anteil", "Courts gehören in 5-6 Jahren euch"].map((tag) =>
                        <span key={tag} className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm font-medium text-amber-500">
                            {tag}
                          </span>
                        )}
                      </div>
                      {/* Icons */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                        { icon: Shield, label: "0€ Investition" },
                        { icon: LayoutGrid, label: "Keine Organisation" },
                        { icon: Wrench, label: "Kein Wartungsaufwand" }].
                        map((item) =>
                        <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <item.icon className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-sm text-center font-medium">{item.label}</span>
                          </div>
                        )}
                      </div>
                      {/* Vorteile */}
                      <div className="mb-6">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Eure Vorteile</p>
                        <div className="flex flex-wrap gap-2">
                          {["Vermögensaufbau", "Vergünstigte Preise für Mitglieder", "Kostenloses Equipment", "Alle Kosten trägt P2G"].map((v) =>
                          <span key={v} className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-foreground">
                              {v}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Fazit */}
                      <div className="mt-auto pt-5 border-t border-border">
                        <div className="p-4 rounded-xl bg-amber-400 text-black">
                          <p className="text-base font-bold text-center">
                            ✓ Nachhaltiger Vermögensaufbau – Courts gehören euch. Geteiltes Risiko.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: Wie es jetzt konkret weitergeht */}
          <section className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto">
                
                <div className="text-center mb-14">
                  <h2 className="text-2xl md:text-5xl font-bold mb-2">
                    Wie es jetzt konkret <span className="text-gradient-lime">weitergeht…</span>
                  </h2>
                  <p className="text-muted-foreground text-lg">Unser Modell für Vereine: einfach, transparent, skalierbar.</p>
                </div>

                {/* 4-Schritt-Timeline */}
                <div className="relative">
                  {/* Verbindungslinie */}
                  <div className="hidden md:block absolute top-10 left-10 right-10 h-0.5 bg-gradient-to-r from-primary via-primary to-primary/30 z-0" />

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
                    {[
                    {
                      step: "1",
                      title: "Erstgespräch",
                      details: ["Kennenlernen", "Konzept vorstellen", "Fragen klären"]
                    },
                    {
                      step: "2",
                      title: "Vor-Ort Kennenlernen",
                      details: ["Fläche ansehen", "Fotos", "Untergrund prüfen"]
                    },
                    {
                      step: "3",
                      title: "Vertragsentwurf",
                      details: ["Laufzeit", "Aufteilung der Einnahmen", "Nutzung durch Mitglieder und Externe"]
                    },
                    {
                      step: "4",
                      title: "Bestellung & Aufbau",
                      details: ["Court & Automaten bestellt", "Konkreter Zeitplan", "Aufbau des Courts", "Kurze Einweisung für den Verein"],
                      highlight: "Ab dann: Buchung und Spielbetrieb"
                    }].
                    map((step, index) =>
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                      className="flex flex-col items-center text-center">
                      
                        {/* Circle */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shrink-0 shadow-lg ${
                      index === 3 ?
                      "bg-primary text-primary-foreground" :
                      "bg-background border-2 border-primary text-primary"}`
                      }>
                          {step.step}
                        </div>
                        <h3 className="font-bold text-lg mb-3">{step.title}</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {step.details.map((d) =>
                        <li key={d}>{d}</li>
                        )}
                        </ul>
                        {step.highlight &&
                      <p className="mt-3 text-sm font-semibold text-primary">{step.highlight}</p>
                      }
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* 2-Monate Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="mt-12 p-5 rounded-2xl bg-primary text-primary-foreground text-center">
                  
                  <p className="text-xl md:text-2xl font-bold">
                    Wir bringen in <span className="underline">2 Monaten</span> Padel zu euch!
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* SEKTION: KI-Kameras & P2G-Liga */}
          <section id="digital" className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto">

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="p-8 md:p-10 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20">
                  
                  <div className="w-full max-w-md mx-auto mb-8 aspect-video rounded-2xl bg-muted border border-primary/20 overflow-hidden">
                    <SiteVisual
                      visualKey="fuer-vereine.ki-kamera"
                      alt="KI-Kamera System"
                      className="w-full h-full object-cover" />
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-2">
                    <h3 className="text-lg md:text-2xl lg:text-3xl font-bold flex items-center gap-3">
                      <Target className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
                      NEU: KI-Kameras & P2G-Liga
                    </h3>
                    {(() => {
                      const wingfield = partnerTiles?.find(t => t.slug === 'wingfield');
                      return (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full shrink-0" style={{ backgroundColor: wingfield?.bg_color || "#3FBB7D" }}>
                          {wingfield?.logo_url ? (
                            <img src={wingfield.logo_url} alt="Wingfield" className="h-5 w-auto object-contain" />
                          ) : null}
                          <span className="text-xs font-semibold text-white">Powered by Wingfield</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-base text-muted-foreground mb-1 ml-11">
                    (auch ohne <BrandName inline />-Court)
                  </p>

                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Sie betreiben bereits eigene Padel Courts und möchten ohne Court-Investition trotzdem unser digitales System nutzen?
                    Dann bieten wir jetzt auch unser KI- & Plattform-Modul separat an.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {kiKameraFeatures.map((item, index) =>
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors group"
                      whileHover={{ x: 5 }}>
                      
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-semibold text-foreground pt-2">{item.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-13">
                          {item.description}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="text-center pt-6 border-t border-border/50">
                    <NavLink
                      to="/faq-kontakt?reason=ki-kamera"
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/20 border border-white/30 text-foreground hover:bg-white/30 transition-all font-medium">
                      
                      <MessageCircle className="w-5 h-5" />
                      Unverbindliches Gespräch anfragen
                    </NavLink>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* SEKTION: CTA */}
          <section className="py-14 md:py-24 lg:py-32 bg-gradient-to-b from-background to-primary/5">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-3xl mx-auto">
                
                <h2 className="text-2xl md:text-5xl font-bold mb-6">
                  Bereit, Padel in Ihren Verein zu{" "}
                  <span className="text-gradient-lime">bringen?</span>
                </h2>
                <p className="text-xl text-muted-foreground mb-10">
                  Starten Sie risikofrei – wir investieren, Sie profitieren.
                </p>
                <div className="flex justify-center">
                  <NavLink
                    to="/faq-kontakt?reason=verein"
                    className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white/20 border border-white/30 text-foreground hover:bg-white/30 transition-all font-medium text-base group max-w-md">
                    
                    <MessageCircle className="w-5 h-5" />
                    Unverbindliches Gespräch anfragen
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </div>
              </motion.div>
            </div>
          </section>

        </LockedContentOverlay>
      </main>

      <Footer />

      <PinGate
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onValidate={validatePin}
        pageTitle="Für Vereine" />
      
    </>);

};

export default FuerVereine;
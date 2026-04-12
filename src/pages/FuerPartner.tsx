import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LockedContentOverlay } from "@/components/LockedContentOverlay";
import { PinGate } from "@/components/PinGate";
import { usePinAccess } from "@/hooks/usePinAccess";
import { LogoCloud } from "@/components/ui/logo-cloud";
import { ArrowRight, Handshake, Monitor, MapPin, Trophy, Gift, Zap, Package, Apple, GlassWater, Sparkles, Mail, Building2, TrendingUp, Shield } from "lucide-react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import {
  PartnerConceptSection,
  PartnerBenchmarksSection,
  PartnerMarketStatsSection,
  PartnerEcommerceSection,
  PartnerTablesSection,
} from "@/components/partner";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";

import BrandName from "@/components/BrandName";

const brandTouchpoints = [
  {
    icon: MapPin,
    text: "Branding auf Courts, Netzen, Banden und Glaswänden",
  },
  {
    icon: Monitor,
    text: "In-App-Präsenz: Banner, Featured-Partner, Sponsored Challenges",
  },
  {
    icon: Gift,
    text: "Integration in P2G Rewards (z. B. Gutscheine, Produkte, Experiences als Reward)",
  },
  {
    icon: Zap,
    text: "Platzierung in Vending-Machines (Equipment, Drinks, Snacks, Nutrition)",
  },
  {
    icon: Trophy,
    text: "Aktivierungen bei League-Finals, Circuit-Events & Pop-Up-Nights",
  },
];

const useCases = [
  {
    icon: Package,
    title: "Sport-Retail / Equipment",
    description: "Schläger, Bälle, Grips & Bags als Standard-Rewards im P2G Rewards Store und als Merchandise an unseren Locations.",
  },
  {
    icon: Apple,
    title: "Nutrition & Supplements",
    description: "Recovery-Drinks, Riegel & Supplements in Vending-Machines, als Event-Sampling und als Rewards.",
  },
  {
    icon: GlassWater,
    title: "Getränke-Marken",
    description: "Branding der Pop-Up-Events, Court-Branding, Sponsored Open-Play-Nights, League-Finals.",
  },
  {
    icon: Sparkles,
    title: "Lifestyle-Brands",
    description: "Co-Branded Capsule Collections, Turnier-Series, Social-Content-Serien rund um Padel & Lifestyle.",
  },
];

const FuerPartner = () => {
  const { isUnlocked, isLoading: pinLoading, validatePin } = usePinAccess("partner");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const { data: partnerTiles } = usePartnerTiles();

  const partnerLogos = (partnerTiles || [])
    .filter(t => t.logo_url)
    .map(t => ({ src: t.logo_url!, alt: t.name }));

  return (
    <>
      <Helmet>
        <title>Für Partner & Sponsoren | PADEL2GO – Sichtbarkeit direkt am Court</title>
        <meta name="description" content="Erreiche aktive, sportliche Communities dort, wo sie ihre Quality-Time verbringen – auf dem Padel-Court, in der App und bei Events. Werde Partner von PADEL2GO." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Sektion 1: Hero - IMMER SICHTBAR */}
        <BackgroundPaths title="PADEL2GO für Marken – Sichtbarkeit direkt am Court.">
          <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Erreiche aktive, sportliche Communities dort, wo sie ihre Quality-Time verbringen – 
            auf dem Padel-Court, in der App und bei Events.
          </p>
          
          {/* Social Proof Stats */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-10 mb-10">
            <div className="flex items-center gap-2 text-sm md:text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Vertrauen in den Vereinen</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Mehr Visibility</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-lg">
              <Shield className="w-5 h-5 text-primary" />
              <span>Deutschlandweite Präsenz</span>
            </div>
          </div>
          
          {/* Abschluss-Text */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Zusammen wachsen.
          </p>
        </BackgroundPaths>

        {/* Partner Logos Section - IMMER SICHTBAR */}
        <section className="py-16 bg-white overflow-hidden">
          <div className="container mx-auto px-4 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <p className="text-sm text-gray-500 mb-2">Bereits dabei</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800">
                Mit diesen Partnern realisieren wir <BrandName variant="light" />
              </h3>
            </motion.div>
          </div>
          
          <LogoCloud logos={partnerLogos} variant="light" />
        </section>


        <SectionDivider variant="glow" />

        {/* AB HIER: GESPERRTER BEREICH */}
        <LockedContentOverlay
          isLocked={!isUnlocked && !pinLoading}
          onRequestPin={() => setShowPinDialog(true)}
          contactReason="partner"
        >
          {/* Sektion 4: PADEL2GO - Das Konzept */}
          <PartnerConceptSection />

          <SectionDivider variant="glow" />

          {/* Sektion 5: Markt-Benchmarks */}
          <PartnerBenchmarksSection />

          <SectionDivider variant="glow" />

          {/* Sektion 6: Padel-Nachfrage & Court-Auslastung */}
          <PartnerMarketStatsSection />

          <SectionDivider variant="glow" />

          {/* Sektion 7: E-Commerce / Affiliate Benchmarks */}
          <PartnerEcommerceSection />

          <SectionDivider variant="glow" />

          {/* Sektion: Partner-Versprechen */}
          <section className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto text-center"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span> als <span className="text-gradient-lime">physisch-digitaler Touchpoint</span> für deine Marke
                </h2>
                <p className="text-base md:text-xl text-muted-foreground leading-relaxed">
                  PADEL2GO verbindet reale Courts in Vereinen mit einem digitalen Ökosystem aus App, League, Loyalty und Events. 
                  Für Marken entsteht damit eine einzigartige Plattform: Du wirst sichtbar im echten Leben, bist Teil der Belohnungen 
                  im Loyalty-Programm, präsent in Turnieren und Pop-Up-Events – und kannst deine Wirkung datenbasiert verstehen.
                </p>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* Sektion: Brand-Touchpoints */}
          <section id="touchpoints" className="py-14 md:py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-16"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  Wo deine Marke auf <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span> trifft
                </h2>
              </motion.div>

              <div className="max-w-3xl mx-auto space-y-4">
                {brandTouchpoints.map((touchpoint, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <touchpoint.icon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-lg">{touchpoint.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* Sektion 10+11: Tabellen */}
          <PartnerTablesSection />

          <SectionDivider variant="glow" />

          {/* Sektion: Co-Growth & Revenue-Modelle */}
          <section id="cogrowth" className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto text-center"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  <span className="text-gradient-lime">Co-Growth</span> statt klassischem Sponsoring
                </h2>
                <p className="text-base md:text-xl text-muted-foreground leading-relaxed">
                  Wir denken Partnerschaften nicht nur als Logo-Placement, sondern als gemeinsame Wachstumsreise. 
                  Über Affiliate-/Revenue-Share-Modelle, Co-Kampagnen und integrierte Promotions sorgen wir dafür, 
                  dass sowohl PADEL2GO als auch unsere Partner von steigender Nutzung profitieren. Je mehr Leute spielen, 
                  je mehr Matches in League & Circuit stattfinden und je intensiver das Loyalty-Programm genutzt wird, 
                  desto höher ist der gemeinsame Impact.
                </p>
              </motion.div>
            </div>
          </section>

          <SectionDivider variant="glow" />

          {/* Sektion 5: Use Cases */}
          <section id="usecases" className="py-14 md:py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-16"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  Beispiele für <span className="text-gradient-lime">Partnerschaften</span>
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {useCases.map((useCase, index) => (
                  <motion.div
                    key={useCase.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 md:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <useCase.icon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{useCase.title}</h3>
                        <p className="text-muted-foreground">{useCase.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Sektion 6: CTA */}
          <section className="py-14 md:py-24 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto text-center"
              >
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  Padel als neuen <span className="text-gradient-lime">Brand-Channel</span> öffnen
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground mb-10">
                  Lass uns gemeinsam prüfen, wie PADEL2GO in deine Markenstrategie passt – 
                  von nationaler Sichtbarkeit bis hyperlokalen Aktivierungen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="hero" size="xl" className="group" asChild>
                    <NavLink to="/faq-kontakt?reason=partner">
                      Partner-Deck anfragen
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </Button>
                  <Button variant="outline" size="xl" asChild>
                    <NavLink to="/faq-kontakt?reason=partner">
                      Direkt Kontakt aufnehmen
                    </NavLink>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </LockedContentOverlay>
      </main>

      <Footer />

      {/* PIN Dialog */}
      <PinGate
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onValidate={validatePin}
        pageTitle="Für Partner"
      />
    </>
  );
};

export default FuerPartner;

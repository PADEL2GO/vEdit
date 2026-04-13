import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LogoCloud } from "@/components/ui/logo-cloud";
import { ArrowRight, Package, Apple, GlassWater, Sparkles, Building2, TrendingUp, Shield } from "lucide-react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import {
  PartnerConceptSection,
  PartnerBenchmarksSection,
  PartnerMarketStatsSection,
  PartnerEcommerceSection,
  PartnerTablesSection,
  TouchpointCarousel,
} from "@/components/partner";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { usePartnerTouchpoints } from "@/hooks/usePartnerTouchpoints";
import BrandName from "@/components/BrandName";

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
  const { data: partnerTiles } = usePartnerTiles();
  const { data: touchpointSlides = [] } = usePartnerTouchpoints();

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

        {/* Hero */}
        <BackgroundPaths title="PADEL2GO für Marken – Sichtbarkeit direkt am Court.">
          <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Erreiche aktive, sportliche Communities dort, wo sie ihre Quality-Time verbringen –
            auf dem Padel-Court, in der App und bei Events.
          </p>
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
        </BackgroundPaths>

        {/* Partner Logos */}
        {partnerLogos.length > 0 && (
          <section className="py-16 bg-white overflow-hidden">
            <div className="container mx-auto px-4 mb-10 text-center">
              <p className="text-sm text-gray-500 mb-2">Bereits dabei</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800">
                Mit diesen Partnern realisieren wir <BrandName variant="light" />
              </h3>
            </div>
            <LogoCloud logos={partnerLogos} variant="light" />
          </section>
        )}

        <SectionDivider variant="glow" />

        {/* ── BENEFITS ─────────────────────────────────────────── */}

        {/* Brand Touchpoints Carousel */}
        <section id="touchpoints" className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Wo deine Marke auf <BrandName /> trifft
              </h2>
              <p className="text-muted-foreground text-lg">
                Physisch am Court, digital in der App und live bei Events.
              </p>
            </motion.div>
            <TouchpointCarousel slides={touchpointSlides} />
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Use Cases */}
        <section id="usecases" className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-12"
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

        <SectionDivider variant="glow" />

        {/* Concept */}
        <PartnerConceptSection />

        <SectionDivider variant="glow" />

        {/* KPI Benchmarks */}
        <PartnerBenchmarksSection />

        <SectionDivider variant="glow" />

        {/* ── ZAHLEN & DIAGRAMME ────────────────────────────────── */}

        <section className="py-10 bg-card/30">
          <div className="container mx-auto px-4 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-4xl font-bold tracking-tight"
            >
              Der Markt – <span className="text-gradient-lime">die Zahlen</span>
            </motion.h2>
          </div>
        </section>

        <PartnerMarketStatsSection />

        <SectionDivider variant="glow" />

        <PartnerEcommerceSection />

        <SectionDivider variant="glow" />

        <PartnerTablesSection />

        <SectionDivider variant="glow" />

        {/* CTA */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Padel als neuen <span className="text-gradient-lime">Brand-Channel</span> öffnen
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-10">
                Lass uns gemeinsam prüfen, wie PADEL2GO in deine Markenstrategie passt –
                von nationaler Sichtbarkeit bis hyperlokalen Aktivierungen.
              </p>

              {/* Calendly Embed */}
              <div className="rounded-2xl overflow-hidden border border-border mb-8">
                <iframe
                  src="https://calendly.com/fsteinfelder-padel2go/marketing-padel2go"
                  width="100%"
                  height="700"
                  frameBorder="0"
                  title="Termin buchen"
                />
              </div>

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

      </main>

      <Footer />
    </>
  );
};

export default FuerPartner;

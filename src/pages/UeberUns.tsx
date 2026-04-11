import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BrandName from "@/components/BrandName";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import {
  Heart,
  Target,
  Users,
  Zap,
  Globe,
  Handshake,
  Sparkles,
  TrendingUp,
  MapPin,
  Cpu,
  Linkedin,
  Instagram,
  Mail,
  Rocket } from
"lucide-react";
import florianImg from "@/assets/team/florian-steinfelder.jpg";
import davidImg from "@/assets/team/david-klemm.jpg";
import fuerVereineHero from "@/assets/fuer-vereine-hero.jpg";


const values = [
{
  icon: Sparkles,
  title: "Junge Menschen bewegen",
  description: "Weg vom Bildschirm, rauf auf den Court. Wir bringen junge Menschen zurück in den Sport – und in die Vereine."
},
{
  icon: Users,
  title: "Community stärken",
  description: "Padel verbindet Generationen, Kulturen und Nachbarschaften. Jeder Court ist ein Treffpunkt."
},
{
  icon: Heart,
  title: "Zusammenhalt fördern",
  description: "Vereine sind das Herz der Gesellschaft. Wir geben ihnen eine Sportart, die Menschen zusammenbringt."
},
{
  icon: Handshake,
  title: "Nähe zu Vereinen",
  description: "Wir arbeiten Seite an Seite mit Vereinen. Diese Nähe erfüllt uns – und macht den Unterschied."
},
{
  icon: TrendingUp,
  title: "Den Sport pushen",
  description: "Padel ist mehr als ein Trend. Wir wollen, dass jeder die Chance bekommt, diesen Sport zu entdecken."
}];


const futureGoals = [
{
  icon: MapPin,
  title: "10+ Standorte in Planung",
  subtitle: null,
  description: "Von Bayern bis Norddeutschland – wir planen die nächsten Standorte in Vereinen quer durch DACH."
},
{
  icon: Cpu,
  title: "Padel-Performance-Analyse",
  subtitle: "powered by Wingfield",
  description: "Automatische Match-Analyse, Shot-Tracking und personalisierte Trainingsempfehlungen – direkt vom Court."
},
{
  icon: Globe,
  title: "Expansion in Europa",
  subtitle: null,
  description: "Jeder Verein hat es verdient, Padel anzubieten. Unser Ziel: Vereins-Padel über Deutschland hinaus."
}];


const timeline = [
{ year: "2023", label: "Gründung aus dem Vereinsumfeld" },
{ year: "2024", label: "Erste Courts & Jugendarbeit" },
{ year: "2026", label: "8+ aktive Standorte" },
{ year: "2027", label: "Padel in jedem 3. Verein" }];


const UeberUns = () => {
  const { data: partnerTiles } = usePartnerTiles(true);
  const wingfieldTile = partnerTiles?.find(t => t.slug === 'wingfield');

  return (
    <>
      <Helmet>
        <title>Über PADEL2GO | Mission, Vision & Team</title>
        <meta name="description" content="PADEL2GO bringt Padel in jeden Verein – ohne Barrieren, ohne Kosten. Erfahre mehr über unsere Mission, unser Team und unsere Vision für Padel in DACH." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">

        {/* 1. Hero */}
        <section className="relative py-16 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[280px] h-[280px] md:w-[600px] md:h-[600px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center">
              
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Unsere Mission</span>
              </span>
              
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                Padel in jedem Verein.
                <br />
                <span className="text-gradient-lime text-2xl sm:text-3xl md:text-4xl lg:text-5xl">Ohne Barrieren. Ohne Kosten.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground">
                Wir bringen den schnellst wachsenden Sport Europas dahin, wo die Menschen schon sind – 
                in ihre Vereine, ihre Nachbarschaft, ihr Leben.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 2. Team */}
        <section className="py-14 md:py-20 bg-card/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-12">
              
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Das Team
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Wer wir sind
              </h2>
              <p className="text-muted-foreground">
                Zwei Unternehmer, ein Ziel: Padel als Vereinssport für alle.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Florian */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-5 md:p-8 rounded-2xl bg-background border border-border text-center flex flex-col">
                
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-primary/30 p-1 mx-auto mb-5">
                  <img
                    src={florianImg}
                    alt="Florian Steinfelder"
                    className="w-full h-full rounded-full object-cover" />
                  
                </div>
                <h3 className="text-xl font-bold tracking-wide mb-1">FLORIAN STEINFELDER</h3>
                <p className="text-primary text-sm font-medium mb-4">Managing Partner</p>

                <div className="flex justify-center gap-4 mb-5">
                  <a href="https://www.linkedin.com/in/floriansteinfelder" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href="https://www.instagram.com/padel2go.official" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="mailto:contact@padel2go.eu" className="text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Unternehmer, Padel-Enthusiast & Managing Partner. Aus dem Tech- und Investmentumfeld 
                  bringt er unternehmerische Klarheit und echte Sport-Leidenschaft zusammen – für faire, 
                  partnerschaftliche Padel-Courts in ganz DACH.
                </p>
              </motion.div>

              {/* David */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-5 md:p-8 rounded-2xl bg-background border border-border text-center flex flex-col">
                
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-primary/30 p-1 mx-auto mb-5">
                  <img
                    src={davidImg}
                    alt="David Klemm"
                    className="w-full h-full rounded-full object-cover" />
                  
                </div>
                <h3 className="text-xl font-bold tracking-wide mb-1">DAVID KLEMM</h3>
                <p className="text-primary text-sm font-medium mb-4">Managing Partner</p>

                <div className="flex justify-center gap-4 mb-5">
                  <a href="https://www.linkedin.com/in/davidklemm" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href="https://www.instagram.com/padel2go.official" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="mailto:contact@padel2go.eu" className="text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Unternehmer im Herzen, Zahlen im Kopf. Mit Stationen bei Porsche, Orlando Capital 
                  und GREENPEAK verantwortet er Finanzstrategie, Unit Economics und profitables Wachstum 
                  – damit Padel2Go nicht nur Spaß macht, sondern auch rechnet.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. Werte */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10">
              
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Heart className="w-4 h-4" />
                Unsere Werte
              </span>
              <h2 className="text-3xl md:text-4xl font-bold">
                Was uns <span className="text-gradient-lime">antreibt</span>
              </h2>
            </motion.div>

            {/* Hero-Bild */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10 rounded-2xl overflow-hidden">
              
              <img

                alt="PADEL2GO Gründer auf dem Padelfeld"
                className="w-full h-[250px] md:h-[300px] object-cover" src="/lovable-uploads/bedad1b9-b247-4cd9-b897-f2a7cb87073e.png" />
              
            </motion.div>

            {/* 3 oben */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              {values.slice(0, 3).map((value, index) =>
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border text-center">
                
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </motion.div>
              )}
            </div>
            {/* 2 unten zentriert */}
            <div className="grid md:grid-cols-2 gap-5 max-w-full sm:max-w-[calc(66.666%+0.625rem)] mx-auto">
              {values.slice(3).map((value, index) =>
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 3) * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border text-center">
                
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Story → Timeline */}
        <section className="py-14 md:py-20 bg-card/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10">
              
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Rocket className="w-4 h-4" />
                Unsere Story
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Wie <BrandName inline /> entstanden ist
              </h2>
              <p className="text-muted-foreground">
                Aus Jugendarbeit im Verein wurde eine Mission: Padel für alle zugänglich machen.
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-stretch gap-0">
                {timeline.map((step, index) =>
                <motion.div
                  key={step.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="flex-1 flex flex-col items-center text-center relative">
                  
                    {index > 0 &&
                  <div className="hidden md:block absolute left-0 top-7 w-1/2 h-px bg-border -translate-y-1/2" />
                  }
                    {index < timeline.length - 1 &&
                  <div className="hidden md:block absolute right-0 top-7 w-1/2 h-px bg-border -translate-y-1/2" />
                  }
                    {index < timeline.length - 1 &&
                  <div className="md:hidden w-px h-8 bg-border mt-1 mb-1" />
                  }

                    <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold text-sm">{step.year}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground px-4">{step.label}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Vision */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}>
              
              <div className="grid lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <Target className="w-4 h-4" />
                    Unsere Vision
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold mb-5">
                    Padel als <span className="text-gradient-lime">Gesellschaftssport</span> – nicht als Luxus
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Padel darf kein Sport sein, den man sich leisten können muss. Unser Ziel:{" "}
                    <strong className="text-foreground">Padel als Vereinssport für alle</strong> – 
                    bezahlbar, nahbar und mitten in der Gemeinschaft.
                  </p>
                  <p className="text-muted-foreground">
                    Statt teurer Anlagen in Ballungsgebieten setzen wir auf lokale Vereine. 
                    Unser 0-Euro-Modell ermöglicht jedem Verein Padel – ohne Investitionsrisiko. 
                    Wir liefern Courts, Technologie und Betrieb. Der Verein gewinnt neue Mitglieder 
                    und eine Sportart mit Zukunft.
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <Globe className="w-9 h-9 text-primary mb-3" />
                    <h3 className="text-base font-bold mb-2">Rein in die Vereine</h3>
                    <p className="text-muted-foreground text-sm">
                      Padel gehört nicht in teure Hallen. Wir bringen den Sport dahin, 
                      wo er hingehört: in die lokalen Vereine und Gemeinden.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15">
                    <Zap className="w-9 h-9 text-primary mb-3" />
                    <h3 className="text-base font-bold mb-2">0-Euro für Vereine</h3>
                    <p className="text-muted-foreground text-sm">
                      Der Verein stellt die Fläche, wir liefern Courts, Technik und Betrieb. 
                      Komplett kostenlos.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 6. Zukunft */}
        <section className="py-14 md:py-20 bg-card/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10">
              
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                Die Zukunft
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Was als <span className="text-gradient-lime">Nächstes</span> kommt
              </h2>
              <p className="text-muted-foreground">
                Wir haben große Pläne – und arbeiten jeden Tag daran, sie umzusetzen.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {futureGoals.map((goal, index) =>
              <motion.div
                key={goal.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col p-5 md:p-8 rounded-2xl bg-card border border-border text-center h-full">
                
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <goal.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{goal.title}</h3>
                  {goal.subtitle && wingfieldTile && (
                    <div className="mb-3">
                      <a href={wingfieldTile.website_url || '#'} target="_blank" rel="noopener noreferrer">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer" style={{ backgroundColor: wingfieldTile.bg_color || "#3FBB7D" }}>
                          {wingfieldTile.logo_url ? (
                            <img alt="Wingfield" className="h-3.5 w-auto" src={wingfieldTile.logo_url} />
                          ) : (
                            <span>Wingfield</span>
                          )}
                        </span>
                      </a>
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed mt-auto pt-2">{goal.description}</p>
                </motion.div>
              )}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>);

};

export default UeberUns;
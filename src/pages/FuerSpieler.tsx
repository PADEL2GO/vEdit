import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import BrandName from "@/components/BrandName";
import { NavLink } from "@/components/NavLink";
import { EXPERT_LEVELS } from "@/lib/expertLevels";
import padel2goLogoFull from "@/assets/padel2go-logo-full.png";
import fuerSpielerHero from "@/assets/fuer-spieler-hero.png";
import { 
  ArrowRight, Smartphone, MapPin, Zap, Calendar, 
  Gift, TrendingUp, Coins, BarChart3, Sparkles, 
  Crosshair, Timer, Wallet, ShoppingBag, Target,
  Brain, Flame, Award, Activity, Video, Dumbbell,
  LineChart, Users
} from "lucide-react";

/**
 * FÜR SPIELER - Seite
 * Neue Struktur: Intro → App-Booking → P2G Points → Marketplace → KI-Analyse
 */


// Expert Levels für Tier-Anzeige
const expertLevels = EXPERT_LEVELS.map(level => ({
  name: level.name,
  points: level.maxPoints === Infinity 
    ? `${level.minPoints.toLocaleString("de-DE")}+` 
    : `${level.minPoints.toLocaleString("de-DE")} – ${level.maxPoints.toLocaleString("de-DE")}`,
  gradient: level.gradient,
  emoji: level.name === "Beginner" ? "🌱" : 
         level.name === "Rookie" ? "🎾" : 
         level.name === "Player" ? "⚡" : 
         level.name === "Expert" ? "🔥" : 
         level.name === "Pro" ? "💎" : 
         level.name === "Master" ? "👑" : 
         level.name === "Champion" ? "🏆" : "🌟"
}));

const bookingSteps = [
  { icon: Crosshair, title: "Standort wählen", description: "Finde Courts in deiner Nähe" },
  { icon: Timer, title: "Zeit auswählen", description: "Echtzeit-Verfügbarkeit" },
  { icon: Wallet, title: "Bezahlen & spielen", description: "Apple Pay, Google Pay, Karte" }
];

const marketplaceCategories = [
  { icon: Calendar, title: "Court-Buchungen", description: "Löse Credits für Spielzeit ein" },
  { icon: Dumbbell, title: "Equipment", description: "Schläger, Bälle, Zubehör" },
  { icon: Gift, title: "Partner-Rewards", description: "Getränke, Snacks, Rabatte" },
  { icon: Award, title: "Events", description: "Exklusive Turnier-Zugänge" }
];

const kiFeatures = [
  { icon: Activity, title: "Echtzeit-Tracking", description: "Jeder Move wird erfasst" },
  { icon: LineChart, title: "Match-Statistiken", description: "Detaillierte Auswertung nach jedem Spiel" },
  { icon: Target, title: "Schwächen erkennen", description: "KI zeigt dir, wo du besser werden kannst" },
  { icon: Video, title: "Video-Highlights", description: "Deine besten Momente automatisch gespeichert" },
  { icon: Brain, title: "Training-Empfehlungen", description: "Personalisierte Tipps für dein Spiel" },
  { icon: TrendingUp, title: "Fortschritts-Tracking", description: "Verfolge deine Entwicklung über Zeit" }
];

const p2gCreditCards = [
  { icon: Calendar, title: "Punkte bei jeder Buchung", description: "Sammle automatisch P2G Points bei jeder Court-Buchung" },
  { icon: Flame, title: "Buchungsstreaks", description: "Buche regelmäßig und erhalte Bonus-Points durch Streaks" },
  { icon: Users, title: "Refer Friends & Game Points", description: "Lade Freunde ein und verdiene Points durch gemeinsame Matches" }
];

const FuerSpieler = () => {
  return (
    <>
      <Helmet>
        <title>Für Spieler | PADEL2GO – Buche Courts, sammle P2G-Credits, löse Rewards ein</title>
        <meta name="description" content="Mit PADEL2GO buchst du Courts in Sekunden, sammelst P2G-Credits durch Buchungen und KI-Analyse, und löst sie im Marketplace ein." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">

        {/* SEKTION 1: Hero - Was dir PADEL2GO bringt */}
        <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={fuerSpielerHero} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_30%] z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/55 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />

          <div className="container mx-auto px-4 relative z-10 pt-[15vh] md:pt-[20vh] lg:pt-[30vh]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-white mb-8">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Für Spieler</span>
              </span>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8 text-white">
                Was dir <BrandName className="font-bold" /> bringt
              </h1>
              
              <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto mb-10">
                Buche Courts in Sekunden, sammle P2G-Credits bei jeder Buchung und jedem Match, 
                und löse sie im Marketplace für Equipment, Spielzeit und mehr ein.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <NavLink 
                  to="/booking"
                  className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-lg min-h-[48px]"
                >
                  <MapPin className="w-5 h-5" />
                  Court buchen
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
                <NavLink 
                  to="/app-booking"
                  className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors font-medium text-lg min-h-[48px]"
                >
                  <Smartphone className="w-5 h-5" />
                  App herunterladen
                </NavLink>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SEKTION 2: All-in-one App */}
        <section id="booking" className="py-10 md:py-14 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                {/* Left: Content */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="order-2 lg:order-1"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-foreground mb-6">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Alles in einer App</span>
                  </span>
                  
                  <h2 className="text-2xl md:text-5xl font-bold mb-6">
                    Dein <span className="text-gradient-lime">All-in-one</span> Padel-Hub
                  </h2>
                  
                  <p className="text-base md:text-lg text-muted-foreground mb-10 leading-relaxed">
                    Buche Courts in Sekunden, tracke deine Stats, löse Rewards ein – 
                    alles an einem Ort, egal ob auf dem Smartphone oder im Browser.
                  </p>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mb-10">
                    {[
                      { icon: MapPin, label: "Standorte finden" },
                      { icon: Calendar, label: "Courts buchen" },
                      { icon: Coins, label: "Credits sammeln" },
                      { icon: ShoppingBag, label: "Rewards einlösen" },
                      { icon: BarChart3, label: "Stats tracken" },
                      { icon: Users, label: "Freunde einladen" },
                    ].map((feature) => (
                      <span 
                        key={feature.label}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm"
                      >
                        <feature.icon className="w-4 h-4 text-primary" />
                        {feature.label}
                      </span>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <NavLink 
                      to="/booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-lg"
                    >
                      Jetzt Court buchen
                      <ArrowRight className="w-5 h-5" />
                    </NavLink>
                    <NavLink 
                      to="/app-booking"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/20 border border-white/30 text-foreground hover:bg-white/30 transition-colors font-medium text-lg"
                    >
                      <Smartphone className="w-5 h-5" />
                      App herunterladen
                    </NavLink>
                  </div>
                </motion.div>

                {/* Right: App Mockup */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative order-1 lg:order-2 flex justify-center"
                >
                  <div className="relative">
                    {/* Glow Effect */}
                    <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-[4rem] blur-2xl" />
                    
                    {/* Phone Frame */}
                    <div className="relative w-56 h-[440px] md:w-72 md:h-[560px] bg-gradient-to-b from-card to-background rounded-[3rem] border-4 border-border shadow-2xl overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-background rounded-full z-10" />
                      
                      {/* Screen Content */}
                      <div className="p-5 pt-14 h-full flex flex-col gap-4">
                        {/* Search Bar */}
                        <div className="h-12 bg-primary/10 rounded-2xl flex items-center px-4 gap-3">
                          <MapPin className="w-5 h-5 text-primary" />
                          <span className="text-sm text-muted-foreground">Standort suchen...</span>
                        </div>
                        
                        {/* Location Card */}
                        <div className="p-4 bg-card rounded-2xl border border-border">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                              <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">PADEL2GO Court</p>
                              <p className="text-xs text-muted-foreground">3 Courts verfügbar</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["10:00", "11:30", "14:00", "16:30"].map((time, i) => (
                              <div 
                                key={time} 
                                className={`py-2 rounded-lg text-xs font-medium text-center ${
                                  i === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-foreground'
                                }`}
                              >
                                {time}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats Preview */}
                        <div className="p-4 bg-card rounded-2xl border border-border flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium">Deine Stats</span>
                            <BarChart3 className="w-4 h-4 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">P2G Credits</span>
                              <span className="text-sm font-bold text-primary">247</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Skill-Level</span>
                              <span className="text-sm font-bold">Expert</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Matches</span>
                              <span className="text-sm font-bold">32</span>
                            </div>
                          </div>
                        </div>

                        {/* Book Button */}
                        <div className="h-14 bg-primary rounded-2xl flex items-center justify-center gap-2 font-semibold text-primary-foreground">
                          <Calendar className="w-5 h-5" />
                          Court buchen
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* SEKTION 3: P2G Points System */}
        <section id="p2g-points" className="py-10 md:py-14 lg:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-foreground mb-6">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">P2G Points</span>
              </span>
              
              <h2 className="text-2xl md:text-5xl font-bold mb-6">
                Sammle <span className="text-gradient-lime">P2G-Credits</span>
              </h2>
              
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Mit jeder Buchung und jedem Match sammelst du P2G-Credits – eine Art Payback-System für Padel-Spieler. 
                Je höher dein Skill-Level, desto mehr Credits verdienst du automatisch.
              </p>
            </motion.div>

            {/* Drei gleichgroße Karten */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {p2gCreditCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-colors text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <card.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-muted-foreground">{card.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Expert Levels */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-5 md:p-8 rounded-3xl bg-background border border-border mb-12"
            >
              <h3 className="text-lg md:text-xl font-bold text-center mb-6">Dein Expert-Level bestimmt deinen Multiplikator</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
                {expertLevels.map((level, index) => (
                  <motion.div
                    key={level.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-2 md:p-4 rounded-xl bg-gradient-to-br ${level.gradient} text-center`}
                  >
                    <span className="text-2xl mb-1 block">{level.emoji}</span>
                    <p className="text-sm font-bold text-white">{level.name}</p>
                    <p className="text-xs text-white/70">{level.points}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="text-center">
              <NavLink 
                to="/rewards"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/20 border border-white/30 text-foreground hover:bg-white/30 transition-colors font-medium"
              >
                Mehr über P2G Points erfahren
                <ArrowRight className="w-5 h-5" />
              </NavLink>
            </div>
          </div>
        </section>

        {/* SEKTION 4: Marketplace */}
        <section id="marketplace" className="py-10 md:py-14 lg:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-foreground mb-6">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Marketplace</span>
              </span>
              
              <h2 className="text-2xl md:text-5xl font-bold mb-6">
                Löse Credits ein im <span className="text-gradient-lime">Marketplace</span>
              </h2>
              
              <p className="text-lg text-muted-foreground">
                Deine gesammelten P2G-Credits kannst du jederzeit einlösen – für Court-Buchungen, 
                Equipment, Getränke, Snacks und exklusive Event-Zugänge.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {marketplaceCategories.map((category, index) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors text-center group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <category.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{category.title}</h3>
                  <p className="text-muted-foreground text-sm">{category.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <NavLink 
                to="/dashboard/marketplace"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
              >
                Zum Marketplace
                <ArrowRight className="w-5 h-5" />
              </NavLink>
            </div>
          </div>
        </section>

        {/* SEKTION 5: KI-Performance-Analyse */}
        <section id="ki-analyse" className="py-10 md:py-14 lg:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-foreground mb-6">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">KI-Analyse</span>
              </span>
              
              <h2 className="text-2xl md:text-5xl font-bold mb-6">
                Deine Performance. <span className="text-gradient-lime">Live analysiert.</span>
              </h2>
              
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Auf PADEL2GO Courts erfassen Wingfield KI-Kameras jeden deiner Moves. 
                Nach jedem Match erhältst du detaillierte Statistiken und Empfehlungen.
              </p>
              
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Das Ergebnis:</strong> Du weißt genau, 
                was du trainieren musst, um besser zu werden – datenbasiert statt Bauchgefühl.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {kiFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Training-Empfehlungen Highlight */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-5 md:p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Target className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-bold mb-3">Werde besser – mit echten Daten</h3>
                  <p className="text-muted-foreground mb-4">
                    Die KI analysiert deine Schläge, Laufwege und Positionierung. 
                    Du bekommst konkrete Empfehlungen: „Verbessere deine Rückhand-Volley" 
                    oder „Arbeite an deiner Court-Coverage links hinten".
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Schlaganalyse
                    </span>
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Heatmaps
                    </span>
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Laufwege
                    </span>
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Reaktionszeit
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default FuerSpieler;

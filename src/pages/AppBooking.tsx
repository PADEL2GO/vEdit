import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Calendar, Target, Users, Trophy, Wallet, MapPin, CreditCard, Play, ArrowRight, Brain, Video, Activity, BarChart3, UserPlus, Clock, Camera } from "lucide-react";
import appIcon from "@/assets/p2g-app-icon.png";
import badgeAppStore from "@/assets/badge-app-store.png";
import badgeGooglePlay from "@/assets/badge-google-play.png";
import wingfieldLogo from "@/assets/partners/wingfield.png";
import appBookingHero from "@/assets/app-booking-hero.jpg";

/**
 * APP & BOOKING - Seite
 * 
 * Zusammenfassung:
 * Diese Seite präsentiert die Padel2Go App als Game-Changing Padel Experience.
 * 
 * Sektionen:
 * 1. Hero: Game-Changing Padel Experience mit einer App + Store Badges
 * 2. Was die App kann: Buchung, Score-Tracking, Spielerprofile, League (Coming Soon), P2G Wallet, Matching (Coming Soon)
 * 3. Booking-Flow in 3 Steps
 * 4. AI & Stats (mit Wingfield): Live-Kamera-Analyse
 */

const appFeatures = [{
  icon: Calendar,
  title: "Court-Buchung",
  description: "Buche Courts an allen Padel2Go-Standorten in Echtzeit – flexibel, schnell und unkompliziert.",
  comingSoon: false
}, {
  icon: Target,
  title: "Score-Tracking & KI-Analyse",
  description: "Erfasse deine Spielergebnisse, nutze die KI-Performance-Analyse und finde alles zu deinen Stats.",
  comingSoon: false
}, {
  icon: Users,
  title: "Spielerprofile",
  description: "Dein persönliches Profil mit Spielhistorie, Statistiken und deinem aktuellen Skill-Level.",
  comingSoon: false
}, {
  icon: Trophy,
  title: "League",
  description: "Ranglisten, Spielpaarungen und Ergebnisse – alles direkt in der App.",
  comingSoon: true
}, {
  icon: Wallet,
  title: "P2G Wallet",
  description: "Behalte deine P2G Points im Überblick: Punkte sammeln, Status checken und Prämien einlösen.",
  comingSoon: false
}, {
  icon: UserPlus,
  title: "Matching-Tool",
  description: "Finde Mitspieler für dein nächstes Match: Trage deine Verfügbarkeit ein und werde automatisch gematcht.",
  comingSoon: true
}];

const bookingSteps = [{
  step: "1",
  icon: MapPin,
  title: "Location wählen",
  description: "Finde deinen Padel2Go-Standort in der Nähe oder wähle deinen Lieblings-Court aus der Liste aller Standorte."
}, {
  step: "2",
  icon: Calendar,
  title: "Slot wählen",
  description: "Sieh die Verfügbarkeit in Echtzeit und wähle Datum, Uhrzeit und Dauer für dein nächstes Match aus."
}, {
  step: "3",
  icon: CreditCard,
  title: "Bezahlen & Spielen",
  description: "Sichere Bezahlung direkt in der App mit allen gängigen Zahlungsmethoden – und ab auf den Court!"
}];

const aiFeatures = [{
  icon: Camera,
  title: "Live-Kamera-Tracking",
  description: "Dein Spiel wird live über Kameras erfasst und analysiert – keine manuelle Eingabe nötig."
}, {
  icon: Activity,
  title: "Distance Tracking",
  description: "Erfasse automatisch deine gelaufene Distanz pro Match und vergleiche dich mit anderen Spielern."
}, {
  icon: BarChart3,
  title: "Zonen-Coverage",
  description: "Analysiere deine Positionierung auf dem Court – wo stehst du am häufigsten, wo solltest du aktiver sein?"
}, {
  icon: Video,
  title: "Video-Highlights",
  description: "Automatisch generierte Highlight-Clips deiner besten Ballwechsel zum Teilen und Analysieren."
}, {
  icon: Brain,
  title: "KI-gestützte Spielanalyse",
  description: "Persönliche Tipps und Insights zur Verbesserung deines Spiels basierend auf deinen Match-Daten."
}, {
  icon: Target,
  title: "Schlaganalyse",
  description: "Detaillierte Analyse deines Schlagverhaltens: Aufschläge, Parejas, Lobs, Bandeja und mehr – erkenne deine Stärken und Schwächen."
}];

const AppBooking = () => {
  return <>
      <Helmet>
        <title>App & Booking | PADEL2GO – Game-Changing Padel Experience</title>
        <meta name="description" content="Die PADEL2GO App: Court-Buchung, Score-Tracking, Spielerprofile, League-Integration und Loyalty – alles in einer App. Hol dir jetzt die Game-Changing Padel Experience." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Sektion 1: Hero */}
        <section className="relative min-h-[80vh] md:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={appBookingHero} alt="" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/55 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />

          <div className="container mx-auto px-4 relative z-10 pt-[20vh]">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">PADEL<span className="text-primary">2</span>GO App</span>
                </span>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
                  Die{" "}
                  <span className="text-gradient-lime">Game-Changing</span>{" "}
                  Padel Experience – in einer App.
                </h1>
                
                <p className="text-xl text-white/80 mb-8">
                  Mit der PADEL2GO App hast du alles, was du für dein Padel-Erlebnis brauchst: 
                  Courts buchen, Ergebnisse tracken, Mitspieler finden und Rewards sammeln – 
                  alles an einem Ort.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Button variant="hero" size="xl" className="group" asChild>
                    <NavLink to="/booking">
                      <Play className="w-5 h-5" />
                      Jetzt buchen
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </Button>

                  {/* Store Badges */}
                  <div className="flex items-center gap-4">
                    <a 
                      href="https://apps.apple.com/app/padel2go" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:opacity-80 hover:scale-105 transition-all"
                    >
                      <img src={badgeAppStore} alt="Download on the App Store" className="h-20 sm:h-24 md:h-32 lg:h-40 w-auto" />
                    </a>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.padel2go" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:opacity-80 hover:scale-105 transition-all"
                    >
                      <img src={badgeGooglePlay} alt="Get it on Google Play" className="h-20 sm:h-24 md:h-32 lg:h-40 w-auto" />
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex justify-center">
                {/* App Icon */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl" />
                  <img 
                    src={appIcon} 
                    alt="PADEL2GO App Icon" 
                    className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-3xl shadow-2xl"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 2: Was die App kann */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Was die <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span> App kann
              </h2>
              <p className="text-lg text-muted-foreground">
                Von der Buchung bis zum Loyalty-Programm – alle Features für dein perfektes Padel-Erlebnis.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {appFeatures.map((feature, index) => <motion.div key={feature.title} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.1
            }} className={`p-6 rounded-2xl bg-background border ${feature.comingSoon ? 'border-dashed border-border' : 'border-border hover:border-primary/30'} transition-all duration-300 group relative`}>
                  {feature.comingSoon && (
                    <Badge variant="secondary" className="absolute top-4 right-4 text-xs">
                      Coming Soon
                    </Badge>
                  )}
                  <div className={`w-12 h-12 rounded-xl ${feature.comingSoon ? 'bg-muted' : 'bg-primary/10 group-hover:bg-primary/20'} flex items-center justify-center mb-4 transition-colors`}>
                    <feature.icon className={`w-6 h-6 ${feature.comingSoon ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>)}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 3: Booking-Flow in 3 Steps */}
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                Court buchen in <span className="text-gradient-lime">3 einfachen Schritten</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                So schnell warst du noch nie auf dem Padel-Court.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {bookingSteps.map((item, index) => <motion.div key={item.step} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.15
            }} className="relative">
                  {/* Connection line */}
                  {index < bookingSteps.length - 1 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />}
                  
                  <div className="p-8 rounded-2xl bg-card border border-border text-center relative h-full flex flex-col">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground font-bold text-lg md:text-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                      {item.step}
                    </div>
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground flex-grow">{item.description}</p>
                  </div>
                </motion.div>)}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 4: AI & Stats mit Wingfield */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-3xl mx-auto mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">Coming Soon</span>
              </span>
              
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                <span className="text-gradient-lime">AI & Stats</span> – Die Zukunft deines Spiels
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                In Kooperation mit Wingfield bringen wir KI-gestützte Spielanalyse auf den Padel-Court. 
                Dein Spiel wird live über Kameras erfasst, analysiert und ausgewertet – 
                für maximale Insights und kontinuierliche Verbesserung.
              </p>
              
              {/* Wingfield Partner Logo */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-sm text-muted-foreground">In Kooperation mit</span>
                <img 
                  src={wingfieldLogo} 
                  alt="Wingfield" 
                  className="h-10 rounded-lg"
                />
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {aiFeatures.map((feature, index) => <motion.div key={feature.title} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.1
            }} className="p-6 rounded-2xl bg-background border border-border border-dashed hover:border-primary/30 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>)}
            </div>

            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="mt-12 p-6 rounded-2xl bg-background/50 border border-primary/20 max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <Camera className="w-8 h-8 text-primary" />
                <h3 className="text-xl font-bold">So funktioniert's</h3>
              </div>
              <p className="text-muted-foreground">
                An unseren Standorten werden Kameras installiert, die dein Spiel automatisch erfassen. 
                Die KI-Analyse läuft im Hintergrund und liefert dir nach jedem Match detaillierte 
                Statistiken, Heatmaps und personalisierte Verbesserungsvorschläge direkt in der App.
                Keine manuelle Eingabe, keine Sensoren – einfach spielen und lernen.
              </p>
            </motion.div>

            <motion.p initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto">
              Diese Features befinden sich in Entwicklung und werden schrittweise in der App verfügbar gemacht. 
              Bleib gespannt – die Zukunft des Padel-Trackings kommt!
            </motion.p>
          </div>
        </section>
      </main>

      <Footer />
    </>;
};
export default AppBooking;

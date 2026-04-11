import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Target, 
  Flame, 
  Star,
  Zap,
  Crown,
  Gift,
  TrendingUp,
  Globe,
  Sparkles,
  Swords,
  BarChart3,
  Radio,
  Building2
} from "lucide-react";
import { getExpertLevel as getExpertLevelFromConfig, getExpertLevelEmoji } from "@/lib/expertLevels";
import leagueHero from "@/assets/league-hero.jpg";
import leagueP2gLogo from "@/assets/league-p2g-logo.png";

/**
 * LEAGUE - Seite
 * 
 * Die schnellst wachsende Online-Liga für Padel in Europa.
 * Open Ranking, Circuit-Turniere, P2G-Credits und Community.
 */

// League Punktesystem
const leaguePoints = [
  { action: "Sieg gegen gleichwertigen Gegner", points: "+25 Punkte", icon: Trophy },
  { action: "Sieg gegen stärkeren Gegner", points: "+40 Punkte", icon: TrendingUp },
  { action: "Knappe Niederlage (1-2 Punkte)", points: "+5 Punkte", icon: Target },
  { action: "3-Match-Siegesserie", points: "+15 Bonus", icon: Flame },
  { action: "5-Match-Siegesserie", points: "+30 Bonus", icon: Crown },
  { action: "10-Match-Siegesserie", points: "+50 Bonus + Badge", icon: Sparkles },
];

// Use centralized expert level config
const getExpertLevel = (points: number) => {
  const level = getExpertLevelFromConfig(points);
  return {
    name: level.name,
    color: `bg-gradient-to-r ${level.gradient}`,
    textColor: level.name === "Padel Legend" ? "text-gray-900" : "text-white",
  };
};

const leagueAdvantages = [
  {
    icon: Users,
    title: "Starke Community",
    description: "Werde Teil einer aktiven Spieler-Community, die sich gegenseitig pusht und gemeinsam besser wird.",
  },
  {
    icon: TrendingUp,
    title: "Live-Ranking",
    description: "Dein dynamisches Ranking zeigt deinen Fortschritt – jedes Match zählt und bringt dich nach vorne.",
  },
  {
    icon: Globe,
    title: "Regional & National",
    description: "Vergleiche dich mit Spielern in deiner Region oder deutschlandweit – du entscheidest.",
  },
  {
    icon: Star,
    title: "Exklusive Events",
    description: "Zugang zu League-Special-Events, Saison-Finals und exklusiven Turnieren nur für Liga-Spieler.",
  },
];


const League = () => {

  return (
    <>
      <Helmet>
        <title>League | PADEL2GO – Die schnellst wachsende Online-Liga für Padel</title>
        <meta name="description" content="Spiele in der P2G League mit dynamischem Open Ranking. Jedes Match zählt, sammle Punkte, erklimme Rankings und nimm an Circuit-Turnieren teil." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] md:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={leagueHero} alt="" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/60 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />
          
          <div className="container mx-auto px-4 relative z-10 pt-[5vh] md:pt-[10vh]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              {/* P2G League Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center mb-6"
              >
                <img src={leagueP2gLogo} alt="P2G League" className="h-40 md:h-60 lg:h-80 w-auto" />
              </motion.div>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Die schnellst wachsende Online-Liga Europas</span>
              </motion.div>
              
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold leading-tight mb-6 text-white">
                Open Ranking.{" "}
                <span className="text-gradient-lime">Jedes Match zählt.</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-white/80 mb-6">
                Spiele, sammle Punkte, erklimme Rankings – deine Ergebnisse fließen{" "}
                <span className="text-white font-semibold">automatisch</span> in dein persönliches Ranking ein.
              </p>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap justify-center gap-6 mb-10"
              >
                <div className="flex items-center gap-2 text-white/70">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-white">Open</span> Ranking-System
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Swords className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-white">Jedes Match</span> zählt
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-white">8 Expert-Levels</span> zum Aufsteigen
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" className="group" asChild>
                  <NavLink to="/auth">
                    <Zap className="w-5 h-5" />
                    Jetzt einsteigen & Punkte sammeln
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
                <Button variant="heroOutline" size="xl" asChild>
                  <NavLink to="/events">
                    <Calendar className="w-5 h-5" />
                    Events entdecken
                  </NavLink>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Open Ranking Section */}
        <section className="py-16 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Flame className="w-4 h-4" />
                P2G League
              </div>
              <h2 className="text-2xl md:text-5xl font-bold mb-6">
                Dynamisches Punktesystem –{" "}
                <span className="text-gradient-lime">belohnt Ehrgeiz</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Unser intelligentes System belohnt nicht nur Siege, sondern auch{" "}
                <span className="text-primary font-semibold">starke Leistungen gegen bessere Gegner</span>.{" "}
                Selbst knappe Niederlagen bringen Punkte – jedes Match zählt!
              </p>
            </motion.div>

            {/* Punktesystem Grid */}
            <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary" />
                  So sammelst du Punkte
                </h3>
                <div className="space-y-3">
                  {leaguePoints.map((item, index) => (
                    <motion.div
                      key={item.action}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{item.action}</span>
                      </div>
                      <span className="text-primary font-bold">{item.points}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  Live-Rankings
                </h3>
                <p className="text-muted-foreground mb-6">
                  Verfolge dein Ranking in <span className="text-primary font-semibold">Echtzeit</span> – 
                  regional oder deutschlandweit. Sieh, wer deine nächsten Gegner sein könnten!
                </p>
                <div className="p-6 rounded-2xl bg-background border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-500" />
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">LIVE</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Deutschland Ranking</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { rank: 1, name: "MaxPadel_HH", points: 12480, trend: "+45" },
                      { rank: 2, name: "SarahSmash", points: 8320, trend: "+28" },
                      { rank: 3, name: "PadelKing_M", points: 4180, trend: "+12" },
                      { rank: 4, name: "BerlinBaller", points: 2050, trend: "-5" },
                      { rank: 5, name: "DU", points: 890, trend: "+67", isUser: true },
                    ].map((player) => {
                      const level = getExpertLevel(player.points);
                      return (
                        <div 
                          key={player.rank} 
                          className={`flex items-center gap-3 p-3 rounded-lg ${player.isUser ? 'bg-primary/10 border border-primary/20' : 'bg-card/50'}`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            player.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : 
                            player.rank === 2 ? 'bg-gray-400/20 text-gray-400' : 
                            player.rank === 3 ? 'bg-orange-500/20 text-orange-500' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {player.rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium ${player.isUser ? 'text-primary' : ''}`}>
                              {player.name}
                            </span>
                            {/* Expert Level Badge */}
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${level.color} ${level.textColor}`}>
                              {level.name}
                            </span>
                          </div>
                          <span className={`text-xs ${player.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                            {player.trend}
                          </span>
                          <span className="text-sm font-medium">{player.points.toLocaleString()} Pts</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-4 italic">
                    In der App siehst du echte Spieler & dein aktuelles Ranking
                  </p>
                </div>
              </motion.div>
            </div>

            {/* League Vorteile */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-center mb-8">Deine Vorteile in der League</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {leagueAdvantages.map((advantage, index) => (
                  <motion.div
                    key={advantage.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 rounded-2xl bg-background border border-border text-center hover:border-primary/30 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <advantage.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h4 className="font-bold mb-2">{advantage.title}</h4>
                    <p className="text-sm text-muted-foreground">{advantage.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default League;

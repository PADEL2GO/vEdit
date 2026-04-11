import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MapPin, Calendar, Trophy, Apple, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import iphoneMockup from "@/assets/iphone-mockup.png";
import padelRacket from "@/assets/padel-racket-hero.png";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  
  // Parallax: Schläger bewegt sich langsamer (0.3x speed)
  const racketY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const racketOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.25, 0.15, 0]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Padel Racket Background - with parallax effect */}
      <motion.div
        style={{ y: racketY, opacity: racketOpacity }}
        className="absolute inset-0 flex items-start justify-center pointer-events-none z-[1]"
      >
        <motion.img 
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          src={padelRacket} 
          alt="" 
          className="w-auto h-[160vh] object-contain -mt-20"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)'
          }}
        />
      </motion.div>
      
      {/* Gradient overlay for smooth transition */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none z-[2]"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))'
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">Jetzt live in Deutschland</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Padel dorthin bringen,{" "}
              <span className="text-gradient-lime">wo du schon spielst</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl lg:max-w-none mb-10"
            >
              Die Plug-and-Play-Lösung für Vereine: Hochwertige Courts, Buchungssystem, 
              Events und Community – alles aus einer Hand.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <Button variant="hero" size="xl" className="group">
                Court finden
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="heroOutline" size="xl">
                Für Vereine
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-2 md:gap-6"
            >
              <div className="flex flex-col items-center lg:items-start p-2 sm:p-4 rounded-xl bg-card/50 border border-border">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="text-lg sm:text-2xl md:text-3xl font-bold">15+</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Standorte</span>
              </div>
              <div className="flex flex-col items-center lg:items-start p-2 sm:p-4 rounded-xl bg-card/50 border border-border">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="text-lg sm:text-2xl md:text-3xl font-bold">5.000+</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Buchungen</span>
              </div>
              <div className="flex flex-col items-center lg:items-start p-2 sm:p-4 rounded-xl bg-card/50 border border-border">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="text-lg sm:text-2xl md:text-3xl font-bold">50+</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Events</span>
              </div>
            </motion.div>
          </div>

          {/* Right: iPhone Mockup with App Store Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col items-center lg:items-end gap-6"
          >
            <img 
              src={iphoneMockup} 
              alt="PADEL2GO App" 
              className="h-[220px] sm:h-[300px] md:h-[420px] lg:h-[520px] w-auto object-contain"
            />
            
            {/* App Store Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-3 px-5 py-6 bg-card/80 border-border hover:bg-card"
              >
                <Apple className="w-7 h-7" />
                <div className="text-left">
                  <span className="text-xs text-muted-foreground block">Download im</span>
                  <span className="text-sm font-semibold">App Store</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-3 px-5 py-6 bg-card/80 border-border hover:bg-card"
              >
                <Play className="w-7 h-7 fill-current" />
                <div className="text-left">
                  <span className="text-xs text-muted-foreground block">Jetzt bei</span>
                  <span className="text-sm font-semibold">Google Play</span>
                </div>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>


      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

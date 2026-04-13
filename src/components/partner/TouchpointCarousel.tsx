import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PartnerTouchpointSlide } from "@/hooks/usePartnerTouchpoints";
import { Monitor, MapPin, Trophy, Gift, Zap } from "lucide-react";

const fallbackSlides = [
  { icon: MapPin, title: "Branding am Court", description: "Auf Courts, Netzen, Banden und Glaswänden." },
  { icon: Monitor, title: "In-App-Präsenz", description: "Banner, Featured-Partner, Sponsored Challenges." },
  { icon: Gift, title: "P2G Rewards", description: "Gutscheine, Produkte, Experiences als Reward." },
  { icon: Zap, title: "Vending-Machines", description: "Equipment, Drinks, Snacks & Nutrition am Court." },
  { icon: Trophy, title: "Events & League", description: "League-Finals, Circuit-Events & Pop-Up-Nights." },
];

interface Props {
  slides: PartnerTouchpointSlide[];
}

export const TouchpointCarousel = ({ slides }: Props) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = slides.length > 0 ? slides : null;
  const count = items ? items.length : fallbackSlides.length;

  const next = () => setCurrent(c => (c + 1) % count);
  const prev = () => setCurrent(c => (c - 1 + count) % count);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4500);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count]);

  const handlePrev = () => { prev(); resetTimer(); };
  const handleNext = () => { next(); resetTimer(); };

  return (
    <div className="relative w-full max-w-5xl mx-auto select-none">
      <div className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          {items ? (
            // DB-driven slides with images
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4 }}
              className="relative aspect-[16/7] bg-card border border-border rounded-2xl overflow-hidden"
            >
              {items[current].image_url ? (
                <img
                  src={items[current].image_url}
                  alt={items[current].title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-card" />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-2">
                  {items[current].title}
                </h3>
                {items[current].description && (
                  <p className="text-white/80 text-base md:text-lg max-w-2xl">
                    {items[current].description}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            // Fallback icon slides
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4 }}
              className="aspect-[16/7] bg-gradient-to-br from-primary/10 to-card border border-border rounded-2xl flex items-center justify-center p-10"
            >
              {(() => {
                const fb = fallbackSlides[current];
                return (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <fb.icon className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl md:text-4xl font-bold mb-3">{fb.title}</h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">{fb.description}</p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
        aria-label="Zurück"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
        aria-label="Weiter"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetTimer(); }}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

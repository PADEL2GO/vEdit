import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import eventsHero from "@/assets/events-hero.jpg";
import { 
  ArrowRight, 
  PartyPopper, 
  Music,
  Wine,
  Users,
  Sparkles,
  Gift,
  Ticket,
  CalendarX,
  UtensilsCrossed,
  Handshake,
  Mic2,
  Gamepad2,
} from "lucide-react";
import { EventCard, FeaturedEvent, EventFilters, NewsletterCTA } from "@/components/events";
import { isToday, isThisWeek, isThisMonth, isPast } from "date-fns";

interface DbArtist {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  instagram_url: string | null;
}

interface DbBrand {
  id: string;
  name: string;
  brand_type: string;
  logo_url: string | null;
}

interface DbEvent {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  city: string | null;
  start_at: string | null;
  end_at: string | null;
  image_url: string | null;
  ticket_url: string;
  event_type: string | null;
  price_label: string | null;
  highlights: string[] | null;
  featured: boolean;
  venue_name: string | null;
  locations: { name: string } | null;
  event_artists: DbArtist[];
  event_brands: DbBrand[];
}

// Benefits Section Data
const benefits = [
  {
    icon: Mic2,
    title: "DJs & Live Music",
    description: "Lokale DJs und Live Acts bringen den perfekten Vibe auf unsere Courts.",
    gradient: "from-violet-400/40 to-fuchsia-400/40",
    borderColor: "hover:border-violet-300/60",
    iconColor: "text-violet-300",
  },
  {
    icon: UtensilsCrossed,
    title: "Food & Drinks",
    description: "Von Cocktails bis Street Food – alles, was den Abend perfekt macht.",
    gradient: "from-amber-400/40 to-orange-400/40",
    borderColor: "hover:border-amber-300/60",
    iconColor: "text-amber-300",
  },
  {
    icon: Handshake,
    title: "Networking",
    description: "Triff Gleichgesinnte, knüpfe Kontakte und werde Teil der Community.",
    gradient: "from-cyan-400/40 to-blue-400/40",
    borderColor: "hover:border-cyan-300/60",
    iconColor: "text-cyan-300",
  },
  {
    icon: Gamepad2,
    title: "Challenges & Fun",
    description: "Mini-Turniere, Challenges und Überraschungen – hier wird's nie langweilig.",
    gradient: "from-emerald-400/40 to-lime-400/40",
    borderColor: "hover:border-emerald-300/60",
    iconColor: "text-emerald-300",
  },
];

const Events = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { data: dbEvents, isLoading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          slug,
          description,
          city,
          start_at,
          end_at,
          image_url,
          ticket_url,
          event_type,
          price_label,
          highlights,
          featured,
          venue_name,
          locations:location_id (name),
          event_artists (id, name, role, image_url, instagram_url),
          event_brands (id, name, brand_type, logo_url)
        `)
        .eq("is_published", true)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DbEvent[];
    },
  });

  // Filter and sort events
  const { featuredEvent, upcomingEvents, partnerLogos } = useMemo(() => {
    if (!dbEvents) return { featuredEvent: null, upcomingEvents: [], partnerLogos: [] };

    const now = new Date();
    
    // Filter events
    let filtered = dbEvents.filter((event) => {
      const eventDate = event.start_at ? new Date(event.start_at) : null;
      
      // Past filter
      if (!showPast && eventDate && isPast(eventDate)) return false;
      if (showPast && eventDate && !isPast(eventDate)) return false;
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(searchLower) ||
          event.city?.toLowerCase().includes(searchLower) ||
          event.venue_name?.toLowerCase().includes(searchLower) ||
          event.highlights?.some(h => h.toLowerCase().includes(searchLower)) ||
          event.event_artists.some(a => a.name.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      // Type filter
      if (selectedType && event.event_type !== selectedType) return false;
      
      // Time filter
      if (selectedTime && eventDate) {
        if (selectedTime === "today" && !isToday(eventDate)) return false;
        if (selectedTime === "weekend" && !isThisWeek(eventDate, { weekStartsOn: 1 })) return false;
        if (selectedTime === "month" && !isThisMonth(eventDate)) return false;
      }
      
      return true;
    });

    // Find featured event (first one with featured=true, or next upcoming)
    const featured = !showPast 
      ? dbEvents.find(e => e.featured && e.start_at && !isPast(new Date(e.start_at))) 
        || dbEvents.find(e => e.start_at && !isPast(new Date(e.start_at)))
      : null;

    // Remove featured from upcoming list
    const upcoming = filtered.filter(e => e.id !== featured?.id);

    // Collect unique partner logos
    const logos = new Map<string, { name: string; logo_url: string }>();
    dbEvents.forEach(event => {
      event.event_brands.forEach(brand => {
        if (brand.logo_url && !logos.has(brand.id)) {
          logos.set(brand.id, { name: brand.name, logo_url: brand.logo_url });
        }
      });
    });

    return {
      featuredEvent: featured,
      upcomingEvents: upcoming,
      partnerLogos: Array.from(logos.values()),
    };
  }, [dbEvents, search, selectedType, selectedTime, showPast]);


  return (
    <>
      <Helmet>
        <title>Events | Padel2Go – Padel, Beats & gute Leute</title>
        <meta 
          name="description" 
          content="Padel-Events mit DJ, Food & Community. Von Day-Drinking Sessions bis zu Partner-Activations – erlebe Padel wie nie zuvor." 
        />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] md:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={eventsHero} alt="" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/60 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />
          
          <div className="container mx-auto px-4 relative z-10 pt-[20vh] md:pt-[30vh]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Events & Community</span>
              </span>
              
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold leading-tight mb-6 text-white">
                Padel, Beats &{" "}
                <span className="text-gradient-lime">gute Leute.</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-white/80 mb-8">
                Von Day-Drinking Sessions mit DJs bis zu Partner-Activations: 
                Padel2Go macht aus Spieltagen Community-Momente.
              </p>

              {/* Trust Strip */}
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 mb-10 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-white">Local DJs</span>
                </span>
                <span className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-white">Partner Brands</span>
                </span>
                <span className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-white">Limited Spots</span>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" className="group" asChild>
                  <a href="#events">
                    Nächstes Event entdecken
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                <Button variant="heroOutline" size="xl" asChild>
                  <a href="#filters">
                    Alle Termine ansehen
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Event Section */}
        {featuredEvent && featuredEvent.slug && (
          <>
            <section id="events" className="py-12 scroll-mt-24">
              <div className="container mx-auto px-4">
                <FeaturedEvent
                  slug={featuredEvent.slug}
                  title={featuredEvent.title}
                  description={featuredEvent.description}
                  city={featuredEvent.city}
                  start_at={featuredEvent.start_at}
                  image_url={featuredEvent.image_url}
                  event_type={featuredEvent.event_type}
                  price_label={featuredEvent.price_label}
                  highlights={featuredEvent.highlights}
                  venue_name={featuredEvent.venue_name || featuredEvent.locations?.name || null}
                  event_artists={featuredEvent.event_artists}
                />
              </div>
            </section>
            <SectionDivider variant="glow" />
          </>
        )}

        {/* Filters & Events Grid */}
        <section id="filters" className="py-16 scroll-mt-24">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {showPast ? "Vergangene Events" : "Kommende Events"}
              </h2>
              <p className="text-muted-foreground">
                {showPast 
                  ? "Schau dir an, was bisher bei uns los war."
                  : "Finde dein nächstes Padel-Erlebnis."
                }
              </p>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <EventFilters
                onSearchChange={setSearch}
                onTypeChange={setSelectedType}
                onTimeChange={setSelectedTime}
                selectedType={selectedType}
                selectedTime={selectedTime}
                showPast={showPast}
                onShowPastChange={setShowPast}
              />
            </motion.div>

            {/* Events Grid */}
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="h-96 rounded-2xl bg-card border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    slug={event.slug || event.id}
                    title={event.title}
                    description={event.description}
                    city={event.city}
                    start_at={event.start_at}
                    end_at={event.end_at}
                    image_url={event.image_url}
                    event_type={event.event_type}
                    price_label={event.price_label}
                    highlights={event.highlights}
                    venue_name={event.venue_name || event.locations?.name || null}
                    event_artists={event.event_artists}
                    event_brands={event.event_brands}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <CalendarX className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {showPast ? "Keine vergangenen Events" : "Noch keine Events geplant"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {showPast 
                    ? "Es gibt noch keine vergangenen Events zum Anzeigen."
                    : "Aktuell sind keine Events geplant. Trag dich für den Newsletter ein, um als Erster zu erfahren, wenn neue Events kommen."
                  }
                </p>
                {!showPast && (
                  <Button variant="outline" asChild>
                    <a href="#newsletter">Newsletter abonnieren</a>
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Benefits Section */}
        <section className="py-14 md:py-20 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-12"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Mehr als Padel</span>
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Was dich <span className="text-gradient-lime">erwartet</span>
              </h2>
              <p className="text-muted-foreground">
                Unsere Events sind mehr als nur Padel – sie sind Community-Erlebnisse.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 md:p-6 rounded-2xl bg-gradient-to-br ${benefit.gradient} border border-border text-center ${benefit.borderColor} transition-all duration-300 hover:scale-[1.02]`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-background/50 backdrop-blur-sm flex items-center justify-center mx-auto mb-4`}>
                    <benefit.icon className={`w-7 h-7 ${benefit.iconColor}`} />
                  </div>
                  <h3 className="font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Newsletter + Event planen Side-by-Side */}
            <div className="grid md:grid-cols-2 gap-8 mt-16">
              <NewsletterCTA />

              <div className="relative rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 md:p-8 lg:p-12 text-center flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <PartyPopper className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Event planen?
                </h3>
                <p className="text-muted-foreground mb-8">
                  Du willst ein Corporate-Event, einen Geburtstag oder eine 
                  Partner-Activation auf unseren Courts? Wir machen es möglich.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="hero" size="lg" asChild>
                    <NavLink to="/faq-kontakt?reason=verein">
                      Jetzt anfragen
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </NavLink>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <NavLink to="/fuer-partner">
                      Mehr erfahren
                    </NavLink>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Events;

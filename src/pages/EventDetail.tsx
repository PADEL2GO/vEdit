import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  ExternalLink,
  Music,
  Instagram,
  Globe,
  Users,
  Ticket,
  Sparkles
} from "lucide-react";
import { EventCard } from "@/components/events";

interface DbArtist {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  website_url: string | null;
}

interface DbBrand {
  id: string;
  name: string;
  brand_type: string;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
}

interface DbEventDetail {
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
  price_cents: number | null;
  highlights: string[] | null;
  featured: boolean;
  venue_name: string | null;
  location_url: string | null;
  address_line1: string | null;
  postal_code: string | null;
  capacity: number | null;
  locations: { name: string; address: string | null } | null;
  event_artists: DbArtist[];
  event_brands: DbBrand[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  party: "Party",
  day_drinking: "Day Drinking",
  tournament: "Turnier",
  community: "Community",
  corporate: "Corporate",
  open_play: "Open Play",
};

const ARTIST_ROLE_LABELS: Record<string, string> = {
  DJ: "DJ",
  live_act: "Live Act",
  host: "Host",
  trainer: "Coach",
  pro_player: "Pro-Spieler",
  influencer: "Influencer",
  other: "",
};

const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event-detail", slug],
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
          price_cents,
          highlights,
          featured,
          venue_name,
          location_url,
          address_line1,
          postal_code,
          capacity,
          locations:location_id (name, address),
          event_artists (id, name, role, image_url, instagram_url, spotify_url, website_url),
          event_brands (id, name, brand_type, logo_url, website_url, instagram_url)
        `)
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      
      if (error) throw error;
      return data as DbEventDetail;
    },
    enabled: !!slug,
  });

  // Fetch similar events
  const { data: similarEvents } = useQuery({
    queryKey: ["similar-events", event?.event_type, event?.id],
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
          event_type,
          price_label,
          highlights,
          venue_name,
          locations:location_id (name),
          event_artists (id, name, image_url),
          event_brands (id, name, logo_url)
        `)
        .eq("is_published", true)
        .eq("event_type", event?.event_type || "")
        .neq("id", event?.id || "")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
    enabled: !!event?.event_type && !!event?.id,
  });

  if (isLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-20">
            <div className="animate-pulse space-y-8">
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-96 bg-muted rounded-3xl" />
              <div className="h-12 w-2/3 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-3xl font-bold mb-4">Event nicht gefunden</h1>
            <p className="text-muted-foreground mb-8">
              Das Event existiert nicht oder wurde entfernt.
            </p>
            <Button variant="hero" onClick={() => navigate("/events")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Events
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const startDate = event.start_at ? new Date(event.start_at) : null;
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const fullAddress = [
    event.venue_name || event.locations?.name,
    event.address_line1 || event.locations?.address,
    event.postal_code && event.city ? `${event.postal_code} ${event.city}` : event.city,
  ].filter(Boolean).join(", ");

  // Schema.org Event JSON-LD
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.start_at,
    endDate: event.end_at,
    image: event.image_url,
    location: {
      "@type": "Place",
      name: event.venue_name || event.locations?.name,
      address: fullAddress,
    },
    offers: event.price_cents ? {
      "@type": "Offer",
      price: event.price_cents / 100,
      priceCurrency: "EUR",
      url: event.ticket_url,
    } : undefined,
  };

  return (
    <>
      <Helmet>
        <title>{event.title} | Padel2Go Events</title>
        <meta 
          name="description" 
          content={event.description || `${event.title} – Padel-Event bei Padel2Go`} 
        />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description || ""} />
        {event.image_url && <meta property="og:image" content={event.image_url} />}
        <script type="application/ld+json">
          {JSON.stringify(eventSchema)}
        </script>
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative">
          {/* Back Button */}
          <div className="container mx-auto px-4 py-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/events")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Events
            </Button>
          </div>

          {/* Hero Image */}
          <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
                <Sparkles className="w-24 h-24 text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>

          {/* Event Info Overlay */}
          <div className="container mx-auto px-4 relative -mt-32 z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {event.event_type && (
                  <Badge className="bg-primary text-primary-foreground">
                    {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                  </Badge>
                )}
                {event.featured && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                {event.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-lg">
                {startDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-5 h-5 text-primary" />
                    {format(startDate, "EEEE, d. MMMM yyyy", { locale: de })}
                  </div>
                )}
                {startDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-5 h-5 text-primary" />
                    {format(startDate, "HH:mm", { locale: de })} Uhr
                    {endDate && ` – ${format(endDate, "HH:mm", { locale: de })} Uhr`}
                  </div>
                )}
                {event.capacity && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5 text-primary" />
                    {event.capacity} Plätze
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-12">
                {/* Description */}
                {event.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h2 className="text-xl font-bold mb-4">Über das Event</h2>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-line">
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Highlights */}
                {event.highlights && event.highlights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <h2 className="text-xl font-bold mb-4">Highlights</h2>
                    <div className="flex flex-wrap gap-2">
                      {event.highlights.map((highlight) => (
                        <Badge 
                          key={highlight} 
                          variant="secondary" 
                          className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm"
                        >
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Line-up */}
                {event.event_artists.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-xl font-bold mb-6">Line-up</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {event.event_artists.map((artist) => (
                        <div
                          key={artist.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0">
                            {artist.image_url ? (
                              <img
                                src={artist.image_url}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{artist.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {ARTIST_ROLE_LABELS[artist.role] || artist.role}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {artist.instagram_url && (
                                <a
                                  href={artist.instagram_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Instagram className="w-4 h-4" />
                                </a>
                              )}
                              {artist.website_url && (
                                <a
                                  href={artist.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Globe className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Partners */}
                {event.event_brands.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <h2 className="text-xl font-bold mb-6">Partner</h2>
                    <div className="flex flex-wrap gap-6">
                      {event.event_brands.map((brand) => (
                        <a
                          key={brand.id}
                          href={brand.website_url || brand.instagram_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                        >
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="h-10 w-auto object-contain"
                            />
                          ) : (
                            <span className="font-bold">{brand.name}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Location */}
                {fullAddress && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-xl font-bold mb-4">Location</h2>
                    <div className="p-6 rounded-xl bg-card border border-border">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold mb-1">
                            {event.venue_name || event.locations?.name}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {event.address_line1 || event.locations?.address}
                            {event.postal_code && event.city && (
                              <><br />{event.postal_code} {event.city}</>
                            )}
                          </p>
                          {event.location_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={event.location_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Route planen
                                <ExternalLink className="w-4 h-4 ml-2" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar - Ticket CTA */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="sticky top-28"
                >
                  <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Ticket className="w-5 h-5 text-primary" />
                      <span className="font-bold">Tickets</span>
                    </div>

                    {event.price_label && (
                      <div className="text-3xl font-bold text-primary mb-2">
                        {event.price_label}
                      </div>
                    )}

                    {startDate && (
                      <p className="text-sm text-muted-foreground mb-6">
                        {format(startDate, "EEEE, d. MMMM", { locale: de })} um{" "}
                        {format(startDate, "HH:mm", { locale: de })} Uhr
                      </p>
                    )}

                    {event.capacity && (
                      <p className="text-sm text-muted-foreground mb-6">
                        Nur {event.capacity} Plätze verfügbar
                      </p>
                    )}

                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full group"
                      asChild
                    >
                      <a
                        href={event.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Tickets sichern
                        <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Ticketverkauf über externen Anbieter
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Similar Events */}
        {similarEvents && similarEvents.length > 0 && (
          <section className="py-16 bg-card/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-8">Ähnliche Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarEvents.map((similar: any, index: number) => (
                  <EventCard
                    key={similar.id}
                    id={similar.id}
                    slug={similar.slug || similar.id}
                    title={similar.title}
                    description={similar.description}
                    city={similar.city}
                    start_at={similar.start_at}
                    end_at={similar.end_at}
                    image_url={similar.image_url}
                    event_type={similar.event_type}
                    price_label={similar.price_label}
                    highlights={similar.highlights}
                    venue_name={similar.venue_name || similar.locations?.name || null}
                    event_artists={similar.event_artists || []}
                    event_brands={similar.event_brands || []}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
};

export default EventDetail;

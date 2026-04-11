import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { Calendar, MapPin, Clock, ArrowRight, Music, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeaturedEventProps {
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  start_at: string | null;
  image_url: string | null;
  event_type: string | null;
  price_label: string | null;
  highlights: string[] | null;
  venue_name: string | null;
  event_artists: { id: string; name: string; image_url: string | null }[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  party: "Party",
  day_drinking: "Day Drinking",
  tournament: "Turnier",
  community: "Community",
  corporate: "Corporate",
  open_play: "Open Play",
};

export const FeaturedEvent = ({
  slug,
  title,
  description,
  city,
  start_at,
  image_url,
  event_type,
  price_label,
  highlights,
  venue_name,
  event_artists,
}: FeaturedEventProps) => {
  const startDate = start_at ? new Date(start_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl overflow-hidden bg-card border border-border group"
    >
      <div className="grid lg:grid-cols-2 gap-0">
        {/* Image */}
        <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[400px] overflow-hidden">
          {image_url ? (
            <img
              src={image_url}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-20 h-20 text-primary/40" />
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-card/40 to-transparent lg:bg-gradient-to-l" />
          
          {/* Featured Badge */}
          <div className="absolute top-6 left-6">
            <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Featured Event
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 lg:p-10 flex flex-col justify-center">
          {/* Event Type & Date */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {event_type && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {EVENT_TYPE_LABELS[event_type] || event_type}
              </Badge>
            )}
            {startDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(startDate, "EEEE, d. MMMM yyyy", { locale: de })}
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 group-hover:text-primary transition-colors">
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-muted-foreground mb-6 line-clamp-3">
              {description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            {(venue_name || city) && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                {venue_name}{venue_name && city ? `, ${city}` : city}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                {format(startDate, "HH:mm", { locale: de })} Uhr
              </span>
            )}
            {price_label && (
              <span className="font-semibold text-primary">
                {price_label}
              </span>
            )}
          </div>

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {highlights.map((highlight) => (
                <Badge key={highlight} variant="secondary" className="bg-muted">
                  {highlight}
                </Badge>
              ))}
            </div>
          )}

          {/* Artists */}
          {event_artists.length > 0 && (
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-3">
                {event_artists.slice(0, 4).map((artist) => (
                  <div
                    key={artist.id}
                    className="w-10 h-10 rounded-full border-2 border-card overflow-hidden bg-muted"
                  >
                    {artist.image_url ? (
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {event_artists.map((a) => a.name).join(", ")}
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-4">
            <Button variant="hero" size="lg" className="group/btn" asChild>
              <NavLink to={`/events/${slug}`}>
                Details & Tickets
                <ArrowRight className="w-5 h-5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </NavLink>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeaturedEvent;

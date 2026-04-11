import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { Calendar, MapPin, Clock, Music, Ticket } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface EventArtist {
  id: string;
  name: string;
  image_url: string | null;
}

interface EventBrand {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface EventCardProps {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  start_at: string | null;
  end_at: string | null;
  image_url: string | null;
  event_type: string | null;
  price_label: string | null;
  highlights: string[] | null;
  venue_name: string | null;
  event_artists: EventArtist[];
  event_brands: EventBrand[];
  index?: number;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  party: "Party",
  day_drinking: "Day Drinking",
  tournament: "Turnier",
  community: "Community",
  corporate: "Corporate",
  open_play: "Open Play",
};

export const EventCard = ({
  slug,
  title,
  city,
  start_at,
  image_url,
  event_type,
  price_label,
  highlights,
  venue_name,
  event_artists,
  index = 0,
}: EventCardProps) => {
  const startDate = start_at ? new Date(start_at) : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <NavLink to={`/events/${slug}`} className="block group">
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(71_91%_51%/0.15)]">
          {/* Image Container */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {image_url ? (
              <img
                src={image_url}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Ticket className="w-12 h-12 text-primary/40" />
              </div>
            )}
            
            {/* Date Badge */}
            {startDate && (
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-center min-w-[56px]">
                <div className="text-2xl font-bold text-primary leading-none">
                  {format(startDate, "dd")}
                </div>
                <div className="text-xs uppercase text-muted-foreground font-medium">
                  {format(startDate, "MMM", { locale: de })}
                </div>
              </div>
            )}

            {/* Event Type Badge */}
            {event_type && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0">
                  {EVENT_TYPE_LABELS[event_type] || event_type}
                </Badge>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {title}
            </h3>

            {/* Location & Time */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
              {(venue_name || city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {venue_name || city}
                </span>
              )}
              {startDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(startDate, "HH:mm", { locale: de })} Uhr
                </span>
              )}
            </div>

            {/* Highlights */}
            {highlights && highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {highlights.slice(0, 3).map((highlight) => (
                  <Badge key={highlight} variant="outline" className="text-xs">
                    {highlight}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer: Artists & Price */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              {/* Artists Preview */}
              <div className="flex items-center gap-2">
                {event_artists.length > 0 && (
                  <>
                    <div className="flex -space-x-2">
                      {event_artists.slice(0, 3).map((artist) => (
                        <div
                          key={artist.id}
                          className="w-7 h-7 rounded-full border-2 border-card overflow-hidden bg-muted"
                        >
                          {artist.image_url ? (
                            <img
                              src={artist.image_url}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event_artists.length === 1
                        ? event_artists[0].name
                        : `${event_artists.length} Artists`}
                    </span>
                  </>
                )}
              </div>

              {/* Price */}
              {price_label && (
                <span className="text-sm font-semibold text-primary">
                  {price_label}
                </span>
              )}
            </div>
          </div>
        </div>
      </NavLink>
    </motion.div>
  );
};

export default EventCard;

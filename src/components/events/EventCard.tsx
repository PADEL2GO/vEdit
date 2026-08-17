import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { Calendar, MapPin, Clock, Music, ArrowRight, Ticket } from "lucide-react";
import { format, isPast } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { StorageImage } from "@/components/StorageImage";

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

export const EventCard = ({
  slug,
  title,
  city,
  start_at,
  image_url,
  event_type,
  price_label,
  venue_name,
  event_artists,
  index = 0,
}: EventCardProps) => {
  const { t, i18n } = useTranslation("events");
  const dateLocale = i18n.language.startsWith("en") ? enUS : de;
  const typeLabels = t("eventTypeLabels", { returnObjects: true }) as Record<string, string>;
  const startDate = start_at ? new Date(start_at) : null;
  const past = startDate ? isPast(startDate) : false;
  const artistLabel =
    event_artists.length === 0
      ? null
      : event_artists.length === 1
      ? event_artists[0].name
      : t("card.artistsCount", { count: event_artists.length });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.07, 0.4) }}
      className={past ? "opacity-60" : ""}
    >
      <NavLink to={`/events/${slug}`} className="block group h-full">
        <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-gradient-card transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(71_91%_51%/0.12)]">
          {/* Image */}
          <div className="relative">
            {image_url ? (
              <StorageImage
                src={image_url}
                renderWidth={800}
                alt={title}
                className={`block w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105 ${
                  past ? "grayscale brightness-[0.6]" : ""
                }`}
              />
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Ticket className="w-10 h-10 text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_4%)] via-transparent to-transparent" />

            {/* Date Badge */}
            {startDate && (
              <span className="absolute top-3 left-3 inline-flex flex-col items-center rounded-xl px-3 py-[7px] bg-black/75 backdrop-blur-md border border-primary/35">
                <span className="font-stat font-bold text-[18px] leading-none text-primary">
                  {format(startDate, "dd")}
                </span>
                <span className="font-stat text-[9.5px] tracking-[0.18em] text-[hsl(0_0%_70%)] uppercase">
                  {format(startDate, "MMM", { locale: dateLocale })}
                </span>
              </span>
            )}

            {/* Category Badge */}
            {(event_type || past) && (
              <span
                className={`absolute top-3 right-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap bg-black/70 backdrop-blur-md border ${
                  past
                    ? "text-[hsl(0_0%_65%)] border-[hsl(0_0%_28%)]"
                    : "text-primary border-primary/40"
                }`}
              >
                {past ? t("card.past") : typeLabels[event_type!] || event_type}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2.5 p-5 pt-4 flex-1">
            <h3 className="font-display font-bold text-[19px] leading-[1.25] tracking-[-0.01em] line-clamp-2 text-foreground">
              {title}
            </h3>

            {/* Meta row 1 */}
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
              {startDate && (
                <span className="inline-flex items-center gap-1.5 font-stat text-xs text-[hsl(0_0%_60%)]">
                  <Calendar className="w-3 h-3" />
                  {format(startDate, "EEE, dd.MM.", { locale: dateLocale })}
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1.5 font-stat text-xs text-[hsl(0_0%_60%)]">
                  <Clock className="w-3 h-3" />
                  {format(startDate, "HH:mm", { locale: dateLocale })}
                </span>
              )}
            </div>

            {/* Meta row 2 */}
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
              {(city || venue_name) && (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(0_0%_60%)]">
                  <MapPin className="w-3 h-3" />
                  {city || venue_name}
                </span>
              )}
              {artistLabel && (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(0_0%_60%)]">
                  <Music className="w-3 h-3" />
                  {artistLabel}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2.5 mt-auto pt-1.5">
              {price_label && (
                <span className="font-stat text-base font-bold text-primary">{price_label}</span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-primary ml-auto">
                {t("card.detailsCta")}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </NavLink>
    </motion.div>
  );
};

export default EventCard;

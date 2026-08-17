import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { Calendar, MapPin, Clock, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { StorageImage } from "@/components/StorageImage";

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

export const FeaturedEvent = ({
  slug,
  title,
  description,
  city,
  start_at,
  image_url,
  event_type,
  price_label,
  venue_name,
}: FeaturedEventProps) => {
  const { t, i18n } = useTranslation("events");
  const dateLocale = i18n.language.startsWith("en") ? enUS : de;
  const typeLabels = t("eventTypeLabels", { returnObjects: true }) as Record<string, string>;
  const startDate = start_at ? new Date(start_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden border border-border/60 bg-gradient-card glow-lime group grid lg:grid-cols-2"
    >
      {/* Image */}
      <div className="relative min-h-[320px]">
        {image_url ? (
          <StorageImage
            src={image_url}
            renderWidth={1200}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-20 h-20 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,hsl(0_0%_4%)_96%)] lg:block hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_4%)] via-transparent to-transparent lg:hidden" />

        {/* Date Badge */}
        {startDate && (
          <span className="absolute top-4 left-4 inline-flex flex-col items-center rounded-[14px] px-3.5 py-2.5 bg-black/75 backdrop-blur-md border border-primary/40">
            <span className="font-stat font-bold text-[22px] leading-none text-primary">
              {format(startDate, "dd")}
            </span>
            <span className="font-stat text-[10.5px] tracking-[0.18em] text-[hsl(0_0%_70%)] uppercase">
              {format(startDate, "MMM", { locale: dateLocale })}
            </span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3.5 justify-center p-6 md:p-9">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 border border-primary/25 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("detail.featured")}
          </span>
          {event_type && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/5 border border-border text-foreground/75">
              {typeLabels[event_type] || event_type}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="font-display font-extrabold text-2xl md:text-4xl leading-[1.1] tracking-[-0.02em] text-foreground">
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p className="text-[15.5px] leading-relaxed text-[hsl(0_0%_65%)] line-clamp-3">
            {description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-2.5 mt-1">
          {startDate && (
            <span className="inline-flex items-center gap-2.5 font-stat text-[13px] text-[hsl(0_0%_75%)]">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {format(startDate, i18n.language.startsWith("en") ? "EEEE, MMMM d, yyyy" : "EEEE, d. MMMM yyyy", { locale: dateLocale })}
            </span>
          )}
          {startDate && (
            <span className="inline-flex items-center gap-2.5 font-stat text-[13px] text-[hsl(0_0%_75%)]">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t("time.withSuffix", { time: format(startDate, "HH:mm", { locale: dateLocale }) })}
            </span>
          )}
          {(venue_name || city) && (
            <span className="inline-flex items-center gap-2.5 text-[13.5px] text-[hsl(0_0%_75%)]">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {venue_name}
              {venue_name && city ? `, ${city}` : city}
            </span>
          )}
        </div>

        {/* CTA + Price */}
        <div className="flex items-center gap-4 flex-wrap mt-1.5">
          <Button variant="hero" size="lg" className="group/btn" asChild>
            <NavLink to={`/events/${slug}`}>
              {t("featured.detailsCta")}
              <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </NavLink>
          </Button>
          {price_label && (
            <span className="font-stat text-[19px] font-bold text-primary">{price_label}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FeaturedEvent;

import { MapPin, Clock, Trophy, Brain, ShoppingCart, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DbLocation } from "@/types/database";
import { COURT_FEATURES, extractFeatures } from "@/lib/courtFeatures";

interface BookingLocationHeaderProps {
  location: DbLocation;
}

export function BookingLocationHeader({ location }: BookingLocationHeaderProps) {
  const { t } = useTranslation("booking");
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[new Date().getDay()];
  const hours = location.opening_hours_json?.[todayName];

  // Echte, admin-gepflegte Ausstattung aus features_json (WC, Dusche, Flutlicht, Indoor/Outdoor …)
  const features = extractFeatures(location.features_json as Record<string, unknown> | null | undefined);
  const activeFeatures = COURT_FEATURES.filter((f) => features[f.key]);
  const description = location.description?.trim();

  // Build full address for maps link
  const fullAddress = [location.address, location.postal_code, location.city, location.country]
    .filter(Boolean)
    .join(", ");

  const mapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  const openingLabel = location.is_24_7
    ? t("locationHeader.open247")
    : hours
      ? t("locationHeader.hoursRange", { open: hours.open, close: hours.close })
      : t("locationHeader.closedToday");

  const featureBadge =
    "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-xs font-semibold text-primary bg-primary/[0.12] backdrop-blur-md border border-primary/30";

  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 bg-gradient-card">
      <div className="relative">
      {/* Hero Image */}
      {location.main_image_url ? (
        <img
          src={location.main_image_url}
          alt={location.name}
          className="block w-full h-[236px] object-cover"
        />
      ) : (
        <div className="w-full h-[236px] bg-gradient-to-br from-primary/20 via-secondary to-muted flex items-center justify-center">
          <MapPin className="w-16 h-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Gradient scrim */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_0%/0.15),hsl(0_0%_0%/0.88)_82%)]" />

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3.5 p-[22px_24px]">
        <div className="flex flex-col gap-2.5 min-w-0">
          <h1 className="font-black tracking-tight text-[clamp(24px,3.6vw,36px)] leading-[1.1] text-foreground">
            {location.name}
          </h1>
          <div className="flex items-center gap-3.5 flex-wrap">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                <MapPin className="w-3.5 h-3.5" />
                {location.city ? `${location.city} · ` : ""}Route planen
                <ExternalLink className="w-3 h-3" />
                <span className="sr-only">{t("locationHeader.openInGoogleMaps")}</span>
              </a>
            ) : (
              location.city && (
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                  <MapPin className="w-3.5 h-3.5" />
                  {location.city}
                </span>
              )
            )}
            <span className="inline-flex items-center gap-1.5 font-stat text-xs text-[hsl(0_0%_70%)]">
              <Clock className="w-[13px] h-[13px]" />
              {openingLabel}
            </span>
          </div>
        </div>

        {/* Feature Badges (Rewards / AI / Vending) */}
        <div className="flex gap-[7px] flex-wrap">
          {location.rewards_enabled && (
            <span className={featureBadge}>
              <Trophy className="w-3 h-3" /> P2G Rewards
            </span>
          )}
          {location.ai_analysis_enabled && (
            <span className={featureBadge}>
              <Brain className="w-3 h-3" /> {t("locationHeader.aiAnalysis")}
            </span>
          )}
          {location.vending_enabled && (
            <span className={featureBadge}>
              <ShoppingCart className="w-3 h-3" /> {t("locationHeader.vending")}
            </span>
          )}
        </div>
      </div>
      </div>

      {/* Beschreibung + echte Ausstattung (admin-gepflegt via features_json) */}
      {(description || activeFeatures.length > 0) && (
        <div className="flex flex-col gap-3 p-5">
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
          {activeFeatures.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFeatures.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-foreground/75 bg-white/5 border border-border"
                >
                  <f.icon className="w-3 h-3 text-primary" />
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

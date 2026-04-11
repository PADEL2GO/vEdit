import { MapPin, Clock, Trophy, Brain, ShoppingCart, ExternalLink } from "lucide-react";
import type { DbLocation } from "@/types/database";
import { Button } from "@/components/ui/button";
import { COURT_FEATURES } from "@/lib/courtFeatures";

interface BookingLocationHeaderProps {
  location: DbLocation;
}

export function BookingLocationHeader({ location }: BookingLocationHeaderProps) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[new Date().getDay()];
  const hours = location.opening_hours_json?.[todayName];

  // Build full address for maps link
  const fullAddress = [location.address, location.postal_code, location.city, location.country]
    .filter(Boolean)
    .join(", ");
  
  const mapsUrl = fullAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  // Get active features from features_json
  const featuresJson = (location.features_json || {}) as Record<string, boolean>;
  const activeFeatures = COURT_FEATURES.filter(f => featuresJson[f.key] === true);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
      {/* Hero Image */}
      {location.main_image_url ? (
        <div className="aspect-[21/9] w-full overflow-hidden">
          <img 
            src={location.main_image_url} 
            alt={location.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[21/9] w-full bg-gradient-to-br from-primary/20 via-secondary to-muted flex items-center justify-center">
          <MapPin className="w-16 h-16 text-muted-foreground/30" />
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{location.name}</h1>
            
            {/* Address with Maps link */}
            {fullAddress && (
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{fullAddress}</span>
                {mapsUrl && (
                  <Button variant="ghost" size="sm" className="h-auto p-1" asChild>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="sr-only">In Google Maps öffnen</span>
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Description */}
            {location.description && (
              <p className="text-muted-foreground mb-4">
                {location.description}
              </p>
            )}
          </div>
          
          {/* Main Feature Badges (Rewards, AI, Vending) */}
          <div className="flex flex-wrap gap-2">
            {location.rewards_enabled && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                <Trophy className="w-4 h-4" /> P2G Rewards
              </span>
            )}
            {location.ai_analysis_enabled && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm">
                <Brain className="w-4 h-4" /> AI-Analyse
              </span>
            )}
            {location.vending_enabled && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 text-sm">
                <ShoppingCart className="w-4 h-4" /> Automat
              </span>
            )}
          </div>
        </div>

        {/* Court Features from features_json + Opening Hours */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          {/* Dynamic court features */}
          {activeFeatures.map(({ key, label, icon: Icon }) => (
            <span 
              key={key}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Icon className="w-4 h-4" />
              {label}
            </span>
          ))}
          
          {/* Opening hours (always shown) */}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {location.is_24_7 
              ? '24/7 geöffnet' 
              : hours 
                ? `${hours.open} - ${hours.close} Uhr` 
                : 'Heute geschlossen'}
          </span>
        </div>
      </div>
    </div>
  );
}

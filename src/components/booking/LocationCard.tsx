import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  ArrowRight,
  Trophy,
  Brain,
  ShoppingCart,
  Euro
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DbLocation } from "@/types/database";

interface LocationCardProps {
  location: DbLocation;
  todayFreeSlots: number;
  occupancyPercent: number;
  index?: number;
  minPriceCents?: number | null;
}

export function LocationCard({ location, todayFreeSlots, occupancyPercent, index = 0, minPriceCents }: LocationCardProps) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[new Date().getDay()];
  const hours = location.opening_hours_json?.[todayName];

  // Build display address
  const displayAddress = [location.address, location.postal_code, location.city]
    .filter(Boolean)
    .join(", ");

  // Format price for display (simple integer for compact badges)
  const formatPriceShort = (cents: number) => (cents / 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all"
    >
      {/* Hero Image - Compact */}
      {location.main_image_url ? (
        <div className="aspect-[21/9] w-full overflow-hidden">
          <img 
            src={location.main_image_url} 
            alt={location.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[21/9] w-full bg-gradient-to-br from-primary/20 via-secondary to-muted flex items-center justify-center">
          <MapPin className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold group-hover:text-primary transition-colors truncate">
              {location.name}
            </h2>
            {displayAddress && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayAddress}</span>
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            {/* Price Badge */}
            {minPriceCents && (
              <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
                <Euro className="w-3 h-3" />
                ab {formatPriceShort(minPriceCents)}€
              </div>
            )}
            
            {/* Occupancy Badge */}
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              occupancyPercent < 50 
                ? 'bg-green-500/20 text-green-400'
                : occupancyPercent < 80
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {occupancyPercent}% belegt
            </div>
          </div>
        </div>

        {/* Features - Compact */}
        <div className="flex flex-wrap gap-1 mb-3">
          {location.rewards_enabled && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
              <Trophy className="w-2.5 h-2.5" /> Rewards
            </span>
          )}
          {location.ai_analysis_enabled && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
              <Brain className="w-2.5 h-2.5" /> AI
            </span>
          )}
          {location.vending_enabled && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs">
              <ShoppingCart className="w-2.5 h-2.5" /> Automat
            </span>
          )}
        </div>

        {/* Today's Availability - Compact */}
        <div className="bg-secondary/50 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Heute:</span>
            </div>
            <span className="text-sm font-bold text-primary">
              {todayFreeSlots} Slots
            </span>
          </div>
        </div>

        {/* Opening Hours - Compact */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {hours ? `${hours.open} - ${hours.close} Uhr` : 'Geschlossen'}
          </span>
        </div>

        <Button variant="lime" size="sm" className="w-full group/btn" asChild>
          <NavLink to={`/booking/locations/${location.slug}`}>
            Auswählen
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </NavLink>
        </Button>
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationCard } from "@/components/booking/LocationCard";
import { MyBookings } from "@/components/booking/MyBookings";
import { useAuth } from "@/hooks/useAuth";
import type { DbLocation } from "@/types/database";

interface LocationWithAvailability extends DbLocation {
  todayFreeSlots: number;
  occupancyPercent: number;
  minPriceCents: number | null;
}

const Booking = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data: locationsData, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_online", true);

      if (error) throw error;

      // Fetch global fallback price for 60 min
      const { data: globalPrice } = await supabase
        .from("court_prices")
        .select("price_cents")
        .is("court_id", null)
        .eq("duration_minutes", 60)
        .maybeSingle();

      const globalMinPrice = globalPrice?.price_cents ?? null;

      // Calculate availability for each location
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today.getDay()];

      const locationsWithAvailability = await Promise.all(
        (locationsData || []).map(async (loc) => {
          const hours = (loc.opening_hours_json as Record<string, { open: string; close: string } | undefined>)?.[todayName];
          
          // Get courts for this location
          const { data: courts } = await supabase
            .from("courts")
            .select("id")
            .eq("location_id", loc.id)
            .eq("is_active", true);

          const courtIds = courts?.map(c => c.id) || [];

          // Get minimum price for this location
          let minPriceCents: number | null = globalMinPrice;
          if (courtIds.length > 0) {
            const { data: courtPrices } = await supabase
              .from("court_prices")
              .select("price_cents")
              .in("court_id", courtIds)
              .eq("duration_minutes", 60)
              .order("price_cents", { ascending: true })
              .limit(1);

            if (courtPrices && courtPrices.length > 0) {
              minPriceCents = courtPrices[0].price_cents;
            }
          }

          if (!hours) {
            return { ...loc, todayFreeSlots: 0, occupancyPercent: 0, minPriceCents };
          }

          // Calculate total available minutes today
          const [openHour, openMin] = hours.open.split(':').map(Number);
          const [closeHour, closeMin] = hours.close.split(':').map(Number);
          const totalMinutes = (closeHour * 60 + closeMin) - (openHour * 60 + openMin);
          const totalSlots = Math.floor(totalMinutes / 60); // 1-hour slots

          // Get bookings for today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const { data: bookings } = await supabase
            .from("bookings")
            .select("start_time, end_time")
            .in("court_id", courtIds.length > 0 ? courtIds : [''])
            .in("status", ["pending", "confirmed"])
            .gte("start_time", todayStart.toISOString())
            .lte("end_time", todayEnd.toISOString());

          const bookedMinutes = (bookings || []).reduce((sum, b) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            return sum + (end.getTime() - start.getTime()) / 60000;
          }, 0);

          const courtsCount = courtIds.length || 1;
          const totalAvailableMinutes = totalMinutes * courtsCount;
          const occupancyPercent = Math.round((bookedMinutes / totalAvailableMinutes) * 100);
          const freeSlots = Math.max(0, (totalSlots * courtsCount) - Math.ceil(bookedMinutes / 60));

          return {
            ...loc,
            todayFreeSlots: freeSlots,
            occupancyPercent: Math.min(100, occupancyPercent),
            minPriceCents,
          };
        })
      );

      setLocations(locationsWithAvailability as LocationWithAvailability[]);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Court Buchen | PADEL2GO – Finde deinen Standort</title>
        <meta name="description" content="Wähle deinen PADEL2GO Standort und buche deinen nächsten Padel-Court in Sekunden." />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Wähle deinen <span className="text-gradient-lime">Standort</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Finde einen PADEL2GO Court in deiner Nähe und buche deinen Slot.
              </p>
            </div>

            {user && (
              <div className="mb-8">
                <MyBookings />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Keine Standorte verfügbar.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {locations.map((location, index) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    todayFreeSlots={location.todayFreeSlots}
                    occupancyPercent={location.occupancyPercent}
                    index={index}
                    minPriceCents={location.minPriceCents}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Booking;

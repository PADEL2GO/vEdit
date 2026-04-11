import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
  CalendarX,
  CreditCard,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { NavLink } from "react-router-dom";
import { formatPrice } from "@/lib/pricing";

const useCountdown = (targetDate: string | null) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) { setIsExpired(false); setTimeLeft(""); return; }

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft("00:00"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      setIsExpired(false);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { timeLeft, isExpired };
};

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_cents: number | null;
  currency: string | null;
  created_at: string;
  cancelled_at: string | null;
  hold_expires_at: string | null;
  location: {
    name: string;
    slug: string;
  };
  court: {
    name: string;
  };
}

export const MyBookings = () => {
  const { user } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          price_cents,
          currency,
          created_at,
          cancelled_at,
          hold_expires_at,
          location:locations(name, slug),
          court:courts(name)
        `)
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Type cast the data
      const typedBookings = (data || []).map(b => ({
        ...b,
        location: b.location as unknown as { name: string; slug: string },
        court: b.court as unknown as { name: string },
      }));

      setBookings(typedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Buchung storniert", {
        description: "Deine Buchung wurde erfolgreich storniert.",
      });

      fetchBookings();
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast.error("Fehler", {
        description: "Die Buchung konnte nicht storniert werden.",
      });
    } finally {
      setCancelling(null);
    }
  };

  // Only show pending_payment if hold hasn't expired yet
  const pendingPaymentBookings = bookings.filter(
    b => b.status === "pending_payment" 
      && !isPast(new Date(b.start_time))
      && (!b.hold_expires_at || new Date(b.hold_expires_at) > new Date())
  );
  const upcomingBookings = bookings.filter(
    b => b.status === "confirmed" && !isPast(new Date(b.start_time))
  );
  const pastBookings = bookings.filter(b => {
    // Completed confirmed bookings: always show
    if (b.status === "confirmed" && isPast(new Date(b.start_time))) {
      return true;
    }
    
    // Cancelled/expired: only show if < 30 min since cancellation/creation
    if (b.status === "cancelled" || b.status === "expired") {
      const relevantTime = b.cancelled_at 
        ? new Date(b.cancelled_at) 
        : new Date(b.created_at);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return relevantTime > thirtyMinutesAgo;
    }
    
    return false;
  });

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Meine Buchungen
        </h2>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Du hast noch keine Buchungen.</p>
                <Button variant="lime" asChild>
                  <NavLink to="/booking">Jetzt Court buchen</NavLink>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pending Payment Bookings */}
                {pendingPaymentBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Zahlung ausstehend
                    </h3>
                    <div className="space-y-3">
                      {pendingPaymentBookings.map((booking) => (
                        <PendingPaymentCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Bookings */}
                {upcomingBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Kommende Buchungen
                    </h3>
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-secondary/50 rounded-xl p-4 border border-border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle className="w-3 h-3" />
                                  Bestätigt
                                </span>
                              </div>
                              <p className="font-medium">{booking.location?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.court?.name}
                              </p>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")} Uhr
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancelling === booking.id}
                            >
                              {cancelling === booking.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Stornieren</span>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past/Cancelled Bookings */}
                {pastBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Vergangene Buchungen
                    </h3>
                    <div className="space-y-3">
                      {pastBookings.slice(0, 5).map((booking) => (
                        <div
                          key={booking.id}
                          className="bg-secondary/30 rounded-xl p-4 border border-border/50 opacity-60"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {booking.status === "cancelled" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                    Storniert
                                  </span>
                                ) : booking.status === "expired" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs">
                                    <Timer className="w-3 h-3" />
                                    Abgelaufen
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs">
                                    Abgeschlossen
                                  </span>
                                )}
                              </div>
                              <p className="font-medium">{booking.location?.name}</p>
                              <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(new Date(booking.start_time), "HH:mm")} Uhr
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Book More CTA */}
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" className="w-full" asChild>
                    <NavLink to="/booking">
                      <Calendar className="w-4 h-4 mr-2" />
                      Neuen Court buchen
                    </NavLink>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PendingPaymentCard = ({ booking }: { booking: Booking }) => {
  const { timeLeft, isExpired } = useCountdown(booking.hold_expires_at);

  if (isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
              <Timer className="w-3 h-3" />
              Zahlung ausstehend
            </span>
            {booking.price_cents && (
              <span className="text-xs font-medium text-primary">
                {formatPrice(booking.price_cents, booking.currency || 'EUR')}
              </span>
            )}
          </div>
          <p className="font-medium">{booking.location?.name}</p>
          <p className="text-sm text-muted-foreground">
            {booking.court?.name}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")} Uhr
            </span>
          </div>
          {timeLeft && (
            <p className="mt-2 text-xs font-medium text-amber-400 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Reserviert — {timeLeft} verbleibend
            </p>
          )}
        </div>
        <Button
          variant="lime"
          size="sm"
          asChild
        >
          <NavLink to={`/booking/checkout?booking_id=${booking.id}`}>
            <CreditCard className="w-4 h-4 mr-1" />
            Jetzt bezahlen
          </NavLink>
        </Button>
      </div>
    </motion.div>
  );
};

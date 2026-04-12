import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { setHours, setMinutes, addMinutes } from "date-fns";
import { useBookingSlots } from "@/hooks/useBookingSlots";
import { useCourtPricesWithFallback, getPriceFromList } from "@/hooks/useCourtPrices";
import { getSharePerPlayer } from "@/lib/pricing";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";
import type { Court, TimeSlot } from "@/components/booking/types";
import type { DbLocation } from "@/types/database";
import type { LobbySettings } from "@/types/lobby";
import { DEFAULT_LOBBY_SETTINGS } from "@/types/lobby";

interface InvitedPlayer {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useBookingLocation(slug: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [location, setLocation] = useState<DbLocation | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [booking, setBooking] = useState(false);
  const [invitedPlayers, setInvitedPlayers] = useState<InvitedPlayer[]>([]);
  const [paymentMode, setPaymentMode] = useState<"full" | "split">("full");
  const [lobbyEnabled, setLobbyEnabled] = useState(false);
  const [lobbySettings, setLobbySettings] = useState<LobbySettings>(DEFAULT_LOBBY_SETTINGS);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestBookingInProgress, setGuestBookingInProgress] = useState(false);

  // Fetch court prices with fallback to global prices
  const { data: courtPrices, isLoading: pricesLoading } = useCourtPricesWithFallback(selectedCourt);

  const { availableSlots, loadingSlots, refetchSlots } = useBookingSlots({
    location,
    courts,
    selectedCourt,
    selectedDate,
    selectedDuration,
  });
  
  // Calculate price from court-specific prices
  const priceCents = getPriceFromList(courtPrices, selectedDuration);
  const hasPrices = priceCents !== null;

  const fetchLocation = useCallback(async () => {
    if (!slug) return;
    
    try {
      const { data: locationData, error: locError } = await supabase
        .from("locations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (locError) throw locError;
      if (!locationData) {
        navigate("/booking");
        return;
      }

      setLocation(locationData as unknown as DbLocation);

      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("*")
        .eq("location_id", locationData.id)
        .eq("is_active", true);

      if (courtsError) throw courtsError;
      
      const courtsList = courtsData || [];
      setCourts(courtsList);
      
      if (courtsList.length > 0) {
        setSelectedCourt(courtsList[0].id);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      toast.error("Fehler", { description: "Standort konnte nicht geladen werden." });
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (slug) {
      fetchLocation();
    }
  }, [slug, fetchLocation]);

  // Guest booking handler — called after the GuestCheckoutModal is submitted
  const handleGuestBooking = useCallback(async (guestName: string, guestEmail: string, guestPhone: string) => {
    if (!selectedSlot || !location || !selectedCourt || !hasPrices) return;

    setGuestBookingInProgress(true);
    try {
      const [hours, minutes] = selectedSlot.time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, selectedDuration);

      const { data, error } = await invokeEdgeFunction<{ booking_id: string; price_cents: number }>(
        "create-guest-booking",
        {
          body: {
            court_id: selectedCourt,
            location_id: location.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
          },
          maxRetries: 1,
        }
      );

      if (error || !data?.booking_id) {
        toast.error("Fehler bei der Buchung", {
          description: error?.message || "Bitte versuche es erneut.",
        });
        return;
      }

      setShowGuestModal(false);
      navigate(`/booking/checkout?booking_id=${data.booking_id}&guest=1`);
    } catch (err: any) {
      toast.error("Fehler bei der Buchung", { description: err.message || "Bitte versuche es erneut." });
    } finally {
      setGuestBookingInProgress(false);
    }
  }, [selectedSlot, location, selectedCourt, hasPrices, selectedDate, selectedDuration, navigate]);

  const handleBooking = useCallback(async () => {
    if (!user) {
      // Open guest checkout modal instead of redirecting to auth
      if (!selectedSlot || !hasPrices) {
        toast.error("Bitte wähle zuerst einen Zeitslot");
        return;
      }
      setShowGuestModal(true);
      return;
    }

    if (!selectedSlot || !location || !selectedCourt || !hasPrices) return;

    setBooking(true);
    try {
      // Limit: max 3 active (unpaid) holds per user at a time.
      // Only pending_payment bookings with a hold that hasn't expired count.
      // Confirmed (paid) bookings never count — users can have unlimited paid bookings.
      const now = new Date().toISOString();
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_payment")
        .gt("hold_expires_at", now);

      if (count !== null && count >= 3) {
        toast.error("Buchungslimit erreicht", {
          description: "Du hast bereits 3 offene Reservierungen. Bezahle eine davon oder warte bis die Haltezeit (15 Min.) abläuft.",
        });
        setBooking(false);
        return;
      }
      const [hours, minutes] = selectedSlot.time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, selectedDuration);
      const holdExpiresAt = addMinutes(new Date(), 15);

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          location_id: location.id,
          court_id: selectedCourt,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending_payment",
          price_cents: priceCents!,
          currency: "EUR",
          hold_expires_at: holdExpiresAt.toISOString(),
          payment_mode: paymentMode,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("no_overlapping_bookings") || error.code === "23P01") {
          toast.error("Slot nicht mehr verfügbar", {
            description: "Dieser Zeitslot wurde gerade von jemand anderem gebucht. Bitte wähle einen anderen.",
          });
          refetchSlots();
          setSelectedSlot(null);
          return;
        }
        throw error;
      }

      // Create invites if any - each invited player pays 1/4 of total
      if (invitedPlayers.length > 0 && paymentMode === "split" && priceCents) {
        const sharePrice = getSharePerPlayer(priceCents);
        for (const player of invitedPlayers) {
          const { data: participantData, error: participantError } = await supabase
            .from("booking_participants")
            .insert({
              booking_id: data.id,
              inviter_user_id: user.id,
              invited_user_id: player.user_id,
              invited_username: player.username,
              status: "pending_invite",
              share_price_cents: sharePrice,
            })
            .select()
            .single();

          // Send email notification to invited player
          if (!participantError && participantData) {
            supabase.functions.invoke("send-invite-notification", {
              body: {
                participant_id: participantData.id,
                origin: window.location.origin,
              },
            }).catch((err) => {
              console.error("Failed to send invite notification:", err);
            });
          }
        }
      }

      // Create lobby if enabled
      if (lobbyEnabled && priceCents) {
        try {
          const { error: lobbyError } = await supabase.functions.invoke("lobby-api", {
            body: {
              action: "create_lobby",
              booking_id: data.id,
              location_id: location.id,
              court_id: selectedCourt,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              price_total_cents: priceCents,
              capacity: lobbySettings.capacity,
              skill_min: lobbySettings.skillRange[0],
              skill_max: lobbySettings.skillRange[1],
              description: lobbySettings.description || null,
            },
          });
          if (lobbyError) {
            console.error("Failed to create lobby:", lobbyError);
            toast.error("Lobby konnte nicht erstellt werden", { description: "Die Buchung wurde trotzdem angelegt." });
          }
        } catch (err) {
          console.error("Lobby creation error:", err);
        }
      }

      // Redirect to checkout page
      navigate(`/booking/checkout?booking_id=${data.id}`);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("Fehler bei der Buchung", { description: error.message || "Bitte versuche es erneut." });
    } finally {
      setBooking(false);
    }
  }, [
    user, slug, selectedSlot, location, selectedCourt, hasPrices,
    selectedDate, selectedDuration, priceCents, paymentMode,
    invitedPlayers, navigate, refetchSlots, lobbyEnabled, lobbySettings
  ]);

  const addPlayer = useCallback((player: InvitedPlayer) => {
    setInvitedPlayers(prev => [...prev, player]);
  }, []);

  const removePlayer = useCallback((userId: string) => {
    setInvitedPlayers(prev => prev.filter(p => p.user_id !== userId));
  }, []);

  return {
    // State
    location,
    courts,
    loading,
    selectedDate,
    selectedCourt,
    selectedSlot,
    selectedDuration,
    booking,
    invitedPlayers,
    paymentMode,
    availableSlots,
    loadingSlots,
    priceCents,
    hasPrices,
    user,
    lobbyEnabled,
    lobbySettings,
    showGuestModal,
    guestBookingInProgress,

    // Setters
    setSelectedDate,
    setSelectedCourt,
    setSelectedSlot,
    setSelectedDuration,
    setPaymentMode,
    setLobbyEnabled,
    setLobbySettings,
    setShowGuestModal,

    // Actions
    handleBooking,
    handleGuestBooking,
    addPlayer,
    removePlayer,
  };
}

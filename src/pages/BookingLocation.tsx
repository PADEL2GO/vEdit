import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { BookingLocationHeader } from "@/components/booking/BookingLocationHeader";
import { BookingSlotPicker } from "@/components/booking/BookingSlotPicker";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { useBookingLocation } from "@/hooks/useBookingLocation";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const BookingLocation = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lobbies_enabled } = useFeatureToggles();
  
  const {
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
    setSelectedDate,
    setSelectedCourt,
    setSelectedSlot,
    setSelectedDuration,
    setPaymentMode,
    setLobbyEnabled,
    setLobbySettings,
    handleBooking,
    addPlayer,
    removePlayer,
  } = useBookingLocation(slug);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{location.name} | PADEL2GO Booking</title>
        <meta name="description" content={`Buche deinen Padel-Court in ${location.name} bei PADEL2GO.`} />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto"
          >
            <Button variant="ghost" onClick={() => navigate("/booking")} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Standortauswahl
            </Button>

            <BookingLocationHeader location={location} />

            <div className="grid lg:grid-cols-3 gap-8">
              <BookingSlotPicker
                courts={courts}
                selectedCourt={selectedCourt}
                setSelectedCourt={setSelectedCourt}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                availableSlots={availableSlots}
                loadingSlots={loadingSlots}
              />

              <BookingSummary
                location={location}
                courts={courts}
                selectedCourt={selectedCourt}
                selectedDate={selectedDate}
                selectedDuration={selectedDuration}
                selectedSlot={selectedSlot}
                booking={booking}
                user={user}
                onBook={handleBooking}
                priceCents={priceCents}
                hasPrices={hasPrices}
                invitedPlayers={invitedPlayers}
                onAddPlayer={addPlayer}
                onRemovePlayer={removePlayer}
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                lobbyEnabled={lobbies_enabled ? lobbyEnabled : false}
                onLobbyEnabledChange={lobbies_enabled ? setLobbyEnabled : undefined}
                lobbySettings={lobbySettings}
                onLobbySettingsChange={setLobbySettings}
                lobbiesFeatureEnabled={lobbies_enabled}
              />
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingLocation;

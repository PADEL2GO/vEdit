import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, EyeOff } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { BookingLocationHeader } from "@/components/booking/BookingLocationHeader";
import { BookingSlotPicker } from "@/components/booking/BookingSlotPicker";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { GuestCheckoutModal } from "@/components/booking/GuestCheckoutModal";
import { useBookingLocation } from "@/hooks/useBookingLocation";
import { useCourtsVisibility } from "@/hooks/useCourtsVisibility";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const BookingLocation = () => {
  const { t } = useTranslation("booking");
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { canSeeCourts, publicEnabled, isAdmin, loading: visibilityLoading } = useCourtsVisibility();
  const { canSee } = useFeatureToggles();


  const {
    location,
    courts,
    loading,
    selectedDate,
    selectedCourt,
    selectedSlot,
    selectedDuration,
    booking,
    availableSlots,
    loadingSlots,
    priceCents,
    hasPrices,
    user,
    lobbyEnabled,
    lobbySettings,
    showGuestModal,
    guestBookingInProgress,
    setSelectedDate,
    setSelectedCourt,
    setSelectedSlot,
    setSelectedDuration,
    setLobbyEnabled,
    setLobbySettings,
    setShowGuestModal,
    handleBooking,
    handleGuestBooking,
  } = useBookingLocation(slug);

  if (loading || visibilityLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!canSeeCourts) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-md text-center py-20">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
              <EyeOff className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("common.comingSoonTitle")}</h1>
            <p className="text-muted-foreground mb-6">
              {t("location.comingSoonDescription")}
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>{t("common.backToHome")}</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{`${location.name} | ${t("meta.location.titleSuffix")}`}</title>
        <meta name="description" content={t("meta.location.descriptionTemplate", { name: location.name })} />
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
              {t("location.back")}
            </Button>

            {isAdmin && !publicEnabled && (
              <div className="mb-6 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">{t("common.adminPreviewLabel")}</p>
                  <p className="text-muted-foreground">
                    {t("location.adminPreviewDescription")}
                  </p>
                </div>
              </div>
            )}

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
                lobbyEnabled={lobbyEnabled}
                onLobbyEnabledChange={setLobbyEnabled}
                lobbySettings={lobbySettings}
                onLobbySettingsChange={setLobbySettings}
                lobbiesFeatureEnabled={canSee("lobbies")}
              />
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />

      <GuestCheckoutModal
        open={showGuestModal}
        onOpenChange={setShowGuestModal}
        onConfirm={handleGuestBooking}
        isSubmitting={guestBookingInProgress}
        locationSlug={slug ?? ""}
      />
    </>
  );
};

export default BookingLocation;

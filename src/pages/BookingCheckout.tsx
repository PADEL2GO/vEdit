import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { NavLink, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  Timer,
  Coins,
  Gift,
  Users,
  Ticket,
  Check,
  X,
  UserPlus,
  Mail,
} from "lucide-react";
import { useBookingCheckout } from "@/hooks/useBookingCheckout";
import { InviteFriendsStep } from "@/components/booking/InviteFriendsStep";
import { format, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { formatPrice, getOwnerShare, getSharePerPlayer, applyVoucherDiscount } from "@/lib/pricing";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const BookingCheckout = () => {
  const navigate = useNavigate();
  const {
    booking,
    state,
    error,
    timeLeft,
    stripeUrl,
    rewardsEstimate,
    selectedFriendIds,
    setSelectedFriendIds,
    voucher,
    setVoucherCode,
    validateVoucher,
    clearVoucher,
    creditsToUse,
    setCreditsToUse,
    availableCredits,
    maxCreditsForBooking,
    isGuest,
    createInvitesAndPay,
    formatTimeLeft,
  } = useBookingCheckout();

  const [voucherOpen, setVoucherOpen] = useState(false);

  if (state === "loading") {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (state === "error" || state === "expired" || !booking) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-background pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h1 className="text-xl font-semibold mb-2">Fehler</h1>
                  <p className="text-muted-foreground mb-6">{error || "Buchung nicht gefunden."}</p>
                  <Button asChild>
                    <NavLink to="/booking">Zurück zur Buchung</NavLink>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const durationMinutes = differenceInMinutes(endTime, startTime);
  const isVoucherApplied = voucher.status === "valid";
  const priceAfterVoucher = isVoucherApplied
    ? applyVoucherDiscount(booking.price_cents, voucher.discountType, voucher.discountValue)
    : booking.price_cents;
  // 100 credits = €1 = 100 cents
  const creditsDiscountCents = Math.min(creditsToUse, Math.floor(priceAfterVoucher * 0.5));
  const effectivePrice = Math.max(0, priceAfterVoucher - creditsDiscountCents);
  const isFullyFree = effectivePrice === 0;

  return (
    <>
      <Helmet>
        <title>Checkout | PADEL2GO</title>
        <meta name="description" content="Bezahle deine Padel-Court Buchung sicher mit Stripe." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>

            {/* Timer Warning */}
            {timeLeft !== null && timeLeft > 0 && (
              <Card className="mb-4 border-amber-500/50 bg-amber-500/10">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Timer className="w-5 h-5" />
                    <span className="font-medium">
                      Reservierung läuft ab in: {formatTimeLeft(timeLeft)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Buchung bezahlen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Summary */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{booking.location?.name}</p>
                      <p className="text-sm text-muted-foreground">{booking.court?.name}</p>
                      {booking.location?.address && (
                        <p className="text-sm text-muted-foreground">{booking.location.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {format(startTime, "EEEE, dd. MMMM yyyy", { locale: de })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} Uhr
                      </p>
                      <p className="text-sm text-muted-foreground">{durationMinutes} Minuten</p>
                    </div>
                  </div>
                </div>

                {/* Guest info banner */}
                {isGuest && booking?.guest_name && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gastbuchung</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.guest_name}</span>
                    </div>
                    {booking.guest_email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{booking.guest_email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Invite Friends — only for logged-in users */}
                {!isGuest && (
                  <InviteFriendsStep
                    selectedFriends={selectedFriendIds}
                    onSelectionChange={setSelectedFriendIds}
                    maxInvites={3}
                  />
                )}

                {/* Voucher Code Section */}
                <Collapsible open={voucherOpen || isVoucherApplied} onOpenChange={setVoucherOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm text-muted-foreground hover:text-foreground gap-2 px-0"
                      disabled={isVoucherApplied}
                    >
                      <Ticket className="w-4 h-4" />
                      {isVoucherApplied ? `Gutscheincode eingelöst ✓ (${voucher.discountLabel})` : "Gutscheincode eingeben"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-2 space-y-2">
                      {isVoucherApplied ? (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            Code <code className="font-mono">{voucher.code}</code> eingelöst – {voucher.discountLabel}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
                            onClick={clearVoucher}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Code eingeben"
                            value={voucher.code}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && validateVoucher()}
                          />
                          <Button
                            variant="outline"
                            onClick={validateVoucher}
                            disabled={!voucher.code.trim() || voucher.status === "validating"}
                          >
                            {voucher.status === "validating" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Einlösen"
                            )}
                          </Button>
                        </div>
                      )}
                      {voucher.status === "invalid" && voucher.errorMessage && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {voucher.errorMessage}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ── P2G Credits Discount — only for authenticated users ── */}
                {!isGuest && maxCreditsForBooking > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">P2G Credits einlösen</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Verfügbar: {availableCredits.toLocaleString("de")} Credits
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={maxCreditsForBooking}
                        step={10}
                        value={creditsToUse}
                        onChange={e => setCreditsToUse(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-bold text-primary w-20 text-right">
                        {creditsToUse > 0
                          ? `−${(creditsToUse / 100).toFixed(2)} €`
                          : "0 Credits"}
                      </span>
                    </div>
                    {creditsToUse > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {creditsToUse.toLocaleString("de")} Credits = {(creditsToUse / 100).toFixed(2)} € Rabatt
                        {" "}(max. 50% des Preises)
                      </p>
                    )}
                  </div>
                )}

                {/* Guest: upsell to create account for points */}
                {isGuest && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                    <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-foreground mb-0.5">Punkte sammeln & mehr Vorteile</p>
                      <p className="text-muted-foreground">
                        Mit einem kostenlosen Konto sammelst du P2G Credits, kannst Freunde einladen und deine Buchungen verwalten.{" "}
                        <NavLink to="/auth" className="text-primary hover:underline">Jetzt kostenlos registrieren →</NavLink>
                      </p>
                    </div>
                  </div>
                )}

                {/* Rewards Estimate (hide if voucher applied or guest) */}
                {!isGuest && !isVoucherApplied && rewardsEstimate && rewardsEstimate.total_points > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/30 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-emerald-500/20">
                        <Coins className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="font-semibold text-emerald-400">
                        Du verdienst mit dieser Buchung:
                      </span>
                    </div>
                    
                    <div className="space-y-2 ml-8 text-sm">
                      {rewardsEstimate.breakdown.map((item) => (
                        <div key={item.key} className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {item.title}
                            {item.description && (
                              <span className="text-xs ml-1 opacity-70">({item.description})</span>
                            )}
                          </span>
                          <span className="text-emerald-400 font-medium">+{item.points}</span>
                        </div>
                      ))}
                      <div className="border-t border-emerald-500/20 pt-2 mt-2 flex justify-between items-center font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Gift className="h-4 w-4 text-emerald-400" />
                          P2G Credits gesamt
                        </span>
                        <span className="text-emerald-400 text-lg">+{rewardsEstimate.total_points}</span>
                      </div>
                    </div>
                    
                    {rewardsEstimate.disclaimers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 ml-8">
                        {rewardsEstimate.disclaimers[0]}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Price */}
                <div className="border-t border-border pt-4 space-y-2">
                  {isVoucherApplied ? (
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium">Gesamtpreis</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-sm">
                          {formatPrice(booking.price_cents, booking.currency)}
                        </span>
                        <span className="font-bold text-emerald-400 text-xl">
                          {isFullyFree ? "0,00 €" : formatPrice(effectivePrice, booking.currency)}
                        </span>
                      </div>
                    </div>
                  ) : selectedFriendIds.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Users className="w-4 h-4" />
                        <span>{selectedFriendIds.length} Freund{selectedFriendIds.length > 1 ? 'e' : ''} eingeladen</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Du zahlst</span>
                        <span className="font-bold text-primary text-xl">
                          {formatPrice(getOwnerShare(booking.price_cents, selectedFriendIds.length), booking.currency)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                        <div className="flex justify-between">
                          <span>Gesamtpreis Court (4 Spieler)</span>
                          <span>{formatPrice(booking.price_cents, booking.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Eingeladene Spieler zahlen je</span>
                          <span>{formatPrice(getSharePerPlayer(booking.price_cents), booking.currency)}</span>
                        </div>
                      </div>
                    </>
                  ) : booking.payment_mode === "split" && booking.invitedCount > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Du zahlst</span>
                        <span className="font-bold text-primary text-xl">
                          {formatPrice(getOwnerShare(booking.price_cents, booking.invitedCount), booking.currency)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                        <div className="flex justify-between">
                          <span>Gesamtpreis Court (4 Spieler)</span>
                          <span>{formatPrice(booking.price_cents, booking.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Eingeladene Spieler zahlen je</span>
                          <span>{formatPrice(getSharePerPlayer(booking.price_cents), booking.currency)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium">Gesamtpreis Court</span>
                      <span className="font-bold text-primary text-xl">
                        {formatPrice(booking.price_cents, booking.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pay Button */}
                <Button
                  variant="lime"
                  size="lg"
                  className="w-full"
                  onClick={() => createInvitesAndPay(selectedFriendIds)}
                  disabled={state === "processing" || (timeLeft !== null && timeLeft === 0)}
                >
                  {state === "processing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isFullyFree
                        ? "Buchung wird bestätigt..."
                        : selectedFriendIds.length > 0
                          ? "Einladungen werden versendet..."
                          : "Weiterleitung zu Stripe..."}
                    </>
                  ) : isFullyFree && isVoucherApplied ? (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Kostenlos buchen
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {creditsToUse > 0
                        ? `${creditsToUse.toLocaleString("de")} Credits – ${formatPrice(effectivePrice, booking.currency)} bezahlen`
                        : isVoucherApplied
                        ? `${voucher.discountLabel} – ${formatPrice(effectivePrice, booking.currency)} bezahlen`
                        : selectedFriendIds.length > 0
                          ? `Einladen & ${formatPrice(getOwnerShare(booking.price_cents, selectedFriendIds.length), booking.currency)} bezahlen`
                          : "Jetzt bezahlen"
                      }
                    </>
                  )}
                </Button>

                {/* Fallback link if redirect doesn't work */}
                {stripeUrl && !isFullyFree && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Falls sich Stripe nicht automatisch öffnet:
                    </p>
                    <a
                      href={stripeUrl}
                      className="text-primary underline hover:no-underline text-sm font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Hier klicken um zu Stripe zu gelangen →
                    </a>
                  </div>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  {isFullyFree && isVoucherApplied
                    ? "Deine Buchung wird kostenlos bestätigt – kein Zahlungsvorgang nötig."
                    : "Sichere Zahlung über Stripe. Nach erfolgreicher Zahlung wird deine Buchung bestätigt."}
                </p>

                <p className="text-xs text-center text-muted-foreground/70">
                  Mit der Buchung stimmst du unseren{" "}
                  <NavLink to="/agb" className="underline hover:no-underline">
                    AGB
                  </NavLink>{" "}
                  und der{" "}
                  <NavLink to="/datenschutz" className="underline hover:no-underline">
                    Datenschutzerklärung
                  </NavLink>{" "}
                  zu.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingCheckout;

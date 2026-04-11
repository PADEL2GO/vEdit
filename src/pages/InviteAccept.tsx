import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type InviteStatus = "loading" | "accepting" | "redirecting" | "error" | "already_paid" | "login_required";

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [bookingDetails, setBookingDetails] = useState<{
    location_name: string;
    date: string;
    time: string;
    share_amount: string;
  } | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("login_required");
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("Ungültiger Einladungslink.");
      return;
    }

    processInvitation();
  }, [token, user, authLoading]);

  const processInvitation = async () => {
    if (!token || !user) return;

    try {
      setStatus("loading");

      // Fetch participant details
      const { data: participant, error: participantError } = await supabase
        .from("booking_participants")
        .select(`
          id,
          invited_user_id,
          status,
          share_price_cents,
          booking_id
        `)
        .eq("id", token)
        .single();

      if (participantError || !participant) {
        setStatus("error");
        setErrorMessage("Einladung nicht gefunden.");
        return;
      }

      // Verify the logged-in user is the invited user
      if (participant.invited_user_id !== user.id) {
        setStatus("error");
        setErrorMessage("Diese Einladung ist für einen anderen Nutzer.");
        return;
      }

      // Check if already paid
      if (participant.status === "paid") {
        setStatus("already_paid");
        return;
      }

      // Fetch booking details for display
      const { data: booking } = await supabase
        .from("bookings")
        .select(`
          start_time,
          end_time,
          location_id
        `)
        .eq("id", participant.booking_id)
        .single();

      if (booking) {
        const { data: location } = await supabase
          .from("locations")
          .select("name")
          .eq("id", booking.location_id)
          .single();

        const startDate = new Date(booking.start_time);
        const dateFormatter = new Intl.DateTimeFormat("de-DE", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        const timeFormatter = new Intl.DateTimeFormat("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });

        setBookingDetails({
          location_name: location?.name || "Unbekannt",
          date: dateFormatter.format(startDate),
          time: timeFormatter.format(startDate),
          share_amount: ((participant.share_price_cents || 0) / 100).toFixed(2).replace(".", ","),
        });
      }

      // Auto-accept the invitation if pending
      if (participant.status === "pending_invite") {
        setStatus("accepting");
        
        const { error: updateError } = await supabase
          .from("booking_participants")
          .update({ status: "accepted" })
          .eq("id", token);

        if (updateError) {
          console.error("Error accepting invitation:", updateError);
          // Continue anyway - might already be accepted
        }
      }

      // Create Stripe checkout session
      setStatus("redirecting");
      
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-participant-checkout",
        {
          body: { participant_id: token },
        }
      );

      if (checkoutError || !checkoutData?.url) {
        throw new Error(checkoutError?.message || "Fehler beim Erstellen der Zahlungssitzung");
      }

      // Redirect to Stripe
      window.location.href = checkoutData.url;
    } catch (error: any) {
      console.error("Error processing invitation:", error);
      setStatus("error");
      setErrorMessage(error.message || "Ein Fehler ist aufgetreten.");
    }
  };

  const handleLogin = () => {
    navigate(`/auth?redirect=/invite/accept?token=${token}`);
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard/booking");
  };

  return (
    <>
      <Helmet>
        <title>Einladung annehmen | PADEL2GO</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
            {/* Logo */}
            <div className="mb-6">
              <span className="text-2xl font-bold text-primary">🎾 PADEL2GO</span>
            </div>

            {/* Loading State */}
            {(status === "loading" || status === "accepting" || status === "redirecting") && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  {status === "loading" && "Einladung wird geladen..."}
                  {status === "accepting" && "Einladung wird angenommen..."}
                  {status === "redirecting" && "Weiterleitung zu Stripe..."}
                </h2>
                {bookingDetails && (
                  <div className="bg-muted rounded-lg p-4 text-left space-y-1">
                    <p className="text-sm text-muted-foreground">
                      📍 {bookingDetails.location_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      📅 {bookingDetails.date} um {bookingDetails.time}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      💰 {bookingDetails.share_amount} €
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Login Required */}
            {status === "login_required" && (
              <div className="space-y-4">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Anmeldung erforderlich</h2>
                <p className="text-muted-foreground">
                  Bitte melde dich an, um die Einladung anzunehmen.
                </p>
                <Button onClick={handleLogin} className="w-full">
                  Jetzt anmelden
                </Button>
              </div>
            )}

            {/* Already Paid */}
            {status === "already_paid" && (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Bereits bezahlt!</h2>
                <p className="text-muted-foreground">
                  Du hast für dieses Match bereits bezahlt. Es erscheint in deinen Buchungen.
                </p>
                <Button onClick={handleGoToDashboard} className="w-full">
                  Zu meinen Buchungen
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="space-y-4">
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Fehler</h2>
                <p className="text-muted-foreground">{errorMessage}</p>
                <Button onClick={handleGoToDashboard} variant="outline" className="w-full">
                  Zu meinen Buchungen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InviteAccept;

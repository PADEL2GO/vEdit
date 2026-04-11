import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  X, 
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { formatPrice } from "@/lib/pricing";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Invite {
  id: string;
  booking_id: string;
  inviter_user_id: string;
  invited_username: string;
  status: string;
  share_price_cents: number | null;
  created_at: string;
  booking: {
    start_time: string;
    end_time: string;
    currency: string;
    location: { name: string; address: string | null };
    court: { name: string };
  };
  inviter: {
    username: string | null;
    display_name: string | null;
  };
}

export function AccountInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user]);

  const fetchInvites = async () => {
    if (!user) return;

    try {
      // Fetch pending invites for this user
      const { data, error } = await supabase
        .from("booking_participants")
        .select(`
          id,
          booking_id,
          inviter_user_id,
          invited_username,
          status,
          share_price_cents,
          created_at
        `)
        .eq("invited_user_id", user.id)
        .eq("status", "pending_invite")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch booking details and inviter info for each invite
      const invitesWithDetails: Invite[] = [];

      for (const invite of data || []) {
        // Fetch booking
        const { data: bookingData } = await supabase
          .from("bookings")
          .select(`
            start_time,
            end_time,
            currency,
            location:locations (name, address),
            court:courts (name)
          `)
          .eq("id", invite.booking_id)
          .single();

        // Fetch inviter profile
        const { data: inviterData } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", invite.inviter_user_id)
          .single();

        if (bookingData) {
          invitesWithDetails.push({
            ...invite,
            booking: {
              start_time: bookingData.start_time,
              end_time: bookingData.end_time,
              currency: bookingData.currency || "EUR",
              location: bookingData.location as { name: string; address: string | null },
              court: bookingData.court as { name: string },
            },
            inviter: inviterData || { username: null, display_name: null },
          });
        }
      }

      setInvites(invitesWithDetails);
    } catch (err) {
      console.error("Error fetching invites:", err);
      toast.error("Fehler beim Laden der Einladungen");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAndPay = async (invite: Invite) => {
    setProcessing(invite.id);

    try {
      // First update status to accepted
      const { error: updateError } = await supabase
        .from("booking_participants")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (updateError) throw updateError;

      // Then create checkout session for the share
      const { data, error } = await supabase.functions.invoke("create-participant-checkout", {
        body: { participant_id: invite.id },
      });

      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error("Keine Checkout-URL erhalten");

      // Redirect to Stripe
      window.open(data.url, "_blank", "noopener,noreferrer");
      
      // Refresh invites
      fetchInvites();
      toast.success("Einladung angenommen! Bitte schließe die Zahlung ab.");
    } catch (err: any) {
      console.error("Accept error:", err);
      toast.error("Fehler beim Annehmen der Einladung", {
        description: err.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (invite: Invite) => {
    setProcessing(invite.id);

    try {
      const { error } = await supabase
        .from("booking_participants")
        .update({ status: "declined" })
        .eq("id", invite.id);

      if (error) throw error;

      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.success("Einladung abgelehnt");
    } catch (err: any) {
      console.error("Decline error:", err);
      toast.error("Fehler beim Ablehnen", { description: err.message });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return null; // Don't show section if no invites
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/30 bg-primary/5">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Einladungen
                  <Badge variant="default" className="ml-2">
                    {invites.length}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              {invites.map((invite) => {
                const startTime = new Date(invite.booking.start_time);
                const endTime = new Date(invite.booking.end_time);
                const duration = differenceInMinutes(endTime, startTime);
                const isProcessing = processing === invite.id;

                return (
                  <div
                    key={invite.id}
                    className="p-4 bg-background rounded-lg border border-border space-y-3"
                  >
                    {/* Inviter info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Eingeladen von{" "}
                        <span className="font-medium text-foreground">
                          @{invite.inviter.username || "Unbekannt"}
                        </span>
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{invite.booking.location?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.booking.court?.name}
                        </p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(startTime, "EEE, dd.MM.yy", { locale: de })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({duration} Min.)
                      </div>
                    </div>

                    {/* Share price */}
                    {invite.share_price_cents && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span>Dein Anteil: </span>
                        <span className="font-bold text-primary">
                          {formatPrice(invite.share_price_cents, invite.booking.currency)}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="lime"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAcceptAndPay(invite)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Annehmen & Bezahlen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(invite)}
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

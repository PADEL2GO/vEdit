import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, User, Clock, XCircle, Building2, Users } from "lucide-react";

export interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  user_id: string;
  created_at: string;
  booking_origin?: string;
  club_id?: string | null;
  club_booked_by_user_id?: string | null;
  booked_for_member_name?: string | null;
  allocation_minutes?: number | null;
  is_free_allocation?: boolean;
  courts: { id: string; name: string } | null;
  locations: { id: string; name: string } | null;
  profiles?: { display_name: string | null; username: string | null } | null;
  club?: { id: string; name: string } | null;
  club_booked_by?: { display_name: string | null; username: string | null } | null;
}

interface BookingDetailDrawerProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (bookingId: string) => void;
}

export function BookingDetailDrawer({
  booking,
  open,
  onOpenChange,
  onCancel,
}: BookingDetailDrawerProps) {
  if (!booking) return null;

  const bookingStart = new Date(booking.start_time);
  const bookingEnd = new Date(booking.end_time);
  const isClubBooking = booking.booking_origin === "club";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-primary/20 text-primary border-primary">
            Bestätigt
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive">
            Storniert
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500">
            Ausstehend
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Buchungsdetails</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Type */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {getStatusBadge(booking.status)}
              {isClubBooking && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Building2 className="h-3 w-3 mr-1" />
                  Club
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              #{booking.id.slice(0, 8)}
            </span>
          </div>

          <Separator className="bg-border" />

          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">
                  {format(bookingStart, "EEEE, dd. MMMM yyyy", { locale: de })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(bookingStart, "HH:mm")} - {format(bookingEnd, "HH:mm")} Uhr
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">
                  {booking.locations?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {booking.courts?.name}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-foreground">
                  {booking.profiles?.display_name || "Unbekannter Benutzer"}
                </div>
                {booking.profiles?.username && (
                  <div className="text-sm text-muted-foreground">
                    @{booking.profiles.username}
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {booking.user_id.slice(0, 8)}...
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Erstellt am</div>
                <div className="font-medium text-foreground">
                  {format(new Date(booking.created_at), "dd.MM.yyyy HH:mm", {
                    locale: de,
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Club Booking Details */}
          {isClubBooking && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Club-Buchungsdetails
                </h4>

                {booking.club?.name && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Club</div>
                      <div className="font-medium text-primary">
                        {booking.club.name}
                      </div>
                    </div>
                  </div>
                )}

                {(booking.club_booked_by?.display_name || booking.club_booked_by?.username) && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Gebucht von</div>
                      <div className="font-medium text-foreground">
                        {booking.club_booked_by.display_name || booking.club_booked_by.username}
                      </div>
                    </div>
                  </div>
                )}

                {booking.booked_for_member_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Für Mitglied</div>
                      <div className="font-medium text-foreground">
                        {booking.booked_for_member_name}
                      </div>
                    </div>
                  </div>
                )}

                {booking.allocation_minutes && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Kontingent</div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {booking.allocation_minutes} Minuten
                        {booking.is_free_allocation && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            Freies Kontingent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="bg-border" />

          {/* Actions */}
          {booking.status === "confirmed" && onCancel && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onCancel(booking.id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Buchung stornieren
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
import { Building2, XCircle } from "lucide-react";

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
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
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
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            Bestätigt
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] px-2.5 py-1 text-[11px] font-bold text-[#FF6B6B]"
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            Storniert
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] px-2.5 py-1 text-[11px] font-bold text-[#FFC44D]"
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            Ausstehend
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const detailRows: { label: string; value: string }[] = [
    { label: "Datum", value: format(bookingStart, "EEEE, dd. MMMM yyyy", { locale: de }) },
    {
      label: "Uhrzeit",
      value: `${format(bookingStart, "HH:mm")} – ${format(bookingEnd, "HH:mm")} Uhr`,
    },
    { label: "Standort", value: booking.locations?.name || "-" },
    { label: "Court", value: booking.courts?.name || "-" },
    {
      label: "Benutzer",
      value: booking.profiles?.display_name || "Unbekannter Benutzer",
    },
    ...(booking.profiles?.username
      ? [{ label: "Username", value: `@${booking.profiles.username}` }]
      : []),
    { label: "User-ID", value: `${booking.user_id.slice(0, 8)}...` },
    {
      label: "Erstellt am",
      value: format(new Date(booking.created_at), "dd.MM.yyyy HH:mm", { locale: de }),
    },
    { label: "Buchungs-ID", value: `#${booking.id.slice(0, 8)}` },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 border-l border-[hsl(0_0%_14%)] bg-gradient-to-b from-[hsl(0_0%_6%)] to-[hsl(0_0%_3%)] p-0 sm:max-w-[430px]">
        <SheetHeader className="flex-none space-y-[5px] border-b border-[hsl(0_0%_14%)] px-5 py-[18px] pr-12 text-left">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Buchungsdetails
          </span>
          <SheetTitle className="font-display text-[19px] font-extrabold leading-tight tracking-tight text-foreground">
            {booking.profiles?.display_name ||
              booking.profiles?.username ||
              booking.guest_name ||
              "Unbekannter Benutzer"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[18px] p-5">
            {/* Status & Typ */}
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(booking.status)}
              {isClubBooking && (
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-full border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] px-2.5 py-1 text-[11px] font-bold text-[#7FD4FF]"
                >
                  <Building2 className="h-3 w-3" />
                  Club
                </Badge>
              )}
            </div>

            {/* Feldliste */}
            <div className="flex flex-col">
              {detailRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-b border-[hsl(0_0%_11%)] py-[11px]"
                >
                  <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="text-right font-mono text-[13px] font-semibold text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Club Booking Details */}
            {isClubBooking && (
              <div className="flex flex-col gap-2 rounded-[14px] border border-[hsl(200_100%_75%/0.2)] bg-[hsl(200_100%_75%/0.05)] p-[15px]">
                <span className="flex items-center gap-2 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#7FD4FF]">
                  <Building2 className="h-3.5 w-3.5 flex-none" />
                  Club-Buchungsdetails
                </span>

                {booking.club?.name && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Club
                    </span>
                    <span className="text-right text-[13px] font-semibold text-[#7FD4FF]">
                      {booking.club.name}
                    </span>
                  </div>
                )}

                {(booking.club_booked_by?.display_name || booking.club_booked_by?.username) && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Gebucht von
                    </span>
                    <span className="text-right text-[13px] font-semibold text-foreground">
                      {booking.club_booked_by?.display_name || booking.club_booked_by?.username}
                    </span>
                  </div>
                )}

                {booking.booked_for_member_name && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Für Mitglied
                    </span>
                    <span className="text-right text-[13px] font-semibold text-foreground">
                      {booking.booked_for_member_name}
                    </span>
                  </div>
                )}

                {(booking.guest_email || booking.guest_name) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted-foreground">
                      Gast-Buchung (ohne Konto)
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {booking.guest_name || "Gast"}
                    </span>
                    {booking.guest_email && (
                      <a
                        href={`mailto:${booking.guest_email}`}
                        className="break-all text-[13px] text-primary hover:underline"
                      >
                        {booking.guest_email}
                      </a>
                    )}
                    {booking.guest_phone && (
                      <span className="text-[13px] text-muted-foreground">
                        {booking.guest_phone}
                      </span>
                    )}
                  </div>
                )}

                {booking.allocation_minutes && (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Kontingent
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[13px] font-semibold text-foreground">
                      {booking.allocation_minutes} Minuten
                      {booking.is_free_allocation && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-green-500/30 bg-green-500/10 px-2 py-0 font-mono text-[10px] uppercase tracking-[0.1em] text-green-500"
                        >
                          Freies Kontingent
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {booking.status === "confirmed" && onCancel && (
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-[hsl(0_100%_71%/0.32)] bg-[hsl(0_100%_71%/0.08)] text-sm font-bold text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.18)] hover:text-[#FF6B6B]"
                onClick={() => onCancel(booking.id)}
              >
                <XCircle className="h-4 w-4" />
                Buchung stornieren
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useMemo } from "react";
import { format, addHours, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

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

interface BookingWeekCalendarProps {
  weekDays: Date[];
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
  startHour?: number;
  endHour?: number;
}

export function BookingWeekCalendar({
  weekDays,
  bookings,
  onBookingClick,
  startHour = 6,
  endHour = 24,
}: BookingWeekCalendarProps) {
  const hours = useMemo(() => {
    const arr = [];
    for (let h = startHour; h < endHour; h++) {
      arr.push(h);
    }
    return arr;
  }, [startHour, endHour]);

  const getBookingsForDayAndHour = (day: Date, hour: number) => {
    const hourStart = addHours(new Date(day.setHours(0, 0, 0, 0)), hour);
    const hourEnd = addHours(hourStart, 1);

    return bookings.filter((booking) => {
      const bookingStart = parseISO(booking.start_time);
      const bookingEnd = parseISO(booking.end_time);

      // Check if booking overlaps with this hour slot
      return (
        isSameDay(bookingStart, day) &&
        bookingStart < hourEnd &&
        bookingEnd > hourStart
      );
    });
  };

  const getBookingStyle = (status: string, isClubBooking: boolean) => {
    if (isClubBooking) {
      switch (status) {
        case "confirmed":
          return "bg-violet-500/20 border-violet-500 text-violet-600 hover:bg-violet-500/30";
        case "cancelled":
          return "bg-destructive/20 border-destructive text-destructive line-through opacity-60";
        case "pending":
          return "bg-yellow-500/20 border-yellow-500 text-yellow-500 hover:bg-yellow-500/30";
        default:
          return "bg-muted border-muted-foreground text-muted-foreground";
      }
    }
    switch (status) {
      case "confirmed":
        return "bg-primary/20 border-primary text-primary hover:bg-primary/30";
      case "cancelled":
        return "bg-destructive/20 border-destructive text-destructive line-through opacity-60";
      case "pending":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-500 hover:bg-yellow-500/30";
      default:
        return "bg-muted border-muted-foreground text-muted-foreground";
    }
  };

  const isBookingStart = (booking: Booking, day: Date, hour: number) => {
    const bookingStart = parseISO(booking.start_time);
    return isSameDay(bookingStart, day) && bookingStart.getHours() === hour;
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row - Days */}
          <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border">
            <div className="p-2 text-center text-xs text-muted-foreground">Zeit</div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="p-2 text-center border-l border-border"
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {format(day, "dd.MM")}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border/50 min-h-[48px]"
              >
                <div className="p-2 text-xs text-muted-foreground text-right pr-3">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayBookings = getBookingsForDayAndHour(day, hour);
                  
                  return (
                    <div
                      key={dayIdx}
                      className="border-l border-border/50 relative min-h-[48px] p-0.5"
                    >
                      {dayBookings.map((booking) => {
                        // Only render if this is the start hour
                        if (!isBookingStart(booking, day, hour)) return null;

                        const bookingStart = parseISO(booking.start_time);
                        const bookingEnd = parseISO(booking.end_time);
                        const durationHours =
                          (bookingEnd.getTime() - bookingStart.getTime()) /
                          (1000 * 60 * 60);
                        const isClubBooking = booking.booking_origin === "club";

                        return (
                          <Tooltip key={booking.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onBookingClick?.(booking)}
                                className={cn(
                                  "absolute left-0.5 right-0.5 rounded-md border text-xs p-1 cursor-pointer transition-colors overflow-hidden",
                                  getBookingStyle(booking.status, isClubBooking)
                                )}
                                style={{
                                  height: `${durationHours * 48 - 4}px`,
                                  zIndex: 10,
                                }}
                              >
                                <div className="font-medium truncate flex items-center gap-1">
                                  {isClubBooking && <Building2 className="h-3 w-3 flex-shrink-0" />}
                                  {booking.courts?.name}
                                </div>
                                <div className="text-[10px] opacity-80 truncate">
                                  {format(bookingStart, "HH:mm")} -{" "}
                                  {format(bookingEnd, "HH:mm")}
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-popover border-border max-w-xs"
                            >
                              <div className="space-y-1">
                                <div className="font-medium flex items-center gap-1">
                                  {isClubBooking && (
                                    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/30 mr-1">
                                      <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                      Club
                                    </Badge>
                                  )}
                                  {booking.courts?.name} @ {booking.locations?.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(bookingStart, "dd.MM.yyyy HH:mm")} -{" "}
                                  {format(bookingEnd, "HH:mm")}
                                </div>
                                <div className="text-xs">
                                  Benutzer:{" "}
                                  {booking.profiles?.display_name ||
                                    booking.profiles?.username ||
                                    "Unbekannt"}
                                </div>
                                {isClubBooking && booking.club?.name && (
                                  <div className="text-xs text-violet-600">
                                    Club: {booking.club.name}
                                  </div>
                                )}
                                {booking.booked_for_member_name && (
                                  <div className="text-xs">
                                    Für: {booking.booked_for_member_name}
                                  </div>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    booking.status === "confirmed" &&
                                      "border-primary text-primary",
                                    booking.status === "cancelled" &&
                                      "border-destructive text-destructive",
                                    booking.status === "pending" &&
                                      "border-yellow-500 text-yellow-500"
                                  )}
                                >
                                  {booking.status === "confirmed"
                                    ? "Bestätigt"
                                    : booking.status === "cancelled"
                                    ? "Storniert"
                                    : "Ausstehend"}
                                </Badge>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

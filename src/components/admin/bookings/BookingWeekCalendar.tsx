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

interface BookingWeekCalendarProps {
  weekDays: Date[];
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 44;
const GRID_COLS = "grid grid-cols-[62px_repeat(7,minmax(74px,1fr))]";

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
    if (isClubBooking && status === "confirmed") {
      return "border-[hsl(200_100%_75%/0.4)] bg-[hsl(200_100%_75%/0.14)] text-[#7FD4FF]";
    }
    switch (status) {
      case "confirmed":
        return "border-primary/40 bg-primary/[0.16] text-primary";
      case "cancelled":
        return "border-[hsl(0_100%_71%/0.36)] bg-[hsl(0_100%_71%/0.12)] text-[#FF6B6B] line-through opacity-60";
      case "pending":
        return "border-[hsl(41_100%_65%/0.4)] bg-[hsl(41_100%_65%/0.14)] text-[#FFC44D]";
      default:
        return "border-[hsl(0_0%_16%)] bg-white/5 text-muted-foreground";
    }
  };

  const isBookingStart = (booking: Booking, day: Date, hour: number) => {
    const bookingStart = parseISO(booking.start_time);
    return isSameDay(bookingStart, day) && bookingStart.getHours() === hour;
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          {/* Kopfzeile — Tage */}
          <div className={cn(GRID_COLS, "border-b border-[hsl(0_0%_12%)]")}>
            <div className="flex h-[34px] items-center justify-end pr-[9px]">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[hsl(0_0%_58%)]">
                Zeit
              </span>
            </div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex h-[34px] flex-col items-center justify-center gap-[3px] border-l border-[hsl(0_0%_10%)]",
                  idx === 6 && "bg-white/[0.03]"
                )}
              >
                <span
                  className={cn(
                    "text-[11.5px] font-bold leading-none text-foreground",
                    idx === 6 && "text-[hsl(0_0%_65%)]"
                  )}
                >
                  {format(day, "EEEEEE", { locale: de })}
                </span>
                <span className="font-mono text-[9.5px] leading-none text-[hsl(0_0%_58%)]">
                  {format(day, "dd.MM")}
                </span>
              </div>
            ))}
          </div>

          {/* Stundenraster */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className={cn(GRID_COLS, "h-11 border-b border-[hsl(0_0%_8%)]")}
              >
                <div className="flex items-start justify-end pr-[9px]">
                  <span className="-translate-y-1.5 font-mono text-[10.5px] text-[hsl(0_0%_58%)]">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayBookings = getBookingsForDayAndHour(day, hour);

                  return (
                    <div
                      key={dayIdx}
                      className="relative border-l border-[hsl(0_0%_10%)]"
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
                                  "absolute left-[3px] right-[3px] flex cursor-pointer flex-col items-start justify-center gap-[3px] overflow-hidden rounded-lg border px-[7px] py-[5px] text-left transition-[filter] duration-150 hover:brightness-[1.35]",
                                  getBookingStyle(booking.status, isClubBooking)
                                )}
                                style={{
                                  top: `${(bookingStart.getMinutes() / 60) * HOUR_HEIGHT + 1}px`,
                                  height: `${durationHours * HOUR_HEIGHT - 2}px`,
                                  zIndex: 10,
                                }}
                              >
                                <span className="whitespace-nowrap font-mono text-[9.5px] font-bold leading-none">
                                  {format(bookingStart, "HH:mm")} –{" "}
                                  {format(bookingEnd, "HH:mm")}
                                </span>
                                <span className="flex w-full min-w-0 items-center gap-1 text-[10.5px] font-semibold leading-none">
                                  {isClubBooking && (
                                    <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{booking.courts?.name}</span>
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-xs rounded-xl border-[hsl(0_0%_15%)] bg-[hsl(0_0%_6%)] px-3.5 py-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
                                  {isClubBooking && (
                                    <Badge
                                      variant="outline"
                                      className="mr-1 gap-1 rounded-full border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] px-2 py-0.5 text-[10px] font-bold text-[#7FD4FF]"
                                    >
                                      <Building2 className="h-2.5 w-2.5" />
                                      Club
                                    </Badge>
                                  )}
                                  {booking.courts?.name} @ {booking.locations?.name}
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">
                                  {format(bookingStart, "dd.MM.yyyy HH:mm")} –{" "}
                                  {format(bookingEnd, "HH:mm")}
                                </div>
                                <div className="text-xs text-[hsl(0_0%_78%)]">
                                  Benutzer:{" "}
                                  {booking.profiles?.display_name ||
                                    booking.profiles?.username ||
                                    "Unbekannt"}
                                </div>
                                {isClubBooking && booking.club?.name && (
                                  <div className="text-xs text-[#7FD4FF]">
                                    Club: {booking.club.name}
                                  </div>
                                )}
                                {booking.booked_for_member_name && (
                                  <div className="text-xs text-[hsl(0_0%_78%)]">
                                    Für: {booking.booked_for_member_name}
                                  </div>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    booking.status === "confirmed" &&
                                      "border-primary/30 bg-primary/10 text-primary",
                                    booking.status === "cancelled" &&
                                      "border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]",
                                    booking.status === "pending" &&
                                      "border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] text-[#FFC44D]"
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

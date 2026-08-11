import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClubCourt } from "@/components/club/ClubCourtContext";
import { SPORT_CHIP_CLASSES } from "@/components/admin/courts/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

export default function ClubCalendar() {
  const { t, i18n } = useTranslation("club");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const { courtId, courtName, sport } = useClubCourt();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Fetch bookings for the week
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["club-calendar-bookings", courtId, currentWeekStart.toISOString()],
    queryFn: async () => {
      if (!courtId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", courtId)
        .gte("start_time", currentWeekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .neq("status", "cancelled")
        .neq("status", "expired")
        .order("start_time");

      if (error) throw error;
      return data;
    },
    enabled: !!courtId,
  });

  const getBookingsForDay = (day: Date) => {
    if (!bookings) return [];
    return bookings.filter((b) => isSameDay(new Date(b.start_time), day));
  };

  const getBookingStyle = (booking: any) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = ((startHour - 7) / 14) * 100;
    const height = ((endHour - startHour) / 14) * 100;
    
    return {
      top: `${top}%`,
      height: `${height}%`,
    };
  };

  const isClubBooking = (booking: any) => booking.booking_origin === "club";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("calendar.title")}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground">
              {t("calendar.utilizationOf", { courtName })}
            </p>
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SPORT_CHIP_CLASSES[sport]}`}
            >
              {t(`common.sport.${sport}`)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            {t("calendar.today")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-sm text-muted-foreground">{t("calendar.legendClub")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-sm text-muted-foreground">{t("calendar.legendUser")}</span>
        </div>
      </div>

      {/* Week Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {t("calendar.weekRange", { start: format(currentWeekStart, t("calendar.weekStartFormat"), { locale: dateLocale }), end: format(weekEnd, t("calendar.weekEndFormat"), { locale: dateLocale }) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-2 text-xs text-muted-foreground">{t("calendar.columnTime")}</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-l ${
                      isSameDay(day, new Date()) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">
                      {format(day, t("calendar.dayNameFormat"), { locale: dateLocale })}
                    </div>
                    <div className={`text-sm font-medium ${
                      isSameDay(day, new Date()) ? "text-primary" : ""
                    }`}>
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="relative">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-8">
                    {/* Time Labels */}
                    <div className="border-r">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="h-12 border-b px-2 text-xs text-muted-foreground flex items-start pt-1"
                        >
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>

                    {/* Day Columns */}
                    {weekDays.map((day) => {
                      const dayBookings = getBookingsForDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`relative border-l ${
                            isSameDay(day, new Date()) ? "bg-primary/5" : ""
                          }`}
                        >
                          {/* Hour Grid Lines */}
                          {HOURS.map((hour) => (
                            <div key={hour} className="h-12 border-b" />
                          ))}

                          {/* Bookings */}
                          {dayBookings.map((booking) => {
                            const style = getBookingStyle(booking);
                            const isClub = isClubBooking(booking);
                            return (
                              <div
                                key={booking.id}
                                className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs overflow-hidden ${
                                  isClub
                                    ? "bg-green-500/90 text-white"
                                    : "bg-blue-500/90 text-white"
                                }`}
                                style={style}
                              >
                                <div className="flex items-center gap-1">
                                  {isClub ? (
                                    <Users className="h-3 w-3 flex-shrink-0" />
                                  ) : (
                                    <User className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {format(new Date(booking.start_time), "HH:mm")}
                                  </span>
                                </div>
                                {isClub && booking.booked_for_member_name && (
                                  <div className="truncate text-[10px] opacity-90">
                                    {booking.booked_for_member_name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("calendar.todayCardTitle", { date: format(new Date(), t("calendar.todayDateFormat"), { locale: dateLocale }) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const todayBookings = getBookingsForDay(new Date());
            if (todayBookings.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("calendar.noBookingsToday")}
                </p>
              );
            }
            return (
              <div className="space-y-2">
                {todayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={isClubBooking(booking) ? "default" : "secondary"}>
                        {isClubBooking(booking) ? t("common.badgeClub") : t("common.badgeUser")}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                        </p>
                        {isClubBooking(booking) && booking.booked_for_member_name && (
                          <p className="text-sm text-muted-foreground">
                            {booking.booked_for_member_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClubCourt } from "@/components/club/ClubCourtContext";
import { SPORT_CHIP_CLASSES } from "@/components/admin/courts/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, User, UserCheck, Clock } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

interface CalendarBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  /** 'club' = über das Club-Portal, 'member' = eigenes Vereinsmitglied, 'user' = fremder Spieler */
  category: "club" | "member" | "user";
  /** Nur bei category = 'member' gesetzt. */
  member_name: string | null;
  /** Womit das Mitglied gebucht hat. */
  member_benefit: "quota" | "discount" | "none" | null;
  member_discount_cents: number;
  allocation_minutes: number | null;
  booked_for_member_name: string | null;
}

/** Ein Block je Kategorie — Grün Club, Bernstein Mitglied, Blau fremder Spieler. */
const CATEGORY_BLOCK: Record<CalendarBooking["category"], string> = {
  club: "bg-green-500/90 text-white",
  member: "bg-amber-500/90 text-white",
  user: "bg-blue-500/90 text-white",
};

const CATEGORY_DOT: Record<CalendarBooking["category"], string> = {
  club: "bg-green-500",
  member: "bg-amber-500",
  user: "bg-blue-500",
};

export default function ClubCalendar() {
  const { t, i18n } = useTranslation("club");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const { courtId, courtName, sport } = useClubCourt();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Kalenderdaten über die RPC: club_users dürfen Buchungen ihrer Courts lesen,
  // aber keine fremden Profile — den Klarnamen eigener Mitglieder liefert nur
  // club_court_bookings (SECURITY DEFINER). Fremde Spieler bleiben anonym.
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["club-calendar-bookings", courtId, currentWeekStart.toISOString()],
    queryFn: async (): Promise<CalendarBooking[]> => {
      if (!courtId) return [];

      const { data, error } = await (supabase as any).rpc("club_court_bookings", {
        p_court_id: courtId,
        p_from: currentWeekStart.toISOString(),
        p_to: weekEnd.toISOString(),
      });

      if (error) throw error;
      return (data ?? []) as CalendarBooking[];
    },
    enabled: !!courtId,
  });

  const getBookingsForDay = (day: Date): CalendarBooking[] => {
    if (!bookings) return [];
    return bookings.filter((b) => isSameDay(new Date(b.start_time), day));
  };

  /** "Kontingent" / "Rabatt" — bei 'none' bewusst nichts, das wäre nur Rauschen. */
  const benefitLabel = (booking: CalendarBooking): string | null => {
    if (booking.category !== "member") return null;
    if (booking.member_benefit === "quota") return t("calendar.benefitQuota");
    if (booking.member_benefit === "discount") return t("calendar.benefitDiscount");
    return null;
  };

  /** Zeile unter der Uhrzeit: Klarname beim Mitglied, Name des Gebuchten beim Club. */
  const subLine = (booking: CalendarBooking): string | null => {
    if (booking.category === "member") return booking.member_name;
    if (booking.category === "club") return booking.booked_for_member_name;
    return null;
  };

  const getBookingStyle = (booking: CalendarBooking) => {
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${CATEGORY_DOT.club}`} />
          <span className="text-sm text-muted-foreground">{t("calendar.legendClub")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${CATEGORY_DOT.member}`} />
          <span className="text-sm text-muted-foreground">{t("calendar.legendMember")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${CATEGORY_DOT.user}`} />
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
                            const name = subLine(booking);
                            const benefit = benefitLabel(booking);
                            return (
                              <div
                                key={booking.id}
                                className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs overflow-hidden ${CATEGORY_BLOCK[booking.category]}`}
                                style={style}
                                title={[
                                  format(new Date(booking.start_time), "HH:mm"),
                                  name,
                                  benefit,
                                ].filter(Boolean).join(" · ")}
                              >
                                <div className="flex items-center gap-1">
                                  {booking.category === "user" ? (
                                    <User className="h-3 w-3 flex-shrink-0" />
                                  ) : booking.category === "member" ? (
                                    <UserCheck className="h-3 w-3 flex-shrink-0" />
                                  ) : (
                                    <Users className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {format(new Date(booking.start_time), "HH:mm")}
                                  </span>
                                </div>
                                {name && (
                                  <div className="truncate text-[10px] opacity-90">{name}</div>
                                )}
                                {benefit && (
                                  <div className="truncate text-[10px] opacity-75">{benefit}</div>
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
                {todayBookings.map((booking) => {
                  const name = subLine(booking);
                  const benefit = benefitLabel(booking);
                  return (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 flex-none rounded-full ${CATEGORY_DOT[booking.category]}`}
                        />
                        <Badge variant={booking.category === "user" ? "secondary" : "default"}>
                          {booking.category === "club"
                            ? t("common.badgeClub")
                            : booking.category === "member"
                              ? t("common.badgeMember")
                              : t("common.badgeUser")}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                          </p>
                          {name && <p className="text-sm text-muted-foreground">{name}</p>}
                        </div>
                      </div>
                      {benefit && (
                        <Badge variant="outline" className="whitespace-nowrap text-xs">
                          {benefit}
                          {booking.member_benefit === "quota" && booking.allocation_minutes
                            ? ` · ${booking.allocation_minutes} Min`
                            : ""}
                          {booking.member_benefit === "discount" && booking.member_discount_cents > 0
                            ? ` · −${formatPrice(booking.member_discount_cents)}`
                            : ""}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

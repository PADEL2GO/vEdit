import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandName from "@/components/BrandName";
import {
  CalendarCheck,
  Users,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  Building2,
  CalendarRange,
  Gauge,
  Euro,
  ArrowRight,
} from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_PILL: Record<string, string> = {
  confirmed: "border-primary/30 bg-primary/10 text-primary",
  cancelled: "border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]",
  pending_payment: "border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] text-[#FFC44D]",
};

type RangeKey = "today" | "week" | "month";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "week", label: "Woche" },
  { key: "month", label: "Monat" },
];

const RANGE_WORD: Record<RangeKey, string> = {
  today: "heute",
  week: "diese Woche",
  month: "in diesem Monat",
};

function getPeriod(range: RangeKey, now: Date) {
  if (range === "today") {
    const prev = subDays(now, 1);
    return {
      start: startOfDay(now),
      end: endOfDay(now),
      prevStart: startOfDay(prev),
      prevEnd: endOfDay(prev),
    };
  }
  if (range === "week") {
    const start = startOfWeek(now, { locale: de });
    const end = endOfWeek(now, { locale: de });
    return { start, end, prevStart: subWeeks(start, 1), prevEnd: subWeeks(end, 1) };
  }
  const prev = subMonths(now, 1);
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    prevStart: startOfMonth(prev),
    prevEnd: endOfMonth(prev),
  };
}

function formatCents(cents: number, compact = false) {
  const digits = compact && cents % 100 === 0 ? 0 : 2;
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function trendPct(current: number | undefined, previous: number | undefined): number | null {
  if (current === undefined || previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export default function AdminOverview() {
  const today = new Date();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("today");
  const period = getPeriod(range, today);

  // Fetch confirmed bookings count for selected range (+ previous period for trend)
  const { data: bookingStats } = useQuery({
    queryKey: ["admin-bookings-count", range],
    queryFn: async () => {
      const countIn = async (from: Date, to: Date) => {
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .gte("start_time", from.toISOString())
          .lte("start_time", to.toISOString())
          .eq("status", "confirmed");
        return count || 0;
      };
      const [current, previous] = await Promise.all([
        countIn(period.start, period.end),
        countIn(period.prevStart, period.prevEnd),
      ]);
      return { current, previous };
    },
    placeholderData: keepPreviousData,
  });

  // Fetch booking revenue for selected range: confirmed, paid bookings only
  // (excludes free club allocations; price_cents reflects the charged amount)
  const { data: revenueStats } = useQuery({
    queryKey: ["admin-revenue", range],
    queryFn: async () => {
      const sumIn = async (from: Date, to: Date) => {
        const { data, error } = await supabase
          .from("bookings")
          .select("price_cents")
          .eq("status", "confirmed")
          .eq("is_free_allocation", false)
          .not("price_cents", "is", null)
          .gte("start_time", from.toISOString())
          .lte("start_time", to.toISOString());
        if (error) throw error;
        const rows = data || [];
        return {
          sum: rows.reduce((acc, row) => acc + (row.price_cents || 0), 0),
          count: rows.length,
        };
      };
      const [current, previous] = await Promise.all([
        sumIn(period.start, period.end),
        sumIn(period.prevStart, period.prevEnd),
      ]);
      return { current, previous };
    },
    placeholderData: keepPreviousData,
  });

  // Fetch new registrations in selected range
  const { data: newUsers } = useQuery({
    queryKey: ["admin-users-new", range],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", period.start.toISOString())
        .lte("created_at", period.end.toISOString());
      return count || 0;
    },
    placeholderData: keepPreviousData,
  });

  // Fetch total users count
  const { data: totalUsers } = useQuery({
    queryKey: ["admin-users-total"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch total locations count
  const { data: totalLocations } = useQuery({
    queryKey: ["admin-locations-total"],
    queryFn: async () => {
      const { count } = await supabase
        .from("locations")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch total courts count
  const { data: totalCourts } = useQuery({
    queryKey: ["admin-courts-total"],
    queryFn: async () => {
      const { count } = await supabase
        .from("courts")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
  });

  // Fetch club bookings today
  const { data: clubBookingsToday } = useQuery({
    queryKey: ["admin-club-bookings-today"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .not("club_id", "is", null)
        .gte("start_time", startOfDay(today).toISOString())
        .lte("start_time", endOfDay(today).toISOString())
        .eq("status", "confirmed");
      return count || 0;
    },
  });

  // Fetch club bookings this week
  const { data: clubBookingsWeek } = useQuery({
    queryKey: ["admin-club-bookings-week"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .not("club_id", "is", null)
        .gte("start_time", startOfWeek(today, { locale: de }).toISOString())
        .lte("start_time", endOfWeek(today, { locale: de }).toISOString())
        .eq("status", "confirmed");
      return count || 0;
    },
  });

  // Fetch club quota usage stats
  const { data: clubQuotaStats } = useQuery({
    queryKey: ["admin-club-quota-stats"],
    queryFn: async () => {
      // Get all active club court assignments with their quotas
      const { data: assignments } = await supabase
        .from("club_court_assignments")
        .select("club_id, court_id, monthly_free_minutes");

      if (!assignments || assignments.length === 0) return { used: 0, total: 0, percentage: 0 };

      // Calculate month start
      const monthStart = startOfMonth(today);
      const monthStartStr = format(monthStart, "yyyy-MM-dd");

      // Get usage for current month
      const { data: ledger } = await supabase
        .from("club_quota_ledger")
        .select("minutes_used, minutes_refunded")
        .eq("month_start_date", monthStartStr);

      const totalMinutesUsed = (ledger || []).reduce(
        (sum, entry) => sum + (entry.minutes_used || 0) - (entry.minutes_refunded || 0),
        0
      );
      const totalMinutesAvailable = assignments.reduce(
        (sum, a) => sum + (a.monthly_free_minutes || 0),
        0
      );

      return {
        used: totalMinutesUsed,
        total: totalMinutesAvailable,
        percentage: totalMinutesAvailable > 0
          ? Math.round((totalMinutesUsed / totalMinutesAvailable) * 100)
          : 0,
      };
    },
  });

  // Fetch all courts grouped by location for dropdown
  const { data: allCourts } = useQuery({
    queryKey: ["admin-courts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courts")
        .select("id, name, is_active, location_id, locations(name)")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  // Fetch recent bookings with optional court filter (incl. player + amount)
  const { data: recentBookings } = useQuery({
    queryKey: ["admin-recent-bookings", selectedCourtId],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          created_at,
          court_id,
          user_id,
          booking_origin,
          price_cents,
          guest_name,
          courts (id, name),
          locations (name)
        `)
        .order("created_at", { ascending: false });

      if (selectedCourtId) {
        query = query.eq("court_id", selectedCourtId);
      }

      const { data } = await query.limit(selectedCourtId ? 10 : 5);
      // guest_name existiert in der Live-DB, aber noch nicht in types.ts
      const rows = ((data as any[]) || []);

      const userIds = [...new Set(rows.map((b) => b.user_id).filter(Boolean))];
      let profilesMap = new Map<string, { display_name: string | null; username: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username")
          .in("user_id", userIds);
        profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      }

      return rows.map((booking) => ({
        ...booking,
        profiles: booking.user_id ? profilesMap.get(booking.user_id) || null : null,
      }));
    },
  });

  // Group courts by location for dropdown
  const courtsByLocation = allCourts?.reduce((acc: Record<string, any[]>, court: any) => {
    const locationName = court.locations?.name || "Unbekannt";
    if (!acc[locationName]) {
      acc[locationName] = [];
    }
    acc[locationName].push(court);
    return acc;
  }, {}) || {};

  const rangeDescription =
    range === "today"
      ? format(today, "EEEE, d. MMMM", { locale: de })
      : range === "week"
        ? "Aktuelle Woche"
        : format(today, "MMMM yyyy", { locale: de });

  const bookingsTitle =
    range === "today" ? "Buchungen heute" : range === "week" ? "Buchungen diese Woche" : "Buchungen im Monat";
  const revenueTitle =
    range === "today" ? "Umsatz heute" : range === "week" ? "Umsatz diese Woche" : "Umsatz im Monat";

  const revenueCurrent = revenueStats?.current;
  const avgPerBooking =
    revenueCurrent && revenueCurrent.count > 0
      ? Math.round(revenueCurrent.sum / revenueCurrent.count)
      : null;

  const kpiCards = [
    {
      title: bookingsTitle,
      value: bookingStats ? bookingStats.current.toLocaleString("de-DE") : "–",
      icon: CalendarCheck,
      description: rangeDescription,
      trend: trendPct(bookingStats?.current, bookingStats?.previous),
    },
    {
      title: revenueTitle,
      value: revenueCurrent ? formatCents(revenueCurrent.sum, true) : "–",
      icon: Euro,
      description:
        avgPerBooking !== null
          ? `Ø ${formatCents(avgPerBooking)} pro Buchung`
          : "Keine bezahlten Buchungen",
      trend: trendPct(revenueCurrent?.sum, revenueStats?.previous.sum),
    },
    {
      title: "Registrierte Benutzer",
      value: (totalUsers ?? 0).toLocaleString("de-DE"),
      icon: Users,
      description: newUsers !== undefined ? `+${newUsers} ${RANGE_WORD[range]}` : "Gesamt Spieler",
      trend: null as number | null,
    },
    {
      title: "Aktive Courts",
      value: (totalCourts ?? 0).toLocaleString("de-DE"),
      icon: LayoutGrid,
      description: `an ${totalLocations ?? 0} Standorten`,
      trend: null as number | null,
    },
  ];

  const clubKpiCards = [
    {
      title: "Club-Buchungen heute",
      value: clubBookingsToday ?? 0,
      icon: Building2,
      description: "Über Club-Kontingente",
      progress: undefined as number | undefined,
    },
    {
      title: "Club-Buchungen Woche",
      value: clubBookingsWeek ?? 0,
      icon: CalendarRange,
      description: "Aktuelle Woche",
      progress: undefined as number | undefined,
    },
    {
      title: "Kontingent-Nutzung",
      value: `${clubQuotaStats?.percentage ?? 0}%`,
      icon: Gauge,
      description: `${clubQuotaStats?.used ?? 0} / ${clubQuotaStats?.total ?? 0} Min`,
      progress: Math.min(100, clubQuotaStats?.percentage ?? 0),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          Willkommen im <BrandName inline /> Admin Panel
        </p>

        {/* Plattform-KPIs */}
        <section className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <h2 className="font-display text-base font-bold tracking-tight text-foreground">
              Plattform
            </h2>
            <div className="flex gap-[3px] rounded-[11px] border border-[hsl(0_0%_14%)] bg-white/[0.04] p-[3px]">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    range === option.key
                      ? "bg-primary text-[#0A0A0A]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(224px,100%),1fr))] gap-4">
            {kpiCards.map((card) => (
              <Card key={card.title} className="rounded-2xl border-border bg-gradient-card p-5">
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-primary/30 bg-primary/10 text-primary">
                      <card.icon className="h-[18px] w-[18px]" />
                    </span>
                    {card.trend !== null && (
                      <span
                        title="vs. Vorperiode"
                        className={`inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] ${
                          card.trend > 0
                            ? "text-primary"
                            : card.trend < 0
                              ? "text-[#FF6B6B]"
                              : "text-muted-foreground"
                        }`}
                      >
                        {card.trend > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : card.trend < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {card.trend > 0 ? "+" : ""}
                        {card.trend.toLocaleString("de-DE")} %
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-[5px]">
                    <span className="font-mono text-3xl font-bold leading-none text-foreground">
                      {card.value}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{card.title}</span>
                    <span className="text-[11.5px] text-[hsl(0_0%_65%)]">{card.description}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Club-KPIs */}
        <section className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="font-display text-base font-bold tracking-tight text-foreground">
              Clubs
            </h2>
            <span className="text-xs text-muted-foreground">Buchungen &amp; Kontingente</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            {clubKpiCards.map((card) => (
              <Card key={card.title} className="rounded-2xl border-border bg-gradient-card p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[hsl(0_0%_72%)]">
                      {card.title}
                    </span>
                    <card.icon className="h-[15px] w-[15px] flex-none text-muted-foreground" />
                  </div>
                  <span className="font-mono text-[27px] font-bold leading-none text-foreground">
                    {card.value}
                  </span>
                  {card.progress !== undefined ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(0_0%_13%)]">
                        <div
                          className="h-full rounded-full bg-gradient-lime"
                          style={{ width: `${card.progress}%` }}
                        />
                      </div>
                      <span className="text-[11.5px] text-[hsl(0_0%_65%)]">{card.description}</span>
                    </div>
                  ) : (
                    <span className="text-[11.5px] text-[hsl(0_0%_65%)]">{card.description}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Letzte Buchungen + Standorte */}
        <section className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Letzte Buchungen */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-3.5">
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                    Letzte Buchungen
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {recentBookings?.length ?? 0} Buchungen
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Select
                    value={selectedCourtId || "all"}
                    onValueChange={(value) => setSelectedCourtId(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="h-9 w-[200px] max-w-full rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13px] font-semibold text-foreground">
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                        <SelectValue placeholder="Court wählen" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Courts</SelectItem>
                      {Object.entries(courtsByLocation).map(([locationName, courts]) => (
                        <SelectGroup key={locationName}>
                          <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                            {locationName}
                          </SelectLabel>
                          {(courts as any[]).map((court) => (
                            <SelectItem key={court.id} value={court.id}>
                              {court.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <Link
                    to="/admin/bookings"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    Alle <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {recentBookings && recentBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className="h-auto px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                          Spieler
                        </TableHead>
                        <TableHead className="h-auto px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                          Datum / Uhrzeit
                        </TableHead>
                        {!selectedCourtId && (
                          <TableHead className="h-auto px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                            Court
                          </TableHead>
                        )}
                        <TableHead className="h-auto px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                          Betrag
                        </TableHead>
                        <TableHead className="h-auto px-0 pb-3 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentBookings.map((booking: any) => {
                        const playerName =
                          booking.profiles?.display_name ||
                          booking.profiles?.username ||
                          booking.guest_name ||
                          null;
                        const playerTag = !booking.user_id
                          ? "Gast"
                          : booking.booking_origin === "club"
                            ? "Club"
                            : null;
                        return (
                          <TableRow
                            key={booking.id}
                            className="border-t border-[hsl(0_0%_12%)] hover:bg-white/[0.02]"
                          >
                            <TableCell className="px-0 py-[13px] pr-3.5">
                              {playerName ? (
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-display text-[11px] font-extrabold text-primary">
                                    {initialsOf(playerName)}
                                  </span>
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <span className="whitespace-nowrap text-[13.5px] font-semibold text-foreground">
                                      {playerName}
                                    </span>
                                    {playerTag && (
                                      <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                                        {playerTag}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[13px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-0 py-[13px] pr-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="whitespace-nowrap text-[13.5px] font-semibold text-foreground">
                                  {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                                </span>
                                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                  {format(new Date(booking.start_time), "HH:mm", { locale: de })} - {format(new Date(booking.end_time), "HH:mm", { locale: de })}
                                </span>
                              </div>
                            </TableCell>
                            {!selectedCourtId && (
                              <TableCell className="px-0 py-[13px] pr-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="whitespace-nowrap text-[13.5px] font-semibold text-foreground">
                                    {booking.courts?.name}
                                  </span>
                                  <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
                                    {booking.locations?.name}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="px-0 py-[13px] pr-3.5">
                              {booking.price_cents != null ? (
                                <span className="whitespace-nowrap font-mono text-[13px] text-foreground">
                                  {formatCents(booking.price_cents)}
                                </span>
                              ) : (
                                <span className="text-[13px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-0 py-[13px]">
                              <span
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                                  STATUS_PILL[booking.status] ??
                                  "border-[hsl(0_0%_16%)] bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <span className="h-[5px] w-[5px] rounded-full bg-current" />
                                {booking.status === "confirmed" && "Bestätigt"}
                                {booking.status === "cancelled" && "Storniert"}
                                {booking.status === "pending" && "Ausstehend"}
                                {booking.status === "pending_payment" && "Zahlung offen"}
                                {booking.status === "expired" && "Abgelaufen"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedCourtId ? "Keine Buchungen für diesen Court" : "Keine Buchungen vorhanden"}
                </p>
              )}
            </div>
          </Card>

          {/* Standorte */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                  Standorte
                </h2>
                <Link
                  to="/admin/courts"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Verwalten <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <LocationsOverview />
            </div>
          </Card>
        </section>
      </div>
    </AdminLayout>
  );
}

function LocationsOverview() {
  const { data: locations } = useQuery({
    queryKey: ["admin-locations-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("locations")
        .select(`
          id,
          name,
          slug,
          address,
          courts (id, name, is_active)
        `);
      return data || [];
    },
  });

  if (!locations || locations.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Standorte konfiguriert</p>;
  }

  const totalActiveCourts = locations.reduce(
    (sum: number, location: any) =>
      sum + (location.courts?.filter((c: any) => c.is_active).length || 0),
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-[9px]">
        {locations.map((location: any) => {
          const activeCourts = location.courts?.filter((c: any) => c.is_active).length || 0;
          return (
            <div
              key={location.id}
              className="flex items-center gap-3 rounded-[14px] border border-[hsl(0_0%_13%)] bg-white/[0.028] px-3.5 py-[13px] transition-colors hover:border-primary/[0.35]"
            >
              <span
                className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-[hsl(0_0%_15%)] bg-white/5 ${
                  activeCourts > 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <MapPin className="h-[15px] w-[15px]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold text-foreground">
                  {location.name}
                </span>
                <span className="truncate text-[11.5px] text-muted-foreground">
                  {location.address}
                </span>
              </div>
              <div className="flex flex-none flex-col items-end gap-0.5">
                <span
                  className={`font-mono text-[15px] font-bold ${
                    activeCourts > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {activeCourts}
                </span>
                <span className="whitespace-nowrap text-[10.5px] text-[hsl(0_0%_58%)]">Courts</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(0_0%_13%)] pt-3.5">
        <span className="text-xs text-muted-foreground">
          {locations.length} Standorte · {totalActiveCourts} Courts aktiv
        </span>
        <Button asChild variant="outline" size="sm" className="rounded-[10px]">
          <Link to="/admin/courts">Neuer Standort</Link>
        </Button>
      </div>
    </div>
  );
}

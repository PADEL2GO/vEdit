import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, Users, Euro, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";
import { format, subDays, differenceInHours, startOfDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Location } from "./types";
import { cn } from "@/lib/utils";

interface LocationAnalyticsTabProps {
  locations: Location[];
}

type TimeRange = "7" | "30" | "90" | "all";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_cents: number | null;
  court_id: string;
  location_id: string;
  created_at: string;
  courts: { name: string } | null;
}

export function LocationAnalyticsTab({ locations }: LocationAnalyticsTabProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("7");

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // Fetch bookings for analytics
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-location-analytics", selectedLocationId, timeRange],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          price_cents,
          court_id,
          location_id,
          created_at,
          courts(name)
        `)
        .order("start_time", { ascending: false });

      if (selectedLocationId !== "all") {
        query = query.eq("location_id", selectedLocationId);
      }

      if (timeRange !== "all") {
        const daysAgo = parseInt(timeRange);
        query = query.gte("start_time", subDays(new Date(), daysAgo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Booking[];
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!bookings) return null;

    const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const last7Days = confirmed.filter((b) => new Date(b.start_time) >= subDays(new Date(), 7));
    const last3Days = confirmed.filter((b) => new Date(b.start_time) >= subDays(new Date(), 3));

    const totalRevenue = confirmed.reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100;
    const revenue7Days = last7Days.reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100;

    const cancellationRate = bookings.length > 0 
      ? (cancelled.length / bookings.length) * 100 
      : 0;

    // Calculate total booked hours
    const totalBookedHours = confirmed.reduce((sum, b) => {
      return sum + differenceInHours(new Date(b.end_time), new Date(b.start_time));
    }, 0);

    // Calculate utilization (simplified: based on 12 hours/day per court)
    const relevantLocations = selectedLocationId === "all" ? locations : [selectedLocation].filter(Boolean);
    const totalCourts = relevantLocations.reduce((sum, l) => sum + (l?.courts?.length || 0), 0);
    const daysInRange = timeRange === "all" ? 90 : parseInt(timeRange);
    const availableHours = totalCourts * 12 * daysInRange; // 12 hours per day per court
    const utilization = availableHours > 0 ? (totalBookedHours / availableHours) * 100 : 0;

    return {
      totalBookings: confirmed.length,
      bookings7Days: last7Days.length,
      bookings3Days: last3Days.length,
      totalRevenue,
      revenue7Days,
      cancellationRate,
      utilization: Math.min(utilization, 100),
      totalBookedHours,
    };
  }, [bookings, locations, selectedLocationId, selectedLocation, timeRange]);

  // Chart data: Bookings per day
  const bookingsPerDay = useMemo(() => {
    if (!bookings) return [];

    const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
    const daysToShow = Math.min(parseInt(timeRange === "all" ? "30" : timeRange), 30);
    const days: { date: string; count: number; revenue: number }[] = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, "yyyy-MM-dd");
      const dayBookings = confirmed.filter(
        (b) => format(new Date(b.start_time), "yyyy-MM-dd") === dateStr
      );
      days.push({
        date: format(date, "dd.MM", { locale: de }),
        count: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100,
      });
    }

    return days;
  }, [bookings, timeRange]);

  // Chart data: Bookings per court
  const bookingsPerCourt = useMemo(() => {
    if (!bookings) return [];

    const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
    const courtMap = new Map<string, { name: string; count: number }>();

    confirmed.forEach((b) => {
      const courtName = b.courts?.name || "Unbekannt";
      const existing = courtMap.get(b.court_id);
      if (existing) {
        existing.count++;
      } else {
        courtMap.set(b.court_id, { name: courtName, count: 1 });
      }
    });

    return Array.from(courtMap.values()).sort((a, b) => b.count - a.count);
  }, [bookings]);

  // Chart data: Status distribution
  const statusDistribution = useMemo(() => {
    if (!bookings) return [];

    const statusMap = new Map<string, number>();
    bookings.forEach((b) => {
      statusMap.set(b.status, (statusMap.get(b.status) || 0) + 1);
    });

    const colors: Record<string, string> = {
      confirmed: "hsl(var(--primary))",
      completed: "hsl(142, 76%, 36%)",
      cancelled: "hsl(var(--destructive))",
      pending: "hsl(var(--muted-foreground))",
      pending_payment: "hsl(45, 93%, 47%)",
    };

    const labels: Record<string, string> = {
      confirmed: "Bestätigt",
      completed: "Abgeschlossen",
      cancelled: "Storniert",
      pending: "Ausstehend",
      pending_payment: "Zahlung ausstehend",
    };

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      name: labels[status] || status,
      value: count,
      color: colors[status] || "hsl(var(--muted))",
    }));
  }, [bookings]);

  // Recent bookings
  const recentBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.slice(0, 10);
  }, [bookings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      confirmed: { className: "bg-primary/20 text-primary", label: "Bestätigt" },
      completed: { className: "bg-green-500/20 text-green-500", label: "Abgeschlossen" },
      cancelled: { className: "bg-destructive/20 text-destructive", label: "Storniert" },
      pending: { className: "bg-muted text-muted-foreground", label: "Ausstehend" },
      pending_payment: { className: "bg-yellow-500/20 text-yellow-500", label: "Zahlung" },
    };
    const v = variants[status] || { className: "bg-muted", label: status };
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">Standort</label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Standort wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Standorte</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Zeitraum</label>
              <div className="flex gap-2">
                {(["7", "30", "90", "all"] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="min-w-[60px]"
                  >
                    {range === "all" ? "Alle" : `${range}T`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <KpiCard
            icon={Calendar}
            label="Buchungen gesamt"
            value={kpis.totalBookings}
            color="text-primary"
          />
          <KpiCard
            icon={TrendingUp}
            label="Letzte 7 Tage"
            value={kpis.bookings7Days}
            color="text-blue-500"
          />
          <KpiCard
            icon={Clock}
            label="Letzte 3 Tage"
            value={kpis.bookings3Days}
            color="text-cyan-500"
          />
          <KpiCard
            icon={Euro}
            label="Umsatz gesamt"
            value={formatCurrency(kpis.totalRevenue)}
            color="text-green-500"
          />
          <KpiCard
            icon={Users}
            label="Auslastung"
            value={`${kpis.utilization.toFixed(1)}%`}
            color="text-orange-500"
          />
          <KpiCard
            icon={XCircle}
            label="Storno-Rate"
            value={`${kpis.cancellationRate.toFixed(1)}%`}
            color="text-destructive"
          />
        </div>
      ) : null}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings per Day */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Buchungen pro Tag</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bookingsPerDay}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Umsatz-Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bookingsPerDay}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [formatCurrency(value), "Umsatz"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings per Court */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Buchungen pro Court</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : bookingsPerCourt.length > 0 ? (
              <div className="space-y-3">
                {bookingsPerCourt.slice(0, 6).map((court, index) => {
                  const maxCount = bookingsPerCourt[0]?.count || 1;
                  const percentage = (court.count / maxCount) * 100;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{court.name}</span>
                        <span className="text-muted-foreground">{court.count}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Keine Daten vorhanden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Status-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : statusDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {statusDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-foreground">{entry.name}</span>
                      </div>
                      <span className="text-muted-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Keine Daten vorhanden
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Letzte Buchungen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Court</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.courts?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.start_time), "HH:mm")} -{" "}
                        {format(new Date(booking.end_time), "HH:mm")}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-right">
                        {booking.price_cents
                          ? formatCurrency(booking.price_cents / 100)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Keine Buchungen vorhanden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simple KPI Card component
function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-secondary/50", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-semibold text-foreground truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

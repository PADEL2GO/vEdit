import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandName from "@/components/BrandName";
import { Calendar, Users, MapPin, TrendingUp, Clock, Activity, Building2, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
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

export default function AdminOverview() {
  const today = new Date();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

  // Fetch today's bookings count
  const { data: todayBookings } = useQuery({
    queryKey: ["admin-bookings-today"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", startOfDay(today).toISOString())
        .lte("start_time", endOfDay(today).toISOString())
        .eq("status", "confirmed");
      return count || 0;
    },
  });

  // Fetch this week's bookings count
  const { data: weekBookings } = useQuery({
    queryKey: ["admin-bookings-week"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", startOfWeek(today, { locale: de }).toISOString())
        .lte("start_time", endOfWeek(today, { locale: de }).toISOString())
        .eq("status", "confirmed");
      return count || 0;
    },
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

  // Fetch recent bookings with optional court filter
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
          courts (id, name),
          locations (name)
        `)
        .order("created_at", { ascending: false });

      if (selectedCourtId) {
        query = query.eq("court_id", selectedCourtId);
      }

      const { data } = await query.limit(selectedCourtId ? 10 : 5);
      return data || [];
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

  const kpiCards = [
    {
      title: "Buchungen heute",
      value: todayBookings ?? 0,
      icon: Calendar,
      description: format(today, "EEEE, d. MMMM", { locale: de }),
    },
    {
      title: "Buchungen diese Woche",
      value: weekBookings ?? 0,
      icon: TrendingUp,
      description: "Gesamt für aktuelle Woche",
    },
    {
      title: "Registrierte Benutzer",
      value: totalUsers ?? 0,
      icon: Users,
      description: "Gesamt Spieler",
    },
    {
      title: "Aktive Courts",
      value: totalCourts ?? 0,
      icon: MapPin,
      description: `an ${totalLocations ?? 0} Standorten`,
    },
  ];

  const clubKpiCards = [
    {
      title: "Club-Buchungen heute",
      value: clubBookingsToday ?? 0,
      icon: Building2,
      description: "Über Club-Kontingente",
    },
    {
      title: "Club-Buchungen Woche",
      value: clubBookingsWeek ?? 0,
      icon: Building2,
      description: "Aktuelle Woche",
    },
    {
      title: "Kontingent-Nutzung",
      value: `${clubQuotaStats?.percentage ?? 0}%`,
      icon: Percent,
      description: `${clubQuotaStats?.used ?? 0} / ${clubQuotaStats?.total ?? 0} Min`,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Willkommen im <BrandName inline /> Admin Panel
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <Card key={card.title} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Club KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {clubKpiCards.map((card) => (
            <Card key={card.title} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-accent-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Letzte Buchungen
              </CardTitle>
              <Select
                value={selectedCourtId || "all"}
                onValueChange={(value) => setSelectedCourtId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Court wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Courts</SelectItem>
                  {Object.entries(courtsByLocation).map(([locationName, courts]) => (
                    <SelectGroup key={locationName}>
                      <SelectLabel className="text-xs text-muted-foreground">
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
            </CardHeader>
            <CardContent>
              {recentBookings && recentBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum / Uhrzeit</TableHead>
                      {!selectedCourtId && <TableHead>Court</TableHead>}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(booking.start_time), "HH:mm", { locale: de })} - {format(new Date(booking.end_time), "HH:mm", { locale: de })}
                            </p>
                          </div>
                        </TableCell>
                        {!selectedCourtId && (
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {booking.courts?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {booking.locations?.name}
                              </p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              booking.status === "confirmed"
                                ? "bg-primary/20 text-primary"
                                : booking.status === "cancelled"
                                ? "bg-destructive/20 text-destructive"
                                : booking.status === "pending_payment"
                                ? "bg-amber-500/20 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {booking.status === "confirmed" && "Bestätigt"}
                            {booking.status === "cancelled" && "Storniert"}
                            {booking.status === "pending" && "Ausstehend"}
                            {booking.status === "pending_payment" && "Zahlung offen"}
                            {booking.status === "expired" && "Abgelaufen"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {selectedCourtId ? "Keine Buchungen für diesen Court" : "Keine Buchungen vorhanden"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Standorte Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocationsOverview />
            </CardContent>
          </Card>
        </div>
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
    return <p className="text-muted-foreground text-sm">Keine Standorte konfiguriert</p>;
  }

  return (
    <div className="space-y-4">
      {locations.map((location: any) => (
        <div
          key={location.id}
          className="flex items-center justify-between py-2 border-b border-border last:border-0"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{location.name}</p>
            <p className="text-xs text-muted-foreground">{location.address}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-primary">
              {location.courts?.filter((c: any) => c.is_active).length || 0} Courts
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

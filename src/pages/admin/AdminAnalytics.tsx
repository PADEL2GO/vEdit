import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

const COLORS = ["hsl(71, 91%, 51%)", "hsl(0, 0%, 40%)", "hsl(0, 84%, 60%)"];

export default function AdminAnalytics() {
  // Bookings per day for last 7 days
  const { data: bookingsPerDay } = useQuery({
    queryKey: ["admin-analytics-bookings-per-day"],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .gte("start_time", startOfDay(date).toISOString())
          .lte("start_time", endOfDay(date).toISOString());
        days.push({
          date: format(date, "EEE", { locale: de }),
          fullDate: format(date, "dd.MM"),
          bookings: count || 0,
        });
      }
      return days;
    },
  });

  // Bookings by status
  const { data: bookingsByStatus } = useQuery({
    queryKey: ["admin-analytics-bookings-by-status"],
    queryFn: async () => {
      const statuses = ["confirmed", "pending", "cancelled"] as const;
      const result = [];
      for (const status of statuses) {
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        result.push({
          name: status === "confirmed" ? "Bestätigt" : status === "pending" ? "Ausstehend" : "Storniert",
          value: count || 0,
        });
      }
      return result;
    },
  });

  // Bookings by location
  const { data: bookingsByLocation } = useQuery({
    queryKey: ["admin-analytics-bookings-by-location"],
    queryFn: async () => {
      const { data: locations } = await supabase.from("locations").select("id, name");
      const result = [];
      for (const location of locations || []) {
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("location_id", location.id)
          .eq("status", "confirmed");
        result.push({
          name: location.name.replace("PADEL2GO ", ""),
          bookings: count || 0,
        });
      }
      return result;
    },
  });

  // User registrations per week
  const { data: userGrowth } = useQuery({
    queryKey: ["admin-analytics-user-growth"],
    queryFn: async () => {
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const startDate = subDays(new Date(), i * 7 + 7);
        const endDate = subDays(new Date(), i * 7);
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        weeks.push({
          week: `KW ${format(endDate, "w")}`,
          users: count || 0,
        });
      }
      return weeks;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Statistiken und Auswertungen</p>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bookings per Day */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                Buchungen (letzte 7 Tage)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsPerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 15%)" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(0, 0%, 65%)"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 5%)",
                        border: "1px solid hsl(0, 0%, 15%)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                    />
                    <Bar dataKey="bookings" fill="hsl(71, 91%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bookings by Status */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Buchungen nach Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingsByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {bookingsByStatus?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 5%)",
                        border: "1px solid hsl(0, 0%, 15%)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bookings by Location */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Buchungen pro Standort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsByLocation || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 15%)" />
                    <XAxis type="number" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(0, 0%, 65%)"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 5%)",
                        border: "1px solid hsl(0, 0%, 15%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="bookings" fill="hsl(71, 91%, 51%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Growth */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Neue Benutzer pro Woche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 15%)" />
                    <XAxis dataKey="week" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 5%)",
                        border: "1px solid hsl(0, 0%, 15%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(71, 91%, 51%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(71, 91%, 51%)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

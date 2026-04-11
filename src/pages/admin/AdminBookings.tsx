import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Search,
  Filter,
  XCircle,
  Trash2,
  AlertTriangle,
  Building2,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
} from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { BookingWeekCalendar, BookingDetailDrawer, type Booking } from "@/components/admin/bookings";

export default function AdminBookings() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("confirmed");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [onlyClubBookings, setOnlyClubBookings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [onlyExpiredAndCancelled, setOnlyExpiredAndCancelled] = useState(true);
  const queryClient = useQueryClient();

  // Get week boundaries (Monday to Friday for work week)
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5); // Mon-Fri

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ["admin-locations-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch clubs for filter
  const { data: clubs } = useQuery({
    queryKey: ["admin-clubs-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bookings for the selected week
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-week-bookings", weekStart.toISOString(), selectedLocationId, statusFilter, clubFilter, onlyClubBookings],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          user_id,
          created_at,
          booking_origin,
          club_id,
          club_booked_by_user_id,
          booked_for_member_name,
          allocation_minutes,
          is_free_allocation,
          courts (id, name),
          locations (id, name),
          club:clubs (id, name)
        `)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true });

      if (selectedLocationId !== "all") {
        query = query.eq("location_id", selectedLocationId);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "confirmed" | "pending" | "cancelled");
      }

      if (onlyClubBookings) {
        query = query.eq("booking_origin", "club");
      }

      if (clubFilter !== "all") {
        query = query.eq("club_id", clubFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for each booking (user who owns it)
      const userIds = [...new Set((data || []).map((b) => b.user_id))];
      const clubBookedByIds = [...new Set((data || []).filter(b => b.club_booked_by_user_id).map((b) => b.club_booked_by_user_id!))];
      const allUserIds = [...new Set([...userIds, ...clubBookedByIds])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", allUserIds);

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return (data || []).map((booking) => ({
        ...booking,
        profiles: profilesMap.get(booking.user_id) || null,
        club_booked_by: booking.club_booked_by_user_id 
          ? profilesMap.get(booking.club_booked_by_user_id) || null 
          : null,
      })) as Booking[];
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buchung storniert");
      queryClient.invalidateQueries({ queryKey: ["admin-week-bookings"] });
      setCancelBookingId(null);
      setSelectedBooking(null);
    },
    onError: () => {
      toast.error("Fehler beim Stornieren");
    },
  });

  // Reset all bookings mutation
  const resetBookingsMutation = useMutation({
    mutationFn: async (onlyExpiredCancelled: boolean) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "reset_all_bookings", onlyExpiredAndCancelled: onlyExpiredCancelled },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Buchungen wurden zurückgesetzt");
      queryClient.invalidateQueries({ queryKey: ["admin-week-bookings"] });
      setShowResetDialog(false);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Filter bookings for list view
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!searchQuery) return bookings;
    
    const searchLower = searchQuery.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.courts?.name?.toLowerCase().includes(searchLower) ||
        booking.locations?.name?.toLowerCase().includes(searchLower) ||
        booking.profiles?.display_name?.toLowerCase().includes(searchLower) ||
        booking.profiles?.username?.toLowerCase().includes(searchLower) ||
        booking.club?.name?.toLowerCase().includes(searchLower) ||
        booking.booked_for_member_name?.toLowerCase().includes(searchLower) ||
        booking.club_booked_by?.display_name?.toLowerCase().includes(searchLower)
    );
  }, [bookings, searchQuery]);

  // Count club bookings
  const clubBookingsCount = useMemo(() => {
    return bookings?.filter(b => b.booking_origin === "club").length || 0;
  }, [bookings]);

  const handlePrevWeek = () => setSelectedWeek((w) => subWeeks(w, 1));
  const handleNextWeek = () => setSelectedWeek((w) => addWeeks(w, 1));
  const handleThisWeek = () => setSelectedWeek(new Date());

  const getStatusBadge = (status: string) => {
    const styles = {
      confirmed: "bg-primary/20 text-primary",
      cancelled: "bg-destructive/20 text-destructive",
      pending: "bg-yellow-500/20 text-yellow-500",
    };
    return styles[status as keyof typeof styles] || "bg-muted text-muted-foreground";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buchungen</h1>
            <p className="text-muted-foreground">
              {bookings?.length || 0} Buchungen in dieser Woche
              {clubBookingsCount > 0 && (
                <span className="ml-2">
                  (<span className="text-primary">{clubBookingsCount} Club-Buchungen</span>)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Buchungen Reset
            </Button>
            <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Kalender
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Liste
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Week Navigation */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevWeek}
                    className="border-border"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-4 py-2 bg-secondary rounded-lg min-w-[200px] text-center">
                    <span className="text-sm font-medium text-foreground">
                      {format(weekStart, "dd. MMM", { locale: de })} -{" "}
                      {format(weekEnd, "dd. MMM yyyy", { locale: de })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextWeek}
                    className="border-border"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleThisWeek}
                    className="border-border"
                  >
                    Diese Woche
                  </Button>
                </div>

                {/* Standard Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background border-border">
                      <SelectValue placeholder="Standort wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Standorte</SelectItem>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] bg-background border-border">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="confirmed">Bestätigt</SelectItem>
                      <SelectItem value="pending">Ausstehend</SelectItem>
                      <SelectItem value="cancelled">Storniert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Club Filters */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="onlyClubBookings"
                    checked={onlyClubBookings}
                    onCheckedChange={(checked) => setOnlyClubBookings(checked === true)}
                  />
                  <Label htmlFor="onlyClubBookings" className="text-sm cursor-pointer flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    Nur Club-Buchungen
                  </Label>
                </div>

                <Select value={clubFilter} onValueChange={setClubFilter}>
                  <SelectTrigger className="w-[200px] bg-background border-border">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Club wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Clubs</SelectItem>
                    {clubs?.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {view === "calendar" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Wochenübersicht (Mo - Fr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Laden...
                </div>
              ) : (
                <BookingWeekCalendar
                  weekDays={weekDays}
                  bookings={filteredBookings}
                  onBookingClick={setSelectedBooking}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {view === "list" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">
                  Buchungsliste ({filteredBookings?.length || 0})
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Laden...</p>
              ) : filteredBookings && filteredBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Typ</TableHead>
                        <TableHead className="text-muted-foreground">Datum & Zeit</TableHead>
                        <TableHead className="text-muted-foreground">Standort</TableHead>
                        <TableHead className="text-muted-foreground">Court</TableHead>
                        <TableHead className="text-muted-foreground">Benutzer</TableHead>
                        <TableHead className="text-muted-foreground">Club</TableHead>
                        <TableHead className="text-muted-foreground">Gebucht von</TableHead>
                        <TableHead className="text-muted-foreground">Für Mitglied</TableHead>
                        <TableHead className="text-muted-foreground">Kontingent</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id} className="border-border">
                          {/* Booking Type */}
                          <TableCell>
                            {booking.booking_origin === "club" ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                <Building2 className="h-3 w-3 mr-1" />
                                Club
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          {/* Date & Time */}
                          <TableCell className="text-foreground">
                            <div>
                              <p className="font-medium">
                                {format(new Date(booking.start_time), "dd.MM.yyyy", { locale: de })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.start_time), "HH:mm")} -{" "}
                                {format(new Date(booking.end_time), "HH:mm")}
                              </p>
                            </div>
                          </TableCell>
                          {/* Location */}
                          <TableCell className="text-foreground">
                            {booking.locations?.name}
                          </TableCell>
                          {/* Court */}
                          <TableCell className="text-foreground">
                            {booking.courts?.name}
                          </TableCell>
                          {/* User (Owner) */}
                          <TableCell className="text-foreground">
                            {booking.profiles?.display_name || booking.profiles?.username || "-"}
                          </TableCell>
                          {/* Club Name */}
                          <TableCell>
                            {booking.club?.name ? (
                              <span className="text-primary font-medium">{booking.club.name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {/* Booked By (Club User) */}
                          <TableCell>
                            {booking.club_booked_by?.display_name || booking.club_booked_by?.username || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {/* For Member */}
                          <TableCell>
                            {booking.booked_for_member_name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {/* Quota */}
                          <TableCell>
                            {booking.allocation_minutes ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{booking.allocation_minutes} Min</span>
                                {booking.is_free_allocation && (
                                  <Badge variant="outline" className="text-xs ml-1 bg-green-500/10 text-green-600 border-green-500/30">
                                    Frei
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {/* Status */}
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(
                                booking.status
                              )}`}
                            >
                              {booking.status === "confirmed"
                                ? "Bestätigt"
                                : booking.status === "cancelled"
                                ? "Storniert"
                                : "Ausstehend"}
                            </span>
                          </TableCell>
                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                Details
                              </Button>
                              {booking.status === "confirmed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setCancelBookingId(booking.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine Buchungen in dieser Woche gefunden
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onCancel={(id) => setCancelBookingId(id)}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Buchung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Buchung wird als storniert
              markiert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelBookingId && cancelMutation.mutate(cancelBookingId)}
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Bookings Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Buchungen löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-destructive font-medium">
                ⚠️ ACHTUNG: Diese Aktion ist UNWIDERRUFLICH!
              </p>
              <p>
                Es werden alle zugehörigen Daten gelöscht:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Alle Buchungen</li>
                <li>Alle Teilnehmer-Einladungen</li>
                <li>Alle Spieler-Zuordnungen</li>
                <li>Alle Zahlungsdaten</li>
              </ul>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="onlyExpiredCancelled"
                  checked={onlyExpiredAndCancelled}
                  onCheckedChange={(checked) => setOnlyExpiredAndCancelled(checked === true)}
                />
                <Label htmlFor="onlyExpiredCancelled" className="text-sm text-foreground cursor-pointer">
                  Nur abgelaufene/stornierte Buchungen löschen
                </Label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => resetBookingsMutation.mutate(onlyExpiredAndCancelled)}
              disabled={resetBookingsMutation.isPending}
            >
              {resetBookingsMutation.isPending ? "Lösche..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

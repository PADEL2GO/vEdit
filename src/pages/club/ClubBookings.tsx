import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useClubQuota } from "@/hooks/useClubQuota";
import { useAuth } from "@/hooks/useAuth";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes, addDays, startOfDay, isSameDay, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { Clock, Users, MapPin, AlertCircle, CheckCircle, Trash2, Building2, CalendarDays, User } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SLOT_DURATIONS = [
  { value: 60, label: "1 Stunde" },
  { value: 90, label: "1,5 Stunden" },
  { value: 120, label: "2 Stunden" },
];

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; // Start at 7:00
  const minutes = (i % 2) * 30;
  return {
    value: `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    label: `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
  };
});

export default function ClubBookings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { club, clubId, courtName, locationName, primaryAssignment, isManager } = useClubAuth();
  const { summary, remainingFormatted, allowanceFormatted, hasQuotaAvailable, refetch: refetchQuota } = useClubQuota(
    clubId,
    primaryAssignment?.court_id ?? null,
    primaryAssignment?.monthly_free_minutes ?? 2400,
    user?.id // Legacy fallback
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [memberName, setMemberName] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"new" | "club" | "all">("new");

  // Fetch existing bookings for the selected date (for availability check)
  const { data: existingBookings } = useQuery({
    queryKey: ["club-court-bookings", primaryAssignment?.court_id, selectedDate],
    queryFn: async () => {
      if (!primaryAssignment?.court_id || !selectedDate) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", primaryAssignment.court_id)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .neq("status", "cancelled")
        .neq("status", "expired");

      if (error) throw error;
      return data;
    },
    enabled: !!primaryAssignment?.court_id && !!selectedDate,
  });

  // Fetch club bookings (all bookings from club members)
  const { data: clubBookings, refetch: refetchClubBookings } = useQuery({
    queryKey: ["all-club-bookings", clubId, primaryAssignment?.court_id],
    queryFn: async () => {
      if (!primaryAssignment?.court_id) return [];

      // Build query based on whether we have clubId
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("court_id", primaryAssignment.court_id)
        .eq("booking_origin", "club")
        .neq("status", "cancelled")
        .neq("status", "expired")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(50);

      if (clubId) {
        query = query.eq("club_id", clubId);
      } else if (user?.id) {
        // Legacy fallback
        query = query.eq("club_owner_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!primaryAssignment?.court_id && (!!clubId || !!user?.id),
  });

  // Fetch ALL court bookings (club + player bookings)
  const { data: allCourtBookings } = useQuery({
    queryKey: ["all-court-bookings-overview", primaryAssignment?.court_id],
    queryFn: async () => {
      if (!primaryAssignment?.court_id) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", primaryAssignment.court_id)
        .neq("status", "cancelled")
        .neq("status", "expired")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!primaryAssignment?.court_id,
  });

  // Check if selected time slot is available
  const isSlotAvailable = (timeStr: string): boolean => {
    if (!selectedDate || !existingBookings) return true;
    
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = addMinutes(slotStart, duration);

    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  // Check if booking can be made
  const canBook = selectedDate && 
    selectedTime && 
    isSlotAvailable(selectedTime) && 
    hasQuotaAvailable && 
    summary.remainingMinutes >= duration &&
    !isPast(new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`));

  // Create booking mutation (using Edge Function)
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !primaryAssignment?.court_id || !selectedDate || !selectedTime) {
        throw new Error("Fehlende Daten");
      }

      if (!hasQuotaAvailable || summary.remainingMinutes < duration) {
        throw new Error("Nicht genügend Kontingent verfügbar");
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, duration);

      // Use edge function for booking
      const { data, error } = await invokeEdgeFunction<{ success: boolean; booking: any; remainingQuota: number; error?: string }>("club-booking-api", {
        body: {
          action: "create",
          courtId: primaryAssignment.court_id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: duration,
          memberName: memberName || null,
          notes: notes || null,
        },
      });

      if (error) throw new Error(String(error));
      if (data?.error) throw new Error(String(data.error));
      
      return data;
    },
    onSuccess: () => {
      toast.success("Buchung erfolgreich erstellt");
      setSelectedTime("");
      setMemberName("");
      setNotes("");
      refetchQuota();
      refetchClubBookings();
      queryClient.invalidateQueries({ queryKey: ["club-court-bookings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Erstellen der Buchung");
    },
  });

  // Cancel booking mutation (using Edge Function)
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await invokeEdgeFunction<{ success: boolean; refundedMinutes?: number; error?: string }>("club-booking-api", {
        body: { 
          action: "cancel",
          bookingId 
        },
      });
      
      if (error) throw new Error(String(error));
      if (data?.error) throw new Error(String(data.error));
      return data;
    },
    onSuccess: (data) => {
      toast.success("Buchung storniert", {
        description: data?.refundedMinutes ? `${data.refundedMinutes} Minuten zurückgebucht` : undefined,
      });
      refetchQuota();
      refetchClubBookings();
      queryClient.invalidateQueries({ queryKey: ["club-court-bookings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Stornieren");
    },
  });

  // Check if user can cancel a specific booking
  const canCancelBooking = (booking: any): boolean => {
    if (!user?.id) return false;
    // Manager can cancel any club booking
    if (isManager) return true;
    // Staff can only cancel their own bookings
    return booking.club_booked_by_user_id === user.id || booking.user_id === user.id;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mitglieder buchen</h1>
        <p className="text-muted-foreground">
          {club 
            ? `Buchungen für ${club.name} erstellen`
            : "Erstellen Sie Buchungen für Ihre Vereinsmitglieder"}
        </p>
      </div>

      {/* Quota Banner */}
      <Card className={hasQuotaAvailable ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasQuotaAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${hasQuotaAvailable ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                  {hasQuotaAvailable ? (club ? "Club-Kontingent verfügbar" : "Kontingent verfügbar") : "Kontingent erschöpft"}
                </p>
                <p className={`text-sm ${hasQuotaAvailable ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                  {remainingFormatted} von {allowanceFormatted} diesen Monat
                </p>
              </div>
            </div>
            <Progress 
              value={100 - summary.percentUsed} 
              className="w-32 h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "club" | "all")}>
        <TabsList>
          <TabsTrigger value="new">Neue Buchung</TabsTrigger>
          <TabsTrigger value="club">
            {club ? "Club-Buchungen" : "Meine Buchungen"}
            {clubBookings && clubBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">{clubBookings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            Alle Platzbuchungen
            {allCourtBookings && allCourtBookings.length > 0 && (
              <Badge variant="outline" className="ml-2">{allCourtBookings.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Court Info & Calendar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {courtName}
                  </CardTitle>
                  <CardDescription>{locationName}</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Datum wählen</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={de}
                    disabled={(date) => date < startOfDay(new Date()) || date > addDays(startOfDay(new Date()), 14)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Booking Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Uhrzeit & Dauer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dauer</Label>
                    <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLOT_DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value.toString()}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Startzeit</Label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {TIME_SLOTS.map((slot) => {
                        const available = isSlotAvailable(slot.value);
                        return (
                          <Button
                            key={slot.value}
                            variant={selectedTime === slot.value ? "default" : "outline"}
                            size="sm"
                            disabled={!available}
                            onClick={() => setSelectedTime(slot.value)}
                            className={!available ? "opacity-50 line-through" : ""}
                          >
                            {slot.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Mitglied
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberName">Name des Mitglieds (optional)</Label>
                    <Input
                      id="memberName"
                      placeholder="z.B. Max Mustermann"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Zusätzliche Informationen..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary & Book Button */}
              {selectedDate && selectedTime && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTime} Uhr • {duration} Minuten
                        </p>
                        {memberName && (
                          <p className="text-sm text-muted-foreground">
                            Für: {memberName}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => createBookingMutation.mutate()}
                        disabled={!canBook || createBookingMutation.isPending}
                      >
                        {createBookingMutation.isPending ? "Wird gebucht..." : "Jetzt buchen"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="club" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {club ? `Buchungen von ${club.name}` : "Meine Club-Buchungen"}
              </CardTitle>
              <CardDescription>
                Kommende Buchungen mit eurem Club-Kontingent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clubBookings && clubBookings.length > 0 ? (
                <div className="space-y-3">
                  {clubBookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy", { locale: de })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")} Uhr
                          {booking.allocation_minutes && ` • ${booking.allocation_minutes} min`}
                        </p>
                        {booking.booked_for_member_name && (
                          <p className="text-sm text-muted-foreground">
                            Für: {booking.booked_for_member_name}
                          </p>
                        )}
                      </div>
                      {canCancelBooking(booking) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Buchung stornieren?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Die Buchung wird storniert und die {booking.allocation_minutes} Minuten 
                                werden eurem Kontingent zurückgebucht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelBookingMutation.mutate(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Stornieren
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine Club-Buchungen vorhanden
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Alle Platzbuchungen
              </CardTitle>
              <CardDescription>
                Alle kommenden Buchungen auf {courtName} – egal ob von Club oder Spielern
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allCourtBookings && allCourtBookings.length > 0 ? (
                <div className="space-y-3">
                  {allCourtBookings.map((booking) => {
                    const isClubBooking = booking.booking_origin === "club";
                    const profile = null as { username?: string; display_name?: string; avatar_url?: string } | null;
                    
                    return (
                      <div 
                        key={booking.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isClubBooking ? (
                              <Building2 className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy", { locale: de })}
                              </p>
                              <Badge 
                                variant={isClubBooking ? "default" : "secondary"}
                                className={isClubBooking ? "bg-primary/20 text-primary" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}
                              >
                                {isClubBooking ? "Club" : "Spieler"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")} Uhr
                              {booking.allocation_minutes && ` • ${booking.allocation_minutes} min`}
                            </p>
                            {isClubBooking && booking.booked_for_member_name && (
                              <p className="text-sm text-muted-foreground">
                                Für: {booking.booked_for_member_name}
                              </p>
                            )}
                            {!isClubBooking && profile && (
                              <p className="text-sm text-muted-foreground">
                                {profile.username ? `@${profile.username}` : ""} 
                                {profile.display_name && profile.username ? ` (${profile.display_name})` : profile.display_name || ""}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Only show cancel for club bookings that user can cancel */}
                        {isClubBooking && canCancelBooking(booking) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Buchung stornieren?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Die Buchung wird storniert und die {booking.allocation_minutes} Minuten 
                                  werden eurem Kontingent zurückgebucht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelBookingMutation.mutate(booking.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Stornieren
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine kommenden Buchungen auf diesem Platz
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useState } from "react";
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
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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
import { useClubCourt } from "@/components/club/ClubCourtContext";
import { TENNIS_DURATION_MINUTES } from "@/components/booking/types";
import { SLOT_DURATIONS } from "@/types/constants";
import { SPORT_CHIP_CLASSES } from "@/components/admin/courts/types";

const PADEL_SLOT_DURATIONS: readonly number[] = SLOT_DURATIONS;
/**
 * Tennis wird ausschliesslich in 60-Minuten-Bloecken gebucht (der Server lehnt
 * alles andere ab). Modulkonstante, damit die Referenz stabil bleibt.
 */
const TENNIS_SLOT_DURATIONS: readonly number[] = [TENNIS_DURATION_MINUTES];

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
  const { t, i18n } = useTranslation("club");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const { user } = useAuth();
  const { club, clubId, isManager } = useClubAuth();
  const { courtId, courtName, locationName, sport, monthlyFreeMinutes } = useClubCourt();
  const { summary, remainingFormatted, allowanceFormatted, hasQuotaAvailable, refetch: refetchQuota } = useClubQuota(
    clubId,
    courtId,
    monthlyFreeMinutes,
    user?.id // Legacy fallback
  );

  const isTennis = sport === "tennis";
  const slotDurations = isTennis ? TENNIS_SLOT_DURATIONS : PADEL_SLOT_DURATIONS;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [memberName, setMemberName] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"new" | "club" | "all">("new");

  // Court gewechselt: Slot-Auswahl verwerfen (andere Belegung) und eine für die
  // Sportart unzulässige Dauer auf den ersten erlaubten Wert zurücksetzen.
  useEffect(() => {
    setSelectedTime("");
    setDuration((current) => (slotDurations.includes(current) ? current : slotDurations[0]));
  }, [courtId, slotDurations]);

  // Fetch existing bookings for the selected date (for availability check)
  const { data: existingBookings } = useQuery({
    queryKey: ["club-court-bookings", courtId, selectedDate],
    queryFn: async () => {
      if (!courtId || !selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", courtId)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .neq("status", "cancelled")
        .neq("status", "expired");

      if (error) throw error;
      return data;
    },
    enabled: !!courtId && !!selectedDate,
  });

  // Fetch club bookings (all bookings from club members)
  const { data: clubBookings, refetch: refetchClubBookings } = useQuery({
    queryKey: ["all-club-bookings", clubId, courtId],
    queryFn: async () => {
      if (!courtId) return [];

      // Build query based on whether we have clubId
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("court_id", courtId)
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
    enabled: !!courtId && (!!clubId || !!user?.id),
  });

  // Fetch ALL court bookings (club + player bookings)
  const { data: allCourtBookings } = useQuery({
    queryKey: ["all-court-bookings-overview", courtId],
    queryFn: async () => {
      if (!courtId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", courtId)
        .neq("status", "cancelled")
        .neq("status", "expired")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!courtId,
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
      if (!user?.id || !courtId || !selectedDate || !selectedTime) {
        throw new Error(t("bookings.error.missingData"));
      }

      if (!hasQuotaAvailable || summary.remainingMinutes < duration) {
        throw new Error(t("bookings.error.notEnoughQuota"));
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, duration);

      // Use edge function for booking
      const { data, error } = await invokeEdgeFunction<{ success: boolean; booking: any; remainingQuota: number; error?: string }>("club-booking-api", {
        body: {
          action: "create",
          courtId,
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
      toast.success(t("bookings.toast.created"));
      setSelectedTime("");
      setMemberName("");
      setNotes("");
      refetchQuota();
      refetchClubBookings();
      queryClient.invalidateQueries({ queryKey: ["club-court-bookings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("bookings.toast.createError"));
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
      toast.success(t("bookings.toast.cancelled"), {
        description: data?.refundedMinutes ? t("bookings.toast.refunded", { minutes: data.refundedMinutes }) : undefined,
      });
      refetchQuota();
      refetchClubBookings();
      queryClient.invalidateQueries({ queryKey: ["club-court-bookings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("bookings.toast.cancelError"));
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
        <h1 className="text-2xl font-bold tracking-tight">{t("bookings.title")}</h1>
        <p className="text-muted-foreground">
          {club
            ? t("bookings.subtitleWithClub", { clubName: club.name })
            : t("bookings.subtitleWithoutClub")}
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
                  {hasQuotaAvailable ? (club ? t("bookings.quotaAvailableClub") : t("bookings.quotaAvailable")) : t("bookings.quotaExhausted")}
                </p>
                <p className={`text-sm ${hasQuotaAvailable ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                  {t("bookings.quotaOfThisMonth", { remaining: remainingFormatted, allowance: allowanceFormatted })}
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
          <TabsTrigger value="new">{t("bookings.tabNew")}</TabsTrigger>
          <TabsTrigger value="club">
            {club ? t("bookings.tabClub") : t("bookings.tabMine")}
            {clubBookings && clubBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">{clubBookings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            {t("bookings.tabAll")}
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
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {courtName}
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SPORT_CHIP_CLASSES[sport]}`}
                    >
                      {t(`common.sport.${sport}`)}
                    </span>
                  </CardTitle>
                  <CardDescription>{locationName}</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("bookings.selectDate")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={dateLocale}
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
                    {t("bookings.timeAndDuration")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("bookings.duration")}</Label>
                    <Select
                      value={duration.toString()}
                      onValueChange={(v) => setDuration(Number(v))}
                      disabled={slotDurations.length === 1}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {slotDurations.map((value) => (
                          <SelectItem key={value} value={value.toString()}>
                            {t(`bookings.durations.d${value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isTennis && (
                      <p className="text-xs text-muted-foreground">
                        {t("bookings.tennisDurationHint")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("bookings.startTime")}</Label>
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
                    {t("bookings.member")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberName">{t("bookings.memberNameLabel")}</Label>
                    <Input
                      id="memberName"
                      placeholder={t("bookings.memberNamePlaceholder")}
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("bookings.notesLabel")}</Label>
                    <Textarea
                      id="notes"
                      placeholder={t("bookings.notesPlaceholder")}
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
                          {format(selectedDate, t("bookings.dateFormat"), { locale: dateLocale })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("bookings.summaryTimeDuration", { time: selectedTime, duration })}
                        </p>
                        {memberName && (
                          <p className="text-sm text-muted-foreground">
                            {t("bookings.summaryFor", { name: memberName })}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => createBookingMutation.mutate()}
                        disabled={!canBook || createBookingMutation.isPending}
                      >
                        {createBookingMutation.isPending ? t("bookings.booking") : t("bookings.bookNow")}
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
                {club ? t("bookings.clubBookingsTitleWithClub", { clubName: club.name }) : t("bookings.clubBookingsTitleWithoutClub")}
              </CardTitle>
              <CardDescription>
                {t("bookings.clubBookingsDesc")}
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
                          {format(new Date(booking.start_time), t("bookings.dateFormat"), { locale: dateLocale })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("bookings.timeRange", { start: format(new Date(booking.start_time), "HH:mm"), end: format(new Date(booking.end_time), "HH:mm") })}
                          {booking.allocation_minutes ? t("bookings.minutesSuffix", { minutes: booking.allocation_minutes }) : ""}
                        </p>
                        {booking.booked_for_member_name && (
                          <p className="text-sm text-muted-foreground">
                            {t("bookings.summaryFor", { name: booking.booked_for_member_name })}
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
                              <AlertDialogTitle>{t("bookings.cancelDialogTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("bookings.cancelDialogDesc", { minutes: booking.allocation_minutes })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("bookings.cancelDialogCancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelBookingMutation.mutate(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("bookings.cancelDialogConfirm")}
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
                  {t("bookings.noClubBookings")}
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
                {t("bookings.allBookingsTitle")}
              </CardTitle>
              <CardDescription>
                {t("bookings.allBookingsDesc", { courtName })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allCourtBookings && allCourtBookings.length > 0 ? (
                <div className="space-y-3">
                  {allCourtBookings.map((booking) => {
                    const isClubBooking = booking.booking_origin === "club";
                    const isOtherClub = isClubBooking && booking.club_id !== clubId;

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
                                {format(new Date(booking.start_time), t("bookings.dateFormat"), { locale: dateLocale })}
                              </p>
                              <Badge
                                variant={isClubBooking ? "default" : "secondary"}
                                className={isClubBooking ? "bg-primary/20 text-primary" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}
                              >
                                {isClubBooking ? t("common.badgeClub") : t("common.badgePlayer")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t("bookings.timeRange", { start: format(new Date(booking.start_time), "HH:mm"), end: format(new Date(booking.end_time), "HH:mm") })}
                              {booking.allocation_minutes ? t("bookings.minutesSuffix", { minutes: booking.allocation_minutes }) : ""}
                            </p>
                            {isClubBooking && booking.booked_for_member_name && (
                              <p className="text-sm text-muted-foreground">
                                {t("bookings.summaryFor", { name: isOtherClub ? t("bookings.otherClub") : booking.booked_for_member_name })}
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
                                <AlertDialogTitle>{t("bookings.cancelDialogTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("bookings.cancelDialogDesc", { minutes: booking.allocation_minutes })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("bookings.cancelDialogCancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelBookingMutation.mutate(booking.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("bookings.cancelDialogConfirm")}
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
                  {t("bookings.noUpcomingBookings")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

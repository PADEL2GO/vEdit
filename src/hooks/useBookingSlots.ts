import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, setHours, setMinutes, isBefore, addMinutes } from "date-fns";
import type { Court, TimeSlot } from "@/components/booking/types";
import type { DbLocation } from "@/types/database";

interface UseBookingSlotsProps {
  location: DbLocation | null;
  courts: Court[];
  selectedCourt: string | null;
  selectedDate: Date;
  selectedDuration: number;
}

export function useBookingSlots({
  location,
  courts,
  selectedCourt,
  selectedDate,
  selectedDuration,
}: UseBookingSlotsProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAvailableSlots = useCallback(async () => {
    if (!location || !selectedCourt || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[selectedDate.getDay()];
      const hours = location.opening_hours_json?.[dayName];

      if (!hours) {
        setAvailableSlots([]);
        return;
      }

      const [openHour, openMin] = hours.open.split(':').map(Number);
      const [closeHour, closeMin] = hours.close.split(':').map(Number);

      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);

      // Use the secure booking_availability view which excludes user_id
      const { data: bookings, error } = await supabase
        .from("booking_availability")
        .select("start_time, end_time")
        .eq("court_id", selectedCourt)
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", dayEnd.toISOString());

      if (error) throw error;

      const slots: TimeSlot[] = [];
      const court = courts.find(c => c.id === selectedCourt);
      
      let currentTime = setMinutes(setHours(selectedDate, openHour), openMin);
      const closeTime = setMinutes(setHours(selectedDate, closeHour), closeMin);
      const now = new Date();

      while (isBefore(addMinutes(currentTime, selectedDuration), closeTime) || 
             (currentTime.getHours() === closeHour - Math.floor(selectedDuration / 60) && currentTime.getMinutes() <= closeMin)) {
        const slotEnd = addMinutes(currentTime, selectedDuration);
        
        const isPast = isBefore(currentTime, now);
        
        const isBooked = (bookings || []).some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          return (
            (currentTime >= bookingStart && currentTime < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (currentTime <= bookingStart && slotEnd >= bookingEnd)
          );
        });

        slots.push({
          time: format(currentTime, "HH:mm"),
          available: !isPast && !isBooked,
          courtId: selectedCourt,
          courtName: court?.name || "Court",
        });

        currentTime = addMinutes(currentTime, 30);
        
        if (slots.length > 50) break;
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  }, [location, selectedCourt, selectedDate, selectedDuration, courts]);

  useEffect(() => {
    if (location && selectedCourt && selectedDate) {
      fetchAvailableSlots();
    }
  }, [location, selectedCourt, selectedDate, selectedDuration, fetchAvailableSlots]);

  return { availableSlots, loadingSlots, refetchSlots: fetchAvailableSlots };
}
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { de } from "date-fns/locale";
import { isBefore, startOfDay, addDays } from "date-fns";
import type { Court, TimeSlot } from "./types";
import { SLOT_DURATIONS } from "@/types/constants";

interface BookingSlotPickerProps {
  courts: Court[];
  selectedCourt: string | null;
  setSelectedCourt: (id: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedDuration: number;
  setSelectedDuration: (duration: number) => void;
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  availableSlots: TimeSlot[];
  loadingSlots: boolean;
}

export function BookingSlotPicker({
  courts,
  selectedCourt,
  setSelectedCourt,
  selectedDate,
  setSelectedDate,
  selectedDuration,
  setSelectedDuration,
  selectedSlot,
  setSelectedSlot,
  availableSlots,
  loadingSlots,
}: BookingSlotPickerProps) {
  const stepOffset = courts.length > 1 ? 1 : 0;

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Court Selection */}
      {courts.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">1. Court wählen</h2>
          <div className="flex flex-wrap gap-2">
            {courts.map((court) => (
              <Button
                key={court.id}
                variant={selectedCourt === court.id ? "lime" : "outline"}
                onClick={() => {
                  setSelectedCourt(court.id);
                  setSelectedSlot(null);
                }}
              >
                {court.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          {stepOffset + 1}. Datum wählen
        </h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              setSelectedDate(date);
              setSelectedSlot(null);
            }
          }}
          disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date())) || date > addDays(startOfDay(new Date()), 14)}
          className="rounded-md border"
          locale={de}
        />
      </div>

      {/* Duration Selection */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          {stepOffset + 2}. Dauer wählen
        </h2>
        <div className="flex flex-wrap gap-2">
          {SLOT_DURATIONS.map((duration) => (
            <Button
              key={duration}
              variant={selectedDuration === duration ? "lime" : "outline"}
              onClick={() => {
                setSelectedDuration(duration);
                setSelectedSlot(null);
              }}
            >
              {duration} Minuten
            </Button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          {stepOffset + 3}. Zeitslot wählen
        </h2>
        
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Keine Slots verfügbar für dieses Datum.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {availableSlots.map((slot, index) => (
              <Button
                key={index}
                variant={selectedSlot?.time === slot.time ? "lime" : "outline"}
                size="sm"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
                className={!slot.available ? "opacity-50 cursor-not-allowed" : ""}
              >
                {slot.time}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Loader2, AlertCircle, Check, ArrowRight, LayoutGrid, Calendar, Hourglass, Clock, type LucideIcon } from "lucide-react";
import { format, startOfDay, addDays, isSameDay, isAfter } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
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

const CARD = "rounded-2xl border border-border/60 bg-gradient-card p-[22px]";
const ICON_TILE =
  "flex-none w-[42px] h-[42px] rounded-xl border border-primary/35 flex items-center justify-center text-primary bg-[linear-gradient(135deg,hsl(71_91%_51%/0.18),hsl(71_91%_51%/0.04))]";

function CheckBadge({ done }: { done: boolean }) {
  return (
    <span
      className={`flex-none w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        done
          ? "bg-primary text-black shadow-[0_0_16px_hsl(71_91%_51%/0.4)]"
          : "bg-[hsl(0_0%_10%)] text-[hsl(0_0%_35%)] border border-[hsl(0_0%_20%)]"
      }`}
    >
      <Check className="w-[13px] h-[13px]" strokeWidth={3} />
    </span>
  );
}

function StepHeader({
  icon: Icon,
  step,
  title,
  children,
}: {
  icon: LucideIcon;
  step: number;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-[13px] min-w-0">
        <span className={ICON_TILE}>
          <Icon className="w-[19px] h-[19px]" />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-stat text-[10.5px] tracking-[0.16em] text-[hsl(0_0%_50%)] uppercase">
            SCHRITT {String(step).padStart(2, "0")}
          </span>
          <h3 className="font-bold text-[17px] tracking-tight text-foreground truncate">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
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
  const { t, i18n } = useTranslation("booking");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const stepOffset = courts.length > 1 ? 1 : 0;

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 14);
  const dateChips = Array.from({ length: 15 }, (_, i) => addDays(today, i));

  const freeCount = availableSlots.filter((s) => s.available).length;
  const hasSlots = availableSlots.length > 0;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Step 1: Court Selection */}
      {courts.length > 1 && (
        <div className={CARD}>
          <div className="flex flex-col gap-4">
            <StepHeader icon={LayoutGrid} step={1} title={t("slotPicker.courtStep", { n: 1 })}>
              <CheckBadge done={!!selectedCourt} />
            </StepHeader>
            <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))]">
              {courts.map((court) => {
                const on = selectedCourt === court.id;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourt(court.id);
                      setSelectedSlot(null);
                    }}
                    className={`relative flex flex-col items-start gap-1 rounded-[14px] px-4 py-3.5 text-left min-h-[44px] transition-all ${
                      on
                        ? "border border-primary bg-primary/[0.08] shadow-[0_0_22px_hsl(71_91%_51%/0.22)]"
                        : "border border-[hsl(0_0%_15%)] bg-white/[0.03] hover:border-primary/55"
                    }`}
                  >
                    {on && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_14px_hsl(71_91%_51%/0.5)]">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className="font-bold text-[15.5px] tracking-tight text-foreground">
                      {court.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Date Selection */}
      <div className={CARD}>
        <div className="flex flex-col gap-4">
          <StepHeader icon={Calendar} step={stepOffset + 1} title={t("slotPicker.dateStep", { n: stepOffset + 1 })}>
            <CheckBadge done />
          </StepHeader>
          <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
            {dateChips.map((d, i) => {
              const on = isSameDay(selectedDate, d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  className={`flex-none flex flex-col items-center gap-0.5 w-16 py-2.5 px-1 rounded-[13px] transition-all ${
                    on
                      ? "bg-primary text-black border border-transparent shadow-[0_0_22px_hsl(71_91%_51%/0.35)]"
                      : "bg-white/[0.03] text-foreground border border-[hsl(0_0%_15%)] hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`text-[10.5px] font-bold uppercase tracking-[0.06em] ${
                      on ? "text-black/65" : i === 0 ? "text-primary" : "text-[hsl(0_0%_55%)]"
                    }`}
                  >
                    {i === 0 ? "Heute" : format(d, "EEEEEE", { locale: dateLocale })}
                  </span>
                  <span className="font-stat font-bold text-base">{format(d, "dd")}</span>
                  <span className={`text-[10.5px] ${on ? "text-black/65" : "text-[hsl(0_0%_50%)]"}`}>
                    {format(d, "MMM", { locale: dateLocale })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 3: Duration Selection */}
      <div className={CARD}>
        <div className="flex flex-col gap-4">
          <StepHeader icon={Hourglass} step={stepOffset + 2} title={t("slotPicker.durationStep", { n: stepOffset + 2 })}>
            <CheckBadge done={!!selectedDuration} />
          </StepHeader>
          <div className="grid grid-cols-3 gap-2.5">
            {SLOT_DURATIONS.map((duration) => {
              const on = selectedDuration === duration;
              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => {
                    setSelectedDuration(duration);
                    setSelectedSlot(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-[14px] min-h-[44px] transition-all ${
                    on
                      ? "bg-primary text-black border border-transparent shadow-[0_0_22px_hsl(71_91%_51%/0.35)]"
                      : "bg-white/[0.03] text-foreground border border-[hsl(0_0%_15%)] hover:border-primary/55"
                  }`}
                >
                  <span className="font-stat font-bold text-[15px]">
                    {t("slotPicker.durationMinutes", { count: duration })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 4: Time Slots */}
      <div className={CARD}>
        <div className="flex flex-col gap-4">
          <StepHeader icon={Clock} step={stepOffset + 3} title={t("slotPicker.timeSlotStep", { n: stepOffset + 3 })}>
            {!loadingSlots && hasSlots && (
              <span className="font-stat text-xs text-primary bg-primary/[0.08] border border-primary/25 rounded-full px-[11px] py-1 whitespace-nowrap">
                {freeCount} von {availableSlots.length} frei
              </span>
            )}
          </StepHeader>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !hasSlots ? (
            <div className="flex flex-col items-center gap-3 text-center py-[26px] px-4 bg-white/[0.03] border border-dashed border-[hsl(0_0%_20%)] rounded-[14px]">
              <span className="w-[46px] h-[46px] rounded-full bg-white/[0.05] border border-[hsl(0_0%_18%)] flex items-center justify-center text-[hsl(0_0%_55%)]">
                <AlertCircle className="w-[22px] h-[22px]" />
              </span>
              <span className="text-[15px] font-semibold text-[hsl(0_0%_80%)]">{t("slotPicker.noSlots")}</span>
              <button
                type="button"
                onClick={() => {
                  const next = addDays(startOfDay(selectedDate), 1);
                  if (!isAfter(next, maxDate)) {
                    setSelectedDate(next);
                    setSelectedSlot(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-primary bg-primary/10 border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/[0.16] transition-colors"
              >
                Nächster freier Tag
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                {availableSlots.map((slot, index) => {
                  const on = selectedSlot?.time === slot.time;
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`h-12 rounded-xl font-stat text-[13.5px] font-semibold transition-all ${
                        on
                          ? "bg-primary text-black border border-transparent shadow-[0_0_20px_hsl(71_91%_51%/0.4)]"
                          : !slot.available
                            ? "bg-white/[0.02] text-[hsl(0_0%_40%)] border border-[hsl(0_0%_12%)] line-through opacity-40 cursor-not-allowed"
                            : "bg-white/[0.03] text-foreground border border-[hsl(0_0%_16%)] hover:border-primary/55"
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(0_0%_50%)]">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[hsl(0_0%_10%)] border border-[hsl(0_0%_22%)] inline-block" />
                Belegte Slots sind ausgegraut
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Search, X, History, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EventFiltersProps {
  onSearchChange: (search: string) => void;
  onTypeChange: (type: string | null) => void;
  onTimeChange: (time: string | null) => void;
  selectedType: string | null;
  selectedTime: string | null;
  showPast: boolean;
  onShowPastChange: (show: boolean) => void;
}

const EVENT_TYPES = [
  { value: "party", label: "Party" },
  { value: "day_drinking", label: "Day Drinking" },
  { value: "tournament", label: "Turnier" },
  { value: "community", label: "Community" },
  { value: "corporate", label: "Corporate" },
  { value: "open_play", label: "Open Play" },
];

const TIME_FILTERS = [
  { value: "today", label: "Heute" },
  { value: "weekend", label: "Wochenende" },
  { value: "month", label: "Diesen Monat" },
];

const pillClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all min-h-[36px] ${
    active
      ? "bg-primary text-black shadow-[0_0_18px_hsl(71_91%_51%/0.35)]"
      : "bg-white/[0.03] border border-[hsl(0_0%_16%)] text-foreground/75 hover:border-primary/55"
  }`;

export const EventFilters = ({
  onSearchChange,
  onTypeChange,
  onTimeChange,
  selectedType,
  selectedTime,
  showPast,
  onShowPastChange,
}: EventFiltersProps) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearchChange(value);
  };

  const clearFilters = () => {
    setSearchValue("");
    onSearchChange("");
    onTypeChange(null);
    onTimeChange(null);
    onShowPastChange(false);
  };

  const hasActiveFilters = searchValue || selectedType || selectedTime || showPast;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Search Bar */}
      <div className="relative max-w-[440px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_45%)] pointer-events-none" />
        <Input
          type="text"
          placeholder="Event, Ort oder Kategorie suchen …"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-[46px] pl-10 pr-11 rounded-[13px] bg-[hsl(0_0%_6%)] border-[hsl(0_0%_16%)] text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
        />
        {searchValue && (
          <button
            onClick={() => handleSearchChange("")}
            aria-label="Suche zurücksetzen"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-[9px] bg-[hsl(0_0%_12%)] text-[hsl(0_0%_70%)] hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onTypeChange(null)} className={pillClass(!selectedType)}>
          Alle
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onTypeChange(selectedType === type.value ? null : type.value)}
            className={pillClass(selectedType === type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Time Pills + Past + Reset */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-stat text-[11px] tracking-[0.14em] uppercase text-[hsl(0_0%_45%)] mr-1">
          Zeitraum
        </span>
        {TIME_FILTERS.map((time) => (
          <button
            key={time.value}
            onClick={() => onTimeChange(selectedTime === time.value ? null : time.value)}
            className={pillClass(selectedTime === time.value)}
          >
            {time.label}
          </button>
        ))}

        <span className="w-px h-5 bg-[hsl(0_0%_16%)] mx-1" />

        <button onClick={() => onShowPastChange(!showPast)} className={pillClass(showPast)}>
          <History className="w-[13px] h-[13px]" />
          Vergangene
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[36px] text-[13px] font-semibold text-[hsl(0_0%_55%)] hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-[13px] h-[13px]" />
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
};

export default EventFilters;

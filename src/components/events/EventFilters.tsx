import { useState } from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  };

  const hasActiveFilters = searchValue || selectedType || selectedTime;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Events durchsuchen..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-12 h-12 bg-card border-border"
        />
        {searchValue && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Event Type Filters */}
        <div className="flex items-center gap-1 mr-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
        </div>
        {EVENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onTypeChange(selectedType === type.value ? null : type.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedType === type.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {type.label}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-2" />

        {/* Time Filters */}
        <div className="flex items-center gap-1 mr-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
        {TIME_FILTERS.map((time) => (
          <button
            key={time.value}
            onClick={() => onTimeChange(selectedTime === time.value ? null : time.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedTime === time.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {time.label}
          </button>
        ))}

        {/* Show Past Toggle */}
        <button
          onClick={() => onShowPastChange(!showPast)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            showPast
              ? "bg-muted text-foreground"
              : "bg-card border border-border hover:border-primary/50 text-muted-foreground"
          }`}
        >
          {showPast ? "Vergangene ausblenden" : "Vergangene anzeigen"}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Filter zurücksetzen
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventFilters;

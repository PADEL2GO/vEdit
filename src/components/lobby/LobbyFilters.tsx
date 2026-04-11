import { useState } from "react";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Zap, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { LobbyFilters as LobbyFiltersType } from "@/types/lobby";

interface LobbyFiltersProps {
  filters: LobbyFiltersType;
  onFiltersChange: (filters: LobbyFiltersType) => void;
  locations: { id: string; name: string }[];
  userSkillLevel?: number;
}

export function LobbyFilters({
  filters,
  onFiltersChange,
  locations,
  userSkillLevel = 5,
}: LobbyFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  const handleDateChange = (range: { from?: Date; to?: Date }) => {
    const newRange = {
      from: range.from || dateRange.from,
      to: range.to || dateRange.to,
    };
    setDateRange(newRange);
    onFiltersChange({
      ...filters,
      date_from: newRange.from.toISOString(),
      date_to: newRange.to.toISOString(),
    });
  };

  const handleLocationChange = (locationId: string) => {
    onFiltersChange({
      ...filters,
      location_id: locationId === "all" ? undefined : locationId,
    });
  };

  const handleSkillChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      skill_min: values[0],
      skill_max: values[1],
    });
  };

  const handleOnlyAvailableChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      only_available: checked,
    });
  };

  const clearFilters = () => {
    const defaultFilters: LobbyFiltersType = {
      date_from: new Date().toISOString(),
      date_to: addDays(new Date(), 7).toISOString(),
      only_available: true,
    };
    setDateRange({ from: new Date(), to: addDays(new Date(), 7) });
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = 
    filters.location_id || 
    filters.skill_min !== undefined || 
    filters.skill_max !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl">
      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Calendar className="w-4 h-4 mr-2" />
            {format(dateRange.from, "dd.MM.", { locale: de })} - {format(dateRange.to, "dd.MM.", { locale: de })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from) {
                handleDateChange({ from: range.from, to: range.to || range.from });
              }
            }}
            numberOfMonths={2}
            locale={de}
          />
        </PopoverContent>
      </Popover>

      {/* Location Select */}
      <Select
        value={filters.location_id || "all"}
        onValueChange={handleLocationChange}
      >
        <SelectTrigger className="w-[180px] h-9">
          <MapPin className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Alle Standorte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Standorte</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Skill Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Zap className="w-4 h-4 mr-2" />
            Skill {filters.skill_min ?? 1}–{filters.skill_max ?? 10}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Skill-Level Range</Label>
            <Slider
              value={[filters.skill_min ?? 1, filters.skill_max ?? 10]}
              onValueChange={handleSkillChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Anfänger (1)</span>
              <span>Profi (10)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleSkillChange([userSkillLevel - 1, userSkillLevel + 1])}
            >
              Auf mein Level setzen (±1)
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Only Available Toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <Switch
          id="only-available"
          checked={filters.only_available ?? true}
          onCheckedChange={handleOnlyAvailableChange}
        />
        <Label htmlFor="only-available" className="text-sm cursor-pointer">
          Nur freie Plätze
        </Label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground hover:text-foreground"
          onClick={clearFilters}
        >
          <X className="w-4 h-4 mr-1" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  );
}

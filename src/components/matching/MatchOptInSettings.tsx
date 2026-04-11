import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, MapPin, Sliders, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useMatchOptIn, AvailabilitySchedule } from "@/hooks/useMatchOptIn";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TIME_SLOTS = [
  { value: "morning", label: "Morgens (6-12)" },
  { value: "afternoon", label: "Nachmittags (12-18)" },
  { value: "evening", label: "Abends (18-22)" },
];

const DAYS = [
  { key: "mon", label: "Mo" },
  { key: "tue", label: "Di" },
  { key: "wed", label: "Mi" },
  { key: "thu", label: "Do" },
  { key: "fri", label: "Fr" },
  { key: "sat", label: "Sa" },
  { key: "sun", label: "So" },
] as const;

export function MatchOptInSettings() {
  const { settings, isLoading, upsertSettings, isSaving, toggleActive, isTogglingActive } = useMatchOptIn();
  
  const [isActive, setIsActive] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [skillRange, setSkillRange] = useState<[number, number]>([1, 10]);
  const [availability, setAvailability] = useState<AvailabilitySchedule>({
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, city")
        .eq("is_online", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setIsActive(settings.is_active);
      setSelectedLocations(settings.preferred_location_ids || []);
      setSkillRange([settings.skill_range_min || 1, settings.skill_range_max || 10]);
      setAvailability(settings.availability_json || {
        mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
      });
    }
  }, [settings]);

  const handleToggleActive = (checked: boolean) => {
    setIsActive(checked);
    toggleActive(checked);
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleTimeSlotToggle = (day: keyof AvailabilitySchedule, slot: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].includes(slot)
        ? prev[day].filter(s => s !== slot)
        : [...prev[day], slot],
    }));
  };

  const handleSave = () => {
    upsertSettings({
      is_active: isActive,
      preferred_location_ids: selectedLocations,
      skill_range_min: skillRange[0],
      skill_range_max: skillRange[1],
      availability_json: availability,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Matchmaking</CardTitle>
              <CardDescription>Finde passende Spielpartner basierend auf deinen Präferenzen</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="matchmaking-active" className="text-sm text-muted-foreground">
              {isActive ? "Aktiv" : "Inaktiv"}
            </Label>
            <Switch
              id="matchmaking-active"
              checked={isActive}
              onCheckedChange={handleToggleActive}
              disabled={isTogglingActive}
            />
          </div>
        </div>
      </CardHeader>

      {isActive && (
        <CardContent className="space-y-6">
          {/* Preferred Locations */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Bevorzugte Standorte</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLocations.includes(location.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleLocationToggle(location.id)}
                >
                  <Checkbox
                    checked={selectedLocations.includes(location.id)}
                    onCheckedChange={() => handleLocationToggle(location.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{location.name}</p>
                    {location.city && (
                      <p className="text-xs text-muted-foreground">{location.city}</p>
                    )}
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">Keine Standorte verfügbar</p>
              )}
            </div>
          </motion.div>

          {/* Skill Range */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Skill-Level Bereich</Label>
            </div>
            <div className="px-2">
              <Slider
                value={skillRange}
                onValueChange={(value) => setSkillRange(value as [number, number])}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>Level {skillRange[0]}</span>
                <span>Level {skillRange[1]}</span>
              </div>
            </div>
          </motion.div>

          {/* Availability */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Verfügbarkeit</Label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Zeit</th>
                    {DAYS.map((day) => (
                      <th key={day.key} className="text-center py-2 px-2 font-medium text-muted-foreground">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot.value}>
                      <td className="py-2 pr-4 text-muted-foreground">{slot.label}</td>
                      {DAYS.map((day) => (
                        <td key={day.key} className="text-center py-2 px-2">
                          <Checkbox
                            checked={availability[day.key]?.includes(slot.value)}
                            onCheckedChange={() => handleTimeSlotToggle(day.key, slot.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              "Einstellungen speichern"
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

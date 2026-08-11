import { CourtSport, SPORT_LABEL } from "./types";

/**
 * Sportart-Wahl beim Anlegen und Bearbeiten eines Courts.
 *
 * Bewusst ein Segment und kein Dropdown: Die Sportart ist keine Nebeneinstellung,
 * sie muss beim Speichern ohne Aufklappen sichtbar sein. Optik wie der
 * Zeitraum-Umschalter der Admin-Seiten; Tennis trägt das etablierte Hellblau,
 * Padel bleibt Lime.
 */
export function SportSelect({
  value,
  onChange,
  size = "md",
  className = "",
}: {
  value: CourtSport;
  onChange: (sport: CourtSport) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Sportart"
      className={`inline-flex gap-[3px] rounded-[11px] border border-[hsl(0_0%_14%)] bg-white/[0.04] p-[3px] ${className}`}
    >
      {(Object.keys(SPORT_LABEL) as CourtSport[]).map((sport) => {
        const isActive = value === sport;
        return (
          <button
            key={sport}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(sport)}
            className={`rounded-lg font-semibold transition-colors ${
              size === "sm"
                ? "px-2.5 py-1 text-[11.5px]"
                : "px-3.5 py-1.5 text-[12.5px]"
            } ${
              isActive
                ? sport === "tennis"
                  ? "bg-[#7FD4FF] text-[#0A0A0A]"
                  : "bg-primary text-[#0A0A0A]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {SPORT_LABEL[sport]}
          </button>
        );
      })}
    </div>
  );
}

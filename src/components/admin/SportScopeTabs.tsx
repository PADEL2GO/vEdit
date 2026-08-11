/**
 * Padel/Tennis-Umschalter für Admin-Seiten.
 *
 * Bewusst pro Seite mit eigenem State (kein globaler Context): So ist beim
 * Öffnen einer Seite immer sichtbar, welcher Blick aktiv ist — ein unbemerkt
 * gesetzter Filter würde sonst zu falsch gelesenen Zahlen führen.
 *
 * Optik 1:1 wie das Zeitraum-Segment in AdminOverview.
 */

export type SportScope = "all" | "padel" | "tennis";

export const SPORT_SCOPE_OPTIONS: { key: SportScope; label: string }[] = [
  { key: "all", label: "Konsolidiert" },
  { key: "padel", label: "Padel" },
  { key: "tennis", label: "Tennis" },
];

/** Sportart für DB-Filter; `null` bedeutet „nicht einschränken". */
export const sportOf = (scope: SportScope): "padel" | "tennis" | null =>
  scope === "all" ? null : scope;

export function SportScopeTabs({
  value,
  onChange,
  className = "",
}: {
  value: SportScope;
  onChange: (scope: SportScope) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Sportart"
      className={`flex gap-[3px] rounded-[11px] border border-[hsl(0_0%_14%)] bg-white/[0.04] p-[3px] ${className}`}
    >
      {SPORT_SCOPE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === option.key
              ? "bg-primary text-[#0A0A0A]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

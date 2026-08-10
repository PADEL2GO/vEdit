import { Lock, Unlock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TranslatableFieldProps {
  label: string;
  /** German source value (always editable). */
  deValue: string;
  onDeChange: (value: string) => void;
  /** English value — auto-filled by DeepL, editable when locked. */
  enValue: string;
  onEnChange: (value: string) => void;
  /** When true, EN field will not be overwritten by the next auto-translate. */
  locked: boolean;
  onLockedChange: (locked: boolean) => void;
  placeholder?: string;
  /** Use a textarea instead of an input. */
  multiline?: boolean;
  rows?: number;
  /** Disable everything (e.g. while saving). */
  disabled?: boolean;
}

export const TranslatableField = ({
  label,
  deValue,
  onDeChange,
  enValue,
  onEnChange,
  locked,
  onLockedChange,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
}: TranslatableFieldProps) => {
  const TextComponent = multiline ? Textarea : Input;
  const deFieldClass = "rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13px]";
  const enFieldClass = "rounded-[10px] border-[hsl(200_100%_75%/0.16)] bg-[hsl(200_100%_75%/0.04)] text-[13px]";
  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex min-h-[22px] items-center">
            <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-primary">
              DE
            </span>
          </div>
          <TextComponent
            value={deValue}
            onChange={(e) => onDeChange((e.target as HTMLInputElement | HTMLTextAreaElement).value)}
            placeholder={placeholder}
            rows={multiline ? rows : undefined}
            disabled={disabled}
            className={deFieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex min-h-[22px] flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full border border-[hsl(200_100%_75%/0.28)] bg-[hsl(200_100%_75%/0.1)] px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#7FD4FF]">
                EN · DeepL
              </span>
              {!locked && !enValue && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground/80">
                  <Sparkles className="h-3 w-3" />
                  auto-translate
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onLockedChange(!locked)}
              disabled={disabled}
              title={
                locked
                  ? "Manuell gesperrt — beim nächsten Speichern nicht überschrieben. Klicken zum Entsperren."
                  : "Automatisch übersetzt — beim nächsten Speichern überschrieben. Klicken zum Sperren."
              }
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[3px] text-[10.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                locked
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/[0.16]"
                  : "border-[hsl(0_0%_16%)] bg-white/[0.05] text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {locked ? "gesperrt" : "frei"}
            </button>
          </div>
          <TextComponent
            value={enValue}
            onChange={(e) => onEnChange((e.target as HTMLInputElement | HTMLTextAreaElement).value)}
            placeholder={locked ? placeholder : "Wird nach dem Speichern automatisch befüllt"}
            rows={multiline ? rows : undefined}
            disabled={disabled || (!locked && !enValue)}
            className={`${enFieldClass} ${!locked && !enValue ? "italic text-muted-foreground" : "text-[hsl(0_0%_82%)]"}`}
          />
        </div>
      </div>
    </div>
  );
};

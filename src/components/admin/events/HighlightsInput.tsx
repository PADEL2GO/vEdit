import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface HighlightsInputProps {
  highlights: string[];
  onChange: (highlights: string[]) => void;
}

const SUGGESTED_HIGHLIGHTS = [
  "DJ",
  "Live-Musik",
  "Food Trucks",
  "Bar & Drinks",
  "Pro-Coaching",
  "Turnier",
  "Anfänger-freundlich",
  "Networking",
  "Gewinnspiele",
  "Goodie Bags",
  "After-Party",
  "VIP Area",
];

export function HighlightsInput({ highlights, onChange }: HighlightsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addHighlight = (highlight: string) => {
    const trimmed = highlight.trim();
    if (trimmed && !highlights.includes(trimmed)) {
      onChange([...highlights, trimmed]);
    }
    setInputValue("");
  };

  const removeHighlight = (highlight: string) => {
    onChange(highlights.filter((h) => h !== highlight));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addHighlight(inputValue);
    }
  };

  const availableSuggestions = SUGGESTED_HIGHLIGHTS.filter(
    (s) => !highlights.includes(s)
  );

  return (
    <div className="flex flex-col gap-[11px] rounded-[15px] border border-[hsl(0_0%_12%)] bg-white/[0.025] p-[17px]">
      <Label className="font-display text-sm font-bold tracking-tight text-foreground">
        Highlights & Features
      </Label>

      {/* Current Highlights */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-[7px]">
          {highlights.map((highlight) => (
            <Badge
              key={highlight}
              className="gap-[7px] whitespace-nowrap rounded-full border border-primary/[0.32] bg-primary/10 py-1.5 pl-[11px] pr-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              {highlight}
              <button
                type="button"
                onClick={() => removeHighlight(highlight)}
                className="flex rounded-full text-primary/70 transition-colors hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Custom Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Eigenes Highlight hinzufügen..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-[38px] min-w-0 flex-1 rounded-[10px] border border-[hsl(0_0%_15%)] bg-white/[0.04] px-[13px] text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addHighlight(inputValue)}
          disabled={!inputValue.trim()}
          className="h-[38px] w-[38px] shrink-0 rounded-[10px] border-primary/30 bg-primary/[0.09] p-0 text-primary hover:bg-primary/[0.18] hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0_0%_58%)]">Vorschläge</p>
          <div className="flex flex-wrap gap-[7px]">
            {availableSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addHighlight(suggestion)}
                className="whitespace-nowrap rounded-full border border-[hsl(0_0%_16%)] bg-white/5 px-[11px] py-1.5 text-xs font-semibold text-[hsl(0_0%_78%)] transition-colors hover:border-primary/40 hover:bg-primary/[0.08] hover:text-primary"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

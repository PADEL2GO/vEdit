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
    <div className="space-y-3">
      <Label className="text-base font-semibold">Highlights & Features</Label>
      
      {/* Current Highlights */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <Badge
              key={highlight}
              className="bg-primary/20 text-primary border-primary/30 pl-3 pr-1 py-1"
            >
              {highlight}
              <button
                type="button"
                onClick={() => removeHighlight(highlight)}
                className="ml-2 hover:bg-primary/30 rounded p-0.5"
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
          className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addHighlight(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Vorschläge:</p>
          <div className="flex flex-wrap gap-1">
            {availableSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addHighlight(suggestion)}
                className="px-2 py-1 text-xs rounded-md border border-border hover:bg-secondary/50 transition-colors"
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

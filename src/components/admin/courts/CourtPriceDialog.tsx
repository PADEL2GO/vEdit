import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useCourtSpecificPrices, useUpsertCourtPrices } from "@/hooks/useCourtPrices";

interface Court {
  id: string;
  name: string;
}

interface CourtPriceDialogProps {
  court: Court;
  locationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [60, 90, 120] as const;

export function CourtPriceDialog({ court, locationName, open, onOpenChange }: CourtPriceDialogProps) {
  const { data: prices, isLoading } = useCourtSpecificPrices(court.id);
  const upsertPrices = useUpsertCourtPrices();
  
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({
    60: 24,
    90: 36,
    120: 40,
  });

  // Initialize from DB
  useEffect(() => {
    if (prices && prices.length > 0) {
      const priceMap: Record<number, number> = {};
      prices.forEach(p => {
        priceMap[p.duration_minutes] = p.price_cents / 100;
      });
      setEditedPrices(prev => ({ ...prev, ...priceMap }));
    }
  }, [prices]);

  const handleSave = async () => {
    const pricesToSave = DURATIONS.map(duration => ({
      court_id: court.id,
      duration_minutes: duration,
      price_cents: Math.round(editedPrices[duration] * 100),
    }));
    
    upsertPrices.mutate(pricesToSave, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const hasPrices = prices && prices.length === 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            💰 Preise für {court.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{locationName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {!hasPrices && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-400">
                  Preise müssen gesetzt sein, damit der Court buchbar ist.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {DURATIONS.map((duration) => (
                <div key={duration} className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
                  <Label className="w-24 text-sm font-medium">
                    {duration} Min.
                  </Label>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedPrices[duration] ?? 0}
                      onChange={(e) => setEditedPrices(prev => ({
                        ...prev,
                        [duration]: parseFloat(e.target.value) || 0,
                      }))}
                      className="bg-background border-border pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={upsertPrices.isPending}>
                {upsertPrices.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

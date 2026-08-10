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
      <DialogContent className="gap-[18px] rounded-[20px] border-[hsl(0_0%_15%)] bg-[linear-gradient(180deg,hsl(0_0%_7%),hsl(0_0%_4%))] p-6 sm:max-w-[430px] sm:rounded-[20px]">
        <DialogHeader className="gap-[5px] space-y-0 text-left">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Preise
          </span>
          <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
            {court.name} · {locationName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-[18px]">
            <div className="flex flex-col gap-[11px]">
              {DURATIONS.map((duration) => (
                <div
                  key={duration}
                  className="flex items-center gap-[13px] rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.028] px-[14px] py-3"
                >
                  <Label className="flex-1 text-[13.5px] font-semibold text-foreground">
                    {duration} Min.
                  </Label>
                  <div className="relative flex flex-shrink-0 items-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedPrices[duration] ?? 0}
                      onChange={(e) => setEditedPrices(prev => ({
                        ...prev,
                        [duration]: parseFloat(e.target.value) || 0,
                      }))}
                      className="h-9 w-24 rounded-[9px] border-[hsl(0_0%_16%)] bg-white/5 pl-3 pr-[26px] font-mono text-sm font-bold text-foreground focus-visible:ring-primary"
                    />
                    <span className="pointer-events-none absolute right-[11px] font-mono text-[13px] text-[hsl(0_0%_65%)]">
                      €
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!hasPrices && (
              <div className="flex items-center gap-[11px] rounded-xl border border-[hsl(41_100%_65%/0.22)] bg-[hsl(41_100%_65%/0.06)] px-[14px] py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFC44D]" />
                <p className="text-[12.5px] leading-[1.5] text-[hsl(0_0%_78%)]">
                  Preise müssen gesetzt sein, damit der Court buchbar ist.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <Button
                variant="ghost"
                className="h-[42px] rounded-[11px] border border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="h-[42px] gap-2 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] transition-opacity hover:opacity-90"
                onClick={handleSave}
                disabled={upsertPrices.isPending}
              >
                {upsertPrices.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
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

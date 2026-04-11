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
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useCourtSpecificPrices, useUpsertCourtPrices } from "@/hooks/useCourtPrices";
import { useLocationMutations } from "./useLocationMutations";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";

interface Court {
  id: string;
  name: string;
  is_active: boolean;
  location_id: string;
}

interface AdminCourtEditDialogProps {
  court: Court;
  locationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [60, 90, 120] as const;

export function AdminCourtEditDialog({ court, locationName, open, onOpenChange }: AdminCourtEditDialogProps) {
  const queryClient = useQueryClient();
  const { data: prices, isLoading } = useCourtSpecificPrices(court.id);
  const upsertPrices = useUpsertCourtPrices();
  const { toggleCourtMutation } = useLocationMutations();
  
  const [courtName, setCourtName] = useState(court.name);
  const [isActive, setIsActive] = useState(court.is_active);
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({
    60: 24,
    90: 36,
    120: 40,
  });

  // Sync state when dialog opens or court changes
  useEffect(() => {
    setCourtName(court.name);
    setIsActive(court.is_active);
  }, [court, open]);

  // Initialize prices from DB
  useEffect(() => {
    if (prices && prices.length > 0) {
      const priceMap: Record<number, number> = {};
      prices.forEach(p => {
        priceMap[p.duration_minutes] = p.price_cents / 100;
      });
      setEditedPrices(prev => ({ ...prev, ...priceMap }));
    }
  }, [prices]);

  const updateCourtMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { error } = await supabase
        .from("courts")
        .update({ name })
        .eq("id", court.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: () => {
      toast.error("Fehler beim Speichern");
    },
  });

  const handleSave = async () => {
    // Update court name if changed
    if (courtName !== court.name) {
      await updateCourtMutation.mutateAsync({ name: courtName });
    }

    // Update active status if changed
    if (isActive !== court.is_active) {
      toggleCourtMutation.mutate({ courtId: court.id, isActive });
    }

    // Update prices
    const pricesToSave = DURATIONS.map(duration => ({
      court_id: court.id,
      duration_minutes: duration,
      price_cents: Math.round(editedPrices[duration] * 100),
    }));
    
    upsertPrices.mutate(pricesToSave, {
      onSuccess: () => {
        toast.success("Court gespeichert");
        onOpenChange(false);
      },
    });
  };

  const hasPrices = prices && prices.length === 3;
  const isSaving = updateCourtMutation.isPending || upsertPrices.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Court bearbeiten
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{locationName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Court Name */}
            <div className="space-y-2">
              <Label htmlFor="court-name">Court Name</Label>
              <Input
                id="court-name"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <Label htmlFor="court-active" className="text-sm font-medium">
                Court ist online
              </Label>
              <Switch
                id="court-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Prices Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Preise</Label>
              
              {!hasPrices && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-400">
                    Preise müssen gesetzt sein, damit der Court buchbar ist.
                  </p>
                </div>
              )}

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
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
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

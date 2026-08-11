import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { CourtSport, SPORT_LABEL } from "./types";
import { SportSelect } from "./SportSelect";

interface AddCourtDialogProps {
  locationId: string;
}

export function AddCourtDialog({ locationId }: AddCourtDialogProps) {
  const [open, setOpen] = useState(false);
  const [courtName, setCourtName] = useState("");
  const [courtLabel, setCourtLabel] = useState("");
  const [sport, setSport] = useState<CourtSport>("padel");
  const queryClient = useQueryClient();

  const addCourtMutation = useMutation({
    mutationFn: async () => {
      // `sport` fehlt noch in den generierten Supabase-Typen (Migration
      // 20260812100000) — daher wie bei `label` per `as any`.
      const { error } = await supabase.from("courts").insert({
        location_id: locationId,
        name: courtName,
        is_active: true,
        label: courtLabel.trim() || null,
        sport,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${SPORT_LABEL[sport]}-Court hinzugefügt`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
      setCourtName("");
      setCourtLabel("");
      setSport("padel");
      setOpen(false);
    },
    onError: () => {
      toast.error("Fehler beim Hinzufügen");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border">
          <Plus className="h-4 w-4 mr-2" />
          Court hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Neuer Court</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sportart</Label>
            <SportSelect value={sport} onChange={setSport} className="flex" />
            <p className="text-xs text-muted-foreground">
              Bestimmt Preise, Auswertungen und die angezeigte Standort-Ansicht.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="court-name">Court Name</Label>
            <Input
              id="court-name"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="z.B. Court 5"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="court-label">Kurz-Label (optional)</Label>
            <Input
              id="court-label"
              value={courtLabel}
              onChange={(e) => setCourtLabel(e.target.value)}
              placeholder="z.B. Outdoor · Flutlicht"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">Wird bei der Court-Auswahl im Booking angezeigt.</p>
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground"
            onClick={() => addCourtMutation.mutate()}
            disabled={!courtName.trim()}
          >
            Hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

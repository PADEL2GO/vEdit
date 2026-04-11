import { motion } from "framer-motion";
import { MapPin, Edit, Trash2, Euro, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { AdminCourtEditDialog } from "./AdminCourtEditDialog";
import { useLocationMutations } from "./useLocationMutations";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";
import { useCourtSpecificPrices, getPriceFromList } from "@/hooks/useCourtPrices";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";

interface AdminCourtCardProps {
  court: {
    id: string;
    name: string;
    is_active: boolean;
    location_id: string;
  };
  location: {
    id: string;
    name: string;
    main_image_url: string | null;
    city: string | null;
  };
  index?: number;
}

export function AdminCourtCard({ court, location, index = 0 }: AdminCourtCardProps) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toggleCourtMutation } = useLocationMutations();
  const { data: prices } = useCourtSpecificPrices(court.id);
  
  const price60 = getPriceFromList(prices, 60);
  const hasPrices = prices && prices.length >= 3;

  const deleteCourtMutation = useMutation({
    mutationFn: async (courtId: string) => {
      // 1. Aktive Lobbies automatisch stornieren
      const { data: lobbies, error: lobbyError } = await supabase
        .from("lobbies")
        .select("id")
        .eq("court_id", courtId)
        .in("status", ["open", "full"]);
      
      if (lobbyError) throw lobbyError;
      
      if ((lobbies?.length || 0) > 0) {
        const { error: cancelError } = await invokeEdgeFunction(
          "lobby-api",
          {
            body: { action: "admin_cancel_lobbies_for_court", court_id: courtId },
          }
        );
        if (cancelError) throw cancelError;
      }
      
      // 2. Zukünftige Buchungen automatisch stornieren
      const { error: bookingCancelError } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled" as const, 
          cancelled_at: new Date().toISOString() 
        })
        .eq("court_id", courtId)
        .gte("start_time", new Date().toISOString())
        .in("status", ["pending_payment", "confirmed"]);
      
      if (bookingCancelError) throw bookingCancelError;
      
      // 3. Hard-Delete: Court komplett löschen
      const { error } = await supabase
        .from("courts")
        .delete()
        .eq("id", courtId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Court gelöscht");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="bg-card border-border overflow-hidden hover:border-primary/30 transition-all group">
          {/* Image Header */}
          {location.main_image_url ? (
            <div className="aspect-[21/9] w-full overflow-hidden relative">
              <img 
                src={location.main_image_url} 
                alt={location.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Status Badge Overlay */}
              <div className="absolute top-2 right-2">
                <Badge
                  className={
                    court.is_active
                      ? "bg-green-500/90 text-white border-green-500"
                      : "bg-red-500/90 text-white border-red-500"
                  }
                >
                  {court.is_active ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="aspect-[21/9] w-full bg-gradient-to-br from-primary/20 via-secondary to-muted flex items-center justify-center relative">
              <Building2 className="w-8 h-8 text-muted-foreground/50" />
              <div className="absolute top-2 right-2">
                <Badge
                  className={
                    court.is_active
                      ? "bg-green-500/90 text-white border-green-500"
                      : "bg-red-500/90 text-white border-red-500"
                  }
                >
                  {court.is_active ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
          )}

          <div className="p-4">
            {/* Court Name & Location */}
            <div className="mb-3">
              <h3 className="text-lg font-bold text-foreground truncate">
                {court.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location.name}
                {location.city && ` • ${location.city}`}
              </p>
            </div>

            {/* Price Badge */}
            <div className="flex items-center gap-2 mb-4">
              {hasPrices && price60 ? (
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  <Euro className="w-3 h-3 mr-1" />
                  ab {(price60 / 100).toFixed(0)}€
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  Preise fehlen
                </Badge>
              )}
            </div>

            {/* Online/Offline Toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-3">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${court.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                  {court.is_active ? "Online" : "Offline"}
                </span>
                <Switch
                  checked={court.is_active}
                  onCheckedChange={(checked) =>
                    toggleCourtMutation.mutate({ courtId: court.id, isActive: checked })
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Bearbeiten
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">
                      Court löschen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      "{court.name}" wird unwiderruflich gelöscht.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteCourtMutation.mutate(court.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </motion.div>

      <AdminCourtEditDialog
        court={court}
        locationName={location.name}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

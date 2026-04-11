import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { MapPin, Edit, Building2, Trash2, Trophy, Brain, ShoppingCart, Euro } from "lucide-react";
import { COURT_FEATURES } from "@/lib/courtFeatures";
import { useState } from "react";
import { CourtPriceDialog } from "./CourtPriceDialog";
import { useQueryClient } from "@tanstack/react-query";
import { Location } from "./types";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { LocationForm } from "./LocationForm";
import { CourtCountSelector } from "./CourtCountSelector";
import { useLocationMutations } from "./useLocationMutations";

interface AdminLocationCardProps {
  location: Location;
}

export function AdminLocationCard({ location }: AdminLocationCardProps) {
  const queryClient = useQueryClient();
  const [priceDialogCourt, setPriceDialogCourt] = useState<{ id: string; name: string } | null>(null);
  const {
    toggleCourtMutation,
    toggleLocationOnline,
    toggleLocationFeature,
    deleteLocationMutation,
  } = useLocationMutations();

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        {/* Mobile: Stack layout, Desktop: Row layout */}
        <div className="flex flex-col gap-4">
          {/* Top row: Image + Info */}
          <div className="flex items-start gap-3 sm:gap-4">
            {location.main_image_url ? (
              <img
                src={location.main_image_url}
                alt={location.name}
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-foreground text-base sm:text-lg truncate">{location.name}</CardTitle>
                <Badge
                  variant={location.is_online ? "default" : "secondary"}
                  className={
                    location.is_online
                      ? "bg-green-500/20 text-green-500 border-green-500/30"
                      : ""
                  }
                >
                  {location.is_online ? "Online" : "Offline"}
                </Badge>
                {location.is_24_7 && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    24/7
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {location.city
                    ? `${location.address || ""}, ${location.postal_code || ""} ${location.city}`
                    : location.address || "Keine Adresse"}
                </span>
              </p>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-1.5">
            {location.rewards_enabled && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                <Trophy className="h-3 w-3 mr-1" /> Rewards
              </Badge>
            )}
            {location.ai_analysis_enabled && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                <Brain className="h-3 w-3 mr-1" /> KI
              </Badge>
            )}
            {location.vending_enabled && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" /> Automat
              </Badge>
            )}
            {/* Dynamic Court Features from features_json */}
            {COURT_FEATURES.filter(f => (location.features_json as Record<string, boolean>)?.[f.key] === true).map(({ key, label, icon: Icon }) => (
              <Badge key={key} className="bg-secondary text-secondary-foreground border-border text-xs">
                <Icon className="h-3 w-3 mr-1" /> {label}
              </Badge>
            ))}
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Label htmlFor={`online-${location.id}`} className="text-sm text-muted-foreground">
                Online
              </Label>
              <Switch
                id={`online-${location.id}`}
                checked={location.is_online}
                onCheckedChange={(checked) =>
                  toggleLocationOnline.mutate({
                    locationId: location.id,
                    isOnline: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Bearbeiten</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Standort bearbeiten</DialogTitle>
                  </DialogHeader>
                  <LocationForm
                    location={location}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminLocations] });
                    }}
                  />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">
                      Standort löschen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      "{location.name}" und alle zugehörigen Courts werden unwiderruflich gelöscht.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteLocationMutation.mutate(location.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Feature Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor={`rewards-${location.id}`} className="text-sm text-foreground">
              Rewards
            </Label>
            <Switch
              id={`rewards-${location.id}`}
              checked={location.rewards_enabled}
              onCheckedChange={(checked) =>
                toggleLocationFeature.mutate({
                  locationId: location.id,
                  feature: "rewards_enabled",
                  enabled: checked,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`ai-${location.id}`} className="text-sm text-foreground">
              KI-Analyse
            </Label>
            <Switch
              id={`ai-${location.id}`}
              checked={location.ai_analysis_enabled}
              onCheckedChange={(checked) =>
                toggleLocationFeature.mutate({
                  locationId: location.id,
                  feature: "ai_analysis_enabled",
                  enabled: checked,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`vending-${location.id}`} className="text-sm text-foreground">
              Automaten
            </Label>
            <Switch
              id={`vending-${location.id}`}
              checked={location.vending_enabled}
              onCheckedChange={(checked) =>
                toggleLocationFeature.mutate({
                  locationId: location.id,
                  feature: "vending_enabled",
                  enabled: checked,
                })
              }
            />
          </div>
        </div>

        {/* Courts */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-foreground">
              Courts ({location.courts?.length || 0})
            </h3>
            <CourtCountSelector
              locationId={location.id}
              locationName={location.name}
              currentCourts={location.courts || []}
              maxCourts={2}
            />
          </div>
          {location.courts && location.courts.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {/* Show active courts first, then inactive */}
              {[...location.courts]
                .sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))
                .map((court) => (
                <div
                  key={court.id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border ${
                    court.is_active 
                      ? "bg-background border-border" 
                      : "bg-muted/30 border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className={`text-sm font-medium truncate ${
                      court.is_active ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {court.name}
                    </span>
                    {!court.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setPriceDialogCourt({ id: court.id, name: court.name })}
                    >
                      <Euro className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Label htmlFor={`court-active-${court.id}`} className="text-xs text-muted-foreground hidden sm:inline">
                      Aktiv
                    </Label>
                    <Switch
                      id={`court-active-${court.id}`}
                      checked={court.is_active}
                      onCheckedChange={(checked) =>
                        toggleCourtMutation.mutate({ courtId: court.id, isActive: checked })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Court Price Dialog */}
      {priceDialogCourt && (
        <CourtPriceDialog
          court={priceDialogCourt}
          locationName={location.name}
          open={!!priceDialogCourt}
          onOpenChange={(open) => !open && setPriceDialogCourt(null)}
        />
      )}
    </Card>
  );
}

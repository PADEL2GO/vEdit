import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useClubAuth } from "@/hooks/useClubAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, MapPin, Trophy, Brain, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  COURT_FEATURES, 
  DEFAULT_COURT_FEATURES, 
  extractFeatures,
  type CourtFeatureKey 
} from "@/lib/courtFeatures";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";

interface PlatformFeatures {
  rewards_enabled: boolean;
  ai_analysis_enabled: boolean;
  vending_enabled: boolean;
}

export default function ClubCourtFeatures() {
  const queryClient = useQueryClient();
  const { primaryAssignment, courtName, locationName } = useClubAuth();
  const [features, setFeatures] = useState<Record<CourtFeatureKey, boolean>>(DEFAULT_COURT_FEATURES);
  const [platformFeatures, setPlatformFeatures] = useState<PlatformFeatures>({
    rewards_enabled: true,
    ai_analysis_enabled: true,
    vending_enabled: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current court features
  const { data: courtData, isLoading } = useQuery({
    queryKey: ["club-court-features", primaryAssignment?.court_id],
    queryFn: async () => {
      if (!primaryAssignment?.court_id) return null;

      const { data, error } = await supabase
        .from("courts")
        .select(`
          id,
          name,
          location:locations (
            id,
            name,
            features_json,
            rewards_enabled,
            ai_analysis_enabled,
            vending_enabled
          )
        `)
        .eq("id", primaryAssignment.court_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!primaryAssignment?.court_id,
  });

  // Initialize features from location data
  useEffect(() => {
    if (courtData?.location) {
      const location = courtData.location as {
        features_json: Record<string, unknown> | null;
        rewards_enabled: boolean;
        ai_analysis_enabled: boolean;
        vending_enabled: boolean;
      };
      
      setFeatures(extractFeatures(location.features_json));
      setPlatformFeatures({
        rewards_enabled: location.rewards_enabled ?? true,
        ai_analysis_enabled: location.ai_analysis_enabled ?? true,
        vending_enabled: location.vending_enabled ?? false,
      });
      setHasChanges(false);
    }
  }, [courtData]);

  const toggleFeature = (key: CourtFeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const togglePlatformFeature = (key: keyof PlatformFeatures) => {
    setPlatformFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  // Save features mutation via Edge Function
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!primaryAssignment?.court_id) {
        throw new Error("Keine Court-Zuweisung gefunden");
      }

      const { data, error } = await invokeEdgeFunction<{ success: boolean; features: Record<string, boolean> }>(
        "club-court-update",
        {
          body: {
            courtId: primaryAssignment.court_id,
            features: features,
            platformFeatures: platformFeatures,
          },
          maxRetries: 2,
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error("Speichern fehlgeschlagen");
      
      return data;
    },
    onSuccess: () => {
      toast.success("Features erfolgreich gespeichert");
      setHasChanges(false);
      // Invalidate all relevant queries for live updates
      queryClient.invalidateQueries({ queryKey: ["club-court-features"] });
      queryClient.invalidateQueries({ queryKey: ["booking-location"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Speichern");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Court Features</h1>
          <p className="text-muted-foreground">
            Ausstattung und Plattform-Features verwalten
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Speichern..." : "Speichern"}
        </Button>
      </div>

      {/* Court Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {courtName}
          </CardTitle>
          <CardDescription>{locationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hier können Sie die Ausstattung und Features Ihres Courts verwalten.
            Diese Informationen werden den Spielern bei der Buchung angezeigt.
          </p>
        </CardContent>
      </Card>

      {/* Platform Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Plattform-Features</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${
              platformFeatures.rewards_enabled
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            }`}
            onClick={() => togglePlatformFeature("rewards_enabled")}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    platformFeatures.rewards_enabled
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <Label className="cursor-pointer font-medium">P2G Rewards</Label>
                  <p className="text-xs text-muted-foreground">Punkte sammeln aktivieren</p>
                </div>
              </div>
              <Switch
                checked={platformFeatures.rewards_enabled}
                onCheckedChange={() => togglePlatformFeature("rewards_enabled")}
              />
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              platformFeatures.ai_analysis_enabled
                ? "border-blue-500 bg-blue-500/5"
                : "hover:border-muted-foreground/50"
            }`}
            onClick={() => togglePlatformFeature("ai_analysis_enabled")}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    platformFeatures.ai_analysis_enabled
                      ? "bg-blue-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <Label className="cursor-pointer font-medium">KI-Analyse</Label>
                  <p className="text-xs text-muted-foreground">Spielanalyse per Kamera</p>
                </div>
              </div>
              <Switch
                checked={platformFeatures.ai_analysis_enabled}
                onCheckedChange={() => togglePlatformFeature("ai_analysis_enabled")}
              />
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              platformFeatures.vending_enabled
                ? "border-orange-500 bg-orange-500/5"
                : "hover:border-muted-foreground/50"
            }`}
            onClick={() => togglePlatformFeature("vending_enabled")}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    platformFeatures.vending_enabled
                      ? "bg-orange-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <Label className="cursor-pointer font-medium">Automaten</Label>
                  <p className="text-xs text-muted-foreground">Verkaufsautomaten vor Ort</p>
                </div>
              </div>
              <Switch
                checked={platformFeatures.vending_enabled}
                onCheckedChange={() => togglePlatformFeature("vending_enabled")}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Court Features Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ausstattung & Merkmale</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {COURT_FEATURES.map(({ key, label, icon: Icon, description }) => (
            <Card
              key={key}
              className={`cursor-pointer transition-colors ${
                features[key as CourtFeatureKey]
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/50"
              }`}
              onClick={() => toggleFeature(key as CourtFeatureKey)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      features[key as CourtFeatureKey]
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="cursor-pointer font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={features[key as CourtFeatureKey]}
                  onCheckedChange={() => toggleFeature(key as CourtFeatureKey)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Hint */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Hinweis:</strong> Änderungen an den Features werden sofort für alle
            Benutzer sichtbar. Kernattribute wie Name, Adresse oder Preise können nur
            vom Plattform-Administrator geändert werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Rocket, Users, Sparkles, Trophy, Calendar, Loader2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureConfig {
  key: "feature_lobbies_enabled" | "feature_matching_enabled" | "feature_league_enabled" | "feature_events_enabled" | "feature_p2g_enabled";
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
}

const FEATURES: FeatureConfig[] = [
  {
    key: "feature_lobbies_enabled",
    title: "Offene Lobbys",
    description: "Finde Mitspieler für dein nächstes Match. Erstelle eigene Lobbys bei deiner Buchung oder tritt anderen Lobbys bei.",
    route: "/lobbies",
    icon: Users,
  },
  {
    key: "feature_matching_enabled",
    title: "Automatisches Matching",
    description: "Werde automatisch mit Spielern auf deinem Level gematcht. Definiere deine Präferenzen und erhalte Vorschläge.",
    route: "/account → Matching Tab",
    icon: Sparkles,
  },
  {
    key: "feature_league_enabled",
    title: "League",
    description: "Rangliste und Spieler-Statistiken. Vergleiche dich mit anderen Spielern und steige im Ranking auf.",
    route: "/league",
    icon: Trophy,
  },
  {
    key: "feature_events_enabled",
    title: "Events",
    description: "Padel-Events mit DJ, Food & Community. Von Day-Drinking Sessions bis zu Partner-Activations.",
    route: "/events",
    icon: Calendar,
  },
  {
    key: "feature_p2g_enabled",
    title: "P2G Points",
    description: "Sammle P2G Credits durch Buchungen und KI-Matches. Löse sie gegen exklusive Prämien ein.",
    route: "/dashboard/p2g-points",
    icon: Coins,
  },
];

export default function AdminFeatures() {
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({
    feature_lobbies_enabled: false,
    feature_matching_enabled: false,
    feature_league_enabled: false,
    feature_events_enabled: false,
    feature_p2g_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatureStates();
  }, []);

  const fetchFeatureStates = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("feature_lobbies_enabled, feature_matching_enabled, feature_league_enabled, feature_events_enabled, feature_p2g_enabled")
        .eq("id", "global")
        .single();

      if (error) throw error;

      setFeatureStates({
        feature_lobbies_enabled: data?.feature_lobbies_enabled ?? false,
        feature_matching_enabled: data?.feature_matching_enabled ?? false,
        feature_league_enabled: data?.feature_league_enabled ?? false,
        feature_events_enabled: (data as any)?.feature_events_enabled ?? false,
        feature_p2g_enabled: (data as any)?.feature_p2g_enabled ?? false,
      });
    } catch (error) {
      console.error("Error fetching feature states:", error);
      toast.error("Fehler beim Laden der Feature-Einstellungen");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    setSavingKey(key);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const timestampKey = key.replace("_enabled", "_updated_at");
      
      const { error } = await supabase
        .from("site_settings")
        .update({
          [key]: enabled,
          [timestampKey]: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq("id", "global");

      if (error) throw error;

      setFeatureStates(prev => ({ ...prev, [key]: enabled }));
      
      toast.success(
        enabled 
          ? "Feature aktiviert – jetzt für alle User sichtbar" 
          : "Feature deaktiviert – Coming Soon Overlay wird angezeigt"
      );
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Fehler beim Aktualisieren des Features");
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Feature-Steuerung
          </h1>
          <p className="text-muted-foreground mt-1">
            Schalte Features für eingeloggte User frei oder zeige "Coming Soon" an
          </p>
        </div>

        <div className="grid gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isEnabled = featureStates[feature.key];
            const isSaving = savingKey === feature.key;

            return (
              <Card key={feature.key} className="bg-card border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${isEnabled ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-6 w-6 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground flex items-center gap-2">
                          {feature.title}
                          {isEnabled ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Coming Soon
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">
                        Route: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">{feature.route}</code>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {isEnabled ? "Aktiv" : "Gesperrt"}
                      </span>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleFeature(feature.key, checked)}
                        disabled={isSaving}
                      />
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info card */}
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Wie funktioniert es?</p>
                <p>
                  Wenn ein Feature <strong>deaktiviert</strong> ist, sehen eingeloggte User statt des 
                  Inhalts einen "Coming Soon" Overlay mit einer kurzen Beschreibung. 
                  Admins können alle Features immer sehen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

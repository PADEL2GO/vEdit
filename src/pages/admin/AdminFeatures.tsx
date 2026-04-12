import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rocket, Users, Sparkles, Trophy, Calendar, Loader2, Coins, Globe, ShoppingCart, Gift, UserCheck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureConfig {
  key: string;
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
    key: "feature_p2g_enabled",
    title: "P2G Points",
    description: "Sammle P2G Credits durch Buchungen und KI-Matches. Löse sie gegen exklusive Prämien ein.",
    route: "/dashboard/p2g-points",
    icon: Coins,
  },
  {
    key: "feature_marketplace_enabled",
    title: "Marketplace",
    description: "Exklusiver Shop für Mitglieder. Equipment, Merchandise und Member-Only Deals.",
    route: "/dashboard/marketplace",
    icon: ShoppingCart,
  },
  {
    key: "feature_league_enabled",
    title: "League",
    description: "Rangliste und Spieler-Statistiken. Vergleiche dich mit anderen Spielern und steige im Ranking auf.",
    route: "/dashboard/league",
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
    key: "feature_rewards_enabled",
    title: "Rewards",
    description: "Prämien-Programm für treue Mitglieder. Exklusive Belohnungen für regelmäßige Buchungen.",
    route: "/rewards",
    icon: Gift,
  },
  {
    key: "feature_friends_enabled",
    title: "Freunde & Community",
    description: "Vernetz dich mit anderen Spielern, sende Freundschaftsanfragen und spiele gemeinsam.",
    route: "/dashboard/friends",
    icon: UserCheck,
  },
  {
    key: "feature_matching_enabled",
    title: "Automatisches Matching",
    description: "Werde automatisch mit Spielern auf deinem Level gematcht. Definiere deine Präferenzen und erhalte Vorschläge.",
    route: "/account → Matching Tab",
    icon: Sparkles,
  },
];

export default function AdminFeatures() {
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({
    feature_app_launched: false,
    feature_lobbies_enabled: false,
    feature_matching_enabled: false,
    feature_league_enabled: false,
    feature_events_enabled: false,
    feature_p2g_enabled: false,
    feature_marketplace_enabled: false,
    feature_rewards_enabled: false,
    feature_friends_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Credits-as-payment settings
  const [creditsPaymentEnabled, setCreditsPaymentEnabled] = useState(false);
  const [creditsMaxPercent, setCreditsMaxPercent] = useState(50);
  const [creditsPerEuro, setCreditsPerEuro] = useState(100);
  const [isSavingCredits, setIsSavingCredits] = useState(false);

  useEffect(() => {
    fetchFeatureStates();
  }, []);

  const fetchFeatureStates = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("feature_app_launched, feature_lobbies_enabled, feature_matching_enabled, feature_league_enabled, feature_events_enabled, feature_p2g_enabled, feature_marketplace_enabled, feature_rewards_enabled, feature_friends_enabled, feature_credits_payment_enabled, credits_payment_max_percent, credits_per_euro")
        .eq("id", "global")
        .single();

      if (error) throw error;

      const d = data as any;
      setFeatureStates({
        feature_app_launched: d?.feature_app_launched ?? false,
        feature_lobbies_enabled: d?.feature_lobbies_enabled ?? false,
        feature_matching_enabled: d?.feature_matching_enabled ?? false,
        feature_league_enabled: d?.feature_league_enabled ?? false,
        feature_events_enabled: d?.feature_events_enabled ?? false,
        feature_p2g_enabled: d?.feature_p2g_enabled ?? false,
        feature_marketplace_enabled: d?.feature_marketplace_enabled ?? false,
        feature_rewards_enabled: d?.feature_rewards_enabled ?? false,
        feature_friends_enabled: d?.feature_friends_enabled ?? false,
      });
      setCreditsPaymentEnabled(d?.feature_credits_payment_enabled ?? false);
      setCreditsMaxPercent(d?.credits_payment_max_percent ?? 50);
      setCreditsPerEuro(d?.credits_per_euro ?? 100);
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

  const toggleCreditsPayment = async (enabled: boolean) => {
    setSavingKey("feature_credits_payment_enabled");
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ feature_credits_payment_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", "global");
      if (error) throw error;
      setCreditsPaymentEnabled(enabled);
      toast.success(enabled ? "Credits-Zahlung aktiviert" : "Credits-Zahlung deaktiviert");
    } catch (err) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSavingKey(null);
    }
  };

  const saveCreditsSettings = async () => {
    if (creditsMaxPercent < 1 || creditsMaxPercent > 100) {
      toast.error("Max. Prozent muss zwischen 1 und 100 liegen");
      return;
    }
    if (creditsPerEuro < 1) {
      toast.error("Credits pro Euro muss mindestens 1 sein");
      return;
    }
    setIsSavingCredits(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          credits_payment_max_percent: creditsMaxPercent,
          credits_per_euro: creditsPerEuro,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
      if (error) throw error;
      toast.success("Credits-Einstellungen gespeichert");
    } catch (err) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSavingCredits(false);
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

        {/* ── Master Launch Toggle ─────────────────────────── */}
        <Card className={`border-2 ${featureStates.feature_app_launched ? "border-green-500/60 bg-green-500/5" : "border-amber-500/60 bg-amber-500/5"}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${featureStates.feature_app_launched ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                  <Globe className={`h-7 w-7 ${featureStates.feature_app_launched ? "text-green-500" : "text-amber-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-foreground">App freischalten</h2>
                    {featureStates.feature_app_launched ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Live</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Vor-Launch</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    {featureStates.feature_app_launched
                      ? "Die App ist freigeschaltet. Alle eingeloggten User haben Zugriff auf alle Bereiche (soweit die einzelnen Features unten aktiviert sind)."
                      : "Vor-Launch-Modus aktiv. Eingeloggte User sehen nur Buchung & Account. Alle anderen Seiten sind gesperrt. Admins haben immer vollen Zugriff."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {featureStates.feature_app_launched ? "Aktiv" : "Gesperrt"}
                </span>
                <Switch
                  checked={featureStates.feature_app_launched}
                  onCheckedChange={(checked) => toggleFeature("feature_app_launched", checked)}
                  disabled={savingKey === "feature_app_launched"}
                />
                {savingKey === "feature_app_launched" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* ── Credits as Payment ──────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${creditsPaymentEnabled ? "bg-primary/10" : "bg-muted"}`}>
                  <Coins className={`h-6 w-6 ${creditsPaymentEnabled ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    Credits als Zahlungsmittel
                    {creditsPaymentEnabled ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inaktiv</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Spieler können P2G Credits beim Checkout einlösen, um einen Teil der Buchung zu bezahlen.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-muted-foreground">
                  {creditsPaymentEnabled ? "Aktiv" : "Inaktiv"}
                </span>
                <Switch
                  checked={creditsPaymentEnabled}
                  onCheckedChange={toggleCreditsPayment}
                  disabled={savingKey === "feature_credits_payment_enabled"}
                />
                {savingKey === "feature_credits_payment_enabled" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-t border-border/50 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Max. Rabatt durch Credits (%)</Label>
                <p className="text-xs text-muted-foreground">Wie viel Prozent des Buchungspreises maximal mit Credits bezahlt werden kann (z.B. 50 = max. 50%).</p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={creditsMaxPercent}
                  onChange={(e) => setCreditsMaxPercent(Number(e.target.value))}
                  className="w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Credits pro Euro</Label>
                <p className="text-xs text-muted-foreground">Wie viele Credits einem Euro entsprechen (z.B. 100 = 100 Credits = 1 €).</p>
                <Input
                  type="number"
                  min={1}
                  value={creditsPerEuro}
                  onChange={(e) => setCreditsPerEuro(Number(e.target.value))}
                  className="w-32"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={saveCreditsSettings}
              disabled={isSavingCredits}
              className="gap-2"
            >
              {isSavingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Einstellungen speichern
            </Button>
          </CardContent>
        </Card>

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

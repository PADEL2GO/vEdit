import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, Calendar, Loader2, Coins, ShoppingCart, Save, Eye, EyeOff, DoorOpen, Gift, Shuffle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeatureState = "visible" | "demo" | "hidden";

interface FeatureConfig {
  name: string;
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
}

const FEATURES: FeatureConfig[] = [
  {
    name: "lobbies",
    title: "Lobbies",
    description: "Spontane Spielrunden erstellen und beitreten. User finden offene Slots bei Courts in der Nähe.",
    route: "/lobbies",
    icon: DoorOpen,
  },
  {
    name: "league",
    title: "Liga",
    description: "Rangliste und Spieler-Statistiken. Vergleiche dich mit anderen Spielern und steige im Ranking auf.",
    route: "/dashboard/league",
    icon: Trophy,
  },
  {
    name: "events",
    title: "Events",
    description: "Padel-Events mit DJ, Food & Community. Von Day-Drinking Sessions bis zu Partner-Activations.",
    route: "/dashboard/events",
    icon: Calendar,
  },
  {
    name: "rewards",
    title: "Rewards",
    description: "Prämien-Katalog zum Einlösen von P2G-Punkten.",
    route: "/dashboard/rewards",
    icon: Gift,
  },
  {
    name: "matching",
    title: "Matching",
    description: "KI-gestütztes Spieler-Matching nach Level und Verfügbarkeit.",
    route: "/dashboard/matching",
    icon: Shuffle,
  },
  {
    name: "p2g",
    title: "P2G-Punkte",
    description: "Sammle P2G-Punkte durch Buchungen und KI-Matches. Löse sie gegen exklusive Prämien ein.",
    route: "/dashboard/p2g-points",
    icon: Coins,
  },
  {
    name: "marketplace",
    title: "Marktplatz",
    description: "Exklusiver Shop für Mitglieder. Equipment, Merchandise und Member-Only Deals.",
    route: "/dashboard/marketplace",
    icon: ShoppingCart,
  },
  {
    name: "friends",
    title: "Freunde",
    description: "Freunde einladen, Freundeslisten verwalten und gemeinsam spielen.",
    route: "/dashboard/friends",
    icon: Users,
  },
];

const STATE_OPTIONS: { value: FeatureState; label: string }[] = [
  { value: "visible", label: "Für alle sichtbar" },
  { value: "demo", label: "Demo (nur Admin)" },
  { value: "hidden", label: "Aus" },
];

const STATE_BADGE: Record<FeatureState, { label: string; className: string }> = {
  visible: { label: "Live", className: "bg-green-500/20 text-green-600 border-green-500/30" },
  demo: { label: "Demo", className: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  hidden: { label: "Aus", className: "text-muted-foreground" },
};

export default function AdminFeatures() {
  const queryClient = useQueryClient();
  const [courtsPublicEnabled, setCourtsPublicEnabled] = useState(false);
  const [featureVisibility, setFeatureVisibility] = useState<Record<string, FeatureState>>({
    lobbies: "hidden",
    league: "hidden",
    events: "hidden",
    rewards: "hidden",
    matching: "hidden",
    p2g: "hidden",
    marketplace: "hidden",
    friends: "hidden",
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
        .select(
          "feature_courts_public_enabled, feature_lobbies_state, feature_league_state, feature_events_state, feature_rewards_state, feature_matching_state, feature_p2g_state, feature_marketplace_state, feature_friends_state, feature_credits_payment_enabled, credits_payment_max_percent, credits_per_euro"
        )
        .eq("id", "global")
        .single();

      if (error) throw error;

      const d = data as any;
      setCourtsPublicEnabled(d?.feature_courts_public_enabled ?? false);
      setFeatureVisibility({
        lobbies: d?.feature_lobbies_state ?? "hidden",
        league: d?.feature_league_state ?? "hidden",
        events: d?.feature_events_state ?? "hidden",
        rewards: d?.feature_rewards_state ?? "hidden",
        matching: d?.feature_matching_state ?? "hidden",
        p2g: d?.feature_p2g_state ?? "hidden",
        marketplace: d?.feature_marketplace_state ?? "hidden",
        friends: d?.feature_friends_state ?? "hidden",
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

  const toggleCourtsPublic = async (enabled: boolean) => {
    setSavingKey("feature_courts_public_enabled");
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("site_settings")
        .update({
          feature_courts_public_enabled: enabled,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq("id", "global");

      if (error) throw error;

      setCourtsPublicEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: ["site-settings", "feature_courts_public_enabled"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-locations"] });

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

  const updateFeatureState = async (name: string, state: FeatureState) => {
    setSavingKey(name);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const column = `feature_${name}_state`;

      const { error } = await supabase
        .from("site_settings")
        .update({
          [column]: state,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq("id", "global");

      if (error) throw error;

      setFeatureVisibility(prev => ({ ...prev, [name]: state }));
      queryClient.invalidateQueries({ queryKey: ["feature-toggles"] });

      const messages: Record<FeatureState, string> = {
        visible: "Feature ist jetzt für alle User sichtbar",
        demo: "Feature ist jetzt im Demo-Modus – nur Admins sehen es",
        hidden: "Feature ist jetzt ausgeblendet",
      };
      toast.success(messages[state]);
    } catch (error) {
      console.error("Error updating feature state:", error);
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
            Steuere pro Feature, ob es für alle sichtbar, nur im Admin-Demo-Modus oder komplett ausgeblendet ist
          </p>
        </div>

        {/* ── Courts visibility toggle ─────────────────────── */}
        <Card className={`border-2 ${courtsPublicEnabled ? "border-green-500/60 bg-green-500/5" : "border-blue-500/60 bg-blue-500/5"}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${courtsPublicEnabled ? "bg-green-500/20" : "bg-blue-500/20"}`}>
                  {courtsPublicEnabled ? (
                    <Eye className="h-7 w-7 text-green-500" />
                  ) : (
                    <EyeOff className="h-7 w-7 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-foreground">Courts für User sichtbar</h2>
                    {courtsPublicEnabled ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Sichtbar</Badge>
                    ) : (
                      <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Nur Admins</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    {courtsPublicEnabled
                      ? "Alle Online-Courts sind für eingeloggte User und Besucher sichtbar und buchbar."
                      : "Nur Admins sehen die buchbaren Courts. User und Besucher sehen auf den Buchungsseiten ein „Bald verfügbar“. Ideal um vor Launch alles selbst zu testen."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {courtsPublicEnabled ? "Aktiv" : "Versteckt"}
                </span>
                <Switch
                  checked={courtsPublicEnabled}
                  onCheckedChange={toggleCourtsPublic}
                  disabled={savingKey === "feature_courts_public_enabled"}
                />
                {savingKey === "feature_courts_public_enabled" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const state = featureVisibility[feature.name] ?? "hidden";
            const isSaving = savingKey === feature.name;
            const badge = STATE_BADGE[state];

            return (
              <Card key={feature.name} className="bg-card border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${state === "visible" ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-6 w-6 ${state === "visible" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground flex items-center gap-2">
                          {feature.title}
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
                    <Label className="text-sm text-muted-foreground">
                      Route: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">{feature.route}</code>
                    </Label>
                    <div className="flex items-center gap-3">
                      <Select
                        value={state}
                        onValueChange={(value) => updateFeatureState(feature.name, value as FeatureState)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
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
                <p className="font-medium text-foreground mb-1">Wie funktionieren die 3 Zustände?</p>
                <p>
                  <strong>Für alle sichtbar</strong>: Nav-Link und Route sind für jeden eingeloggten User erreichbar.{" "}
                  <strong>Demo (nur Admin)</strong>: Nav-Link und Route existieren, aber nur Admins können sie sehen –
                  ideal um ein Feature vor dem Launch selbst zu testen. <strong>Aus</strong>: Nav-Link ist verborgen und
                  die Route leitet weg, niemand kommt mehr hin (auch Admins nicht).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

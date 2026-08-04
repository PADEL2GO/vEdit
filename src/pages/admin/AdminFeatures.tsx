import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, Calendar, Loader2, Coins, ShoppingCart, Save, Eye, EyeOff, DoorOpen, Shuffle, Users, Info } from "lucide-react";
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
    route: "/marketplace",
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
  visible: { label: "Live", className: "border-primary/[0.35] bg-primary/[0.12] text-primary" },
  demo: { label: "Demo", className: "border-[hsl(41_100%_65%/0.35)] bg-[hsl(41_100%_65%/0.12)] text-[#FFC44D]" },
  hidden: { label: "Aus", className: "border-[hsl(0_0%_20%)] bg-white/[0.06] text-muted-foreground" },
};

const PILL_CLASSES =
  "inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]";

const STATE_INFO: { state: FeatureState; label: string; text: React.ReactNode }[] = [
  {
    state: "visible",
    label: "Für alle sichtbar",
    text: "Nav-Link und Route sind für jeden eingeloggten User erreichbar.",
  },
  {
    state: "demo",
    label: "Demo (nur Admin)",
    text: "Nav-Link und Route existieren, aber nur Admins können sie sehen – ideal um ein Feature vor dem Launch selbst zu testen.",
  },
  {
    state: "hidden",
    label: "Aus",
    text: "Nav-Link ist verborgen und die Route leitet weg, niemand kommt mehr hin (auch Admins nicht).",
  },
];

// ISO-Timestamp → Wert für <input type="datetime-local"> (lokale Zeit, "YYYY-MM-DDTHH:mm")
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminFeatures() {
  const queryClient = useQueryClient();
  const [courtsPublicEnabled, setCourtsPublicEnabled] = useState(false);
  const [launchDate, setLaunchDate] = useState<string>("");
  const [isSavingLaunch, setIsSavingLaunch] = useState(false);
  const [featureVisibility, setFeatureVisibility] = useState<Record<string, FeatureState>>({
    lobbies: "hidden",
    league: "hidden",
    events: "hidden",
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
          "feature_courts_public_enabled, feature_lobbies_state, feature_league_state, feature_events_state, feature_matching_state, feature_p2g_state, feature_marketplace_state, feature_friends_state, feature_credits_payment_enabled, credits_payment_max_percent, credits_per_euro, launch_date"
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
        matching: d?.feature_matching_state ?? "hidden",
        p2g: d?.feature_p2g_state ?? "hidden",
        marketplace: d?.feature_marketplace_state ?? "hidden",
        friends: d?.feature_friends_state ?? "hidden",
      });
      setCreditsPaymentEnabled(d?.feature_credits_payment_enabled ?? false);
      setCreditsMaxPercent(d?.credits_payment_max_percent ?? 50);
      setCreditsPerEuro(d?.credits_per_euro ?? 100);
      setLaunchDate(d?.launch_date ? toLocalInput(d.launch_date) : "");
    } catch (error) {
      console.error("Error fetching feature states:", error);
      toast.error("Fehler beim Laden der Feature-Einstellungen");
    } finally {
      setIsLoading(false);
    }
  };

  const saveLaunchDate = async () => {
    if (!launchDate) {
      toast.error("Bitte ein Launch-Datum wählen");
      return;
    }
    setIsSavingLaunch(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const iso = new Date(launchDate).toISOString();
      const { error } = await supabase
        .from("site_settings")
        .update({
          launch_date: iso,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        } as any)
        .eq("id", "global");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["site-settings", "launch_date"] });
      toast.success("Launch-Datum gespeichert – gilt für Countdown & alle Placeholder");
    } catch (error) {
      console.error("Error saving launch date:", error);
      toast.error("Fehler beim Speichern des Launch-Datums");
    } finally {
      setIsSavingLaunch(false);
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
          feature_courts_public_updated_at: new Date().toISOString(),
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
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          Launch-Datum, Court-Sichtbarkeit, Feature-Status und Credits-Regeln steuern.
        </p>

        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* ── Launch-Datum ─────────────────────────────────── */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary">
                  <Rocket className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">
                    Launch-Datum
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    Treibt den Countdown auf der Startseite und alle „Coming Soon"-Placeholder (z. B. Events, wenn noch keine angelegt sind).
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="launch-date"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Datum &amp; Uhrzeit<span className="text-primary"> *</span>
                </Label>
                <Input
                  id="launch-date"
                  type="datetime-local"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  className="h-[42px] rounded-[11px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold"
                />
              </div>
              <Button
                onClick={saveLaunchDate}
                disabled={isSavingLaunch}
                className="self-start rounded-[11px] font-bold"
              >
                {isSavingLaunch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </Card>

          {/* ── Courts visibility toggle ─────────────────────── */}
          <Card
            className={`rounded-2xl p-5 sm:p-6 ${
              courtsPublicEnabled
                ? "border-primary/[0.32] bg-primary/[0.05]"
                : "border-[hsl(200_100%_75%/0.32)] bg-[hsl(200_100%_75%/0.05)]"
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border ${
                      courtsPublicEnabled
                        ? "border-primary/[0.32] bg-primary/[0.12] text-primary"
                        : "border-[hsl(200_100%_75%/0.32)] bg-[hsl(200_100%_75%/0.12)] text-[#7FD4FF]"
                    }`}
                  >
                    {courtsPublicEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </span>
                  <div className="flex min-w-0 flex-col gap-[3px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                        Courts für User sichtbar
                      </h2>
                      {courtsPublicEnabled ? (
                        <Badge className={`${PILL_CLASSES} border-primary/[0.35] bg-primary/[0.12] text-primary`}>
                          <span className="h-[5px] w-[5px] rounded-full bg-current" />
                          Sichtbar
                        </Badge>
                      ) : (
                        <Badge
                          className={`${PILL_CLASSES} border-[hsl(200_100%_75%/0.35)] bg-[hsl(200_100%_75%/0.12)] text-[#7FD4FF]`}
                        >
                          <span className="h-[5px] w-[5px] rounded-full bg-current" />
                          Nur Admins
                        </Badge>
                      )}
                    </div>
                    <p className="max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
                      {courtsPublicEnabled
                        ? "Alle Online-Courts sind für eingeloggte User und Besucher sichtbar und buchbar."
                        : "Nur Admins sehen die buchbaren Courts. User und Besucher sehen auf den Buchungsseiten ein „Bald verfügbar“. Ideal um vor Launch alles selbst zu testen."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {courtsPublicEnabled ? "Aktiv" : "Versteckt"}
                  </span>
                  <Switch
                    checked={courtsPublicEnabled}
                    onCheckedChange={toggleCourtsPublic}
                    disabled={savingKey === "feature_courts_public_enabled"}
                  />
                  {savingKey === "feature_courts_public_enabled" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </div>
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground/70">
                feature_courts_public_enabled
              </span>
            </div>
          </Card>
        </div>

        {/* ── App-Features ─────────────────────────────────── */}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <span className="font-display text-base font-bold tracking-tight text-foreground">App-Features</span>
          <span className="text-[12.5px] text-muted-foreground">
            {FEATURES.length} Features · 3-Stufen-Status
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-3.5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const state = featureVisibility[feature.name] ?? "hidden";
            const isSaving = savingKey === feature.name;
            const badge = STATE_BADGE[state];

            return (
              <Card
                key={feature.name}
                className="flex h-full flex-col gap-3.5 rounded-2xl border-border bg-gradient-card p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border ${
                        state === "visible"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                        {feature.title}
                      </span>
                      <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {feature.route}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${PILL_CLASSES} flex-none ${badge.className}`}>
                    <span className="h-[5px] w-[5px] rounded-full bg-current" />
                    {badge.label}
                  </Badge>
                </div>

                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{feature.description}</p>

                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <Select
                      value={state}
                      onValueChange={(value) => updateFeatureState(feature.name, value as FeatureState)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="h-[38px] w-full rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13px] font-semibold">
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
                    {isSaving && <Loader2 className="h-4 w-4 flex-none animate-spin text-primary" />}
                  </div>
                  <span className="truncate font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/70">
                    feature_{feature.name}_state
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── Credits as Payment ──────────────────────────── */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3.5">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border ${
                    creditsPaymentEnabled
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]"
                  }`}
                >
                  <Coins className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-bold tracking-tight text-foreground">
                      Credits als Zahlungsmittel
                    </span>
                    {creditsPaymentEnabled ? (
                      <Badge className={`${PILL_CLASSES} border-primary/[0.35] bg-primary/[0.12] text-primary`}>
                        <span className="h-[5px] w-[5px] rounded-full bg-current" />
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`${PILL_CLASSES} border-[hsl(0_0%_20%)] bg-white/[0.06] text-muted-foreground`}
                      >
                        <span className="h-[5px] w-[5px] rounded-full bg-current" />
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    Spieler können P2G Credits beim Checkout einlösen, um einen Teil der Buchung zu bezahlen.
                  </p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {creditsPaymentEnabled ? "Aktiv" : "Inaktiv"}
                </span>
                <Switch
                  checked={creditsPaymentEnabled}
                  onCheckedChange={toggleCreditsPayment}
                  disabled={savingKey === "feature_credits_payment_enabled"}
                />
                {savingKey === "feature_credits_payment_enabled" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5">
              <div className="flex flex-col gap-[7px]">
                <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Max. Rabatt durch Credits (%)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={creditsMaxPercent}
                  onChange={(e) => setCreditsMaxPercent(Number(e.target.value))}
                  className="h-[42px] rounded-[11px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold"
                />
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Wie viel Prozent des Buchungspreises maximal mit Credits bezahlt werden kann (z.B. 50 = max. 50%).
                </span>
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Credits pro Euro
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={creditsPerEuro}
                  onChange={(e) => setCreditsPerEuro(Number(e.target.value))}
                  className="h-[42px] rounded-[11px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold"
                />
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Wie viele Credits einem Euro entsprechen (z.B. 100 = 100 Credits = 1 €).
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={saveCreditsSettings}
              disabled={isSavingCredits}
              className="gap-2 self-start rounded-[11px] font-bold"
            >
              {isSavingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Einstellungen speichern
            </Button>
          </div>
        </Card>

        {/* Info card */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] text-[#7FD4FF]">
                <Info className="h-[15px] w-[15px]" />
              </span>
              <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                Wie funktionieren die 3 Zustände?
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3">
              {STATE_INFO.map((info) => (
                <div
                  key={info.state}
                  className="flex flex-col gap-[7px] rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.03] p-3.5"
                >
                  <span className={`${PILL_CLASSES} self-start ${STATE_BADGE[info.state].className}`}>
                    <span className="h-[5px] w-[5px] rounded-full bg-current" />
                    {info.label}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-muted-foreground">{info.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

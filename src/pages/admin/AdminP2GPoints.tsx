import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Coins, Users, Trophy, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { P2GWalletsTab } from "@/components/admin/p2g/P2GWalletsTab";
import { P2GExpertLevelsTab } from "@/components/admin/p2g/P2GExpertLevelsTab";

const TABS = [
  { id: "dashboard", label: "Einstellungen", icon: Coins },
  { id: "wallets", label: "Benutzer-Wallets", icon: Users },
  { id: "expert-levels", label: "Expert Levels", icon: Trophy },
] as const;

type TabId = typeof TABS[number]["id"];

function P2GExchangeRateCard() {
  const [creditsPerEuro, setCreditsPerEuro] = useState(100);
  const [creditsMaxPercent, setCreditsMaxPercent] = useState(50);
  const [creditsPaymentEnabled, setCreditsPaymentEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("credits_per_euro, credits_payment_max_percent, feature_credits_payment_enabled")
        .eq("id", "global")
        .single();

      if (error) throw error;

      const d = data as any;
      setCreditsPerEuro(d?.credits_per_euro ?? 100);
      setCreditsMaxPercent(d?.credits_payment_max_percent ?? 50);
      setCreditsPaymentEnabled(d?.feature_credits_payment_enabled ?? false);
    } catch (error) {
      console.error("Error fetching P2G Punktewert settings:", error);
      toast.error("Fehler beim Laden der Punktewert-Einstellungen");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCreditsPayment = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ feature_credits_payment_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", "global");
      if (error) throw error;
      setCreditsPaymentEnabled(enabled);
      toast.success(enabled ? "Punkte-Zahlung aktiviert" : "Punkte-Zahlung deaktiviert");
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsToggling(false);
    }
  };

  const saveExchangeRate = async () => {
    if (creditsPerEuro < 1) {
      toast.error("Punkte pro Euro muss mindestens 1 sein");
      return;
    }
    if (creditsMaxPercent < 1 || creditsMaxPercent > 100) {
      toast.error("Max. Prozent muss zwischen 1 und 100 liegen");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          credits_per_euro: creditsPerEuro,
          credits_payment_max_percent: creditsMaxPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
      if (error) throw error;
      toast.success("Punktewert-Einstellungen gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6 flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const euroValue =
    creditsPerEuro > 0
      ? (100 / creditsPerEuro).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "0,00";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${creditsPaymentEnabled ? "bg-primary/10" : "bg-muted"}`}>
              <Coins className={`h-6 w-6 ${creditsPaymentEnabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                P2G Punktewert
                {creditsPaymentEnabled ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                    Aktiv
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inaktiv
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Wechselkurs für P2G Punkte als Zahlungsmittel beim Buchungs-Checkout.
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
              disabled={isToggling}
            />
            {isToggling && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="border-t border-border/50 pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Punkte pro Euro</Label>
            <p className="text-xs text-muted-foreground">Wie viele P2G Punkte einem Euro entsprechen.</p>
            <Input
              type="number"
              min={1}
              value={creditsPerEuro}
              onChange={(e) => setCreditsPerEuro(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Max. Rabatt durch Punkte (%)</Label>
            <p className="text-xs text-muted-foreground">
              Wie viel Prozent des Buchungspreises maximal mit Punkten bezahlt werden kann.
            </p>
            <Input
              type="number"
              min={1}
              max={100}
              value={creditsMaxPercent}
              onChange={(e) => setCreditsMaxPercent(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </div>
        <p className="text-sm font-medium text-foreground">
          100 Punkte = {euroValue} €
        </p>
        <Button size="sm" onClick={saveExchangeRate} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Einstellungen speichern
        </Button>
      </CardContent>
    </Card>
  );
}

function P2GPaybackRatesCard() {
  const [rate60, setRate60] = useState(100);
  const [rate90, setRate90] = useState(150);
  const [rate120, setRate120] = useState(200);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("payback_points_60min, payback_points_90min, payback_points_120min")
        .eq("id", "global")
        .maybeSingle();
      const d = data as any;
      if (d) {
        setRate60(Number(d.payback_points_60min ?? 100));
        setRate90(Number(d.payback_points_90min ?? 150));
        setRate120(Number(d.payback_points_120min ?? 200));
      }
      setIsLoading(false);
    })();
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("site_settings")
        .update({
          payback_points_60min: Math.max(0, Math.round(rate60)),
          payback_points_90min: Math.max(0, Math.round(rate90)),
          payback_points_120min: Math.max(0, Math.round(rate120)),
        })
        .eq("id", "global");
      if (error) throw error;
      toast.success("Payback-Raten gespeichert");
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          Payback pro Buchung
        </CardTitle>
        <CardDescription>
          Feste Punkte-Rückvergütung je Buchungslänge — wird mit dem Expert-Level-Multiplikator multipliziert.
          Kein Payback bei Zahlung mit Gutscheincode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Payback für 60 Min (Punkte)</Label>
            <Input type="number" min={0} value={rate60} onChange={(e) => setRate60(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Payback für 90 Min (Punkte)</Label>
            <Input type="number" min={0} value={rate90} onChange={(e) => setRate90(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Payback für 120 Min (Punkte)</Label>
            <Input type="number" min={0} value={rate120} onChange={(e) => setRate120(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Beispiel bei Level-Multiplikator ×1,5: 60-Min-Buchung ergibt {Math.round(rate60 * 1.5)} Punkte,
          90-Min-Buchung {Math.round(rate90 * 1.5)} Punkte, 120-Min-Buchung {Math.round(rate120 * 1.5)} Punkte.
          Bei Stornierung wird das gutgeschriebene Payback automatisch zurückgebucht.
        </p>
        <Button onClick={save} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Payback-Raten speichern
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminP2GPoints() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "dashboard";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId);
    setSearchParams({ tab: value });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>P2G Points | Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            P2G Points
          </h1>
          <p className="text-muted-foreground">
            Exchange-Rate, Payback und Expert Levels verwalten
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <div className="space-y-6">
              <P2GExchangeRateCard />
              <P2GPaybackRatesCard />
            </div>
          </TabsContent>

          <TabsContent value="wallets" className="mt-0">
            <P2GWalletsTab />
          </TabsContent>

          <TabsContent value="expert-levels" className="mt-0">
            <P2GExpertLevelsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

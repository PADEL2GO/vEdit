import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Wallet, Crown, Loader2, Save, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { P2GWalletsTab } from "@/components/admin/p2g/P2GWalletsTab";
import { P2GExpertLevelsTab } from "@/components/admin/p2g/P2GExpertLevelsTab";

const TABS = [
  { id: "dashboard", label: "Einstellungen", icon: Settings },
  { id: "wallets", label: "Benutzer-Wallets", icon: Wallet },
  { id: "expert-levels", label: "Expert Levels", icon: Crown },
] as const;

type TabId = typeof TABS[number]["id"];

const TAB_TRIGGER_CLASSES =
  "-mb-px gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-[11px] pt-0 text-sm font-bold text-[hsl(0_0%_60%)] shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none";

const FIELD_LABEL_CLASSES = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const SAVE_BUTTON_CLASSES =
  "h-[42px] w-fit gap-2 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] transition-opacity hover:opacity-90";

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
      <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const euroValue =
    creditsPerEuro > 0
      ? (100 / creditsPerEuro).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "0,00";

  return (
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-[5px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                P2G Punktewert
              </h2>
              {creditsPaymentEnabled ? (
                <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-primary/[0.28] bg-primary/[0.09] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                  <span className="h-[5px] w-[5px] rounded-full bg-primary" />
                  Aktiv
                </span>
              ) : (
                <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[hsl(0_0%_16%)] bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="h-[5px] w-[5px] rounded-full bg-muted-foreground" />
                  Inaktiv
                </span>
              )}
            </div>
            <span className="text-[13px] leading-normal text-muted-foreground">
              Wechselkurs für P2G Punkte als Zahlungsmittel beim Buchungs-Checkout.
            </span>
          </div>
          <div className="flex flex-none items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {creditsPaymentEnabled ? "Aktiv" : "Inaktiv"}
            </span>
            <Switch
              checked={creditsPaymentEnabled}
              onCheckedChange={toggleCreditsPayment}
              disabled={isToggling}
            />
            {isToggling && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <Label className={FIELD_LABEL_CLASSES}>
            Punkte pro Euro<span className="text-primary"> *</span>
          </Label>
          <Input
            type="number"
            min={1}
            value={creditsPerEuro}
            onChange={(e) => setCreditsPerEuro(Number(e.target.value))}
            className="h-[42px] rounded-[11px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-[15px] font-bold"
          />
          <p className="text-[11.5px] text-muted-foreground">
            Wie viele P2G Punkte einem Euro entsprechen.
          </p>
        </div>

        <div className="flex flex-col gap-[7px]">
          <Label className={FIELD_LABEL_CLASSES}>
            Max. Rabatt durch Punkte (%)<span className="text-primary"> *</span>
          </Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={creditsMaxPercent}
            onChange={(e) => setCreditsMaxPercent(Number(e.target.value))}
            className="h-[42px] rounded-[11px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-[15px] font-bold"
          />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Wie viel Prozent des Buchungspreises maximal mit Punkten bezahlt werden kann.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-primary/[0.26] bg-gradient-to-br from-primary/[0.09] to-primary/[0.02] px-[17px] py-[15px]">
          <span className="text-[13px] text-[hsl(0_0%_72%)]">Live-Berechnung</span>
          <span className="whitespace-nowrap font-mono text-[17px] font-bold text-primary">
            100 Punkte = {euroValue} €
          </span>
        </div>

        <Button onClick={saveExchangeRate} disabled={isSaving} className={SAVE_BUTTON_CLASSES}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Einstellungen speichern
        </Button>
      </div>
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

  const rows = [
    { id: "payback-60", label: "Payback für 60 Min. (Punkte)", value: rate60, setValue: setRate60 },
    { id: "payback-90", label: "Payback für 90 Min. (Punkte)", value: rate90, setValue: setRate90 },
    { id: "payback-120", label: "Payback für 120 Min. (Punkte)", value: rate120, setValue: setRate120 },
  ];

  return (
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-[5px]">
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">
            Payback pro Buchung
          </h2>
          <span className="text-[13px] leading-normal text-muted-foreground">
            Feste Punkte-Rückvergütung je Buchungslänge — wird mit dem Expert-Level-Multiplikator
            multipliziert. Kein Payback bei Zahlung mit Gutscheincode.
          </span>
        </div>

        <div className="flex flex-col gap-[11px]">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3.5 rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.03] px-[15px] py-[13px]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Label htmlFor={row.id} className="text-[13.5px] font-semibold leading-snug text-foreground">
                  {row.label}
                </Label>
                <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  ×1,5 Level = {Math.round(row.value * 1.5)} P.
                </span>
              </div>
              <div className="relative flex flex-none items-center">
                <Input
                  id={row.id}
                  type="number"
                  min={0}
                  value={row.value}
                  onChange={(e) => row.setValue(parseInt(e.target.value) || 0)}
                  className="h-[38px] w-24 rounded-[10px] border-[hsl(0_0%_16%)] bg-white/[0.05] pr-8 font-mono text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 font-mono text-[11px] text-muted-foreground">
                  P.
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-[13px] border border-[hsl(41_100%_65%/0.22)] bg-[hsl(41_100%_65%/0.06)] px-[15px] py-[13px]">
          <Info className="mt-0.5 h-4 w-4 flex-none text-[#FFC44D]" />
          <span className="text-[12.5px] leading-relaxed text-[hsl(0_0%_78%)]">
            Bei Stornierung wird das gutgeschriebene Payback automatisch zurückgebucht.
          </span>
        </div>

        <Button onClick={save} disabled={isSaving} className={SAVE_BUTTON_CLASSES}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Payback-Raten speichern
        </Button>
      </div>
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

      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          Exchange-Rate, Payback und Expert Levels verwalten
        </p>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-5">
          <TabsList className="h-auto w-full justify-start gap-5 overflow-x-auto rounded-none border-b border-[hsl(0_0%_12%)] bg-transparent p-0 sm:gap-[22px]">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className={TAB_TRIGGER_CLASSES}>
                <tab.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-[18px]">
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

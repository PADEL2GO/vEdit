import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, Save, Plug } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StripeConfig {
  secret_key: string;
  webhook_secret: string;
  publishable_key: string;
  mode: string;
  has_secret_key: boolean;
  has_webhook_secret: boolean;
}

interface ResendConfig {
  api_key: string;
  from_email: string;
  has_api_key: boolean;
}

interface AppConfig {
  url: string;
}

interface AnthropicConfig {
  api_key: string;
  has_api_key: boolean;
}

interface DeeplConfig {
  api_key: string;
  has_api_key: boolean;
}

interface PaypalConfig {
  client_id: string;
  client_secret: string;
  mode: string;
  has_client_id: boolean;
  has_client_secret: boolean;
}

interface ServiceRow {
  service: string;
  config: Record<string, string | boolean>;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// get_integration_configs_masked() returns secret values as "••••" + last 4 chars.
const MASK_PREFIX = "••••";
const isMasked = (v: unknown): boolean =>
  typeof v === "string" && v.startsWith(MASK_PREFIX);

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Verbunden
    </Badge>
  ) : (
    <Badge className="bg-red-500/15 text-red-500 border-red-500/30 gap-1">
      <XCircle className="w-3 h-3" /> Nicht konfiguriert
    </Badge>
  );
}

function SecretInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Beim Speichern neu eingeben"}
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminIntegrations() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // Last loaded (masked) config per service — used on save to detect unchanged
  // fields and to carry over untouched plain values into the full-jsonb upsert.
  const [originalConfigs, setOriginalConfigs] = useState<Record<string, Record<string, unknown>>>({});

  // Per-service form state (empty string = "don't change")
  const [stripe, setStripe] = useState<StripeConfig>({
    secret_key: "", webhook_secret: "", publishable_key: "", mode: "test",
    has_secret_key: false, has_webhook_secret: false,
  });
  const [resendState, setResendState] = useState<ResendConfig>({
    api_key: "", from_email: "", has_api_key: false,
  });
  const [appState, setAppState] = useState<AppConfig>({ url: "" });
  const [anthropicState, setAnthropicState] = useState<AnthropicConfig>({
    api_key: "",
    has_api_key: false,
  });
  const [deeplState, setDeeplState] = useState<DeeplConfig>({
    api_key: "",
    has_api_key: false,
  });
  const [paypal, setPaypal] = useState<PaypalConfig>({
    client_id: "", client_secret: "", mode: "sandbox",
    has_client_id: false, has_client_secret: false,
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    // Direct SELECT on site_integration_configs is no longer allowed;
    // reads go through the masking RPC (secrets come back as "••••" + last4).
    const { data, error } = await (supabase.rpc as any)("get_integration_configs_masked");

    if (error || !data) {
      toast.error("Fehler beim Laden der Konfigurationen", { description: error?.message });
      setIsLoading(false);
      return;
    }

    const originals: Record<string, Record<string, unknown>> = {};
    for (const row of data as ServiceRow[]) {
      originals[row.service] = (row.config as Record<string, unknown>) ?? {};
    }
    setOriginalConfigs(originals);

    for (const row of data as ServiceRow[]) {
      const c = (row.config as Record<string, string>) ?? {};
      if (row.service === "stripe") {
        setStripe({
          secret_key: "",
          webhook_secret: "",
          publishable_key: c.publishable_key ?? "",
          mode: c.mode || "test",
          has_secret_key: !!c.secret_key,
          has_webhook_secret: !!c.webhook_secret,
        });
      }
      if (row.service === "resend") {
        setResendState({
          api_key: "",
          from_email: c.from_email ?? "",
          has_api_key: !!c.api_key,
        });
      }
      if (row.service === "app") {
        setAppState({ url: c.url ?? "" });
      }
      if (row.service === "anthropic") {
        setAnthropicState({
          api_key: "",
          has_api_key: !!c.api_key,
        });
      }
      if (row.service === "deepl") {
        setDeeplState({
          api_key: "",
          has_api_key: !!c.api_key,
        });
      }
      if (row.service === "paypal") {
        setPaypal({
          client_id: "",
          client_secret: "",
          mode: c.mode || "sandbox",
          has_client_id: !!c.client_id,
          has_client_secret: !!c.client_secret,
        });
      }
    }
    setIsLoading(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  // Secrets can no longer be read back from the browser (no SELECT policy;
  // reads are masked), and the upsert replaces the whole config jsonb. We
  // therefore: skip the upsert entirely when nothing changed, carry over
  // untouched plain (non-masked) values from the loaded config, and warn the
  // admin that secret fields which were not re-entered get cleared.
  const save = async (service: string, newConfig: Record<string, string>) => {
    const original = originalConfigs[service] ?? {};
    const payload: Record<string, string> = {};
    const clearedSecrets: string[] = [];
    let changed = false;

    for (const [k, v] of Object.entries(newConfig)) {
      if (v === "" || v === null || v === undefined || isMasked(v)) {
        // Empty or still-masked = unchanged; the real value cannot be read
        // back, so it cannot survive a full-config upsert.
        if (original[k] !== undefined && original[k] !== "") clearedSecrets.push(k);
        continue;
      }
      payload[k] = v;
      if (v !== original[k]) changed = true;
    }

    // Preserve plain values stored in the config that this form doesn't manage
    for (const [k, v] of Object.entries(original)) {
      if (k in newConfig) continue;
      if (isMasked(v)) clearedSecrets.push(k);
      else payload[k] = String(v);
    }

    if (!changed) {
      toast.info("Keine Änderungen", {
        description: "Es wurde nichts gespeichert — bestehende Schlüssel bleiben erhalten.",
      });
      return;
    }

    setSaving(service);
    // Table is not in the generated types.ts yet
    const { error } = await (supabase.from as any)("site_integration_configs")
      .upsert({ service, config: payload, updated_at: new Date().toISOString() });

    setSaving(null);
    if (error) {
      toast.error("Fehler beim Speichern", { description: error.message });
    } else {
      toast.success("Gespeichert", { description: `${service}-Konfiguration aktualisiert.` });
      if (clearedSecrets.length > 0) {
        toast.warning("Geheime Felder wurden entfernt", {
          description: `Nicht neu eingegebene Werte (${clearedSecrets.join(", ")}) wurden beim Speichern gelöscht. Bitte neu eingeben, falls sie weiterhin benötigt werden.`,
          duration: 10000,
        });
      }
      loadConfigs();
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            Integrationen
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte alle externen Dienste und API-Verbindungen. Geheime Schlüssel werden serverseitig gespeichert
            und sind nach dem Speichern im Browser nicht mehr lesbar.
          </p>
        </div>

        {/* ── Stripe ─────────────────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#635bff]/10 flex items-center justify-center text-lg font-bold text-[#635bff]">S</div>
                <div>
                  <CardTitle className="text-lg">Stripe</CardTitle>
                  <CardDescription>Zahlungsabwicklung für Courtbuchungen</CardDescription>
                </div>
              </div>
              <StatusBadge configured={stripe.has_secret_key && stripe.has_webhook_secret} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <div className="grid sm:grid-cols-2 gap-4">
              <SecretInput
                label="Secret Key"
                value={stripe.secret_key}
                onChange={(v) => setStripe(p => ({ ...p, secret_key: v }))}
                hint={stripe.has_secret_key ? "Schlüssel hinterlegt — beim Speichern neu eingeben, sonst wird er entfernt" : "sk_live_... oder sk_test_..."}
              />
              <SecretInput
                label="Webhook Secret"
                value={stripe.webhook_secret}
                onChange={(v) => setStripe(p => ({ ...p, webhook_secret: v }))}
                hint={stripe.has_webhook_secret ? "Secret hinterlegt — beim Speichern neu eingeben, sonst wird es entfernt" : "whsec_..."}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Publishable Key <span className="text-muted-foreground">(öffentlich)</span></Label>
                <Input
                  value={stripe.publishable_key}
                  onChange={(e) => setStripe(p => ({ ...p, publishable_key: e.target.value }))}
                  placeholder="pk_live_... oder pk_test_..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Modus</Label>
                <Select value={stripe.mode} onValueChange={(v) => setStripe(p => ({ ...p, mode: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test (Testmodus)</SelectItem>
                    <SelectItem value="live">Live (Echtbetrieb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => save("stripe", {
                  secret_key: stripe.secret_key,
                  webhook_secret: stripe.webhook_secret,
                  publishable_key: stripe.publishable_key,
                  mode: stripe.mode,
                })}
                disabled={saving === "stripe"}
                size="sm"
              >
                {saving === "stripe" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Resend ─────────────────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg font-bold text-blue-500">R</div>
                <div>
                  <CardTitle className="text-lg">Resend</CardTitle>
                  <CardDescription>Buchungsbestätigungen, Einladungen und Kontaktmails</CardDescription>
                </div>
              </div>
              <StatusBadge configured={resendState.has_api_key} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <div className="grid sm:grid-cols-2 gap-4">
              <SecretInput
                label="API Key"
                value={resendState.api_key}
                onChange={(v) => setResendState(p => ({ ...p, api_key: v }))}
                hint={resendState.has_api_key ? "••• API-Key hinterlegt" : "re_..."}
              />
              <div className="space-y-1">
                <Label className="text-sm">Absender-E-Mail</Label>
                <Input
                  value={resendState.from_email}
                  onChange={(e) => setResendState(p => ({ ...p, from_email: e.target.value }))}
                  placeholder="info@padel2go-official.de"
                  type="email"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Versand läuft zentral über <strong>info@padel2go-official.de</strong> (in Resend verifizierte Domain, Kunden können direkt antworten). Nur den API-Key eintragen genügt.</p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => save("resend", {
                  api_key: resendState.api_key,
                  from_email: resendState.from_email,
                })}
                disabled={saving === "resend"}
                size="sm"
              >
                {saving === "resend" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── App-Konfiguration ───────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">P</div>
                <div>
                  <CardTitle className="text-lg">App-Konfiguration</CardTitle>
                  <CardDescription>Basis-URL und allgemeine Einstellungen</CardDescription>
                </div>
              </div>
              <StatusBadge configured={!!appState.url} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <div className="space-y-1">
              <Label className="text-sm">App URL</Label>
              <Input
                value={appState.url}
                onChange={(e) => setAppState({ url: e.target.value })}
                placeholder="https://padel2go.de"
                type="url"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Wird für Weiterleitungen nach der Zahlung und in E-Mails verwendet.</p>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => save("app", { url: appState.url })}
                disabled={saving === "app"}
                size="sm"
              >
                {saving === "app" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Anthropic (KI) ─────────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-lg font-bold text-orange-500">A</div>
                <div>
                  <CardTitle className="text-lg">Anthropic (KI)</CardTitle>
                  <CardDescription>KI-Texterstellung für News-Artikel (Voice-In im News-Editor)</CardDescription>
                </div>
              </div>
              <StatusBadge configured={anthropicState.has_api_key} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <SecretInput
              label="API Key"
              value={anthropicState.api_key}
              onChange={(v) => setAnthropicState((p) => ({ ...p, api_key: v }))}
              hint={anthropicState.has_api_key ? "••• API-Key hinterlegt" : "sk-ant-..."}
            />
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => save("anthropic", { api_key: anthropicState.api_key })}
                disabled={saving === "anthropic"}
                size="sm"
              >
                {saving === "anthropic" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── DeepL (Auto-Translation) ───────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F2B46]/10 flex items-center justify-center text-lg font-bold text-[#0F2B46] dark:text-white dark:bg-white/10">D</div>
                <div>
                  <CardTitle className="text-lg">DeepL</CardTitle>
                  <CardDescription>Automatische DE→EN Übersetzung von Admin-Inhalten (Partner-Tiles, Vereine, Galerie, Touchpoints)</CardDescription>
                </div>
              </div>
              <StatusBadge configured={deeplState.has_api_key} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <SecretInput
              label="API Key"
              value={deeplState.api_key}
              onChange={(v) => setDeeplState((p) => ({ ...p, api_key: v }))}
              hint={deeplState.has_api_key ? "••• API-Key hinterlegt" : "z.B. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx (Free) oder ohne :fx (Pro)"}
            />
            <p className="text-xs text-muted-foreground">
              Beim Speichern eines Inhalts im Admin (z.B. Partner-Tile, Verein, Touchpoint) wird der deutsche Text automatisch an DeepL geschickt und das Ergebnis in die EN-Felder geschrieben — solange die Felder nicht manuell gesperrt sind.
            </p>
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => save("deepl", { api_key: deeplState.api_key })}
                disabled={saving === "deepl"}
                size="sm"
              >
                {saving === "deepl" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── PayPal (Coming Soon) ────────────────────────────────────────── */}
        <Card className="border-border opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#003087]/10 flex items-center justify-center text-lg font-bold text-[#003087]">P</div>
                <div>
                  <CardTitle className="text-lg">PayPal</CardTitle>
                  <CardDescription>Alternative Zahlungsmethode</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-muted-foreground">Demnächst verfügbar</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 border-t border-border/50">
            <div className="grid sm:grid-cols-2 gap-4">
              <SecretInput
                label="Client ID"
                value={paypal.client_id}
                onChange={(v) => setPaypal(p => ({ ...p, client_id: v }))}
                placeholder="Noch nicht verfügbar"
              />
              <SecretInput
                label="Client Secret"
                value={paypal.client_secret}
                onChange={(v) => setPaypal(p => ({ ...p, client_secret: v }))}
                placeholder="Noch nicht verfügbar"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Modus</Label>
                <Select value={paypal.mode} onValueChange={(v) => setPaypal(p => ({ ...p, mode: v }))} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                    <SelectItem value="live">Live (Echtbetrieb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button size="sm" disabled>
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <Plug className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Sicherheitshinweis</p>
                <p>
                  Geheime Schlüssel (Secret Keys) werden serverseitig gespeichert. Nach dem Speichern sind sie im
                  Browser nicht mehr lesbar — es wird nur eine maskierte Vorschau angezeigt. Beim erneuten Speichern
                  eines Dienstes müssen geheime Felder <strong>neu eingegeben</strong> werden, sonst werden sie entfernt
                  (du erhältst dann einen Warnhinweis).
                </p>
                <p>
                  Alternativ kannst du Schlüssel direkt als{" "}
                  <strong>Supabase Edge Function Secrets</strong> hinterlegen — diese haben Vorrang vor der hier gespeicherten Konfiguration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

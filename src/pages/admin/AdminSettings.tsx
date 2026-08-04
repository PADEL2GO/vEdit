import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const LOCKS = [
  {
    key: "pin_lock_vereine" as const,
    label: 'Sperre für „Für Vereine"',
    hint: "PIN-Eingabe für /fuer-vereine erforderlich",
  },
  {
    key: "pin_lock_partner" as const,
    label: 'Sperre für „Für Partner"',
    hint: "PIN-Eingabe für /fuer-partner erforderlich",
  },
];

const PLACEHOLDER_GROUPS = [
  {
    title: "Benachrichtigungen",
    icon: Bell,
    items: [
      { label: "Buchungsbestätigungen", hint: "E-Mail bei neuen Buchungen senden", on: true },
      { label: "Stornierungsbenachrichtigungen", hint: "E-Mail bei Stornierungen senden", on: true },
      { label: "Admin-Benachrichtigungen", hint: "Admins über wichtige Ereignisse informieren", on: true },
    ],
  },
  {
    title: "Sicherheit",
    icon: ShieldCheck,
    items: [
      { label: "Zwei-Faktor-Authentifizierung", hint: "2FA für Admin-Konten erforderlich machen", on: false },
      { label: "Session-Timeout", hint: "Automatisch abmelden nach Inaktivität", on: true },
    ],
  },
];

export default function AdminSettings() {
  const { settings, isLoading, isSaving, updateSetting } = useSiteSettings();

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          PIN-Sperren der B2B-Seiten und allgemeine Systemeinstellungen.
        </p>

        {/* Inhalts-Sperre — echtes Backend (site_settings) */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary">
                  <Lock className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">
                    Inhalts-Sperre
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    B2B-Seiten für nicht autorisierte Besucher sperren (PIN erforderlich).
                  </span>
                </div>
              </div>
              <span className="inline-flex flex-none items-center gap-[7px] whitespace-nowrap rounded-full border border-primary/[0.28] bg-primary/[0.09] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                <span className="h-[5px] w-[5px] rounded-full bg-primary" />
                Persistiert
              </span>
            </div>

            <div className="flex flex-col gap-[11px]">
              {LOCKS.map((lock) => (
                <div
                  key={lock.key}
                  className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.03] p-[15px]"
                >
                  <div className="flex min-w-[180px] flex-1 flex-col gap-[3px]">
                    <Label className="text-sm font-bold text-foreground">{lock.label}</Label>
                    <span className="text-xs text-muted-foreground">{lock.hint}</span>
                    <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70">
                      site_settings.{lock.key}
                    </span>
                  </div>
                  <Switch
                    checked={settings?.[lock.key] ?? true}
                    onCheckedChange={(checked) => updateSetting(lock.key, checked)}
                    disabled={isLoading || isSaving}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-[13px] border border-[hsl(41_100%_65%/0.22)] bg-[hsl(41_100%_65%/0.06)] px-[15px] py-[13px]">
              <AlertTriangle className="mt-0.5 h-[15px] w-[15px] flex-none text-[#FFC44D]" />
              <span className="text-[12.5px] leading-relaxed text-[hsl(0_0%_78%)]">
                Beim Aktivieren einer Sperre werden{" "}
                <span className="font-semibold text-foreground">alle bisherigen Entsperrungen ungültig</span> —
                Besucher müssen die PIN erneut eingeben.
              </span>
            </div>
          </div>
        </Card>

        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Weitere Einstellungen
          </span>
          <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[hsl(0_0%_16%)] bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            UI-Platzhalter · ohne Backend
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-[18px]">
          {/* Allgemeine Einstellungen */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 opacity-70">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
                  <Settings className="h-[15px] w-[15px]" />
                </span>
                <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                  Allgemeine Einstellungen
                </span>
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="app-name"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  App Name
                </Label>
                <Input
                  id="app-name"
                  defaultValue="PADEL2GO"
                  className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04]"
                />
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="default-timezone"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Standard Zeitzone
                </Label>
                <Input
                  id="default-timezone"
                  defaultValue="Europe/Berlin"
                  disabled
                  className="h-10 rounded-[10px] border-[hsl(0_0%_13%)] bg-white/[0.03] font-semibold"
                />
              </div>
              <div className="flex items-center gap-3.5 rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.03] px-3.5 py-[13px]">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-foreground">Wartungsmodus</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    Zeigt eine Wartungsseite für alle Besucher.
                  </span>
                </div>
                <Switch />
              </div>
            </div>
          </Card>

          {/* Benachrichtigungen + Sicherheit */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            {PLACEHOLDER_GROUPS.map((group) => (
              <Card key={group.title} className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
                <div className="flex flex-col gap-[15px] opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
                      <group.icon className="h-[15px] w-[15px]" />
                    </span>
                    <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                      {group.title}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[9px]">
                    {group.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-3.5 rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.03] px-3.5 py-3"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                          <span className="text-[11.5px] text-muted-foreground">{item.hint}</span>
                        </div>
                        <Switch defaultChecked={item.on} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

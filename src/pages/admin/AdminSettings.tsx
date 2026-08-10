import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Lock, AlertTriangle } from "lucide-react";
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

export default function AdminSettings() {
  const { settings, isLoading, isSaving, updateSetting } = useSiteSettings();

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          PIN-Sperren der B2B-Seiten. Weitere Systemeinstellungen folgen, sobald die
          zugehörigen Funktionen existieren.
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
      </div>
    </AdminLayout>
  );
}

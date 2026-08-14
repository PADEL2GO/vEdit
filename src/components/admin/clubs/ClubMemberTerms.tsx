import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/pricing";

interface MemberTerms {
  club_id: string;
  home_mode: "discount" | "fixed";
  home_discount_cents: number;
  home_price_60_cents: number | null;
  home_price_90_cents: number | null;
  home_price_120_cents: number | null;
  away_discount_cents: number;
  monthly_discount_limit: number | null;
  quota_enabled: boolean;
  quota_minutes_per_member: number;
}

interface MemberRow {
  membership_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  source: string;
  valid_until: string | null;
  bookings_total: number;
  bookings_month: number;
  discount_bookings_month: number;
  discount_cents_month: number;
  free_tennis_month: number;
  quota_minutes_month: number;
  last_booking_at: string | null;
}

/** Cent-Betrag als "12,00" für die Eingabe; leeres Feld = 0. */
const toEuroInput = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);

const toCents = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
};

const FIELD =
  "h-[42px] rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 text-[13.5px]";
const BOX =
  "flex flex-col gap-3.5 rounded-[15px] border border-[hsl(0_0%_12%)] bg-white/[0.025] p-[17px]";
const BOX_TITLE = "text-[13.5px] font-bold text-foreground";
const HINT = "text-[11.5px] leading-[1.5] text-[hsl(0_0%_50%)]";

/**
 * Die mit einem Verein vereinbarten Mitglieder-Konditionen plus die Liste seiner
 * Mitglieder mit Buchungsvolumen. Was hier steht, gilt sofort für jede neue
 * Buchung — die Preisauflösung liest genau diese Werte.
 */
export function ClubMemberTerms({ clubId }: { clubId: string }) {
  const queryClient = useQueryClient();

  const { data: terms, isLoading } = useQuery({
    queryKey: ["club-member-terms", clubId],
    queryFn: async (): Promise<MemberTerms | null> => {
      const { data, error } = await (supabase as any)
        .from("club_member_terms")
        .select("*")
        .eq("club_id", clubId)
        .maybeSingle();
      if (error) throw error;
      return data as MemberTerms | null;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["club-member-overview", clubId],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await (supabase as any).rpc("club_member_overview", {
        p_club_id: clubId,
      });
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const [mode, setMode] = useState<"discount" | "fixed">("discount");
  const [homeDiscount, setHomeDiscount] = useState("");
  const [p60, setP60] = useState("");
  const [p90, setP90] = useState("");
  const [p120, setP120] = useState("");
  const [awayDiscount, setAwayDiscount] = useState("");
  const [limit, setLimit] = useState("");
  const [quotaEnabled, setQuotaEnabled] = useState(false);
  const [quotaMinutes, setQuotaMinutes] = useState("");

  useEffect(() => {
    if (!terms) return;
    setMode(terms.home_mode === "fixed" ? "fixed" : "discount");
    setHomeDiscount(toEuroInput(terms.home_discount_cents));
    setP60(toEuroInput(terms.home_price_60_cents));
    setP90(toEuroInput(terms.home_price_90_cents));
    setP120(toEuroInput(terms.home_price_120_cents));
    setAwayDiscount(toEuroInput(terms.away_discount_cents));
    setLimit(terms.monthly_discount_limit === null ? "" : String(terms.monthly_discount_limit));
    setQuotaEnabled(terms.quota_enabled);
    setQuotaMinutes(String(terms.quota_minutes_per_member ?? 0));
  }, [terms]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "fixed" && toCents(p60) === null) {
        throw new Error("Im Festpreis-Modus muss mindestens der 60-Minuten-Preis gesetzt sein.");
      }
      const { error } = await (supabase as any).from("club_member_terms").upsert(
        {
          club_id: clubId,
          home_mode: mode,
          home_discount_cents: toCents(homeDiscount) ?? 0,
          home_price_60_cents: toCents(p60),
          home_price_90_cents: toCents(p90),
          home_price_120_cents: toCents(p120),
          away_discount_cents: toCents(awayDiscount) ?? 0,
          monthly_discount_limit: limit.trim() === "" ? null : Number(limit),
          quota_enabled: quotaEnabled,
          quota_minutes_per_member: Number(quotaMinutes || 0),
        },
        { onConflict: "club_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Konditionen gespeichert");
      queryClient.invalidateQueries({ queryKey: ["club-member-terms", clubId] });
    },
    onError: (error: Error) => toast.error("Fehler: " + error.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await (supabase as any).rpc("remove_club_member", {
        p_membership_id: membershipId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mitglied entfernt");
      queryClient.invalidateQueries({ queryKey: ["club-member-overview", clubId] });
    },
    onError: (error: Error) => toast.error("Fehler: " + error.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className={BOX}>
        <div className="flex flex-col gap-0.5">
          <h3 className={BOX_TITLE}>Konditionen im Heimatverein</h3>
          <span className={HINT}>
            Gilt auf allen Courts, die diesem Verein zugewiesen sind. Tennis ist dort für
            Mitglieder generell kostenlos.
          </span>
        </div>

        <div className="flex gap-2">
          {(["discount", "fixed"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-[11px] border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                mode === m
                  ? "border-primary/45 bg-primary/[0.12] text-primary"
                  : "border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_70%)] hover:border-primary/30"
              }`}
            >
              {m === "discount" ? "Rabattbetrag" : "Festpreise"}
            </button>
          ))}
        </div>

        {mode === "discount" ? (
          <div className="flex flex-col gap-1.5 sm:max-w-[220px]">
            <Label className="text-xs text-muted-foreground">Abzug pro Buchung (€)</Label>
            <Input
              value={homeDiscount}
              onChange={(e) => setHomeDiscount(e.target.value)}
              placeholder="12,00"
              className={FIELD}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "60 Min (€)", value: p60, set: setP60 },
              { label: "90 Min (€)", value: p90, set: setP90 },
              { label: "120 Min (€)", value: p120, set: setP120 },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder="20,00"
                  className={FIELD}
                />
              </div>
            ))}
            <span className={`${HINT} sm:col-span-3`}>
              Leer gelassene Dauern laufen zum Externenpreis. Festpreise schlagen auch
              Zeitfenster-Bänder.
            </span>
          </div>
        )}
      </div>

      <div className={BOX}>
        <div className="flex flex-col gap-0.5">
          <h3 className={BOX_TITLE}>Auf fremden PADEL2GO-Courts</h3>
          <span className={HINT}>
            Fixer Abzug vom Externenpreis. Auf fremden Tennis-Courts gilt der reguläre Preis.
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Abzug pro Buchung (€)</Label>
            <Input
              value={awayDiscount}
              onChange={(e) => setAwayDiscount(e.target.value)}
              placeholder="10,00"
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Max. vergünstigte Buchungen pro Mitglied und Monat
            </Label>
            <Input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="leer = unbegrenzt"
              className={FIELD}
            />
            <span className={HINT}>
              Gilt gemeinsam für Heim und Fremd. Storniertes zählt nicht mit.
            </span>
          </div>
        </div>
      </div>

      <div className={BOX}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className={BOX_TITLE}>Freikontingent für Mitglieder</h3>
            <span className={HINT}>
              Aus: nur der Club-Manager verbucht das Kontingent im Portal.
            </span>
          </div>
          <Switch checked={quotaEnabled} onCheckedChange={setQuotaEnabled} />
        </div>
        {quotaEnabled && (
          <div className="flex flex-col gap-1.5 sm:max-w-[260px]">
            <Label className="text-xs text-muted-foreground">
              Minuten pro Mitglied und Monat
            </Label>
            <Input
              value={quotaMinutes}
              onChange={(e) => setQuotaMinutes(e.target.value)}
              placeholder="120"
              className={FIELD}
            />
            <span className={HINT}>
              0 = kein Kontingent für Mitglieder. Der Vereinsrest je Court bleibt zusätzlich
              die Obergrenze.
            </span>
          </div>
        )}
      </div>

      <Button
        variant="hero"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "Speichert …" : "Konditionen speichern"}
      </Button>

      <div className={BOX}>
        <div className="flex flex-col gap-0.5">
          <h3 className={BOX_TITLE}>Vereinsmitglieder ({members?.length ?? 0})</h3>
          <span className={HINT}>
            Zahlen des laufenden Monats. Der Verein sieht dieselbe Liste im Club-Portal.
          </span>
        </div>

        {!members || members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(0_0%_18%)] px-4 py-8 text-center text-[13px] text-muted-foreground">
            Noch keine Vereinsmitglieder hinterlegt
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.membership_id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-3"
              >
                <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold text-foreground">
                    {m.display_name || m.email}
                  </span>
                  <span className="font-mono text-[11.5px] text-[hsl(0_0%_55%)]">{m.email}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/30 bg-primary/[0.1] px-[9px] py-[3px] text-[10.5px] font-bold text-primary"
                  >
                    {m.discount_bookings_month} vergünstigt
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-[hsl(0_0%_18%)] bg-white/5 px-[9px] py-[3px] text-[10.5px] font-bold text-[hsl(0_0%_72%)]"
                  >
                    −{formatPrice(m.discount_cents_month)}
                  </Badge>
                  {m.free_tennis_month > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-[hsl(0_0%_18%)] bg-white/5 px-[9px] py-[3px] text-[10.5px] font-bold text-[hsl(0_0%_72%)]"
                    >
                      {m.free_tennis_month}× Tennis
                    </Badge>
                  )}
                  {m.quota_minutes_month > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-[hsl(0_0%_18%)] bg-white/5 px-[9px] py-[3px] text-[10.5px] font-bold text-[hsl(0_0%_72%)]"
                    >
                      {m.quota_minutes_month} Min Kontingent
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMutation.mutate(m.membership_id)}
                  className="h-[30px] w-[30px] rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

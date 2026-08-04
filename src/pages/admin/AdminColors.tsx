import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TOPICS, TOPIC_COLORS } from "@/types/article";
import {
  SECTION_LABELS,
  SECTION_THEME_DEFAULTS,
  useSectionThemes,
  type SectionKey,
} from "@/hooks/useSectionThemes";

const SWATCHES = [
  "#C7F011", "#2F7BFF", "#A855F7", "#FF8A00", "#FF4D4D",
  "#2FE0C0", "#F43F5E", "#FACC15", "#22C55E", "#9AA3AE",
];

const SECTIONS = Object.keys(SECTION_THEME_DEFAULTS) as SectionKey[];
const APP_ONLY_SECTIONS: SectionKey[] = ["profile", "admin"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function useSaveSectionColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, hex }: { section: SectionKey; hex: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("site_visuals")
        .update({ image_url: hex, updated_at: new Date().toISOString() })
        .eq("key", `app.theme.${section}`)
        .select("id");
      if (error) throw error;
      // Zeile existiert noch nicht (keine Migration seedet app.theme.*) → anlegen,
      // sonst ginge das Speichern still verloren (0 rows affected)
      if (!data || data.length === 0) {
        const { error: insertError } = await (supabase as any).from("site_visuals").insert({
          key: `app.theme.${section}`,
          label: `Farbe · ${SECTION_LABELS[section]}`,
          category: "app-theme",
          image_url: hex,
        });
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["section-themes"] });
      qc.invalidateQueries({ queryKey: ["site-visuals"] });
      toast.success(
        vars.hex
          ? `${SECTION_LABELS[vars.section]}: Farbe gespeichert`
          : `${SECTION_LABELS[vars.section]}: zurückgesetzt auf Standard`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function SectionColorRow({ section }: { section: SectionKey }) {
  const themes = useSectionThemes();
  const saveMutation = useSaveSectionColor();
  const current = themes[section];
  const isDefault = current === SECTION_THEME_DEFAULTS[section];
  const [hexInput, setHexInput] = useState("");

  const apply = (hex: string) => saveMutation.mutate({ section, hex });

  const applyHexInput = () => {
    const v = hexInput.trim().startsWith("#") ? hexInput.trim() : `#${hexInput.trim()}`;
    if (!HEX_RE.test(v)) {
      toast.error("Bitte gültigen Hex-Code angeben, z. B. #2F7BFF");
      return;
    }
    apply(v.toUpperCase());
    setHexInput("");
  };

  return (
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="grid grid-cols-1 items-center gap-[18px] lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-[13px]">
          <div className="flex flex-wrap items-center gap-[13px]">
            <span
              className="h-10 w-10 flex-none rounded-full"
              style={{ background: current, boxShadow: `0 0 22px ${current}66` }}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-[9px]">
                <span className="font-display text-base font-bold tracking-tight text-foreground">
                  {SECTION_LABELS[section]}
                </span>
                <span className="whitespace-nowrap rounded-md border border-[hsl(0_0%_15%)] bg-white/5 px-[7px] py-0.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                  app.theme.{section}
                </span>
                {APP_ONLY_SECTIONS.includes(section) && (
                  <span className="whitespace-nowrap rounded-full border border-[hsl(41_100%_65%/0.28)] bg-[hsl(41_100%_65%/0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#FFC44D]">
                    nur App
                  </span>
                )}
              </div>
              <span className="font-mono text-[13px] font-bold text-[hsl(0_0%_82%)]">
                {current.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() => apply(hex)}
                className={`h-[30px] w-[30px] flex-none rounded-[9px] border-2 transition-transform hover:scale-110 ${
                  current.toUpperCase() === hex.toUpperCase() ? "border-white" : "border-transparent"
                }`}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-[9px]">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Hex
            </span>
            <Input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#HEX"
              className="h-9 w-[110px] rounded-[9px] border-[hsl(0_0%_16%)] bg-white/5 px-[11px] font-mono text-[13px] font-bold uppercase"
              onKeyDown={(e) => e.key === "Enter" && applyHexInput()}
            />
          </label>
          <Button
            size="sm"
            onClick={applyHexInput}
            disabled={!hexInput.trim()}
            className="h-9 rounded-[9px] bg-gradient-lime px-3.5 text-[12.5px] font-bold text-primary-foreground hover:opacity-90"
          >
            Setzen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate({ section, hex: null })}
            disabled={isDefault}
            title={`Standard: ${SECTION_THEME_DEFAULTS[section]}`}
            className="h-9 rounded-[9px] border-[hsl(0_0%_16%)] bg-white/5 px-[13px] text-[12.5px] font-bold text-[hsl(0_0%_82%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
          >
            <RotateCcw className="mr-[7px] h-3.5 w-3.5" /> Standard
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminColors() {
  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <div className="flex max-w-[760px] flex-col gap-[9px]">
          <p className="text-sm leading-[1.55] text-muted-foreground">
            Farbwelten pro Section — steuern Shader-Hintergrund und alle Akzente (Buttons, Chips,
            Badges, Highlights) für eingeloggte Nutzer. Gilt zentral für die App{" "}
            <strong className="font-bold text-foreground">und</strong> die Website (gleiche
            Datenbasis, Änderungen wirken sofort in beiden). „Standard" setzt auf den
            Code-Standardwert zurück.
          </p>
          <span className="inline-flex items-center gap-[7px] self-start whitespace-nowrap rounded-full border border-primary/[0.28] bg-primary/[0.09] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
            <span className="h-[5px] w-[5px] rounded-full bg-primary" />
            Speichert sofort · kein Dialog
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <SectionColorRow key={section} section={section} />
          ))}
        </div>

        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-[13px]">
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              News-Topics — festes Farbsystem
            </span>
            <p className="max-w-[640px] text-[12.5px] leading-normal text-muted-foreground">
              Die News-Section nutzt innerhalb der Seite zusätzlich das feste Topic-Farbsystem —
              das bleibt bewusst im Code und ist hier nicht einstellbar.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {TOPICS.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-[9px] whitespace-nowrap rounded-full border border-[hsl(0_0%_14%)] bg-white/[0.04] py-[7px] pl-[9px] pr-[13px] text-[12.5px] font-semibold text-[hsl(0_0%_85%)]"
                >
                  <span
                    className="h-4 w-4 flex-none rounded-[5px]"
                    style={{ background: TOPIC_COLORS[topic] }}
                  />
                  {topic}
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {TOPIC_COLORS[topic]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function useSaveSectionColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, hex }: { section: SectionKey; hex: string | null }) => {
      const { error } = await (supabase as any)
        .from("site_visuals")
        .update({ image_url: hex, updated_at: new Date().toISOString() })
        .eq("key", `app.theme.${section}`);
      if (error) throw error;
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
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <div className="flex w-44 items-center gap-3">
        <span
          className="h-10 w-10 flex-none rounded-full border-2 border-white/10"
          style={{ background: current }}
        />
        <div className="flex flex-col">
          <span className="font-semibold">{SECTION_LABELS[section]}</span>
          <span className="font-stat text-xs text-muted-foreground">{current.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => apply(hex)}
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
              current.toUpperCase() === hex.toUpperCase() ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          placeholder="#HEX"
          className="h-8 w-24 font-stat text-xs"
          onKeyDown={(e) => e.key === "Enter" && applyHexInput()}
        />
        <Button variant="outline" size="sm" onClick={applyHexInput} disabled={!hexInput.trim()}>
          Setzen
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => saveMutation.mutate({ section, hex: null })}
          disabled={isDefault}
          title={`Standard: ${SECTION_THEME_DEFAULTS[section]}`}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Standard
        </Button>
      </div>
    </Card>
  );
}

export default function AdminColors() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6 text-primary" />
            Farben (App &amp; Website)
          </h1>
          <p className="text-sm text-muted-foreground">
            Farbwelten pro Section — steuern Shader-Hintergrund und alle Akzente (Buttons, Chips,
            Badges, Highlights) für eingeloggte Nutzer. Gilt zentral für die App <strong>und</strong> die
            Website (gleiche Datenbasis, Änderungen wirken sofort in beiden). „Standard" setzt auf den
            Code-Standardwert zurück.
          </p>
        </div>

        <div className="grid gap-3">
          {SECTIONS.map((section) => (
            <SectionColorRow key={section} section={section} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Hinweis: Die News-Section nutzt innerhalb der Seite zusätzlich das feste Topic-Farbsystem
          (Inside P2G, Events, Marketplace, Community, Business) — das bleibt bewusst im Code und ist
          hier nicht einstellbar. „Profil" und „Admin" betreffen aktuell nur die App.
        </p>
      </div>
    </AdminLayout>
  );
}

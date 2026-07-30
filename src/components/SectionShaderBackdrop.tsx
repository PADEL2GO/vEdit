import { NewsHeroShader } from "@/components/news/NewsHeroShader";

interface SectionShaderBackdropProps {
  color: string;
  /**
   * true → Shader liegt vollflächig hinter der ganzen Seite (fixed, eingeloggte User);
   * false → nur der obere Seitenbereich mit weichem Auslauf (Gäste).
   */
  full?: boolean;
}

/**
 * Shader-Hintergrund einer Section. Absolut/fixiert positioniert —
 * der Seiteninhalt muss relativ darüber liegen (relative + z-[1]).
 */
export function SectionShaderBackdrop({ color, full = false }: SectionShaderBackdropProps) {
  if (full) {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <NewsHeroShader color={color} />
        <div className="absolute inset-0 bg-background/70" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 40%, hsl(var(--background) / 0.55) 100%)" }}
        />
      </div>
    );
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden">
      <NewsHeroShader color={color} />
      <div className="absolute inset-0 bg-background/65" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, transparent 25%, hsl(var(--background)) 96%)" }}
      />
    </div>
  );
}

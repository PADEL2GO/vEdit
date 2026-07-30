import { NewsHeroShader } from "@/components/news/NewsHeroShader";

/**
 * Shader-Hintergrund für eingeloggte Sections: animierter Farb-Shader im oberen
 * Seitenbereich, weich in den Seitenhintergrund auslaufend. Absolut positioniert —
 * der Seiteninhalt muss relativ darüber liegen (relative + z-[1]).
 */
export function SectionShaderBackdrop({ color }: { color: string }) {
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

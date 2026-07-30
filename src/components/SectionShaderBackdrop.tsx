import { NewsHeroShader } from "@/components/news/NewsHeroShader";

/**
 * Vollflächiger Shader-Hintergrund einer Section (Gäste wie eingeloggte User):
 * animierter Farb-Shader hinter der ganzen Seite, am Viewport fixiert, mit
 * dunklem Overlay für Lesbarkeit. Bilder und Inhalte liegen unverändert darüber —
 * der Seiteninhalt muss relativ positioniert sein (relative + z-[1]).
 */
export function SectionShaderBackdrop({ color }: { color: string }) {
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

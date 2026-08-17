import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Vollflächiger Court-Grid-Hintergrund einer Seite (Design "Hero Court Grid"):
 * Court-Grundrisse als gekipptes Raster, einzelne Courts leuchten auf ("hier wird
 * gerade gebucht"), ein Scanband läuft durch, Vignette hält den Rand ruhig. Am
 * Viewport fixiert — der Seiteninhalt muss relativ positioniert sein (relative + z-[1]).
 *
 * Performance: alles läuft über CSS-Hintergründe, animiert wird ausschließlich
 * `transform`/`opacity`. Ein animiertes SVG (Pattern in einem <g transform>) müsste der
 * Browser pro Frame neu rastern — bei einer fixierten, vollflächigen Ebene ruckelt davon
 * das ganze Scrollen.
 */

const COURT_PATH = "M20 20 H180 V100 H20 Z M100 20 V100 M44 20 V100 M156 20 V100 M44 60 H156";

/** Court-Grundriss als 200x120-Kachel für background-image. */
const courtTile = (strokeWidth: number, strokeOpacity = 1) =>
`url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><path d="${COURT_PATH}" fill="none" stroke="#C7F011" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/></svg>`
)}")`;

const GRID_TILE = courtTile(1.25);
const FLARE_TILE = courtTile(1.6, 0.22);

/** [x, y, Delay im 56s-Zyklus] — Positionen im 200x120-Kachelraster */
const FLARES: [number, number, number][] = [
  [0, 120, 0],
  [600, 0, 3.6],
  [1200, 240, 7.1],
  [200, 480, 10.9],
  [1600, 120, 14.2],
  [800, 600, 18],
  [400, 840, 21.4],
  [1400, 720, 25.1],
  [1000, 360, 28.4],
  [0, 720, 32.2],
  [1800, 480, 35.6],
  [600, 960, 39.3],
  [1200, 0, 42.7],
  [200, 240, 46.4],
  [1600, 840, 49.8],
  [800, 120, 53.2],
];

const DRIFT = "p2gDrift var(--driftT, 116s) linear infinite";
const TILT = "rotate(-9deg) skewX(-9deg)";

/**
 * Verschiebt die Grafikebene sanft gegen den Zeiger (max. 12px). Läuft nur mit echter
 * Maus und nur solange sich etwas bewegt — ein Dauer-rAF kostet auf jedem Frame Zeit,
 * die beim Scrollen fehlt.
 */
function usePointerParallax(layer: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layerEl = layer.current;
    if (!layerEl) return;

    const MAX = 12;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const tick = () => {
      const dx = tx - cx;
      const dy = ty - cy;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        raf = 0;
        return;
      }
      cx += dx * 0.045;
      cy += dy * 0.045;
      layerEl.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -2 * MAX;
      ty = (e.clientY / window.innerHeight - 0.5) * -2 * MAX;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      layerEl.style.transform = "";
    };
  }, [layer]);
}

/** Gekipptes, driftendes Court-Raster. `opacity` steuert die Linienstärke. */
function GridLayer({ opacity, withFlares = false }: {opacity: number;withFlares?: boolean;}) {
  return (
    <div className="absolute inset-0" style={{ transform: TILT }}>
      <div className="p2g-drift absolute -inset-[30%]" style={{ animation: DRIFT }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: GRID_TILE, backgroundSize: "200px 120px", opacity }} />

        {withFlares &&
        FLARES.map(([x, y, delay]) =>
        <div
          key={`${x}-${y}`}
          className="p2g-flare absolute h-[120px] w-[200px]"
          style={{
            left: x,
            top: y,
            backgroundImage: FLARE_TILE,
            animation: `p2gFlare 56s ${delay}s infinite both`
          }} />

        )}
      </div>
    </div>);

}

export function CourtGridBackdrop() {
  const layerRef = useRef<HTMLDivElement>(null);
  usePointerParallax(layerRef);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          "--flareO": 0.22,
          "--scanT": "8s",
          "--driftT": "116s",
          "--vigO": 0.8,
          background: "#0A0A0A",
          // Hält Layout- und Paint-Invalidierungen der Seite aus dieser Ebene heraus
          contain: "layout paint"
        } as CSSProperties
      }>

      <div ref={layerRef} className="absolute inset-0 will-change-transform">
        {/* Court-Grundrisse + aufleuchtende Courts */}
        <GridLayer opacity={0.07} withFlares />

        {/* Dot-Grid darüber */}
        <div
          className="absolute inset-0 opacity-[.03]"
          style={{
            backgroundImage: "radial-gradient(#C7F011 1.5px, transparent 1.6px)",
            backgroundSize: "26px 26px"
          }} />


        {/* Scanband — auf Telefonen aus, dort zählt jedes Frame */}
        <div
          className="p2g-scan absolute left-0 top-0 hidden h-full w-[320px] overflow-hidden sm:block"
          style={{
            transform: "translateX(-320px)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 34%, #000 66%, rgba(0,0,0,0) 100%)",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 34%, #000 66%, rgba(0,0,0,0) 100%)",
            animation: "p2gScan var(--scanT, 8s) linear infinite"
          }}>

          {/* Gegenbewegung: hält die aufgehellten Linien geometrisch still */}
          <div
            className="p2g-scan-inv absolute left-0 top-0 h-full w-screen"
            style={{ transform: "translateX(320px)", animation: "p2gScanInv var(--scanT, 8s) linear infinite" }}>

            <GridLayer opacity={0.2} />
          </div>
          <div className="absolute inset-0 bg-[#C7F011] opacity-10" />
        </div>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
          "radial-gradient(115% 95% at 50% 46%, rgba(10,10,10,0) 26%, rgba(10,10,10,.45) 64%, rgba(10,10,10,var(--vigO, .8)) 100%)"
        }} />

    </div>);

}

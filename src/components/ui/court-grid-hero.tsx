import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Hero "Court Grid" — Court-Grundrisse als gekipptes Raster, einzelne Courts
 * leuchten auf ("hier wird gerade gebucht"), ein Scanband läuft durch und ein
 * Pointer-Parallax verschiebt die Ebene leicht. Vignette hält den Rand ruhig.
 */

const COURT_PATH = "M20 20 H180 V100 H20 Z M100 20 V100 M44 20 V100 M156 20 V100 M44 60 H156";

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

/** Verschiebt die Grafikebene sanft gegen den Zeiger (max. 12px). */
function usePointerParallax(
  host: React.RefObject<HTMLElement>,
  layer: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hostEl = host.current;
    const layerEl = layer.current;
    if (!hostEl || !layerEl) return;

    const MAX = 12;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const onMove = (e: PointerEvent) => {
      const r = hostEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -2 * MAX;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -2 * MAX;
    };
    const onLeave = () => {tx = 0;ty = 0;};
    const tick = () => {
      cx += (tx - cx) * 0.045;
      cy += (ty - cy) * 0.045;
      layerEl.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
      raf = requestAnimationFrame(tick);
    };

    hostEl.addEventListener("pointermove", onMove);
    hostEl.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      hostEl.removeEventListener("pointermove", onMove);
      hostEl.removeEventListener("pointerleave", onLeave);
      layerEl.style.transform = "";
    };
  }, [host, layer]);
}

export function CourtGridHero({ children }: {children?: ReactNode;}) {
  const hostRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  usePointerParallax(hostRef, layerRef);

  return (
    <section
      ref={hostRef}
      className="relative grid items-center overflow-hidden"
      style={
        {
          "--lineO": 0.07,
          "--flareO": 0.22,
          "--scanT": "8s",
          "--driftT": "116s",
          "--vigO": 0.8,
          background: "#0A0A0A",
          minHeight: "max(560px, min(92vh, 900px))"
        } as CSSProperties
      }>

      <div ref={layerRef} aria-hidden className="absolute inset-0 will-change-transform">
        {/* Court-Grundrisse, Grundraster */}
        <svg width="100%" height="100%" className="absolute inset-0" style={{ opacity: "var(--lineO, .07)" }}>
          <defs>
            <pattern id="p2gCourtPlan" width="200" height="120" patternUnits="userSpaceOnUse">
              <path d={COURT_PATH} fill="none" stroke="#C7F011" strokeWidth="1.25" />
            </pattern>
            <pattern id="p2gDotGrid" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#C7F011" />
            </pattern>
          </defs>
          <g transform="rotate(-9) skewX(-9)">
            <g className="p2g-drift" style={{ animation: DRIFT }}>
              <rect x="-2400" y="-2400" width="7000" height="7000" fill="url(#p2gCourtPlan)" />
            </g>
          </g>
        </svg>

        {/* Einzelne Courts leuchten auf: "hier wird gerade gebucht" */}
        <svg width="100%" height="100%" className="absolute inset-0">
          <g transform="rotate(-9) skewX(-9)">
            <g className="p2g-drift" style={{ animation: DRIFT }}>
              {FLARES.map(([x, y, delay]) =>
              <path
                key={`${x}-${y}`}
                className="p2g-flare"
                d={COURT_PATH}
                transform={`translate(${x},${y})`}
                fill="none"
                stroke="#C7F011"
                strokeWidth="1.6"
                style={{ strokeOpacity: "var(--flareO, .22)", animation: `p2gFlare 56s ${delay}s infinite both` }} />

              )}
            </g>
          </g>
        </svg>

        {/* Dot-Grid darüber */}
        <svg width="100%" height="100%" className="absolute inset-0 opacity-[.03]">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#p2gDotGrid)" />
        </svg>

        {/* Scanband */}
        <div
          className="p2g-scan absolute left-0 top-0 h-full w-[320px] overflow-hidden"
          style={{
            transform: "translateX(-320px)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 34%, #000 66%, rgba(0,0,0,0) 100%)",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #000 34%, #000 66%, rgba(0,0,0,0) 100%)",
            animation: "p2gScan var(--scanT, 8s) linear infinite"
          }}>

          <div
            className="p2g-scan-inv absolute left-0 top-0 h-full w-screen"
            style={{ transform: "translateX(320px)", animation: "p2gScanInv var(--scanT, 8s) linear infinite" }}>

            <svg width="100%" height="100%" className="absolute inset-0 opacity-20">
              <g transform="rotate(-9) skewX(-9)">
                <g className="p2g-drift" style={{ animation: DRIFT }}>
                  <rect x="-2400" y="-2400" width="7000" height="7000" fill="url(#p2gCourtPlan)" />
                </g>
              </g>
            </svg>
          </div>
          <div className="absolute inset-0 bg-[#C7F011] opacity-10" />
        </div>
      </div>

      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
          "radial-gradient(115% 95% at 50% 46%, rgba(10,10,10,0) 26%, rgba(10,10,10,.45) 64%, rgba(10,10,10,var(--vigO, .8)) 100%)"
        }} />


      <div className="relative mx-auto w-full max-w-[1240px] px-[clamp(24px,5vw,64px)] pb-16 pt-28 md:pb-20 md:pt-32">
        {children}
      </div>
    </section>);

}

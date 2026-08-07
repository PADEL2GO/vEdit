/* PADEL2GO hero background FX collection.
   Each effect is a lightweight canvas web component sized by its parent.
   Lime (#C7F011) on black, reduced-motion aware. */
(function () {
  const LIME = '199,240,17';

  class FXBase extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.overflow = 'hidden';
      this.style.background = '#000';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      const c = document.createElement('canvas');
      c.style.cssText = 'width:100%;height:100%;display:block';
      this.appendChild(c);
      this._c = c;
      this._ctx = c.getContext('2d');
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();
      if (this.setup) this.setup();
      this._t0 = performance.now();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const loop = () => {
        const t = (performance.now() - this._t0) / 1000;
        if (this._c.width > 2) this.draw(this._ctx, this._c.width, this._c.height, t);
        if (!reduced) this._raf = requestAnimationFrame(loop);
      };
      loop();
    }
    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this._c.width = Math.max(1, Math.round(this.clientWidth * dpr));
      this._c.height = Math.max(1, Math.round(this.clientHeight * dpr));
      this._dpr = dpr;
      if (this.onResize) this.onResize();
    }
    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
    }
  }

  /* ── Liquid Orbs: große, driftende Lime-Glows ─────────────────── */
  class FXOrbs extends FXBase {
    setup() {
      this._orbs = [
        { ax: 0.25, ay: 0.3, rx: 0.18, ry: 0.14, r: 0.55, s: 0.21, a: 0.16, p: 0 },
        { ax: 0.75, ay: 0.55, rx: 0.16, ry: 0.2, r: 0.65, s: 0.14, a: 0.12, p: 2.1 },
        { ax: 0.5, ay: 0.85, rx: 0.24, ry: 0.1, r: 0.5, s: 0.17, a: 0.1, p: 4.2 },
        { ax: 0.12, ay: 0.75, rx: 0.1, ry: 0.16, r: 0.4, s: 0.26, a: 0.09, p: 1.2 },
      ];
    }
    draw(ctx, w, h, t) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const base = Math.max(w, h);
      this._orbs.forEach((o) => {
        const x = (o.ax + Math.cos(t * o.s + o.p) * o.rx) * w;
        const y = (o.ay + Math.sin(t * o.s * 1.3 + o.p) * o.ry) * h;
        const r = o.r * base * (1 + 0.06 * Math.sin(t * 0.5 + o.p));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${LIME},${o.a})`);
        g.addColorStop(1, `rgba(${LIME},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    }
  }

  /* ── Court Grid: perspektivisches Raster, fließt auf dich zu ──── */
  class FXGrid extends FXBase {
    draw(ctx, w, h, t) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.42;
      // horizon glow
      let g = ctx.createRadialGradient(w / 2, horizon, 0, w / 2, horizon, w * 0.6);
      g.addColorStop(0, `rgba(${LIME},0.22)`);
      g.addColorStop(1, `rgba(${LIME},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = Math.max(1, this._dpr);
      // vertical rays from vanishing point
      const cx = w / 2;
      for (let i = -14; i <= 14; i++) {
        const x2 = cx + i * (w / 9);
        const a = 0.22 - Math.abs(i) * 0.012;
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(${LIME},${a})`;
        ctx.beginPath();
        ctx.moveTo(cx, horizon);
        ctx.lineTo(x2, h);
        ctx.stroke();
      }
      // horizontal lines rushing toward viewer
      const speed = 0.35;
      for (let i = 0; i < 16; i++) {
        let p = (i / 16 + t * speed / 16 * 4) % 1;
        const y = horizon + Math.pow(p, 2.6) * (h - horizon);
        const a = 0.05 + p * 0.3;
        ctx.strokeStyle = `rgba(${LIME},${a})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // fade top
      g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, horizon);
    }
  }

  /* ── Partikel-Netz: Punkte + Verbindungslinien ────────────────── */
  class FXParticles extends FXBase {
    setup() { this._pts = null; }
    onResize() { this._pts = null; }
    draw(ctx, w, h, t) {
      if (!this._pts) {
        const n = Math.min(90, Math.round((w * h) / 22000));
        this._pts = Array.from({ length: n }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35 * this._dpr,
          vy: (Math.random() - 0.5) * 0.35 * this._dpr,
          r: (Math.random() * 1.6 + 1) * this._dpr,
        }));
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const pts = this._pts;
      const link = 120 * this._dpr;
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x += w; if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.strokeStyle = `rgba(${LIME},${0.16 * (1 - d / link)})`;
            ctx.lineWidth = this._dpr;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach((p, i) => {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
        ctx.fillStyle = `rgba(${LIME},${0.35 + tw * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /* ── Radar Pulse: expandierende Ringe ─────────────────────────── */
  class FXRings extends FXBase {
    draw(ctx, w, h, t) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.52;
      const maxR = Math.hypot(w, h) * 0.55;
      // center glow
      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.35);
      g.addColorStop(0, `rgba(${LIME},0.14)`);
      g.addColorStop(1, `rgba(${LIME},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const N = 5, period = 5.5;
      for (let i = 0; i < N; i++) {
        const p = ((t / period) + i / N) % 1;
        const r = p * maxR;
        const a = 0.38 * (1 - p);
        ctx.strokeStyle = `rgba(${LIME},${a})`;
        ctx.lineWidth = Math.max(1, (1.6 - p) * this._dpr);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${LIME},${0.75 + 0.25 * Math.sin(t * 3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5 * this._dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Stadium Lights: schwenkende Lichtkegel ───────────────────── */
  class FXLights extends FXBase {
    draw(ctx, w, h, t) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const beams = [
        { x: w * 0.08, ang: Math.PI / 2 + Math.sin(t * 0.4) * 0.35, spread: 0.34, a: 0.16 },
        { x: w * 0.92, ang: Math.PI / 2 + Math.sin(t * 0.33 + 2) * -0.35, spread: 0.3, a: 0.14 },
        { x: w * 0.5, ang: Math.PI / 2 + Math.sin(t * 0.25 + 4) * 0.25, spread: 0.22, a: 0.08 },
      ];
      ctx.globalCompositeOperation = 'lighter';
      beams.forEach((b) => {
        const len = h * 1.35;
        const x1 = b.x + Math.cos(b.ang - b.spread) * len;
        const y1 = Math.sin(b.ang - b.spread) * len;
        const x2 = b.x + Math.cos(b.ang + b.spread) * len;
        const y2 = Math.sin(b.ang + b.spread) * len;
        const g = ctx.createLinearGradient(b.x, 0, b.x, h);
        g.addColorStop(0, `rgba(${LIME},${b.a})`);
        g.addColorStop(1, `rgba(${LIME},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(b.x, -10);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      // floor glow
      const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(${LIME},0.06)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ── Ball Trail: springender Ball mit Leuchtspur ──────────────── */
  class FXBall extends FXBase {
    setup() {
      this._b = { x: 0.3, y: 0.4, vx: 0.0038, vy: 0.0031 };
      this._first = true;
    }
    draw(ctx, w, h) {
      if (this._first) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        this._first = false;
      }
      // fading trail
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(0, 0, w, h);
      const b = this._b;
      b.x += b.vx; b.y += b.vy;
      if (b.x < 0.04 || b.x > 0.96) b.vx *= -1;
      if (b.y < 0.06 || b.y > 0.92) b.vy *= -1;
      const x = b.x * w, y = b.y * h;
      const r = Math.max(5, 0.011 * Math.max(w, h));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
      g.addColorStop(0, `rgba(${LIME},0.5)`);
      g.addColorStop(1, `rgba(${LIME},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${LIME})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const defs = {
    'p2g-fx-orbs': FXOrbs,
    'p2g-fx-grid': FXGrid,
    'p2g-fx-particles': FXParticles,
    'p2g-fx-rings': FXRings,
    'p2g-fx-lights': FXLights,
    'p2g-fx-ball': FXBall,
  };
  Object.keys(defs).forEach((k) => {
    if (!customElements.get(k)) customElements.define(k, defs[k]);
  });
})();

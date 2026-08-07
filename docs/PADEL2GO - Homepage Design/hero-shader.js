/* <p2g-fluid> — animated WebGL lime fluid background for PADEL2GO heroes.
   Organic domain-warped fbm noise, lime on black. Falls back to a static
   radial glow when WebGL is unavailable or reduced motion is preferred. */
(function () {
  if (customElements.get('p2g-fluid')) return;

  const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_speed;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 2.2;
  float t = u_time * 0.06 * u_speed;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.7),
                fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p + 2.8 * r);
  float glow = smoothstep(0.35, 0.95, f);
  vec3 lime = vec3(0.78, 0.94, 0.066);
  vec3 col = lime * glow * 0.55;
  /* soft vertical falloff so the bottom stays darker */
  col *= mix(1.0, 0.45, uv.y * uv.y);
  gl_FragColor = vec4(col, 1.0);
}`;

  const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  class P2GFluid extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.overflow = 'hidden';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this.style.background =
        'radial-gradient(ellipse at 50% 0%, hsl(71 91% 51% / 0.14), transparent 60%), #000';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:100%;display:block';
      this.appendChild(canvas);
      this._canvas = canvas;

      const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
      if (!gl) return; // static fallback stays
      this._gl = gl;

      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this._uRes = gl.getUniformLocation(prog, 'u_res');
      this._uTime = gl.getUniformLocation(prog, 'u_time');
      this._uSpeed = gl.getUniformLocation(prog, 'u_speed');

      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const start = performance.now();
      const draw = () => {
        const speed = parseFloat(this.getAttribute('speed') || '1') || 1;
        gl.uniform1f(this._uTime, (performance.now() - start) / 1000);
        gl.uniform1f(this._uSpeed, speed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!reduced) this._raf = requestAnimationFrame(draw);
      };
      draw();
    }
    _resize() {
      const gl = this._gl; if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(this.clientWidth * dpr * 0.5));
      const h = Math.max(1, Math.round(this.clientHeight * dpr * 0.5));
      this._canvas.width = w; this._canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(this._uRes, w, h);
    }
    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
    }
  }
  customElements.define('p2g-fluid', P2GFluid);
})();

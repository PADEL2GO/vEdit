/* <p2g-icon name="map-pin" size="16"> — React-safe lucide icon web component.
   Renders the SVG into a SHADOW root only — the light DOM stays untouched,
   so React never sees (or tries to remove) nodes it doesn't own. */
(function () {
  function toPascal(n) {
    return String(n || '')
      .split('-')
      .map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); })
      .join('');
  }
  class P2GIcon extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    static get observedAttributes() { return ['name', 'size', 'stroke-width']; }
    connectedCallback() { this._render(); }
    disconnectedCallback() { if (this._retry) { clearInterval(this._retry); this._retry = null; } }
    attributeChangedCallback() { this._render(); }
    _render() {
      var lu = window.lucide;
      if (!lu || !lu.createElement || !lu.icons) {
        if (!this._retry) {
          var self = this;
          this._retry = setInterval(function () {
            if (window.lucide && window.lucide.icons) {
              clearInterval(self._retry); self._retry = null; self._render();
            }
          }, 80);
        }
        return;
      }
      var node = lu.icons[toPascal(this.getAttribute('name'))];
      if (!node) { this.shadowRoot.replaceChildren(); return; }
      var svg = lu.createElement(node);
      var s = this.getAttribute('size') || '18';
      svg.setAttribute('width', s);
      svg.setAttribute('height', s);
      svg.setAttribute('stroke-width', this.getAttribute('stroke-width') || '2');
      svg.style.display = 'block';
      this.shadowRoot.replaceChildren(svg);
    }
  }
  if (!customElements.get('p2g-icon')) customElements.define('p2g-icon', P2GIcon);
})();

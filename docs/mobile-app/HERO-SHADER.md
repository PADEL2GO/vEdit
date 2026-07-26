# Home-Hero Hintergrund-Shader → App-Portierung

Der dynamische Hintergrund im Web-Hero (hinter dem Countdown, `src/components/ui/synthetic-hero.tsx`)
ist **keine Datei**, sondern ein prozeduraler GLSL-Fragment-Shader ("P2G Lime Green"),
gerendert via React Three Fiber auf ein fullscreen Quad. Inputs: nur `u_time` (Sekunden × 0.5)
und `u_resolution` (Viewport-Pixel). Keine Assets, keine Interaktion.

## Original-GLSL (Web, 1:1 aus synthetic-hero.tsx)

```glsl
// Vertex (fullscreen quad, plane args [2,2]):
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

// Fragment:
precision highp float;
varying vec2 vUv;
uniform float u_time;        // elapsedTime * 0.5
uniform vec3 u_resolution;   // (width, height, 1)

vec2 toPolar(vec2 p) { return vec2(length(p), atan(p.y, p.x)); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = 6.0 * ((fragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y);
    vec2 polar = toPolar(p);
    float r = polar.x;
    vec2 i = p;
    float c = 0.0;
    float rot = r + u_time + p.x * 0.100;
    for (float n = 0.0; n < 4.0; n++) {
        float rr = r + 0.15 * sin(u_time*0.7 + float(n) + r*2.0);
        p *= mat2(
            cos(rot - sin(u_time / 10.0)), sin(rot),
            -sin(cos(rot) - u_time / 10.0), cos(rot)
        ) * -0.25;
        float t = r - u_time / (n + 30.0);
        i -= p + sin(t - i.y) + rr;
        c += 2.2 / length(vec2((sin(i.x + t) / 0.15), (cos(i.y + t) / 0.15)));
    }
    c /= 8.0;
    vec3 baseColor = vec3(0.65, 0.9, 0.2);   // P2G Lime ≈ hsl(75, 85%, 45%)
    vec3 finalColor = baseColor * smoothstep(0.0, 1.0, c * 0.6);
    fragColor = vec4(finalColor, 1.0);
}

void main() {
    vec4 fragColor;
    vec2 fragCoord = vUv * u_resolution.xy;
    mainImage(fragColor, fragCoord);
    gl_FragColor = fragColor;
}
```

## Empfohlener Weg in Expo/RN: react-native-skia RuntimeEffect (SKSL)

`@shopify/react-native-skia` → `Skia.RuntimeEffect.Make(sksl)` + `<Canvas><Fill><Shader …/></Fill></Canvas>`,
`u_time` über `useClock()` (Millisekunden → `* 0.0005` für dasselbe Tempo wie im Web).

SKSL-Portierungshinweise (Syntax-Deltas zu GLSL ES):
- Kein `varying`/`gl_FragColor`: Signatur ist `half4 main(float2 fragCoord)`; `fragCoord` kommt in Pixeln — das ersetzt `vUv * u_resolution` direkt.
- `uniform float u_time; uniform float2 u_resolution;` (vec3 nicht nötig, `.y` reicht der Formel).
- `mat2` → `float2x2`, `vec2/3/4` → `float2/3/4`.
- Die `for`-Schleife mit float-Zähler funktioniert in SKSL; alternativ `int n` und `float(n)`.
- Rückgabe: `return half4(half3(finalColor), 1.0);`

Alternative: `expo-gl` + `expo-three` — dann läuft exakt der obige GLSL-Code unverändert
(ShaderMaterial auf PlaneGeometry(2,2), `u_time` im Render-Loop hochzählen).

Fallback ohne GPU-Aufwand: Animation im Web als nahtlosen MP4-Loop capturen und per
`expo-av` als Hintergrundvideo abspielen (visuell identisch, größerer Bundle/kein Endlos-Drift).

## Performance-Hinweis
4 Iterationen Fullscreen bei nativer Auflösung sind auf älteren Geräten spürbar.
Üblicher Trick: Canvas mit halber Pixeldichte rendern (Skia: kleineres Rect + `scale`),
der weiche Look verzeiht das komplett.

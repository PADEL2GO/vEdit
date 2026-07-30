import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Gleicher Shader wie der Homepage-Hero (synthetic-hero), aber mit
// parametrisierbarer Akzentfarbe — der Artikel-Hero läuft in der Topic-Farbe.

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec3 u_resolution;
  uniform vec3 u_color;

  vec2 toPolar(vec2 p) {
      float r = length(p);
      float a = atan(p.y, p.x);
      return vec2(r, a);
  }

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

          c += 2.2 / length(vec2(
              (sin(i.x + t) / 0.15),
              (cos(i.y + t) / 0.15)
          ));
      }

      c /= 8.0;

      vec3 finalColor = u_color * smoothstep(0.0, 1.0, c * 0.6);
      fragColor = vec4(finalColor, 1.0);
  }

  void main() {
      vec4 fragColor;
      vec2 fragCoord = vUv * u_resolution.xy;
      mainImage(fragColor, fragCoord);
      gl_FragColor = fragColor;
  }
`;

function hexToVec3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function ShaderPlane({ color }: { color: string }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: reducedMotion ? 8 : 0 },
          u_resolution: { value: new THREE.Vector3(1, 1, 1) },
          u_color: { value: hexToVec3(color) },
        },
      }),
    [color, reducedMotion],
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    if (!reducedMotion) materialRef.current.uniforms.u_time.value = state.clock.elapsedTime * 0.5;
    materialRef.current.uniforms.u_resolution.value.set(size.width, size.height, 1.0);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

/** Vollflächiger Shader-Hintergrund in der übergebenen Topic-Farbe. */
export function NewsHeroShader({ color }: { color: string }) {
  return (
    <Canvas gl={{ antialias: true }} camera={{ position: [0, 0, 1] }} style={{ width: "100%", height: "100%" }}>
      <ShaderPlane color={color} />
    </Canvas>
  );
}

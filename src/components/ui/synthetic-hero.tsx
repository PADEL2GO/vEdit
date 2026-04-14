import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Badge } from "@/components/ui/badge";
import p2gIconLogo from "@/assets/p2g-icon-logo.png";

// Extend THREE.ShaderMaterial for r3f
extend({ ShaderMaterial: THREE.ShaderMaterial });

gsap.registerPlugin(useGSAP);

// Countdown calculation helper
function calculateTimeLeft(targetDate: Date) {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

interface ShaderPlaneProps {
  vertexShader: string;
  fragmentShader: string;
  uniforms: { [key: string]: { value: unknown } };
}

const ShaderPlane = ({
  vertexShader,
  fragmentShader,
  uniforms,
}: ShaderPlaneProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime * 0.5;
      materialRef.current.uniforms.u_resolution.value.set(size.width, size.height, 1.0);
    }
  });

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
  }, [vertexShader, fragmentShader, uniforms]);

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// P2G Lime Green shader
const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec3 u_resolution;

  vec2 toPolar(vec2 p) {
      float r = length(p);
      float a = atan(p.y, p.x);
      return vec2(r, a);
  }

  vec2 fromPolar(vec2 polar) {
      return vec2(cos(polar.y), sin(polar.y)) * polar.x;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 p = 6.0 * ((fragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y);

      vec2 polar = toPolar(p);
      float r = polar.x;
      float a = polar.y;

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

      // P2G Lime Green: hsl(75, 85%, 45%) approx vec3(0.65, 0.9, 0.2)
      vec3 baseColor = vec3(0.65, 0.9, 0.2);
      vec3 finalColor = baseColor * smoothstep(0.0, 1.0, c * 0.6);

      fragColor = vec4(finalColor, 1.0);
  }

  void main() {
      vec4 fragColor;
      vec2 fragCoord = vUv * u_resolution.xy;
      mainImage(fragColor, fragCoord);
      gl_FragColor = fragColor;
  }
`;

// Simple text line animation (alternative to GSAP SplitText club plugin)
const animateLines = (element: HTMLElement) => {
  element.innerHTML = "";

  // Define exact words for the hero headline
  const words = "Dein Padel. Dein Level. Dein Spiel.".split(" ");

  words.forEach((word, wordIndex) => {
    const span = document.createElement("span");
    span.textContent = word + (wordIndex < words.length - 1 ? " " : "");
    span.style.display = "inline-block";
    span.style.opacity = "0";
    span.style.transform = "translateY(20px)";
    span.style.filter = "blur(8px)";
    element.appendChild(span);
  });

  const spans = element.querySelectorAll("span");
  gsap.to(spans, {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    delay: 0.2,
  });
};

interface HeroProps {
  title: string;
  description: string | React.ReactNode;
  badgeText?: string;
  badgeLabel?: string;
  showCountdown?: boolean;
  countdownTargetDate?: Date;
  microDetails?: Array<string>;
  showLogo?: boolean;
  children?: React.ReactNode;
}

const SyntheticHero = ({
  title = "An experiment in light, motion, and the quiet chaos between.",
  description = "Experience a new dimension of interaction — fluid, tactile, and alive.",
  badgeText = "React Three Fiber",
  badgeLabel = "Experience",
  showCountdown = false,
  countdownTargetDate = new Date("2026-03-14T00:00:00"),
  microDetails = [],
  showLogo = false,
  children,
}: HeroProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeWrapperRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLUListElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Countdown state
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(countdownTargetDate));

  useEffect(() => {
    if (!showCountdown) return;
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(countdownTargetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [showCountdown, countdownTargetDate]);
  
  const shaderUniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [],
  );

  useGSAP(
    () => {
      if (!headingRef.current) return;

      // Build the hero slogan immediately (prevents a flash of the raw `title` string)
      animateLines(headingRef.current);

      if (logoRef.current) {
        gsap.set(logoRef.current, { autoAlpha: 0, scale: 0.8 });
      }
      if (badgeWrapperRef.current) {
        gsap.set(badgeWrapperRef.current, { autoAlpha: 0, y: -8 });
      }
      if (paragraphRef.current) {
        gsap.set(paragraphRef.current, { autoAlpha: 0, y: 8 });
      }
      if (countdownRef.current) {
        gsap.set(countdownRef.current, { autoAlpha: 0, y: 8 });
      }

      const microItems = microRef.current
        ? Array.from(microRef.current.querySelectorAll("li"))
        : [];
      if (microItems.length > 0) {
        gsap.set(microItems, { autoAlpha: 0, y: 6 });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (logoRef.current) {
        tl.to(logoRef.current, { autoAlpha: 1, scale: 1, duration: 0.6 }, 0);
      }

      if (badgeWrapperRef.current) {
        tl.to(badgeWrapperRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.1);
      }

      if (paragraphRef.current) {
        tl.to(paragraphRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8);
      }

      if (countdownRef.current) {
        tl.to(countdownRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, 1.0);
      }

      if (microItems.length > 0) {
        tl.to(microItems, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 }, 1.2);
      }
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* WebGL Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          gl={{ antialias: true }}
          camera={{ position: [0, 0, 1] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ShaderPlane
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={shaderUniforms}
          />
        </Canvas>
      </div>

      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-background/70 z-[1]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24 md:pt-32 pb-20 max-w-5xl">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo */}
          {showLogo && (
            <div ref={logoRef} className="mb-2">
              <img 
                src={p2gIconLogo} 
                alt="PADEL2GO Logo" 
                className="h-24 md:h-40 lg:h-52 w-auto drop-shadow-2xl"
              />
            </div>
          )}

          {/* Badge */}
          <div ref={badgeWrapperRef} className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="px-3 py-1.5 text-xs font-semibold bg-primary/10 border-primary/20 text-primary backdrop-blur-sm"
            >
              {badgeLabel}
            </Badge>
            <span className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {badgeText}
            </span>
          </div>

          {/* Heading */}
          <h1
            ref={headingRef}
            className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground max-w-4xl"
          >
            {title}
          </h1>

          {/* Description */}
          <p
            ref={paragraphRef}
            className="text-base md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
          >
            {description}
          </p>

          {/* Launch Countdown */}
          {showCountdown && (
            <div ref={countdownRef} className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
              {[
                { value: timeLeft.days, label: "Tage" },
                { value: timeLeft.hours, label: "Stunden" },
                { value: timeLeft.minutes, label: "Minuten" },
                { value: timeLeft.seconds, label: "Sekunden" },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center p-2 sm:p-3 md:p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/20 min-w-[56px] sm:min-w-[64px] md:min-w-[80px]"
                >
                  <span className="text-xl md:text-3xl font-bold text-primary tabular-nums">
                    {String(item.value).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Micro Details - only show if not empty */}
          {microDetails && microDetails.length > 0 && (
            <ul
              ref={microRef}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              {microDetails.map((detail, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {detail}
                </li>
              ))}
            </ul>
          )}

          {/* Optional children (for scroll indicator, etc.) */}
          {children}
        </div>
      </div>
    </section>
  );
};

export default SyntheticHero;

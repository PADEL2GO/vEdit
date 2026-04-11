import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
  /** Light = weißer Hintergrund (Logos normal, Blur weiß), Dark = dunkler Hintergrund (Logos invertiert) */
  variant?: "light" | "dark";
};

export function LogoCloud({ logos, variant = "dark" }: LogoCloudProps) {
  const logoClasses = variant === "light" 
    ? "h-20 w-auto object-contain opacity-90" 
    : "h-20 w-auto object-contain brightness-0 invert opacity-80";
  
  const blurMask = variant === "light"
    ? "from-white via-white/80 to-transparent"
    : "from-background via-background/80 to-transparent";

  return (
    <div className="relative">
      <div className="flex w-full">
        <div className="relative w-full overflow-hidden">
          <InfiniteSlider gap={80} duration={20} durationOnHover={60} className="flex w-full">
            {logos.map((logo, index) => (
              <img
                key={index}
                src={logo.src}
                alt={logo.alt}
                className={logoClasses}
              />
            ))}
          </InfiniteSlider>

          {/* Left blur with gradient mask */}
          <div className={`pointer-events-none absolute left-0 top-0 h-full w-[200px] bg-gradient-to-r ${blurMask}`} />
          <ProgressiveBlur
            direction="left"
            blurIntensity={1}
            className="pointer-events-none absolute left-0 top-0 h-full w-[200px]"
          />
          
          {/* Right blur with gradient mask */}
          <div className={`pointer-events-none absolute right-0 top-0 h-full w-[200px] bg-gradient-to-l ${blurMask}`} />
          <ProgressiveBlur
            direction="right"
            blurIntensity={1}
            className="pointer-events-none absolute right-0 top-0 h-full w-[200px]"
          />
        </div>
      </div>
    </div>
  );
}

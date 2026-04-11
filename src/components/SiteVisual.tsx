import { useSiteVisual } from "@/hooks/useSiteVisuals";
import { cn } from "@/lib/utils";

interface SiteVisualProps {
  visualKey: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackSrc?: string;
}

export function SiteVisual({ 
  visualKey, 
  alt, 
  className,
  fallbackClassName,
  fallbackSrc
}: SiteVisualProps) {
  const { data: visual, isLoading } = useSiteVisual(visualKey);

  const imageUrl = visual?.image_url || visual?.placeholder_url || fallbackSrc;

  // Loading state: show fallback if provided, otherwise transparent container
  if (isLoading) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn("object-cover", className)}
        />
      );
    }
    return (
      <div className={cn("bg-transparent", className, fallbackClassName)} />
    );
  }

  // No image available: show fallback if provided, otherwise transparent container
  if (!imageUrl) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn("object-cover", className)}
        />
      );
    }
    return (
      <div className={cn("bg-transparent", className, fallbackClassName)} />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn("object-cover", className)}
    />
  );
}

import { useSiteVisual } from "@/hooks/useSiteVisuals";
import { StorageImage } from "@/components/StorageImage";
import { cn } from "@/lib/utils";

interface SiteVisualProps {
  visualKey: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackSrc?: string;
  /** Zielbreite des Storage-Derivats — Anzeigebreite × 2 (Retina). */
  renderWidth?: number;
}

export function SiteVisual({
  visualKey,
  alt,
  className,
  fallbackClassName,
  fallbackSrc,
  renderWidth = 1200
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
          loading="lazy"
          decoding="async"
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
          loading="lazy"
          decoding="async"
          className={cn("object-cover", className)}
        />
      );
    }
    return (
      <div className={cn("bg-transparent", className, fallbackClassName)} />
    );
  }

  return (
    <StorageImage
      src={imageUrl}
      renderWidth={renderWidth}
      alt={alt}
      className={cn("object-cover", className)}
    />
  );
}

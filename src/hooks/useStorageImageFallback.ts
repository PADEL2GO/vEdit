import { useEffect, type RefObject } from "react";
import { originalImage } from "@/lib/imageUrl";

/**
 * Fällt für Bilder in eingefügtem HTML einmal auf das Original zurück, wenn das Derivat
 * scheitert — der Transformer lehnt Quellen über ~25 MB mit HTTP 400 ab. In `<img onerror>`
 * geht das nicht: die Sanitisierung des Artikel-HTML erlaubt keine on*-Attribute.
 */
export function useStorageImageFallback(container: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const onError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const fallback = originalImage(img.src);
      if (fallback !== img.src) img.src = fallback;
    };

    // `error` bubbelt nicht — deshalb in der Capture-Phase lauschen.
    el.addEventListener("error", onError, true);
    return () => el.removeEventListener("error", onError, true);
  }, [container]);
}

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { originalImage, storageImage } from "@/lib/imageUrl";

type StorageImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  /** Zielbreite des Derivats — Anzeigebreite × 2 (Retina). */
  renderWidth: number;
  quality?: number;
};

/**
 * Bild aus dem Supabase-Storage über den Render-Endpunkt: skaliertes WebP mit `max-age`
 * statt Original mit `no-cache`. Schlägt das Derivat fehl (der Transformer lehnt Quellen
 * über ~25 MB mit 400 ab), wird einmal auf das Original zurückgefallen — ohne das bleibt
 * genau dort ein Loch.
 */
export function StorageImage({ src, renderWidth, quality, ...imgProps }: StorageImageProps) {
  const derivative = storageImage(src, { width: renderWidth, quality }) ?? src;
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {setUseOriginal(false);}, [derivative]);

  return (
    <img
      src={useOriginal ? originalImage(derivative) : derivative}
      onError={() => setUseOriginal(true)}
      loading="lazy"
      decoding="async"
      {...imgProps} />);

}

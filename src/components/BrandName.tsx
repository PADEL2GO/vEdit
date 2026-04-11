/**
 * PADEL2GO Markenname Komponente
 * Einheitliche Darstellung: PADEL (weiß) + 2 (neongrün) + GO (weiß)
 * Alles in Großbuchstaben
 */

interface BrandNameProps {
  className?: string;
  /** Wenn true, wird die Marke inline dargestellt (für Fließtext) */
  inline?: boolean;
  /** Light = für weiße Hintergründe (PADEL+GO dunkel), Dark = für dunkle Hintergründe (PADEL+GO hell) */
  variant?: "light" | "dark";
}

const BrandName = ({ className = "", inline = false, variant = "dark" }: BrandNameProps) => {
  const Tag = inline ? "span" : "span";
  const textColor = variant === "light" ? "text-gray-800" : "text-foreground";
  
  return (
    <Tag className={className}>
      <span className={textColor}>PADEL</span>
      <span className="text-primary">2</span>
      <span className={textColor}>GO</span>
    </Tag>
  );
};

export default BrandName;

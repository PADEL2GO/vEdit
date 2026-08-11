import { ArrowRight, CircleDot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteVisual } from "@/components/SiteVisual";

interface BookingTennisTeaserProps {
  /** Standort mit Automat -> Hinweis auf Schläger & Bälle vor Ort. */
  vendingEnabled: boolean;
  onShowTennis: () => void;
}

/**
 * Dezenter Cross-Sell-Hinweis auf der Buchungsseite: erscheint nur an Standorten
 * mit Tennis-Courts und nur in der Padel-Ansicht.
 */
export function BookingTennisTeaser({ vendingEnabled, onShowTennis }: BookingTennisTeaserProps) {
  const { t } = useTranslation("booking");

  return (
    <div className="flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06]">
      <SiteVisual
        visualKey="booking.tennis.teaser"
        alt={t("tennisTeaser.imageAlt")}
        className="w-full h-[108px] shrink-0 self-stretch object-cover sm:h-auto sm:w-[148px]"
        fallbackClassName="bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--primary)/0.04))]"
      />

      <div className="flex min-w-0 flex-col items-start gap-2 px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
          <CircleDot className="w-3 h-3" />
          {t("tennisTeaser.badge")}
        </span>

        <p className="text-[12.5px] leading-[1.55] text-[hsl(0_0%_75%)]">
          <span className="font-bold text-foreground">{t("tennisTeaser.title")} </span>
          {t("tennisTeaser.body")}
          {vendingEnabled ? ` ${t("tennisTeaser.vending")}` : ""}
        </p>

        <button
          type="button"
          onClick={onShowTennis}
          className="inline-flex min-h-[32px] items-center gap-1.5 text-[12.5px] font-bold text-primary transition-opacity hover:opacity-80"
        >
          {t("tennisTeaser.cta")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

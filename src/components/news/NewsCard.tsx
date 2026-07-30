import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Image as ImageIcon, ThumbsUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { localized } from "@/lib/localized";
import { useArticleLike } from "@/hooks/useArticles";
import { topicColor, type Article } from "@/types/article";

interface NewsCardProps {
  article: Article;
  /** "rail" → große Highlight-Card, "grid" → Standard-Card im Feed */
  variant?: "rail" | "grid";
  index?: number;
}

/**
 * 4:5-Hochformat-News-Card nach Claude Design (News Web).
 * Badge, Weiterlesen-Link und Hover-Border tragen immer die Farbe des
 * EIGENEN Topics — unabhängig vom aktiven Seitenfilter (Colorcode Regel 2).
 */
export function NewsCard({ article, variant = "grid", index = 0 }: NewsCardProps) {
  const { t, i18n } = useTranslation("news");
  const { liked, likeCount, toggle, pending } = useArticleLike(article);
  const isRail = variant === "rail";
  const acc = topicColor(article.topic);

  const title = localized(article, "title", i18n.language);
  const dateLabel = article.published_at
    ? format(parseISO(article.published_at), "dd.MM.yyyy", {
        locale: i18n.language.startsWith("en") ? enUS : de,
      })
    : null;

  const onLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pending) toggle();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: Math.min(index, 5) * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={isRail ? "flex-none w-[min(340px,78vw)] snap-start" : undefined}
      style={{ "--card-acc": acc, "--card-acc-brd": `${acc}66` } as React.CSSProperties}
    >
      <Link to={`/news/${article.slug}`} className="group flex flex-col gap-3.5 no-underline">
        <div
          className={`relative aspect-[4/5] overflow-hidden border border-border/80 bg-gradient-card transition-all duration-300 group-hover:border-[color:var(--card-acc-brd)] group-hover:-translate-y-1 ${
            isRail ? "rounded-3xl group-hover:shadow-[0_18px_46px_rgba(0,0,0,0.6)]" : "rounded-[20px]"
          }`}
        >
          {article.cover_image_url ? (
            <img
              src={article.cover_image_url}
              alt={article.cover_alt ?? title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background: isRail
                ? "linear-gradient(190deg, hsl(0 0% 0% / 0.1) 22%, hsl(0 0% 0% / 0.92) 88%)"
                : "linear-gradient(190deg, hsl(0 0% 0% / 0.15) 30%, hsl(0 0% 0% / 0.85) 92%)",
            }}
          />

          <span
            className={`absolute left-3.5 top-3.5 whitespace-nowrap rounded-full border bg-black/60 font-stat uppercase backdrop-blur-md ${
              isRail ? "px-3 py-1.5 text-[10px] tracking-[0.16em]" : "px-2.5 py-1 text-[9.5px] tracking-[0.16em]"
            }`}
            style={{ color: acc, borderColor: `${acc}59` }}
          >
            {article.topic}
          </span>

          <button
            onClick={onLike}
            aria-label={t("like")}
            aria-pressed={liked}
            className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full border bg-black/60 px-2.5 py-1.5 text-[11.5px] font-semibold backdrop-blur-md transition-colors"
            style={liked ? { color: acc, borderColor: `${acc}66` } : { color: "rgba(255,255,255,0.75)", borderColor: "rgba(255,255,255,0.16)" }}
          >
            <ThumbsUp className="h-3.5 w-3.5" style={liked ? { fill: acc } : undefined} />
            {likeCount}
          </button>

          <div className={`absolute inset-x-0 bottom-0 flex flex-col ${isRail ? "gap-2 p-5" : "gap-1.5 p-4"}`}>
            <span className={`font-stat tracking-[0.1em] text-white/60 ${isRail ? "text-[11px]" : "text-[10.5px]"}`}>
              {dateLabel}
              {!isRail && ` · ${t("readingTime", { minutes: article.reading_minutes })}`}
            </span>
            <h3
              className={`font-display font-bold text-white m-0 ${isRail ? "text-2xl leading-[1.12]" : "text-lg leading-[1.18]"}`}
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </h3>
            {isRail && (
              <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: acc }}>
                {t("readMore")} <ArrowRight className="h-[15px] w-[15px] transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </div>
        </div>

        {!isRail && article.excerpt && (
          <p className="m-0 px-0.5 text-sm leading-[1.55] text-muted-foreground">
            {localized(article, "excerpt", i18n.language)}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

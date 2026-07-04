import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, CalendarDays, ArrowRight, ChevronUp, ExternalLink, Image as ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useArticles } from "@/hooks/useArticles";
import { ArticleCard } from "./ArticleCard";
import type { Article } from "@/types/article";

interface ArticleFeedProps {
  /** "logged_in" → dashboard Übersicht, "logged_out" → public home */
  surface: "logged_in" | "logged_out";
  /** "public" wraps the feed in a page section with a container; "dashboard" renders bare */
  placement: "public" | "dashboard";
}

/** Public homepage news card — image-top card matching the marketing design. */
function PublicArticleCard({ article, index }: { article: Article; index: number }) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);

  const dateLabel = article.published_at
    ? format(parseISO(article.published_at), "d. MMMM yyyy", { locale: de })
    : null;

  return (
    <motion.div
      className="group flex flex-col rounded-2xl overflow-hidden bg-gradient-card border border-border/60 hover:border-primary/30 transition-colors duration-300"
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cover */}
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5 p-5 md:p-6">
        {dateLabel && (
          <span className="inline-flex items-center gap-1.5 font-stat text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {dateLabel}
          </span>
        )}
        <h3 className="text-lg md:text-xl font-bold text-foreground font-display" style={{ lineHeight: 1.3 }}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3" style={{ textWrap: "pretty" }}>
            {article.excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-1">
          {article.body_html?.trim() && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              {expanded ? (
                <>
                  {t("newsReadMore")} <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  {t("newsReadMore")} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}
          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              {t("newsToSource")} <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded && article.body_html && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className="prose prose-sm dark:prose-invert max-w-none mt-3 pt-3 border-t border-border/60"
                dangerouslySetInnerHTML={{ __html: article.body_html }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ArticleFeed({ surface, placement }: ArticleFeedProps) {
  const { t } = useTranslation("common");
  const { data: articles = [], isLoading } = useArticles(surface);

  // Render nothing while loading or when there's no news — avoid an empty section.
  if (isLoading || articles.length === 0) return null;

  // Public homepage — marketing design (badge header + image-top card grid).
  if (placement === "public") {
    return (
      <section id="news" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
              <Newspaper className="w-3.5 h-3.5" />
              {t("newsBadge")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground" style={{ lineHeight: 1.1 }}>
              {t("newsHeadingPre")} <span className="text-gradient-lime">{t("newsHeadingAccent")}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
            {articles.map((article, i) => (
              <PublicArticleCard key={article.id} article={article} index={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Dashboard — unchanged: heading + list of horizontal article cards.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">{t("latestNews")}</h2>
      </div>
      <div className="space-y-5">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

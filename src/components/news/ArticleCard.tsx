import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { localized } from "@/lib/localized";
import type { Article } from "@/types/article";

export function ArticleCard({ article }: { article: Article }) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);

  const dateLabel = article.published_at
    ? format(parseISO(article.published_at), "d. MMMM yyyy", { locale: de })
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden w-full">
        {/* Top row: cover image (left on desktop, top on mobile) + content (right) */}
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-80 md:flex-shrink-0 bg-muted overflow-hidden aspect-[16/9] md:aspect-auto md:h-auto">
            {article.cover_image_url ? (
              <img
                src={article.cover_image_url}
                alt={localized(article, "title", i18n.language)}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center min-h-[180px]">
                <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex-1 p-5 md:p-6 space-y-3">
            {dateLabel && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {dateLabel}
              </div>
            )}

            <h3 className="text-xl md:text-2xl font-bold leading-tight text-foreground">
              {localized(article, "title", i18n.language)}
            </h3>

            {article.excerpt && (
              <p className="text-sm md:text-base text-muted-foreground">{localized(article, "excerpt", i18n.language)}</p>
            )}

            <div className="flex flex-wrap items-center gap-1 pt-1">
              {article.body_html?.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-primary hover:text-primary"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? (
                    <>
                      {t("newsShowLess")} <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      {t("newsReadArticle")} <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              {article.source_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-primary hover:text-primary"
                  asChild
                >
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                    {t("newsToSource")} <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded full-article body — full card width below the top row */}
        {expanded && article.body_html && (
          <div className="border-t border-border px-5 md:px-6 py-5">
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: localized(article, "body_html", i18n.language) }}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

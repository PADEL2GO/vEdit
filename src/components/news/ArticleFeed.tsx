import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useArticles } from "@/hooks/useArticles";
import { ArticleCard } from "./ArticleCard";
import { NewsCard } from "./NewsCard";

interface ArticleFeedProps {
  /** "logged_in" → dashboard Übersicht, "logged_out" → public home */
  surface: "logged_in" | "logged_out";
  /** "public" wraps the feed in a page section with a container; "dashboard" renders bare */
  placement: "public" | "dashboard";
}

export function ArticleFeed({ surface, placement }: ArticleFeedProps) {
  const { t } = useTranslation("common");
  const { data: articles = [], isLoading } = useArticles(surface);

  // Render nothing while loading or when there's no news — avoid an empty section.
  if (isLoading || articles.length === 0) return null;

  // Public homepage — 4:5-Hochformat-Cards (News-Web-Design) + Link zur News-Seite.
  if (placement === "public") {
    return (
      <section id="news" className="py-16 md:py-24 bg-background">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="flex flex-col items-center gap-4 text-center mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
              <Newspaper className="w-3.5 h-3.5" />
              {t("newsBadge")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground" style={{ lineHeight: 1.1 }}>
              {t("newsHeadingPre")} <span className="text-gradient-lime">{t("newsHeadingAccent")}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 3).map((article, i) => (
              <NewsCard key={article.id} article={article} index={i} />
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <Link
              to="/news"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-7 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("newsAllLink")} <ArrowRight className="h-[17px] w-[17px]" />
            </Link>
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

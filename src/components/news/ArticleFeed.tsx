import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useArticles } from "@/hooks/useArticles";
import { NewsCard } from "./NewsCard";

/**
 * News-Section der Homepage: 4:5-Cards (News-Web-Design) + Link zur News-Seite.
 * Die Audience folgt dem Login-Zustand des Besuchers.
 */
export function ArticleFeed() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: articles = [], isLoading } = useArticles(user ? "logged_in" : "logged_out");

  // Render nothing while loading or when there's no news — avoid an empty section.
  if (isLoading || articles.length === 0) return null;

  return (
    <section id="news" className="py-16 md:py-24">
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

import { useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Flame, Instagram, Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsletterCTA } from "@/components/events/NewsletterCTA";
import { useAuth } from "@/hooks/useAuth";
import { useArticles } from "@/hooks/useArticles";
import { accentVars, TOPIC_COLORS, TOPICS, type Topic } from "@/types/article";

const PAGE_SIZE = 9;

type Filter = "Alle" | Topic;

export default function News() {
  const { t } = useTranslation("news");
  const { user } = useAuth();
  const { data: articles = [], isLoading } = useArticles(user ? "logged_in" : "logged_out");

  const [activeFilter, setActiveFilter] = useState<Filter>("Alle");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const railRef = useRef<HTMLDivElement>(null);

  const featured = useMemo(
    () =>
      articles
        .filter((a) => a.is_featured)
        .sort((a, b) => a.featured_rank - b.featured_rank)
        .slice(0, 6),
    [articles],
  );

  const filtered = useMemo(
    () => (activeFilter === "Alle" ? articles : articles.filter((a) => a.topic === activeFilter)),
    [articles, activeFilter],
  );

  const pickFilter = (f: Filter) => {
    setActiveFilter(f);
    setVisible(PAGE_SIZE);
  };

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      {/* Seiten-Akzent folgt dem aktiven Filter (Colorcode Regel 1) */}
      <main className="news-root min-h-screen bg-background" style={accentVars(TOPIC_COLORS[activeFilter])}>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 pb-24 pt-14">
          {/* ── Header ── */}
          <motion.div
            className="flex flex-wrap items-end justify-between gap-7"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex max-w-[620px] flex-col items-start gap-3.5">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-300"
                style={{ color: "var(--acc)", background: "var(--acc-bg)", borderColor: "var(--acc-brd)" }}
              >
                <Newspaper className="h-3.5 w-3.5" />
                {t("badge")}
              </span>
              <h1
                className="m-0 font-display font-extrabold text-foreground"
                style={{ fontSize: "clamp(34px, 5.4vw, 60px)", lineHeight: 1.04, letterSpacing: "-0.025em" }}
              >
                {t("headingPre")}{" "}
                <span className="transition-colors duration-300" style={{ color: "var(--acc)" }}>
                  {t("headingAccent")}
                </span>
              </h1>
              <p className="m-0 text-[17px] leading-[1.6] text-muted-foreground">{t("subline")}</p>
            </div>
            <a
              href="https://www.instagram.com/padel2go"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-5 py-2.5 text-[14.5px] font-semibold text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
            >
              <Instagram className="h-[17px] w-[17px]" /> {t("followInstagram")}
            </a>
          </motion.div>

          {/* ── Topic-Filter ── */}
          <div className="flex flex-wrap gap-2.5">
            {(["Alle", ...TOPICS] as Filter[]).map((f) => {
              const on = activeFilter === f;
              return (
                <button
                  key={f}
                  data-on={on || undefined}
                  onClick={() => pickFilter(f)}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
                  style={
                    on
                      ? {
                          background: TOPIC_COLORS[f],
                          borderColor: TOPIC_COLORS[f],
                          color: "#0A0A0A",
                          boxShadow: `0 0 24px ${TOPIC_COLORS[f]}47`,
                        }
                      : { borderColor: "hsl(var(--border))", background: "rgba(255,255,255,0.04)", color: `${TOPIC_COLORS[f]}D9` }
                  }
                >
                  {f === "Alle" ? t("filterAll") : f}
                </button>
              );
            })}
          </div>

          {/* ── Highlight-Rail ── */}
          {featured.length > 0 && activeFilter === "Alle" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="m-0 flex items-center gap-2.5 font-display text-xl font-bold text-foreground">
                  <Flame className="h-[18px] w-[18px]" style={{ color: "var(--acc)" }} /> {t("highlights")}
                </h2>
                <div className="flex gap-2">
                  <button
                    aria-label={t("railPrev")}
                    onClick={() => railRef.current?.scrollBy({ left: -358, behavior: "smooth" })}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                  >
                    <ArrowLeft className="h-[17px] w-[17px]" />
                  </button>
                  <button
                    aria-label={t("railNext")}
                    onClick={() => railRef.current?.scrollBy({ left: 358, behavior: "smooth" })}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                  >
                    <ArrowRight className="h-[17px] w-[17px]" />
                  </button>
                </div>
              </div>
              <div
                ref={railRef}
                className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto pb-3.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {featured.map((article, i) => (
                  <NewsCard key={article.id} article={article} variant="rail" index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Feed (vertikal scrollend) ── */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-1">
              <h2 className="m-0 font-display text-xl font-bold text-foreground">{t("allPosts")}</h2>
              <span className="font-stat text-xs text-muted-foreground">
                {t("postCount", { count: filtered.length })}
              </span>
            </div>

            {isLoading ? (
              <p className="py-10 text-center text-muted-foreground">{t("loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, visible).map((article, i) => (
                  <NewsCard key={article.id} article={article} index={i % PAGE_SIZE} />
                ))}
              </div>
            )}

            {visible < filtered.length && (
              <div className="flex justify-center pt-5">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-7 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                >
                  {t("loadMore")} <ChevronDown className="h-[17px] w-[17px]" />
                </button>
              </div>
            )}
          </div>

          {/* ── Newsletter ── */}
          <NewsletterCTA />
        </div>
      </main>

      <Footer />
    </>
  );
}

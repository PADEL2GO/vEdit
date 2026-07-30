import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Instagram,
  Link as LinkIcon,
  Linkedin,
  MapPin,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { NewsCard } from "@/components/news/NewsCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { localized } from "@/lib/localized";
import {
  trackArticleView,
  useArticleBySlug,
  useArticleLike,
  useArticleLocation,
  useRelatedArticles,
} from "@/hooks/useArticles";
import { accentVars, topicColor } from "@/types/article";

/** Scroll-Lesefortschritt als Akzent-Balken am oberen Rand. */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-[3px] bg-transparent">
      <div
        className="h-full transition-[width] duration-100 ease-linear"
        style={{ width: `${pct}%`, background: "var(--acc)", boxShadow: "0 0 12px var(--acc-brd)" }}
      />
    </div>
  );
}

export default function NewsArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation("news");
  const { data: article, isLoading } = useArticleBySlug(slug);
  const { data: related = [] } = useRelatedArticles(article);
  const { data: location } = useArticleLocation(article?.location_id);
  const { liked, likeCount, toggle, pending } = useArticleLike(article);
  const [copied, setCopied] = useState(false);

  const { data: authorName } = useQuery({
    queryKey: ["article-author", article?.created_by],
    enabled: !!article?.created_by,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("display_name")
        .eq("id", article!.created_by!)
        .maybeSingle();
      return (data?.display_name as string | undefined) ?? null;
    },
  });

  useEffect(() => {
    if (article?.slug) trackArticleView(article.slug);
  }, [article?.slug]);

  if (!isLoading && !article) {
    return (
      <>
        <Navigation />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5">
          <p className="text-muted-foreground">{t("notFound")}</p>
          <Button asChild variant="outline">
            <Link to="/news">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("backToNews")}
            </Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }
  if (!article) return null;

  const acc = topicColor(article.topic);
  const title = localized(article, "title", i18n.language);
  const highlight = localized(article, "title_highlight", i18n.language);
  const lead = localized(article, "lead", i18n.language);
  const excerpt = localized(article, "excerpt", i18n.language);
  const dateLabel = article.published_at
    ? format(parseISO(article.published_at), "dd.MM.yyyy", {
        locale: i18n.language.startsWith("en") ? enUS : de,
      })
    : null;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard blockiert */
    }
  };

  return (
    <>
      <Helmet>
        <title>{article.seo_title ?? `${title} | PADEL2GO`}</title>
        <meta name="description" content={article.seo_description ?? excerpt} />
        {article.cover_image_url && <meta property="og:image" content={article.cover_image_url} />}
        <meta property="og:title" content={article.seo_title ?? title} />
        <meta property="og:description" content={article.seo_description ?? excerpt} />
        <meta property="og:type" content="article" />
      </Helmet>

      <Navigation />

      {/* Seiten-Akzent = Topic dieses Artikels (Colorcode Regel 1) */}
      <main className="news-root min-h-screen bg-background" style={accentVars(acc)}>
        <ReadingProgress />
        <article>
          {/* ── Hero ── */}
          <div className="relative flex min-h-[min(78vh,720px)] items-end overflow-hidden">
            {article.cover_image_url && (
              <img
                src={article.cover_image_url}
                alt={article.cover_alt ?? title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(195deg, hsl(0 0% 0% / 0.28) 18%, hsl(0 0% 0% / 0.86) 76%, hsl(var(--background)))",
              }}
            />
            <motion.div
              className="relative mx-auto flex w-full max-w-[1280px] flex-col items-start gap-5 px-5 pb-14 pt-32"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to="/news"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-[color:var(--acc)]"
              >
                <ArrowLeft className="h-4 w-4" /> {t("backToNews")}
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="whitespace-nowrap rounded-full border bg-black/60 px-3.5 py-1.5 font-stat text-[10.5px] uppercase tracking-[0.18em] backdrop-blur-md"
                  style={{ color: acc, borderColor: `${acc}66` }}
                >
                  {article.topic}
                </span>
                {dateLabel && <span className="font-stat text-xs tracking-[0.08em] text-white/65">{dateLabel}</span>}
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span className="font-stat text-xs tracking-[0.08em] text-white/65">
                  {t("readingTime", { minutes: article.reading_minutes })}
                </span>
              </div>
              <h1
                className="m-0 max-w-[900px] font-display font-extrabold text-white"
                style={{ fontSize: "clamp(36px, 6.2vw, 76px)", lineHeight: 1.01, letterSpacing: "-0.03em", textWrap: "pretty" }}
              >
                {title}
                {highlight && (
                  <>
                    {" "}
                    <span className="italic" style={{ color: acc }}>
                      {highlight}
                    </span>
                  </>
                )}
              </h1>
              {lead && (
                <p
                  className="m-0 max-w-[660px] text-white/75"
                  style={{ fontSize: "clamp(16px, 2vw, 21px)", lineHeight: 1.55 }}
                >
                  {lead}
                </p>
              )}
            </motion.div>
          </div>

          {/* ── Body + Sidebar ── */}
          <div className="mx-auto max-w-[1280px] px-5 pb-10 pt-14">
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
              <div className="flex max-w-[720px] flex-col gap-6">
                {article.body_html?.trim() && (
                  <div
                    className="prose prose-invert max-w-none text-[17px] leading-[1.75] prose-headings:font-display prose-headings:font-extrabold prose-headings:tracking-tight prose-h2:text-3xl prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-[color:var(--acc)] prose-blockquote:rounded-2xl prose-blockquote:border prose-blockquote:border-[color:var(--acc-brd)] prose-blockquote:bg-gradient-card prose-blockquote:px-7 prose-blockquote:py-6 prose-blockquote:font-display prose-blockquote:text-xl prose-blockquote:not-italic prose-blockquote:text-foreground prose-li:text-muted-foreground prose-img:rounded-2xl"
                    dangerouslySetInnerHTML={{ __html: localized(article, "body_html", i18n.language) }}
                  />
                )}

                {(article.ai_generated || article.source_url) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {article.ai_generated && (
                      <span className="inline-flex w-fit items-center rounded-full border border-border bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground">
                        {t("aiBadge")}
                      </span>
                    )}
                    {article.source_url && (
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                        style={{ color: "var(--acc)" }}
                      >
                        {t("toSource")} <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* CTA-Box */}
                {article.cta_title && (
                  <div
                    className="relative mt-5 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl border bg-gradient-card p-7 md:p-10"
                    style={{ borderColor: "var(--acc-brd)" }}
                  >
                    <div
                      className="pointer-events-none absolute -right-28 -top-28 h-[300px] w-[300px] rounded-full"
                      style={{ background: "radial-gradient(circle, var(--acc-glow), transparent 70%)" }}
                    />
                    <div className="relative flex flex-col gap-2">
                      <h3 className="m-0 font-display text-2xl font-extrabold tracking-tight text-foreground">
                        {article.cta_title}
                      </h3>
                      {article.cta_subtitle && (
                        <p className="m-0 text-[15px] text-muted-foreground">{article.cta_subtitle}</p>
                      )}
                    </div>
                    <Button asChild size="lg" className="relative" style={{ background: "var(--acc)", color: "#0A0A0A" }}>
                      <a href={article.cta_url ?? "/booking"}>
                        {article.cta_label || t("ctaDefaultLabel")} <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Sidebar ── */}
              <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
                <div className="flex flex-col gap-3.5 rounded-[20px] border border-border bg-gradient-card p-5">
                  <span className="font-stat text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("writtenBy")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-display text-base font-extrabold"
                      style={{ background: "var(--acc)", color: "#0A0A0A" }}
                    >
                      {(authorName ?? "P2G").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-foreground">{authorName ?? "PADEL2GO"}</span>
                      <span className="text-[13px] text-muted-foreground">{t("editorial")}</span>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <span className="font-stat text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("share")}
                  </span>
                  <div className="flex gap-2">
                    <a
                      aria-label="Instagram"
                      href="https://www.instagram.com/padel2go.official"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/[0.04] text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                    >
                      <Instagram className="h-[17px] w-[17px]" />
                    </a>
                    <a
                      aria-label="WhatsApp"
                      href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/[0.04] text-muted-foreground transition-colors hover:border-[#25D366]/60 hover:text-[#25D366]"
                    >
                      <MessageCircle className="h-[17px] w-[17px]" />
                    </a>
                    <a
                      aria-label="LinkedIn"
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/[0.04] text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                    >
                      <Linkedin className="h-[17px] w-[17px]" />
                    </a>
                    <button
                      aria-label={t("copyLink")}
                      onClick={copyLink}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/[0.04] text-muted-foreground transition-colors hover:border-[color:var(--acc-brd)] hover:text-[color:var(--acc)]"
                    >
                      {copied ? (
                        <Check className="h-[17px] w-[17px]" style={{ color: "var(--acc)" }} />
                      ) : (
                        <LinkIcon className="h-[17px] w-[17px]" />
                      )}
                    </button>
                  </div>
                  <div className="h-px bg-border" />
                  <button
                    onClick={toggle}
                    disabled={pending}
                    aria-pressed={liked}
                    className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                    style={
                      liked
                        ? { color: "var(--acc)", borderColor: "var(--acc)", background: "var(--acc-bg)" }
                        : { color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))", background: "rgba(255,255,255,0.04)" }
                    }
                  >
                    <ThumbsUp className="h-4 w-4" style={liked ? { fill: acc } : undefined} />
                    {likeCount}
                  </button>
                </div>

                {location && (
                  <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-gradient-card p-5">
                    <span className="font-stat text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("location")}
                    </span>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-[17px] w-[17px] flex-none" style={{ color: "var(--acc)" }} />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold text-foreground">{location.name}</span>
                        <span className="text-[13.5px] leading-normal text-muted-foreground">
                          {[location.address, [location.postal_code, location.city].filter(Boolean).join(" ")]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/booking"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                      style={{ color: "var(--acc)" }}
                    >
                      {t("checkAvailability")} <ArrowRight className="h-[15px] w-[15px]" />
                    </Link>
                  </div>
                )}
              </aside>
            </div>
          </div>

          {/* ── Related — Cards tragen ihre eigene Topic-Farbe (Regel 2) ── */}
          {related.length > 0 && (
            <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 pb-24 pt-5">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-1.5">
                <h2 className="m-0 font-display text-xl font-bold text-foreground">{t("related")}</h2>
                <Link
                  to="/news"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  style={{ color: "var(--acc)" }}
                >
                  {t("allNews")} <ArrowRight className="h-[15px] w-[15px]" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
                {related.map((a, i) => (
                  <NewsCard key={a.id} article={a} index={i} />
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </>
  );
}

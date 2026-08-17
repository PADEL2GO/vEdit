import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation, Trans } from "react-i18next";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { sectionThemeVars, useSectionTheme } from "@/hooks/useSectionThemes";
import { SectionShaderBackdrop } from "@/components/SectionShaderBackdrop";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import {
  Search, X, RotateCcw, ArrowRight, Coins, Zap,
  LayoutGrid, CircleDot, Shirt, Footprints, Backpack, Package, Flame,
} from "lucide-react";
import { useMarketplaceItems, type MarketplaceItem } from "@/hooks/useMarketplaceItems";
import { useCatalogCategories, useCatalogBrands } from "@/hooks/useMarketplaceCatalog";
import { useAuth } from "@/hooks/useAuth";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { usePointsValue } from "@/hooks/usePointsValue";
import { eur, ptsFmt, discountPct } from "@/lib/marketplace";
import { localized } from "@/lib/localized";
import { StorageImage } from "@/components/StorageImage";

const CAT_ICONS: Record<string, typeof Package> = {
  schlaeger: Zap,
  baelle: CircleDot,
  bekleidung: Shirt,
  schuhe: Footprints,
  taschen: Backpack,
  zubehoer: Package,
};

type SortKey = "pop" | "asc" | "desc";
type PriceKey = "all" | "low" | "mid" | "high";

const Marketplace = () => {
  const sectionColor = useSectionTheme("market");
  const { t, i18n } = useTranslation("marketplace");
  const navigate = useNavigate();
  const { data: items, isLoading } = useMarketplaceItems();
  const { data: categories } = useCatalogCategories();
  const { data: brands } = useCatalogBrands();
  const { user } = useAuth();
  const { summary } = useP2GPoints();
  const { enabled: pointsEnabled } = usePointsValue();

  const loggedIn = !!user;
  const balance = summary?.redeemable_balance ?? 0;

  const [catId, setCatId] = useState<string>("all");
  const [selBrands, setSelBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceKey>("all");
  const [availOnly, setAvailOnly] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("pop");

  const brandName = (id?: string | null) => brands?.find((b) => b.id === id)?.name;
  const brandLogo = (id?: string | null) => brands?.find((b) => b.id === id)?.logo_url ?? null;
  const catName = (id?: string | null) => {
    const c = categories?.find((c) => c.id === id);
    return c ? localized(c, "name", i18n.language) : undefined;
  };

  // Public shop only lists published products that have a slug (own product page).
  const all = (items ?? []).filter((p) => !!p.slug && p.status !== "draft");

  const countFor = (id: string) =>
    id === "all" ? all.length : all.filter((p) => p.category_id === id).length;

  const filtersActive =
    catId !== "all" || selBrands.length > 0 || priceRange !== "all" || availOnly || q.trim() !== "";

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let res = all.filter((p) => {
      if (catId !== "all" && p.category_id !== catId) return false;
      if (selBrands.length > 0 && !selBrands.includes(p.brand_id ?? "")) return false;
      const price = p.price_cents ?? 0;
      if (priceRange === "low" && !(price < 5000)) return false;
      if (priceRange === "mid" && !(price >= 5000 && price <= 15000)) return false;
      if (priceRange === "high" && !(price > 15000)) return false;
      const inStock = p.stock_quantity === null || (p.stock_quantity ?? 0) > 0;
      if (availOnly && !inStock) return false;
      if (query) {
        const hay = `${p.name} ${brandName(p.brand_id) ?? p.partner_name ?? ""} ${catName(p.category_id) ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    res = res.slice().sort((a, b) => {
      if (sort === "asc") return (a.price_cents ?? 0) - (b.price_cents ?? 0);
      if (sort === "desc") return (b.price_cents ?? 0) - (a.price_cents ?? 0);
      // "pop": featured first, then sort_order.
      const fa = a.is_featured ? 1 : 0;
      const fb = b.is_featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, catId, selBrands, priceRange, availOnly, q, sort, brands, categories]);

  const resetFilters = () => {
    setCatId("all");
    setSelBrands([]);
    setPriceRange("all");
    setAvailOnly(false);
    setQ("");
    setSort("pop");
  };

  const chip = (active: boolean) =>
    `inline-flex items-center gap-2 shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all cursor-pointer border ${
      active
        ? "bg-primary text-black border-transparent shadow-[0_0_20px_rgba(199,240,17,0.3)]"
        : "bg-white/[0.04] text-foreground/75 border-border/70 hover:border-primary/50"
    }`;

  const smallChip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all cursor-pointer border ${
      active
        ? "bg-primary/[0.12] text-primary border-primary/50"
        : "bg-white/[0.04] text-foreground/65 border-border/70 hover:border-primary/50"
    }`;

  return (
    <>
      <Helmet>
        <title>{t("page.metaTitle")}</title>
        <meta name="description" content={t("page.metaDescription")} />
      </Helmet>

      <Navigation />

      <main
        className="relative min-h-screen bg-background pt-[92px] pb-24"
        style={sectionThemeVars(sectionColor)}
      >
        <SectionShaderBackdrop color={sectionColor} />
        <div className="relative z-[1] mx-auto max-w-[1200px] px-5 flex flex-col gap-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-center gap-4 text-center pt-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("hero.badge")}
            </span>
            <h1 className="font-display font-extrabold tracking-tight text-[clamp(32px,5vw,54px)] leading-[1.08]">
              <Trans i18nKey="marketplace:hero.title" components={{ 1: <span className="text-gradient-acc" /> }} />
            </h1>
            <p className="max-w-[560px] text-[17.5px] leading-relaxed text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            {loggedIn && pointsEnabled ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-1.5 text-[13.5px] font-semibold text-primary">
                <Coins className="w-3.5 h-3.5" />
                {t("hero.pointsBanner", { points: ptsFmt(balance) })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-1.5 text-[13.5px] font-semibold text-primary">
                <Zap className="w-3.5 h-3.5" />
                {t("hero.guestBanner")}
              </span>
            )}
          </motion.div>

          {/* Filters */}
          <div className="flex flex-col gap-3.5">
            {/* Category chips */}
            <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button className={chip(catId === "all")} onClick={() => setCatId("all")}>
                <LayoutGrid className="w-3.5 h-3.5" />
                {t("filters.all")}
                <span className="font-stat text-[11px] opacity-60">{countFor("all")}</span>
              </button>
              {categories?.map((c) => {
                const Icon = CAT_ICONS[c.slug] ?? Package;
                return (
                  <button key={c.id} className={chip(catId === c.id)} onClick={() => setCatId(c.id)}>
                    <Icon className="w-3.5 h-3.5" />
                    {localized(c, "name", i18n.language)}
                    <span className="font-stat text-[11px] opacity-60">{countFor(c.id)}</span>
                  </button>
                );
              })}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex-1 min-w-[220px] max-w-[380px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("filters.searchPlaceholder")}
                  className="pl-9 h-11 rounded-full bg-white/[0.04] border-border/70"
                />
              </div>
              <div className="flex gap-1.5 rounded-full border border-border/70 bg-black/40 p-1">
                {([["pop", t("sort.pop")], ["asc", t("sort.asc")], ["desc", t("sort.desc")]] as [SortKey, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSort(key)}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                        sort === key ? "bg-primary text-black" : "text-foreground/65"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => setAvailOnly((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold border transition-all ${
                  availOnly
                    ? "bg-primary/[0.12] text-primary border-primary/50"
                    : "bg-white/[0.04] text-foreground/65 border-border/70 hover:border-primary/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${availOnly ? "bg-primary shadow-[0_0_10px_rgba(199,240,17,0.6)]" : "bg-muted-foreground/40"}`} />
                {t("filters.inStockOnly")}
              </button>
              <span className="font-stat text-xs text-muted-foreground ml-auto whitespace-nowrap">
                {list.length === all.length
                  ? t("filters.countAll", { count: all.length })
                  : t("filters.countFiltered", { shown: list.length, total: all.length })}
              </span>
            </div>

            {/* Brand + price chips */}
            {(brands?.length || 0) > 0 && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-stat text-[10.5px] tracking-[0.14em] text-muted-foreground/70">{t("filters.brandLabel")}</span>
                {brands?.map((b) => {
                  const on = selBrands.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      className={smallChip(on)}
                      onClick={() =>
                        setSelBrands((s) => (on ? s.filter((x) => x !== b.id) : [...s, b.id]))
                      }
                    >
                      {b.name}
                    </button>
                  );
                })}
                <span className="w-px h-[18px] bg-border mx-1" />
                <span className="font-stat text-[10.5px] tracking-[0.14em] text-muted-foreground/70">{t("filters.priceLabel")}</span>
                {([["all", t("price.all")], ["low", t("price.low")], ["mid", t("price.mid")], ["high", t("price.high")]] as [PriceKey, string][]).map(
                  ([key, label]) => (
                    <button key={key} className={smallChip(priceRange === key)} onClick={() => setPriceRange(key)}>
                      {label}
                    </button>
                  ),
                )}
                {filtersActive && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                    {t("filters.reset")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden animate-pulse">
                  <div className="aspect-[2/3] bg-white/[0.04]" />
                  <div className="h-[120px]" />
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 text-center py-16 rounded-[20px] border border-dashed border-border/70 bg-white/[0.02]">
              <span className="w-[52px] h-[52px] rounded-full bg-white/[0.05] border border-border/70 flex items-center justify-center text-muted-foreground">
                <Search className="w-6 h-6" />
              </span>
              <span className="text-base font-semibold text-foreground/80">{t("empty.title")}</span>
              {filtersActive && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[13.5px] font-bold text-primary hover:bg-primary/[0.16]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("empty.resetFilters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
              {list.map((p, i) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  index={i}
                  brand={brandName(p.brand_id) ?? p.partner_name ?? "P2G"}
                  logo={brandLogo(p.brand_id)}
                  onOpen={() => navigate(`/marketplace/${p.slug}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

function ProductCard({
  p,
  index,
  brand,
  logo,
  onOpen,
}: {
  p: MarketplaceItem;
  index: number;
  brand: string;
  logo?: string | null;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation("marketplace");
  const price = p.price_cents ?? 0;
  const uvp = p.compare_at_price_cents ?? null;
  const off = discountPct(price, uvp);
  const soldOut = p.stock_quantity !== null && (p.stock_quantity ?? 0) <= 0;
  const low = !soldOut && p.stock_quantity !== null && (p.stock_quantity ?? 0) <= 5;
  const stockCol = soldOut ? "text-red-400" : low ? "text-amber-400" : "text-primary";
  const stockDot = soldOut ? "bg-red-400" : low ? "bg-amber-400" : "bg-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl border border-border/60 bg-gradient-card overflow-hidden flex flex-col transition-colors hover:border-primary/50"
    >
      <div className="relative overflow-hidden">
        <div className={`aspect-[2/3] ${soldOut ? "opacity-45 grayscale" : ""}`}>
          <StorageImage
            src={p.image_url || "/placeholder.svg"}
            renderWidth={800}
            alt={localized(p, "name", i18n.language)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        {(logo || p.is_featured) && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {logo && (
              <span className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-black/70 backdrop-blur shadow-md shrink-0">
                <img src={logo} alt={brand} className="w-full h-full object-cover" />
              </span>
            )}
            {p.is_featured && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-black/70 px-2.5 py-1 text-[11.5px] font-bold text-primary backdrop-blur">
                <Flame className="w-3 h-3" />
                {t("card.bestseller")}
              </span>
            )}
          </div>
        )}
        {off > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-stat text-[11.5px] font-bold text-foreground backdrop-blur">
            −{off}%
          </span>
        )}
        {soldOut && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex rounded-full border border-border bg-black/80 px-4 py-1.5 text-[12.5px] font-bold backdrop-blur">
            {t("stock.soldOut")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-[16px_18px_18px] flex-1">
        <div className="flex flex-col gap-0.5">
          <span className="font-stat text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground/80">{brand}</span>
          <h3 className="font-display font-bold text-[16.5px] leading-tight tracking-tight line-clamp-2">{localized(p, "name", i18n.language)}</h3>
        </div>
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="font-stat font-bold text-[17.5px]">{eur(price)}</span>
          {uvp && (
            <span className="font-stat text-[12.5px] text-muted-foreground/70 line-through">{eur(uvp)}</span>
          )}
        </div>
        <span className="text-[10.5px] text-muted-foreground/70 -mt-1.5">{t("product.taxShipping")}</span>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-[7px] h-[7px] rounded-full ${stockDot}`} />
            <span className={`text-[12.5px] font-semibold ${stockCol}`}>
              {soldOut
                ? t("stock.soldOut")
                : low
                  ? t("stock.lowShort", { count: p.stock_quantity })
                  : t("stock.inStock")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-primary">
            {t("card.details")}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default Marketplace;

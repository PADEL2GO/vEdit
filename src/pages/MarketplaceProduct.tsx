import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Coins, Gift, Minus, Plus, Zap, Truck, RotateCcw, ShieldCheck,
  Loader2, PackageX, ArrowRight, Flame, ArrowLeft,
} from "lucide-react";
import { useMarketplaceProduct } from "@/hooks/useMarketplaceProduct";
import { useCatalogCategories, useCatalogBrands } from "@/hooks/useMarketplaceCatalog";
import { useAuth } from "@/hooks/useAuth";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { usePointsValue } from "@/hooks/usePointsValue";
import { eur, ptsFmt, discountPct, maxRedeemablePoints } from "@/lib/marketplace";
import type { MarketplaceItem } from "@/hooks/useMarketplaceItems";

const MarketplaceProduct = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMarketplaceProduct(slug);
  const { data: categories } = useCatalogCategories();
  const { data: brands } = useCatalogBrands();
  const { user } = useAuth();
  const { summary } = useP2GPoints();
  const { centsPerPoint, maxPercent, enabled: pointsEnabled } = usePointsValue();

  const [qty, setQty] = useState(1);
  const [mainIdx, setMainIdx] = useState(0);

  const product = data?.product ?? null;
  const gallery = data?.gallery ?? [];

  const images = useMemo(() => {
    const urls = [product?.image_url, ...gallery.map((g) => g.url)].filter(Boolean) as string[];
    return urls.length ? urls : ["/placeholder.svg"];
  }, [product, gallery]);

  if (isLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-black flex items-center justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 pt-20 px-5 text-center">
          <span className="w-16 h-16 rounded-full bg-white/5 border border-border flex items-center justify-center text-muted-foreground">
            <PackageX className="w-8 h-8" />
          </span>
          <h1 className="text-2xl font-bold font-display">Produkt nicht gefunden</h1>
          <Button variant="lime" onClick={() => navigate("/marketplace")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück zum Shop
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  const brandName = brands?.find((b) => b.id === product.brand_id)?.name ?? product.partner_name ?? "P2G";
  const categoryName = categories?.find((c) => c.id === product.category_id)?.name ?? "Equipment";
  const price = product.price_cents ?? 0;
  const uvp = product.compare_at_price_cents ?? null;
  const off = discountPct(price, uvp);
  const soldOut = product.stock_quantity !== null && (product.stock_quantity ?? 0) <= 0;
  const low = !soldOut && product.stock_quantity !== null && (product.stock_quantity ?? 0) <= 5;
  const qtyMax = Math.min(product.stock_quantity ?? 5, 5);

  const balance = summary?.play_credits ?? 0;
  const maxRedeem = maxRedeemablePoints(price * qty, balance, centsPerPoint, maxPercent);
  const maxSaveCents = Math.floor(maxRedeem * centsPerPoint);

  const specs = Array.isArray(product.specs) ? product.specs : [];
  const descParas = (product.long_description || product.description || "")
    .split(/\n{2,}|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const stockCol = soldOut ? "text-red-400" : low ? "text-amber-400" : "text-primary";
  const stockDot = soldOut ? "bg-red-400" : low ? "bg-amber-400" : "bg-primary";

  const buyNow = () => navigate(`/marketplace/${product.slug}/checkout?qty=${qty}`);

  return (
    <>
      <Helmet>
        <title>{product.meta_title || `${product.name} | PADEL2GO Marketplace`}</title>
        <meta name="description" content={product.meta_description || product.description || ""} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-black pt-[92px] pb-24">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-[1200px] px-5 flex flex-col gap-6"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 flex-wrap text-[13.5px]">
            <button onClick={() => navigate("/marketplace")} className="text-muted-foreground hover:text-primary">
              Marketplace
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-muted-foreground">{categoryName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="font-semibold text-foreground">{product.name}</span>
          </div>

          {/* Detail grid */}
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-start">
            {/* Gallery */}
            <div className="flex flex-col gap-3">
              <div className="relative rounded-[20px] overflow-hidden border border-border/80 bg-gradient-to-br from-white/[0.04] to-black min-h-[440px]">
                <img src={images[mainIdx]} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
                {soldOut && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex rounded-full border border-border bg-black/80 px-5 py-2 text-sm font-bold backdrop-blur">
                    Ausverkauft
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setMainIdx(i)}
                      className={`h-[92px] rounded-2xl overflow-hidden border bg-gradient-to-br from-white/[0.04] to-black ${
                        i === mainIdx ? "border-primary" : "border-border/80"
                      }`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buy box */}
            <div className="rounded-2xl border border-border/60 bg-gradient-card p-[26px] flex flex-col gap-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-stat text-[11px] tracking-[0.14em] uppercase text-primary bg-primary/[0.08] border border-primary/25 rounded-full px-3 py-1">
                  {brandName}
                </span>
                {product.is_featured && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11.5px] font-bold text-primary">
                    <Flame className="w-3 h-3" />
                    Bestseller
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="font-display font-extrabold tracking-tight text-[clamp(26px,3.4vw,34px)] leading-[1.12]">
                  {product.name}
                </h1>
                {product.subtitle && (
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{product.subtitle}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-stat font-bold text-[34px] text-primary leading-none">{eur(price)}</span>
                  {uvp && <span className="font-stat text-[14.5px] text-muted-foreground/70 line-through">UVP {eur(uvp)}</span>}
                  {off > 0 && (
                    <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 font-stat text-[12px] font-bold text-primary">
                      −{off}%
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">inkl. MwSt. · kostenloser Versand</span>
              </div>

              {pointsEnabled && (user ? (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-3.5 py-3">
                  <Coins className="w-[18px] h-[18px] text-primary shrink-0" />
                  <span className="text-[13px] leading-snug text-foreground/80">
                    Mit deinen Points: bis zu{" "}
                    <span className="font-stat font-bold text-primary">−{eur(maxSaveCents)}</span> Rabatt im Checkout.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-3.5 py-3">
                  <Gift className="w-[17px] h-[17px] text-primary shrink-0" />
                  <span className="text-[12.5px] leading-snug text-muted-foreground">
                    Mit P2G Konto zahlst du bis zu <span className="font-stat font-bold text-primary">{maxPercent}%</span> mit Points.{" "}
                    <button onClick={() => navigate("/auth")} className="font-bold text-primary underline">Einloggen</button>
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stockDot}`} />
                <span className={`text-[13.5px] font-bold ${stockCol}`}>
                  {soldOut ? "Ausverkauft" : low ? `Nur noch ${product.stock_quantity} Stück` : "Auf Lager"}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {soldOut ? "· bald wieder verfügbar" : "· Lieferung in 2–4 Werktagen"}
                </span>
              </div>

              {soldOut ? (
                <Button variant="outline" size="xl" className="w-full" disabled>
                  Zurzeit nicht verfügbar
                </Button>
              ) : (
                <div className="flex gap-3 items-stretch">
                  <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-black/40 p-1 shrink-0">
                    <button
                      onClick={() => setQty((v) => Math.max(1, v - 1))}
                      disabled={qty <= 1}
                      className="w-[38px] h-[38px] rounded-xl flex items-center justify-center disabled:text-muted-foreground/40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-stat font-bold text-base w-9 text-center">{qty}</span>
                    <button
                      onClick={() => setQty((v) => Math.min(qtyMax, v + 1))}
                      disabled={qty >= qtyMax}
                      className="w-[38px] h-[38px] rounded-xl flex items-center justify-center disabled:text-muted-foreground/40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button variant="hero" size="xl" className="flex-1" onClick={buyNow}>
                    <Zap className="w-4 h-4 mr-1" />
                    Jetzt kaufen
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-0.5">
                <span className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
                  <Truck className="w-[15px] h-[15px] text-primary" />
                  Kostenloser Versand
                </span>
                <span className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
                  <RotateCcw className="w-[15px] h-[15px] text-primary" />
                  14 Tage Widerrufsrecht
                </span>
                <span className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
                  <ShieldCheck className="w-[15px] h-[15px] text-primary" />
                  Sichere Zahlung über Stripe — Karte &amp; PayPal
                </span>
              </div>
            </div>
          </div>

          {/* Specs + description */}
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] items-start">
            {specs.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-gradient-card p-6">
                <h3 className="font-display font-bold text-[17px] mb-2">Technische Details</h3>
                <div className="flex flex-col">
                  {specs.map((sp, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-baseline gap-4 py-2.5 ${i > 0 ? "border-t border-border/60" : ""}`}
                    >
                      <span className="text-[13.5px] text-muted-foreground">{sp.label}</span>
                      <span className="text-[13.5px] font-semibold text-right">{sp.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {descParas.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-gradient-card p-6">
                <h3 className="font-display font-bold text-[17px] mb-3">Beschreibung</h3>
                <div className="flex flex-col gap-3">
                  {descParas.map((text, i) => (
                    <p key={i} className="text-[14.5px] leading-relaxed text-foreground/70">{text}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related */}
          {(data?.related.length || 0) > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="font-display font-bold text-[21px] tracking-tight">Passt dazu</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-[18px]">
                {data!.related.map((r) => (
                  <RelatedCard
                    key={r.id}
                    p={r}
                    brand={brands?.find((b) => b.id === r.brand_id)?.name ?? r.partner_name ?? "P2G"}
                    onOpen={() => {
                      setQty(1);
                      setMainIdx(0);
                      navigate(`/marketplace/${r.slug}`);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </>
  );
};

function RelatedCard({ p, brand, onOpen }: { p: MarketplaceItem; brand: string; onOpen: () => void }) {
  const price = p.price_cents ?? 0;
  const uvp = p.compare_at_price_cents ?? null;
  const off = discountPct(price, uvp);
  const soldOut = p.stock_quantity !== null && (p.stock_quantity ?? 0) <= 0;

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl border border-border/60 bg-gradient-card overflow-hidden flex flex-col transition-colors hover:border-primary/50"
    >
      <div className="relative overflow-hidden">
        <div className={`h-[170px] ${soldOut ? "opacity-45 grayscale" : ""}`}>
          <img src={p.image_url || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
        {off > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-stat text-[11.5px] font-bold backdrop-blur">−{off}%</span>
        )}
        {soldOut && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex rounded-full border border-border bg-black/80 px-4 py-1.5 text-[12.5px] font-bold backdrop-blur">Ausverkauft</span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-[16px_18px_18px] flex-1">
        <div className="flex flex-col gap-0.5">
          <span className="font-stat text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground/80">{brand}</span>
          <h3 className="font-display font-bold text-[16.5px] leading-tight tracking-tight line-clamp-2">{p.name}</h3>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-stat font-bold text-[17.5px]">{eur(price)}</span>
            {uvp && <span className="font-stat text-[12.5px] text-muted-foreground/70 line-through">{eur(uvp)}</span>}
          </div>
          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

export default MarketplaceProduct;

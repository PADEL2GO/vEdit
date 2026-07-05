import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, MapPin, CreditCard, Wallet, Check, Coins, Gift, Lock,
  ShieldCheck, Truck, Loader2,
} from "lucide-react";
import { useMarketplaceProduct } from "@/hooks/useMarketplaceProduct";
import { useMarketplaceCheckout } from "@/hooks/useMarketplaceCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { usePointsValue } from "@/hooks/usePointsValue";
import { eur, ptsFmt, maxRedeemablePoints } from "@/lib/marketplace";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MarketplaceCheckout = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, isLoading } = useMarketplaceProduct(slug);
  const checkout = useMarketplaceCheckout();
  const { user } = useAuth();
  const { summary } = useP2GPoints();
  const { centsPerPoint, maxPercent, enabled: pointsEnabled } = usePointsValue();

  const product = data?.product ?? null;
  const qtyMax = Math.min(product?.stock_quantity ?? 5, 5);
  const qty = Math.max(1, Math.min(qtyMax, Number(params.get("qty")) || 1));

  const [aName, setAName] = useState("");
  const [aMail, setAMail] = useState("");
  const [aStreet, setAStreet] = useState("");
  const [aZip, setAZip] = useState("");
  const [aCity, setACity] = useState("");
  const [payMethod, setPayMethod] = useState(0);
  const [pointsUse, setPointsUse] = useState(0);

  useEffect(() => {
    if (user?.email && !aMail) setAMail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const price = product?.price_cents ?? 0;
  const subtotal = price * qty;
  const balance = summary?.play_credits ?? 0;
  const canUsePoints = !!user && pointsEnabled;
  const maxRedeem = canUsePoints ? maxRedeemablePoints(subtotal, balance, centsPerPoint, maxPercent) : 0;
  const redeem = Math.min(pointsUse, maxRedeem);
  const discountCents = Math.floor(redeem * centsPerPoint);
  const total = Math.max(50, subtotal - discountCents);

  const emailOk = EMAIL_RE.test(aMail.trim());
  const addrValid =
    aName.trim().length > 1 && emailOk && aStreet.trim().length > 3 && /^\d{4,5}$/.test(aZip.trim()) && aCity.trim().length > 1;

  const payMethods = useMemo(
    () => [
      { icon: CreditCard, name: "Karte", sub: "Visa · Mastercard · Amex" },
      { icon: Wallet, name: "PayPal", sub: "Mit PayPal-Konto zahlen" },
    ],
    [],
  );

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
    navigate("/marketplace", { replace: true });
    return null;
  }

  const handlePay = async () => {
    if (!addrValid) return;
    try {
      const res = await checkout.mutateAsync({
        itemId: product.id,
        itemName: product.name,
        quantity: qty,
        pointsToUse: canUsePoints ? redeem : 0,
        shipping: { address_line1: aStreet.trim(), postal_code: aZip.trim(), city: aCity.trim(), country: "DE" },
        guestEmail: aMail.trim(),
        guestName: aName.trim() || undefined,
      });
      // Points covered the full price → no Stripe redirect; go straight to the success screen.
      if (res && !res.url) {
        navigate("/marketplace/success", {
          state: {
            order: {
              code: res.reference_code,
              mail: aMail.trim(),
              product: `${product.name} × ${qty}`,
              addrName: aName.trim(),
              addrLine: `${aStreet.trim()} · ${aZip.trim()} ${aCity.trim()}`,
              total: eur(total),
              method: payMethod === 0 ? "Karte" : "PayPal",
              spent: redeem,
            },
          },
        });
      }
      // Otherwise the hook redirects to Stripe (window.location).
    } catch {
      /* the hook surfaces the error toast */
    }
  };

  const field = "flex flex-col gap-1.5";
  const fieldLabel = "text-[12.5px] font-bold text-foreground/75";

  return (
    <>
      <Helmet>
        <title>Checkout | PADEL2GO Marketplace</title>
      </Helmet>

      <Navigation />

      <main
        className="min-h-screen pt-[92px] pb-24"
        style={{ background: "radial-gradient(ellipse 60% 34% at 50% 0%, rgba(199,240,17,0.05), transparent), #000" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-[1060px] px-5 flex flex-col gap-4"
        >
          <button
            onClick={() => navigate(`/marketplace/${product.slug}`)}
            className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-primary py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Produkt
          </button>

          <div className="flex flex-col gap-2">
            <h1 className="font-display font-extrabold tracking-tight text-[clamp(26px,4vw,38px)]">Fast deins!</h1>
            <p className="text-[15.5px] text-muted-foreground">
              Lieferadresse angeben, Zahlart wählen — bezahlt wird sicher über Stripe.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
            {/* Left: address + payment */}
            <div className="flex flex-col gap-4">
              {/* Address */}
              <div className="rounded-2xl border border-border/60 bg-gradient-card p-[22px] flex flex-col gap-4">
                <StepHeader n="01" title="Lieferadresse" icon={MapPin} />
                <div className="flex flex-col gap-3">
                  <div className={field}>
                    <span className={fieldLabel}>Name</span>
                    <Input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Vor- und Nachname" className="h-11" />
                  </div>
                  <div className={field}>
                    <span className={fieldLabel}>
                      E-Mail <span className="text-muted-foreground/70 font-medium">· für deine Bestellbestätigung</span>
                    </span>
                    <Input type="email" value={aMail} onChange={(e) => setAMail(e.target.value)} placeholder="name@mail.de" className="h-11" />
                  </div>
                  <div className={field}>
                    <span className={fieldLabel}>Straße &amp; Hausnummer</span>
                    <Input value={aStreet} onChange={(e) => setAStreet(e.target.value)} placeholder="z. B. Lindwurmstraße 42" className="h-11" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <div className={field}>
                      <span className={fieldLabel}>PLZ</span>
                      <Input value={aZip} onChange={(e) => setAZip(e.target.value)} placeholder="80331" className="h-11" />
                    </div>
                    <div className={field}>
                      <span className={fieldLabel}>Ort</span>
                      <Input value={aCity} onChange={(e) => setACity(e.target.value)} placeholder="München" className="h-11" />
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Deine Daten werden nur für diese Bestellung verwendet.
                </span>
              </div>

              {/* Payment method */}
              <div className="rounded-2xl border border-border/60 bg-gradient-card p-[22px] flex flex-col gap-4">
                <StepHeader n="02" title="Zahlart" icon={CreditCard} />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {payMethods.map((m, i) => {
                    const on = payMethod === i;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.name}
                        onClick={() => setPayMethod(i)}
                        className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left transition-all border ${
                          on
                            ? "bg-primary/[0.09] border-primary/60 shadow-[0_0_20px_rgba(199,240,17,0.18)]"
                            : "bg-white/[0.04] border-border/70 hover:border-primary/55"
                        }`}
                      >
                        {on && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                        <span className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center border ${on ? "bg-primary/[0.14] border-primary/40 text-primary" : "bg-white/5 border-border text-muted-foreground"}`}>
                          <Icon className="w-[19px] h-[19px]" />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[14.5px] font-bold">{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground">Beide Zahlarten laufen sicher über Stripe.</span>
              </div>
            </div>

            {/* Right: summary */}
            <div className="lg:sticky lg:top-[90px]">
              <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 flex flex-col gap-3.5">
                <h3 className="font-display font-bold text-[17px]">Bestellübersicht</h3>

                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0 bg-gradient-to-br from-white/[0.06] to-black">
                    <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-display font-bold text-[15px] leading-tight">{product.name}</span>
                    <span className="text-[12.5px] text-muted-foreground">Menge: {qty} × {eur(price)}</span>
                  </div>
                  <span className="font-stat font-bold text-[15px] shrink-0">{eur(subtotal)}</span>
                </div>

                <div className="h-px bg-border" />

                {/* Points */}
                {canUsePoints && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-primary" />
                      <span className="text-[13.5px] font-bold flex-1">P2G Points einlösen</span>
                      <span className="font-stat text-[11.5px] text-primary">{ptsFmt(balance)} Points</span>
                    </div>
                    {maxRedeem >= 10 ? (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={maxRedeem}
                          step={10}
                          value={redeem}
                          onChange={(e) => setPointsUse(Number(e.target.value))}
                          className="w-full cursor-pointer"
                          style={{ accentColor: "#C7F011" }}
                        />
                        <div className="flex justify-between items-baseline">
                          <span className="font-stat text-[12.5px] text-foreground/70">{ptsFmt(redeem)} Points</span>
                          <span className="font-stat font-bold text-sm text-primary">−{eur(discountCents)}</span>
                        </div>
                        <span className="text-[11.5px] text-muted-foreground">
                          Max. {maxPercent}% des Warenwerts · {ptsFmt(Math.round(100 / centsPerPoint))} Points = €1,00
                        </span>
                      </>
                    ) : (
                      <span className="text-[12.5px] leading-snug text-muted-foreground">
                        Noch keine Points — sammle welche bei deiner nächsten{" "}
                        <button onClick={() => navigate("/booking")} className="text-primary font-bold">Court-Buchung</button>.
                      </span>
                    )}
                  </div>
                )}
                {!user && pointsEnabled && (
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-white/[0.03] px-3.5 py-3">
                    <Gift className="w-[17px] h-[17px] text-primary mt-0.5 shrink-0" />
                    <span className="text-[12.5px] leading-snug text-muted-foreground">
                      Points einlösen geht nur mit Konto.{" "}
                      <button onClick={() => navigate("/auth")} className="font-bold text-primary underline">Kostenlos einloggen</button>{" "}
                      — oder einfach als Gast bestellen.
                    </span>
                  </div>
                )}

                {/* Totals */}
                <div className="flex flex-col gap-2.5">
                  <Row label="Zwischensumme" value={eur(subtotal)} />
                  {discountCents > 0 && (
                    <div className="flex justify-between text-[13.5px] text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        {ptsFmt(redeem)} Points eingelöst
                      </span>
                      <span className="font-stat">−{eur(discountCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      Versand
                    </span>
                    <span className="font-stat font-bold text-primary">Kostenlos</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-[14.5px] font-bold">Gesamt</span>
                    <span className="flex flex-col items-end">
                      <span className="font-stat font-bold text-[30px] text-primary leading-none">{eur(total)}</span>
                      <span className="text-[11px] text-muted-foreground">inkl. MwSt.</span>
                    </span>
                  </div>
                </div>

                <div style={{ opacity: addrValid ? 1 : 0.45, pointerEvents: addrValid ? "auto" : "none" }} className="transition-opacity">
                  <Button variant="hero" size="xl" className="w-full" onClick={handlePay} disabled={checkout.isPending}>
                    <Lock className="w-4 h-4 mr-1" />
                    Jetzt bezahlen · {eur(total)}
                  </Button>
                </div>
                <span className={`text-xs text-center ${addrValid ? "text-muted-foreground" : "text-primary"}`}>
                  {addrValid
                    ? "Mit Klick auf „Jetzt bezahlen“ geht's sicher weiter zu Stripe."
                    : "Fülle deine Lieferadresse aus, um fortzufahren."}
                </span>
                <span className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Sichere Zahlung über Stripe · SSL-verschlüsselt
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />

      {/* Stripe redirect overlay */}
      {checkout.isPending && (
        <div className="fixed inset-0 z-[110] bg-black/[0.86] backdrop-blur-md flex items-center justify-center p-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="text-lg font-bold font-display">Weiter zu Stripe …</span>
            <span className="text-sm text-muted-foreground">Du wirst sicher zur Zahlung weitergeleitet.</span>
          </div>
        </div>
      )}
    </>
  );
};

function StepHeader({ n, title, icon: Icon }: { n: string; title: string; icon: typeof MapPin }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-primary/[0.18] to-primary/[0.04] border border-primary/35 flex items-center justify-center text-primary">
        <Icon className="w-[19px] h-[19px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-stat text-[10.5px] tracking-[0.16em] text-muted-foreground">SCHRITT {n}</span>
        <h3 className="font-display font-bold text-[17px]">{title}</h3>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13.5px] text-muted-foreground">
      <span>{label}</span>
      <span className="font-stat">{value}</span>
    </div>
  );
}

export default MarketplaceCheckout;

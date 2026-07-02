import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShippingAddressForm } from "@/components/marketplace/ShippingAddressForm";
import { useMarketplaceItems, MarketplaceItem } from "@/hooks/useMarketplaceItems";
import { useMarketplaceCheckout, ShippingAddress } from "@/hooks/useMarketplaceCheckout";
import { Loader2, ShoppingBag, Sparkles, Truck, UserPlus, Mail, User } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CheckoutErrors = { email?: string } & Partial<Record<keyof ShippingAddress, string>>;

const Marketplace = () => {
  const { t } = useTranslation("marketplace");
  const { data: items, isLoading } = useMarketplaceItems();
  const checkoutMutation = useMarketplaceCheckout();

  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    address_line1: "",
    postal_code: "",
    city: "",
    country: "DE",
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});

  const activeItems = items ?? [];

  const handleBuyClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setGuestEmail("");
    setGuestName("");
    setShippingAddress({ address_line1: "", postal_code: "", city: "", country: "DE" });
    setErrors({});
    setConfirmOpen(true);
  };

  const validate = (): boolean => {
    const next: CheckoutErrors = {};
    if (!guestEmail.trim() || !EMAIL_REGEX.test(guestEmail.trim())) {
      next.email = t("checkoutDialog.errors.email");
    }
    if (selectedItem?.product_type === "purchase") {
      if (!shippingAddress.address_line1.trim()) next.address_line1 = t("checkoutDialog.errors.required");
      if (!shippingAddress.postal_code.trim()) next.postal_code = t("checkoutDialog.errors.required");
      if (!shippingAddress.city.trim()) next.city = t("checkoutDialog.errors.required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleConfirmCheckout = () => {
    if (!selectedItem || !validate()) return;

    checkoutMutation.mutate({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      guestEmail: guestEmail.trim(),
      guestName: guestName.trim() || undefined,
      shipping: selectedItem.product_type === "purchase" ? shippingAddress : undefined,
    });
  };

  const selectedPriceCents = selectedItem?.price_cents ?? 0;

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20">
        {/* Header */}
        <section className="relative py-14 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </span>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {t("hero.title")}{" "}
                <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground">{t("hero.description")}</p>
            </motion.div>
          </div>
        </section>

        {/* Upsell banner */}
        <section className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t("upsell.title")}</p>
              <p className="text-sm text-muted-foreground">{t("upsell.body")}</p>
            </div>
            <Button variant="lime" asChild className="shrink-0 w-full sm:w-auto">
              <NavLink to="/auth">{t("upsell.cta")}</NavLink>
            </Button>
          </motion.div>
        </section>

        <SectionDivider variant="glow" />

        {/* Items grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center py-20">
                <Sparkles className="w-12 h-12 text-primary/60" />
                <h2 className="text-xl font-bold">{t("empty.title")}</h2>
                <p className="text-muted-foreground max-w-md">{t("empty.description")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeItems.map((item, index) => {
                  const priceCents = item.price_cents ?? 0;
                  const hasPrice = priceCents > 0;
                  const isOutOfStock = item.stock_quantity !== null && item.stock_quantity <= 0;
                  const isPurchase = item.product_type === "purchase";

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (index % 4) * 0.08 }}
                      className="relative rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm border border-border/50 flex flex-col"
                    >
                      <div className="absolute top-2 left-2 z-10 flex gap-1">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                          {item.partner_name || "P2G"}
                        </Badge>
                        {isPurchase && (
                          <Badge variant="default" className="bg-primary/80 backdrop-blur-sm">
                            <Truck className="w-3 h-3 mr-1" />
                            {t("item.shippingBadge")}
                          </Badge>
                        )}
                      </div>

                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={item.image_url || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>

                      <div className="p-4 flex flex-col flex-grow space-y-3">
                        <div className="flex-grow space-y-2">
                          <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          {hasPrice ? (
                            <span className="text-xl font-bold text-primary block">
                              {t("item.price", { amount: (priceCents / 100).toFixed(2) })}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t("item.pointsOnlyBadge")}
                            </Badge>
                          )}

                          <Button
                            onClick={() => handleBuyClick(item)}
                            disabled={!hasPrice || isOutOfStock}
                            className="w-full"
                            variant={hasPrice && !isOutOfStock ? "lime" : "secondary"}
                            size="sm"
                          >
                            {isOutOfStock ? t("item.outOfStock") : t("item.buy")}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Guest checkout dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !checkoutMutation.isPending && setConfirmOpen(open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("checkoutDialog.title")}</DialogTitle>
            <DialogDescription>
              {selectedItem?.product_type === "purchase"
                ? t("checkoutDialog.descriptionPurchase")
                : t("checkoutDialog.descriptionDefault")}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <p className="font-semibold">{selectedItem.name}</p>
                {selectedItem.partner_name && (
                  <p className="text-xs text-muted-foreground">
                    {t("checkoutDialog.from", { partner: selectedItem.partner_name })}
                  </p>
                )}
                {selectedItem.product_type === "purchase" && (
                  <Badge variant="default" className="mt-1">
                    <Truck className="w-3 h-3 mr-1" />
                    {t("checkoutDialog.willShip")}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-email">
                  {t("checkoutDialog.emailLabel")} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder={t("checkoutDialog.emailPlaceholder")}
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className={`pl-9 ${errors.email ? "border-destructive" : ""}`}
                    disabled={checkoutMutation.isPending}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-name">{t("checkoutDialog.nameLabel")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-name"
                    placeholder={t("checkoutDialog.namePlaceholder")}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="pl-9"
                    disabled={checkoutMutation.isPending}
                  />
                </div>
              </div>

              {selectedItem.product_type === "purchase" && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t("checkoutDialog.deliveryAddress")}</h4>
                  <ShippingAddressForm
                    address={shippingAddress}
                    onChange={setShippingAddress}
                    errors={errors}
                  />
                </div>
              )}

              <div className="flex justify-between text-sm border-t pt-4">
                <span className="text-muted-foreground">{t("checkoutDialog.totalLabel")}</span>
                <span className="font-semibold text-primary">
                  {t("item.price", { amount: (selectedPriceCents / 100).toFixed(2) })}
                </span>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t("checkoutDialog.loginHint")}{" "}
                <NavLink to="/auth" className="text-primary hover:underline font-medium">
                  {t("checkoutDialog.loginLink")}
                </NavLink>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={checkoutMutation.isPending}>
              {t("checkoutDialog.cancel")}
            </Button>
            <Button variant="lime" onClick={handleConfirmCheckout} disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("checkoutDialog.submitting")}
                </>
              ) : (
                t("checkoutDialog.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Marketplace;

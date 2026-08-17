import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { useMarketplaceItems, MarketplaceItem } from "@/hooks/useMarketplaceItems";
import { useMarketplaceCheckout, ShippingAddress } from "@/hooks/useMarketplaceCheckout";
import { useUserRedemptions } from "@/hooks/useUserRedemptions";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { usePointsValue } from "@/hooks/usePointsValue";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ShippingAddressForm } from "@/components/marketplace/ShippingAddressForm";
import { MarketplaceCreditsHeader } from "@/components/p2g";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Gift, Loader2, Sparkles, Truck, Coins } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { StorageImage } from "@/components/StorageImage";

type SortOption = "default" | "price-asc" | "price-desc";

const DashboardMarketplace = () => {
  const { t, i18n } = useTranslation("p2g");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const numberLocale = i18n.language === "en" ? "en-US" : "de-DE";
  const { user } = useAuth();
  const { wallet, profile, loading: walletLoading } = useAccountData(user);
  const { creditBreakdown, isCreditBreakdownLoading } = useP2GPoints();
  const { centsPerPoint, maxPercent, enabled: pointsEnabled } = usePointsValue();
  const [sortBy, setSortBy] = useState<SortOption>("default");
  // Show ALL active marketplace items in one list (equipment shop) — not filtered by
  // category, so anything the admin adds appears (ready-to-run).
  const { data: items, isLoading: itemsLoading } = useMarketplaceItems();
  const { data: redemptions } = useUserRedemptions();
  const checkoutMutation = useMarketplaceCheckout();

  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    address_line1: "",
    postal_code: "",
    city: "",
    country: "DE",
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const playCredits = wallet?.play_credits || 0;
  const rewardCredits = wallet?.reward_credits || 0;
  const totalCredits = playCredits + rewardCredits;
  const balanceWorthEuro = (totalCredits * centsPerPoint / 100).toFixed(2);

  const handleBuyClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setPointsToUse(0);
    if (item.product_type === "purchase" && profile) {
      setShippingAddress({
        address_line1: profile.shipping_address_line1 || "",
        postal_code: profile.shipping_postal_code || "",
        city: profile.shipping_city || "",
        country: profile.shipping_country || "DE",
      });
    }
    setAddressErrors({});
    setConfirmOpen(true);
  };

  const validateAddress = (): boolean => {
    const errors: Partial<Record<keyof ShippingAddress, string>> = {};
    if (!shippingAddress.address_line1.trim()) errors.address_line1 = t("marketplacePage.required");
    if (!shippingAddress.postal_code.trim()) errors.postal_code = t("marketplacePage.required");
    if (!shippingAddress.city.trim()) errors.city = t("marketplacePage.required");
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmCheckout = () => {
    if (!selectedItem) return;
    if (selectedItem.product_type === "purchase" && !validateAddress()) return;

    checkoutMutation.mutate({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      pointsToUse,
      shipping: selectedItem.product_type === "purchase" ? shippingAddress : undefined,
    }, {
      onSuccess: (data) => {
        // The Stripe path redirects away inside the mutation; only close on the free path.
        if (!data?.url) {
          setConfirmOpen(false);
          setSelectedItem(null);
          setPointsToUse(0);
          setShippingAddress({ address_line1: "", postal_code: "", city: "", country: "DE" });
        }
      },
    });
  };

  const isLoading = walletLoading || itemsLoading;

  const sortedItems = [...(items || [])].sort((a, b) => {
    const pa = a.price_cents ?? 0;
    const pb = b.price_cents ?? 0;
    if (sortBy === "price-asc") return pa - pb;
    if (sortBy === "price-desc") return pb - pa;
    return 0;
  });

  // Selected-item points maths (mirrors useBookingCheckout / marketplace-checkout server side).
  const selectedPriceCents = selectedItem?.price_cents ?? 0;
  const selectedMaxPoints = pointsEnabled
    ? Math.min(totalCredits, Math.floor(selectedPriceCents * maxPercent / 100 / centsPerPoint))
    : 0;
  const pointsDiscountCents = Math.min(
    Math.floor(pointsToUse * centsPerPoint),
    Math.floor(selectedPriceCents * maxPercent / 100),
  );
  const remainderCents = Math.max(0, selectedPriceCents - pointsDiscountCents);

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t("meta.marketplace.title")}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Expert Level + Credits Breakdown Header */}
        <MarketplaceCreditsHeader
          playCredits={playCredits}
          rewardCredits={rewardCredits}
          creditBreakdown={creditBreakdown}
          isLoading={walletLoading || isCreditBreakdownLoading}
        />

        {/* Points balance + its € worth — always visible */}
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Coins className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm">
            {t("marketplacePage.balanceWorth", {
              points: totalCredits.toLocaleString(numberLocale),
              amount: balanceWorthEuro,
            })}
          </p>
        </div>

        {/* Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("marketplacePage.sort.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">{t("marketplacePage.sort.default")}</SelectItem>
              <SelectItem value="price-asc">{t("marketplacePage.sort.priceAsc")}</SelectItem>
              <SelectItem value="price-desc">{t("marketplacePage.sort.priceDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  {t("marketplacePage.categories.equipment")}
                  <Badge variant="secondary" className="ml-2">{t("marketplacePage.productsCount", { count: sortedItems.length })}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 text-center py-12">
                    <Sparkles className="w-10 h-10 text-primary/60" />
                    <p className="text-lg font-semibold">{t("marketplacePage.empty.seeYouSoonTitle")}</p>
                    <p className="text-sm text-muted-foreground max-w-md">{t("marketplacePage.empty.seeYouSoonDesc")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sortedItems.map((item) => {
                      const priceCents = item.price_cents ?? 0;
                      const hasPrice = priceCents > 0;
                      const isOutOfStock = item.stock_quantity !== null && item.stock_quantity <= 0;
                      const isPurchase = item.product_type === "purchase";
                      const maxDiscountCents = pointsEnabled ? Math.floor(priceCents * maxPercent / 100) : 0;

                      return (
                        <div key={item.id} className="relative rounded-xl overflow-hidden bg-background/50 border border-border/30 flex flex-col">
                          <div className="absolute top-2 left-2 z-10 flex gap-1">
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                              {item.partner_name || "P2G"}
                            </Badge>
                            {isPurchase && (
                              <Badge variant="default" className="bg-primary/80 backdrop-blur-sm">
                                <Truck className="w-3 h-3 mr-1" />
                                {t("marketplacePage.shippingBadge")}
                              </Badge>
                            )}
                          </div>

                          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                            <StorageImage
                              renderWidth={600}
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
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-primary">
                                  {t("marketplacePage.price", { amount: (priceCents / 100).toFixed(2) })}
                                </span>
                              </div>
                              {maxDiscountCents > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {t("marketplacePage.maxPointsDiscount", { amount: (maxDiscountCents / 100).toFixed(2) })}
                                </p>
                              )}

                              <Button
                                onClick={() => handleBuyClick(item)}
                                disabled={!hasPrice || isOutOfStock || checkoutMutation.isPending}
                                className="w-full"
                                variant={hasPrice && !isOutOfStock ? "lime" : "secondary"}
                                size="sm"
                              >
                                {isOutOfStock
                                  ? t("marketplacePage.button.outOfStock")
                                  : t("marketplacePage.button.buy")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historie */}
            {redemptions && redemptions.length > 0 && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    {t("marketplacePage.historyHeading")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {redemptions.slice(0, 5).map((redemption) => (
                      <div key={redemption.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                        <div className="space-y-1">
                          <p className="font-medium">{redemption.item?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(redemption.created_at), t("marketplacePage.dateFormat"), { locale: dateLocale })}
                          </p>
                        </div>
                        <div className="text-right">
                          {redemption.credit_cost > 0 && (
                            <p className="font-semibold text-destructive">-{redemption.credit_cost}</p>
                          )}
                          {redemption.reference_code && (
                            <p className="text-xs text-muted-foreground font-mono">{redemption.reference_code}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("marketplacePage.confirm.title")}</DialogTitle>
            <DialogDescription>
              {selectedItem?.product_type === "purchase"
                ? t("marketplacePage.confirm.descPurchase")
                : t("marketplacePage.confirm.descDefault")}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="py-4 space-y-4">
              {selectedItem.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <StorageImage renderWidth={1200} src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <p className="font-semibold">{selectedItem.name}</p>
                {selectedItem.partner_name && (
                  <p className="text-xs text-muted-foreground">{t("marketplacePage.confirm.from", { partner: selectedItem.partner_name })}</p>
                )}
                {selectedItem.product_type === "purchase" && (
                  <Badge variant="default" className="mt-1">
                    <Truck className="w-3 h-3 mr-1" />
                    {t("marketplacePage.confirm.willShip")}
                  </Badge>
                )}
              </div>

              {selectedItem.product_type === "purchase" && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t("marketplacePage.confirm.deliveryAddress")}</h4>
                  <ShippingAddressForm
                    address={shippingAddress}
                    onChange={setShippingAddress}
                    errors={addressErrors}
                  />
                </div>
              )}

              {/* P2G points discount */}
              {pointsEnabled && selectedMaxPoints > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{t("marketplacePage.confirm.points.title")}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t("marketplacePage.confirm.points.available", {
                        count: totalCredits.toLocaleString(numberLocale),
                        amount: balanceWorthEuro,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={selectedMaxPoints}
                      step={10}
                      value={pointsToUse}
                      onChange={e => setPointsToUse(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-bold text-primary w-20 text-right">
                      {pointsToUse > 0
                        ? `−${(pointsDiscountCents / 100).toFixed(2)} €`
                        : t("marketplacePage.confirm.points.none")}
                    </span>
                  </div>
                  {pointsToUse > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("marketplacePage.confirm.points.discountLine", {
                        count: pointsToUse.toLocaleString(numberLocale),
                        amount: (pointsDiscountCents / 100).toFixed(2),
                        maxPercent,
                      })}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("marketplacePage.confirm.price")}</span>
                  <span className="font-semibold">{t("marketplacePage.price", { amount: (selectedPriceCents / 100).toFixed(2) })}</span>
                </div>
                {pointsDiscountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("marketplacePage.confirm.pointsDiscount")}</span>
                    <span className="font-semibold text-primary">−{(pointsDiscountCents / 100).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">{t("marketplacePage.confirm.toPay")}</span>
                  <span className="font-semibold text-primary">{t("marketplacePage.price", { amount: (remainderCents / 100).toFixed(2) })}</span>
                </div>
                {remainderCents <= 0 && (
                  <p className="text-xs text-muted-foreground pt-1">{t("marketplacePage.confirm.freeHint")}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t("marketplacePage.confirm.cancel")}</Button>
            <Button variant="lime" onClick={handleConfirmCheckout} disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("marketplacePage.confirm.checkingOut")}</>
              ) : (
                t("marketplacePage.confirm.checkout")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardMarketplace;

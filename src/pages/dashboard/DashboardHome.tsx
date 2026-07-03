import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Coins, Sparkles, Truck, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { useMarketplaceItems } from "@/hooks/useMarketplaceItems";
import { usePointsValue } from "@/hooks/usePointsValue";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const DashboardHome = () => {
  const { t, i18n } = useTranslation("p2g");
  const { t: tDash } = useTranslation("dashboard");
  const numberLocale = i18n.language === "en" ? "en-US" : "de-DE";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useAccountData(user);
  const { centsPerPoint, maxPercent, enabled: pointsEnabled } = usePointsValue();
  const { canSee, isLoading: featureLoading } = useFeatureToggles();
  const { data: items, isLoading: itemsLoading } = useMarketplaceItems("equipment");

  const showMarketplace = canSee("marketplace");
  const playCredits = wallet?.play_credits || 0;
  const rewardCredits = wallet?.reward_credits || 0;
  const totalCredits = playCredits + rewardCredits;
  const balanceWorthEuro = (totalCredits * centsPerPoint / 100).toFixed(2);

  const isLoading = walletLoading || featureLoading || itemsLoading;
  const activeItems = items || [];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{tDash("home.meta.title")}</title>
      </Helmet>

      <div className="container mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6 pb-24">

        {/* Points + euro-value summary */}
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Coins className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm">
            {t("marketplacePage.balanceWorth", {
              points: totalCredits.toLocaleString(numberLocale),
              amount: balanceWorthEuro,
            })}
          </p>
        </div>

        {/* Equipment shop grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : showMarketplace ? (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {t("marketplacePage.categories.equipment")}
                <Badge variant="secondary" className="ml-2">
                  {t("marketplacePage.productsCount", { count: activeItems.length })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center py-12">
                  <Sparkles className="w-10 h-10 text-primary/60" />
                  <p className="text-lg font-semibold">{t("marketplacePage.empty.seeYouSoonTitle")}</p>
                  <p className="text-sm text-muted-foreground max-w-md">{t("marketplacePage.empty.seeYouSoonDesc")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {activeItems.map((item) => {
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
                              onClick={() => navigate("/dashboard/marketplace")}
                              disabled={!hasPrice || isOutOfStock}
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
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { useMarketplaceItems, MarketplaceItem, MarketplaceCategory } from "@/hooks/useMarketplaceItems";
import { useMarketplaceRedeem, ShippingAddress } from "@/hooks/useMarketplaceRedeem";
import { useUserRedemptions } from "@/hooks/useUserRedemptions";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ShippingAddressForm } from "@/components/marketplace/ShippingAddressForm";
import { MarketplaceCreditsHeader, ReferralShareCard } from "@/components/p2g";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { ShoppingBag, Gift, Loader2, Calendar, Sparkles, Ticket, Truck, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const CATEGORIES: { key: MarketplaceCategory; label: string; icon: typeof Calendar }[] = [
  { key: "courtbooking", label: "Courtbuchung", icon: Calendar },
  { key: "equipment", label: "Equipment", icon: ShoppingBag },
  { key: "other", label: "Sonstiges", icon: Sparkles },
  { key: "events", label: "Events", icon: Ticket },
];

type SortOption = "default" | "price-asc" | "price-desc";

const DashboardMarketplace = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { wallet, profile, loading: walletLoading } = useAccountData(user);
  const { creditBreakdown, isCreditBreakdownLoading, dailyClaimStatus, isDailyClaimStatusLoading } = useP2GPoints();
  const [activeCategory, setActiveCategory] = useState<MarketplaceCategory>("courtbooking");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showAffordableOnly, setShowAffordableOnly] = useState(searchParams.get("affordable") === "true");
  const { data: items, isLoading: itemsLoading } = useMarketplaceItems(activeCategory);
  const { data: redemptions } = useUserRedemptions();
  const redeemMutation = useMarketplaceRedeem();
  
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  // Update URL when toggle changes
  useEffect(() => {
    if (showAffordableOnly) {
      searchParams.set("affordable", "true");
    } else {
      searchParams.delete("affordable");
    }
    setSearchParams(searchParams, { replace: true });
  }, [showAffordableOnly, searchParams, setSearchParams]);

  const handleRedeemClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
    // Pre-fill with saved address if available
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
    if (!shippingAddress.address_line1.trim()) errors.address_line1 = "Pflichtfeld";
    if (!shippingAddress.postal_code.trim()) errors.postal_code = "Pflichtfeld";
    if (!shippingAddress.city.trim()) errors.city = "Pflichtfeld";
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmRedeem = () => {
    if (!selectedItem) return;
    
    // Validate address for purchase products
    if (selectedItem.product_type === "purchase" && !validateAddress()) {
      return;
    }

    redeemMutation.mutate({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      creditCost: selectedItem.credit_cost,
      shippingAddress: selectedItem.product_type === "purchase" ? shippingAddress : undefined,
    }, {
      onSuccess: () => {
        setConfirmOpen(false);
        setSelectedItem(null);
        setShippingAddress({ address_line1: "", postal_code: "", city: "", country: "DE" });
      },
    });
  };

  const isLoading = walletLoading || itemsLoading;

  // Filter and sort items
  let filteredItems = items || [];
  if (showAffordableOnly) {
    filteredItems = filteredItems.filter(item => totalCredits >= item.credit_cost);
  }
  
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "price-asc") return a.credit_cost - b.credit_cost;
    if (sortBy === "price-desc") return b.credit_cost - a.credit_cost;
    return 0;
  });

  const activeCategoryData = CATEGORIES.find(c => c.key === activeCategory);
  const affordableCount = items?.filter(item => totalCredits >= item.credit_cost).length || 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Marketplace | Padel2Go Dashboard</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* New Expert Level + Credits Breakdown Header */}
        <MarketplaceCreditsHeader
          playCredits={playCredits}
          rewardCredits={rewardCredits}
          creditBreakdown={creditBreakdown}
          isLoading={walletLoading || isCreditBreakdownLoading}
        />

        {/* Referral Section */}
        <ReferralShareCard />

        {/* Category Tabs and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as MarketplaceCategory)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
                {CATEGORIES.map(({ key, label, icon: Icon }) => (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 hidden sm:block" />
                    <span className="text-xs sm:text-sm">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-4">
              {/* Affordable Only Toggle */}
              <div className="flex items-center gap-2">
                <Switch 
                  id="affordable-only" 
                  checked={showAffordableOnly}
                  onCheckedChange={setShowAffordableOnly}
                />
                <Label htmlFor="affordable-only" className="text-sm cursor-pointer">
                  Nur leistbare
                </Label>
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standard</SelectItem>
                  <SelectItem value="price-asc">Preis: Niedrig → Hoch</SelectItem>
                  <SelectItem value="price-desc">Preis: Hoch → Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  {activeCategoryData && <activeCategoryData.icon className="w-5 h-5 text-primary" />}
                  {activeCategoryData?.label}
                  <Badge variant="secondary" className="ml-2">{sortedItems.length} Produkte</Badge>
                  {showAffordableOnly && (
                    <Badge variant="outline" className="ml-2 text-green-400 border-green-400/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Nur leistbare
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {showAffordableOnly 
                      ? "Keine leistbaren Produkte in dieser Kategorie. Sammle mehr Credits!"
                      : "Keine Produkte in dieser Kategorie verfügbar."
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sortedItems.map((item) => {
                      const canAfford = totalCredits >= item.credit_cost;
                      const isOutOfStock = item.stock_quantity !== null && item.stock_quantity <= 0;
                      const isPurchase = item.product_type === "purchase";
                      const missingCredits = item.credit_cost - totalCredits;
                      
                      return (
                        <div key={item.id} className="relative rounded-xl overflow-hidden bg-background/50 border border-border/30 flex flex-col">
                          <div className="absolute top-2 left-2 z-10 flex gap-1">
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                              {item.partner_name || "P2G"}
                            </Badge>
                            {isPurchase && (
                              <Badge variant="default" className="bg-primary/80 backdrop-blur-sm">
                                <Truck className="w-3 h-3 mr-1" />
                                Versand
                              </Badge>
                            )}
                          </div>

                          {/* Affordability indicator */}
                          <div className="absolute top-2 right-2 z-10">
                            {canAfford ? (
                              <Badge className="bg-green-500/80 backdrop-blur-sm">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Leistbar
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-destructive/80 backdrop-blur-sm">
                                <XCircle className="w-3 h-3 mr-1" />
                                -{missingCredits}
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

                            <div className="space-y-3">
                              <Badge variant="outline" className="text-primary border-primary">
                                {item.credit_cost} Credits
                              </Badge>

                              <Button
                                onClick={() => handleRedeemClick(item)}
                                disabled={!canAfford || isOutOfStock || redeemMutation.isPending}
                                className="w-full"
                                variant={canAfford && !isOutOfStock ? "lime" : "secondary"}
                                size="sm"
                              >
                                {isOutOfStock 
                                  ? "Nicht verfügbar" 
                                  : canAfford 
                                    ? "Einlösen" 
                                    : `Noch ${missingCredits} Credits`
                                }
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

            {/* Historie (previously "Meine Einlösungen") */}
            {redemptions && redemptions.length > 0 && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Historie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {redemptions.slice(0, 5).map((redemption) => (
                      <div key={redemption.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                        <div className="space-y-1">
                          <p className="font-medium">{redemption.item?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(redemption.created_at), "d. MMM yyyy, HH:mm", { locale: de })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-destructive">-{redemption.credit_cost}</p>
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
            <DialogTitle>Einlösung bestätigen</DialogTitle>
            <DialogDescription>
              {selectedItem?.product_type === "purchase"
                ? "Bitte gib deine Lieferadresse ein."
                : "Möchtest du dieses Item wirklich einlösen?"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="py-4 space-y-4">
              {selectedItem.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <p className="font-semibold">{selectedItem.name}</p>
                {selectedItem.partner_name && (
                  <p className="text-xs text-muted-foreground">von {selectedItem.partner_name}</p>
                )}
                {selectedItem.product_type === "purchase" && (
                  <Badge variant="default" className="mt-1">
                    <Truck className="w-3 h-3 mr-1" />
                    Wird versendet
                  </Badge>
                )}
              </div>

              {selectedItem.product_type === "purchase" && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Lieferadresse</h4>
                  <ShippingAddressForm
                    address={shippingAddress}
                    onChange={setShippingAddress}
                    errors={addressErrors}
                  />
                </div>
              )}
              
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preis:</span>
                  <span className="font-semibold">{selectedItem.credit_cost} Credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dein Guthaben:</span>
                  <span className="font-semibold">{totalCredits} Credits</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Nach Einlösung:</span>
                  <span className="font-semibold text-primary">{totalCredits - selectedItem.credit_cost} Credits</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="lime" onClick={handleConfirmRedeem} disabled={redeemMutation.isPending}>
              {redeemMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird eingelöst...</>
              ) : (
                "Jetzt einlösen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardMarketplace;

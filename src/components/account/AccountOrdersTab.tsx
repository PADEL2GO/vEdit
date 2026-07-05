import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, ShoppingBag, ArrowRight, Coins, MapPin,
  Clock, Truck, PackageCheck, XCircle, RotateCcw, Image as ImageIcon,
} from "lucide-react";
import { useUserRedemptions, type UserRedemption } from "@/hooks/useUserRedemptions";
import { eur } from "@/lib/marketplace";

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

type StatusView = { label: string; icon: typeof Clock; className: string };

function statusView(o: UserRedemption): StatusView {
  if (o.status === "refunded")
    return { label: "Erstattet", icon: RotateCcw, className: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (o.status === "cancelled")
    return { label: "Storniert", icon: XCircle, className: "bg-muted text-muted-foreground border-border" };
  switch (o.fulfillment_status) {
    case "shipped":
      return { label: "Versandt", icon: Truck, className: "bg-primary/15 text-primary border-primary/30" };
    case "delivered":
      return { label: "Geliefert", icon: PackageCheck, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    default:
      return { label: "In Bearbeitung", icon: Clock, className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  }
}

export function AccountOrdersTab() {
  const { data, isLoading } = useUserRedemptions();

  // Only completed orders belong in the customer's history — hide abandoned
  // (pending) / failed checkout attempts.
  const orders = (data ?? []).filter((o) => ["success", "refunded", "cancelled"].includes(o.status));

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-16 rounded-2xl border border-border bg-card">
        <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Package className="w-7 h-7 text-muted-foreground" />
        </span>
        <h3 className="text-lg font-semibold">Noch keine Bestellungen</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Sobald du im Marketplace bestellst, findest du hier deine Bestellungen und den Versandstatus.
        </p>
        <Button asChild variant="lime" className="mt-1">
          <Link to="/marketplace" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Zum Marketplace
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o, i) => {
        const sv = statusView(o);
        const Icon = sv.icon;
        const pointsSpent = (o.play_spent ?? 0) + (o.reward_spent ?? 0);
        const hasAddress = !!o.shipping_address_line1;
        return (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                {o.item?.image_url ? (
                  <img src={o.item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{o.item?.name || "Produkt"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {dateFmt(o.created_at)} · Menge {o.quantity ?? 1}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 gap-1.5 ${sv.className}`}>
                    <Icon className="w-3 h-3" />
                    {sv.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                  <span className="font-mono font-semibold">{eur(o.amount_cents)}</span>
                  {pointsSpent > 0 && (
                    <span className="inline-flex items-center gap-1 text-primary text-xs">
                      <Coins className="w-3.5 h-3.5" />
                      {pointsSpent.toLocaleString("de-DE")} Punkte
                    </span>
                  )}
                  {o.reference_code && (
                    <span className="font-mono text-xs text-muted-foreground">Nr. {o.reference_code}</span>
                  )}
                </div>

                {hasAddress && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {o.shipping_address_line1}, {o.shipping_postal_code} {o.shipping_city}
                    </span>
                  </div>
                )}

                {o.status === "refunded" && (
                  <p className="text-xs text-red-400 mt-2">
                    Diese Bestellung wurde storniert und erstattet. Eingelöste Punkte wurden zurückgebucht.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

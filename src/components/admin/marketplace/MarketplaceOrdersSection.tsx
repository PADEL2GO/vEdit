import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Package, MapPin, Coins, Truck, RotateCcw, Image as ImageIcon, Send, Undo2 } from "lucide-react";
import {
  useAdminMarketplaceOrders,
  useUpdateFulfillmentStatus,
  useRefundMarketplaceOrder,
  useShipOrder,
  useAdminReturns,
  useUpdateReturn,
  type MarketplaceOrder,
  type FulfillmentStatus,
  type ReturnStatus,
} from "@/hooks/useAdminMarketplace";

const eur = (cents: number | null | undefined) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);

const FULFILL_LABEL: Record<FulfillmentStatus, string> = {
  pending: "Offen",
  shipped: "Versendet",
  delivered: "Geliefert",
  cancelled: "Storniert",
};

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

const CARRIERS = ["DHL", "DPD", "GLS", "Hermes", "Andere"];

const RETURN_LABEL: Record<ReturnStatus, string> = {
  requested: "Angemeldet",
  received: "Ware eingegangen",
  refunded: "Erstattet",
  rejected: "Abgelehnt",
};

export function MarketplaceOrdersSection() {
  const { data: orders, isLoading } = useAdminMarketplaceOrders();
  const updateFulfillment = useUpdateFulfillmentStatus();
  const refund = useRefundMarketplaceOrder();
  const shipOrder = useShipOrder();

  const [filter, setFilter] = useState<string>("open");
  const [refundTarget, setRefundTarget] = useState<MarketplaceOrder | null>(null);
  const [shipForms, setShipForms] = useState<Record<string, { carrier: string; tracking: string }>>({});

  const setShipForm = (id: string, patch: Partial<{ carrier: string; tracking: string }>) =>
    setShipForms((f) => ({ ...f, [id]: { ...(f[id] ?? { carrier: "DHL", tracking: "" }), ...patch } }));

  const all = orders ?? [];
  const openCount = all.filter((o) => o.status === "success" && o.fulfillment_status === "pending").length;

  const filtered = all.filter((o) => {
    if (filter === "all") return true;
    if (filter === "open") return o.status === "success" && o.fulfillment_status === "pending";
    if (filter === "shipped") return o.status === "success" && o.fulfillment_status === "shipped";
    if (filter === "delivered") return o.status === "success" && o.fulfillment_status === "delivered";
    if (filter === "refunded") return o.status === "refunded" || o.status === "cancelled";
    return true;
  });

  const statusBadge = (o: MarketplaceOrder) => {
    if (o.status === "refunded") return <Badge variant="destructive">Erstattet</Badge>;
    if (o.status === "cancelled") return <Badge variant="secondary">Storniert</Badge>;
    const v =
      o.fulfillment_status === "delivered" ? "default" :
      o.fulfillment_status === "shipped" ? "default" : "secondary";
    return <Badge variant={v as "default" | "secondary"}>{FULFILL_LABEL[o.fulfillment_status]}</Badge>;
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Bestellungen &amp; Versand
            {openCount > 0 && (
              <Badge variant="default" className="ml-1">{openCount} offen</Badge>
            )}
          </CardTitle>
          <div className="w-full sm:w-56">
            <Label className="sr-only">Filter</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Offen (zu versenden)</SelectItem>
                <SelectItem value="shipped">Versendet</SelectItem>
                <SelectItem value="delivered">Geliefert</SelectItem>
                <SelectItem value="refunded">Storniert / Erstattet</SelectItem>
                <SelectItem value="all">Alle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 opacity-50" />
            <p>Keine Bestellungen in dieser Ansicht.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Bestellnr.</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Lieferadresse</TableHead>
                  <TableHead className="text-right">Bezahlt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const refunded = o.status !== "success";
                  const pointsSpent = (o.play_spent ?? 0) + (o.reward_spent ?? 0);
                  const hasAddress = !!o.shipping_address_line1;
                  const form = shipForms[o.id] ?? { carrier: "DHL", tracking: "" };
                  const shipping = shipOrder.isPending && shipOrder.variables?.order_id === o.id;
                  return (
                    <TableRow key={o.id} className={refunded ? "opacity-60" : ""}>
                      <TableCell className="whitespace-nowrap text-sm">{dateFmt(o.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{o.reference_code || o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{o.guest_name || (o.user_id ? "Konto-Nutzer" : "Gast")}</div>
                        {o.guest_email && <div className="text-xs text-muted-foreground break-all">{o.guest_email}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0">
                            {o.item?.image_url ? (
                              <img src={o.item.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium line-clamp-1">{o.item?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">Menge: {o.quantity ?? 1}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm min-w-[180px]">
                        {hasAddress ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                            <span>
                              {o.shipping_address_line1}<br />
                              {o.shipping_postal_code} {o.shipping_city}<br />
                              {o.shipping_country || "DE"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Keine Versandadresse</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="font-mono font-medium">{eur(o.amount_cents)}</div>
                        {pointsSpent > 0 && (
                          <div className="text-xs text-primary inline-flex items-center gap-1 justify-end">
                            <Coins className="w-3 h-3" />
                            {pointsSpent.toLocaleString("de-DE")} P.
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {statusBadge(o)}
                        {o.tracking_number && (o.fulfillment_status === "shipped" || o.fulfillment_status === "delivered") && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                            {o.carrier} · {o.tracking_number}
                            {o.shipped_at && <> · {dateFmt(o.shipped_at)}</>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-2">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={o.fulfillment_status}
                              onValueChange={(v) =>
                                updateFulfillment.mutate({ id: o.id, fulfillment_status: v as FulfillmentStatus })
                              }
                              disabled={refunded}
                            >
                              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Offen</SelectItem>
                                <SelectItem value="shipped">Versendet</SelectItem>
                                <SelectItem value="delivered">Geliefert</SelectItem>
                              </SelectContent>
                            </Select>
                            {!refunded && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive shrink-0"
                                onClick={() => setRefundTarget(o)}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Stornieren
                              </Button>
                            )}
                          </div>
                          {!refunded && o.fulfillment_status === "pending" && hasAddress && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Select value={form.carrier} onValueChange={(v) => setShipForm(o.id, { carrier: v })}>
                                <SelectTrigger className="h-8 w-[92px] shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CARRIERS.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-8 w-[140px]"
                                placeholder="Sendungsnummer"
                                value={form.tracking}
                                onChange={(e) => setShipForm(o.id, { tracking: e.target.value })}
                              />
                              <Button
                                size="sm"
                                className="h-8 shrink-0"
                                disabled={!form.tracking.trim() || shipping}
                                onClick={() =>
                                  shipOrder.mutate({
                                    order_id: o.id,
                                    tracking_number: form.tracking.trim(),
                                    carrier: form.carrier,
                                  })
                                }
                              >
                                {shipping ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4 mr-1" />
                                )}
                                Versenden + Mail
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Refund confirmation */}
      <AlertDialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestellung stornieren &amp; erstatten?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget && (
                <>
                  „{refundTarget.item?.name}" ({refundTarget.reference_code}) wird storniert.
                  {(refundTarget.amount_cents ?? 0) > 0 && (
                    <> Der bezahlte Betrag <strong>{eur(refundTarget.amount_cents)}</strong> wird über Stripe zurückerstattet.</>
                  )}
                  {((refundTarget.play_spent ?? 0) + (refundTarget.reward_spent ?? 0)) > 0 && (
                    <> Eingelöste Punkte werden dem Konto gutgeschrieben.</>
                  )}
                  {" "}Der Lagerbestand wird zurückgebucht. Diese Aktion kann nicht rückgängig gemacht werden.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refund.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={refund.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!refundTarget) return;
                refund.mutate(refundTarget.id, { onSuccess: () => setRefundTarget(null) });
              }}
            >
              {refund.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Stornieren &amp; erstatten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>

    <MarketplaceReturnsSection />
    </>
  );
}

function MarketplaceReturnsSection() {
  const { data: returns, isLoading } = useAdminReturns();
  const updateReturn = useUpdateReturn();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const list = returns ?? [];
  const openReturns = list.filter((r) => r.status === "requested").length;

  const saveNote = (id: string, current: string | null) => {
    const value = notes[id];
    if (value === undefined || value === (current ?? "")) return;
    updateReturn.mutate({ id, admin_note: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="w-5 h-5" />
          Retouren &amp; Widerrufe
          {openReturns > 0 && <Badge variant="default" className="ml-1">{openReturns} offen</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Keine Retouren vorhanden.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Bestellung</TableHead>
                  <TableHead>Grund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Interne Notiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{dateFmt(r.requested_at)}</TableCell>
                    <TableCell className="text-sm min-w-[160px]">
                      <div className="font-mono text-xs">{r.order?.reference_code || r.order_id.slice(0, 8)}</div>
                      <div className="font-medium line-clamp-1">{r.order?.item?.name || "—"}</div>
                      {r.order?.guest_email && (
                        <div className="text-xs text-muted-foreground break-all">{r.order.guest_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm min-w-[180px] max-w-[280px]">
                      <span className="whitespace-pre-wrap">{r.reason || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateReturn.mutate({ id: r.id, status: v as ReturnStatus })}
                      >
                        <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(RETURN_LABEL) as ReturnStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{RETURN_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <Input
                        className="h-8"
                        placeholder="Notiz…"
                        value={notes[r.id] ?? r.admin_note ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        onBlur={() => saveNote(r.id, r.admin_note)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Erstattung wie gewohnt über den Stornieren-Button der Bestellung auslösen.
        </p>
      </CardContent>
    </Card>
  );
}

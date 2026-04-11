import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Loader2, Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  useAdminRedemptions,
  useUpdateFulfillmentStatus,
  type FulfillmentStatus,
} from "@/hooks/useAdminMarketplace";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ausstehend", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  shipped: { label: "Versendet", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Truck },
  delivered: { label: "Zugestellt", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  cancelled: { label: "Storniert", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

const AdminRedemptions = () => {
  const { data: redemptions, isLoading } = useAdminRedemptions();
  const updateStatusMutation = useUpdateFulfillmentStatus();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Filter redemptions
  const filteredRedemptions = redemptions?.filter((r) => {
    if (filterStatus !== "all" && r.fulfillment_status !== filterStatus) return false;
    if (filterType === "purchase" && r.item?.product_type !== "purchase") return false;
    if (filterType === "rental" && r.item?.product_type !== "rental") return false;
    return true;
  }) || [];

  // Stats
  const pendingCount = redemptions?.filter((r) => r.fulfillment_status === "pending" && r.item?.product_type === "purchase").length || 0;
  const shippedCount = redemptions?.filter((r) => r.fulfillment_status === "shipped").length || 0;
  const totalPurchases = redemptions?.filter((r) => r.item?.product_type === "purchase").length || 0;

  const handleStatusChange = (id: string, status: FulfillmentStatus) => {
    updateStatusMutation.mutate({ id, fulfillment_status: status });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Einlösungen | Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Einlösungen
          </h1>
          <p className="text-muted-foreground">
            Alle Marketplace-Einlösungen und Versandstatus verwalten
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Ausstehend</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{shippedCount}</p>
                  <p className="text-sm text-muted-foreground">Unterwegs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPurchases}</p>
                  <p className="text-sm text-muted-foreground">Kaufprodukte</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="shipped">Versendet</SelectItem>
                    <SelectItem value="delivered">Zugestellt</SelectItem>
                    <SelectItem value="cancelled">Storniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Produktart</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="purchase">Kauf (Versand)</SelectItem>
                    <SelectItem value="rental">Verleih (Code)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redemptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Einlösungen ({filteredRedemptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Keine Einlösungen gefunden.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Referenz</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Lieferadresse</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRedemptions.map((redemption) => {
                      const isPurchase = redemption.item?.product_type === "purchase";
                      const statusInfo = FULFILLMENT_STATUS_LABELS[redemption.fulfillment_status];
                      const StatusIcon = statusInfo.icon;

                      return (
                        <TableRow key={redemption.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(parseISO(redemption.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {redemption.reference_code || "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {redemption.item?.name || "Unbekannt"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isPurchase ? "default" : "secondary"}>
                              {isPurchase ? "Kauf" : "Verleih"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {redemption.credit_cost}
                          </TableCell>
                          <TableCell>
                            {isPurchase && redemption.shipping_address_line1 ? (
                              <div className="text-sm">
                                <p>{redemption.shipping_address_line1}</p>
                                <p className="text-muted-foreground">
                                  {redemption.shipping_postal_code} {redemption.shipping_city}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isPurchase ? (
                              <Select
                                value={redemption.fulfillment_status}
                                onValueChange={(value) => handleStatusChange(redemption.id, value as FulfillmentStatus)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon className="w-4 h-4" />
                                    <span>{statusInfo.label}</span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(FULFILLMENT_STATUS_LABELS).map(([key, { label, icon: Icon }]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span>{label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Eingelöst
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRedemptions;

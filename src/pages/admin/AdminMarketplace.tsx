import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShoppingCart,
  Image as ImageIcon,
  Euro,
  Coins,
  Users,
  Tag,
  Award,
  ArrowUp,
  ArrowDown,
  X,
  Star,
  Languages,
  Download,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useAdminMarketplaceItems,
  useCreateMarketplaceItem,
  useUpdateMarketplaceItem,
  useDeleteMarketplaceItem,
  useToggleMarketplaceItemStatus,
  MarketplaceItemInput,
} from "@/hooks/useAdminMarketplace";
import {
  useAdminCatalogCategories,
  useAdminCatalogBrands,
  useSyncItemImages,
  slugify,
} from "@/hooks/useMarketplaceCatalog";
import { CatalogManagerDialog } from "@/components/admin/marketplace/CatalogManagerDialog";
import { MarketplaceOrdersSection } from "@/components/admin/marketplace/MarketplaceOrdersSection";
import type { MarketplaceItem, MarketplaceCategory, ProductType } from "@/hooks/useMarketplaceItems";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRODUCT_TRANSLATE_FIELDS = ["name", "subtitle", "description", "long_description", "meta_title", "meta_description"];

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  courtbooking: "Courtbuchung",
  equipment: "Equipment",
  other: "Sonstiges",
  events: "Events",
};

interface GalleryImage {
  url: string;
  alt: string;
}
interface SpecRow {
  label: string;
  value: string;
}

interface MarketplaceReferrer {
  user_id: string;
  display_name: string | null;
  username: string | null;
  referred_count: number;
  points: number;
  eur_value_cents: number;
}

interface MarketplaceAnalytics {
  revenue_cents: number;
  order_count: number;
  points_redeemed: number;
  credits_per_euro: number;
  cents_per_point: number;
  referrers: MarketplaceReferrer[];
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    (cents || 0) / 100,
  );

const emptyForm = (): Partial<MarketplaceItemInput> => ({
  name: "",
  category: "equipment",
  credit_cost: 0,
  price_cents: 0,
  compare_at_price_cents: null,
  description: "",
  subtitle: "",
  long_description: "",
  image_url: "",
  slug: "",
  category_id: null,
  brand_id: null,
  partner_name: "",
  stock_quantity: null,
  sort_order: 0,
  is_featured: false,
  status: "published",
  meta_title: "",
  meta_description: "",
  manufacturer_name: "",
  manufacturer_address: "",
  manufacturer_email: "",
  eu_responsible_name: "",
  eu_responsible_address: "",
  eu_responsible_email: "",
  product_identifier: "",
  safety_warnings: "",
  textile_composition: "",
  delivery_days_min: 2,
  delivery_days_max: 4,
  base_price_quantity: null,
  base_price_unit: "",
});

const AdminMarketplace = () => {
  const { data: items, isLoading } = useAdminMarketplaceItems();
  const createMutation = useCreateMarketplaceItem();
  const updateMutation = useUpdateMarketplaceItem();
  const deleteMutation = useDeleteMarketplaceItem();
  const toggleStatusMutation = useToggleMarketplaceItemStatus();
  const syncImages = useSyncItemImages();
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const { data: categories } = useAdminCatalogCategories();
  const { data: brands } = useAdminCatalogBrands();

  const invalidateItems = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
    queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
  };

  // Backfill: translate every product AND category's DE copy into its *_en columns. Sequential
  // to respect DeepL rate limits; locked/empty fields are skipped server-side, so it is idempotent.
  const translateAll = async () => {
    const jobs = [
      ...(items ?? []).map((i) => ({ table: "marketplace_items", id: i.id, fields: PRODUCT_TRANSLATE_FIELDS })),
      ...(categories ?? []).map((c) => ({ table: "marketplace_categories", id: c.id, fields: ["name"] })),
    ];
    if (!jobs.length) return;
    setBulk({ done: 0, total: jobs.length });
    let ok = 0;
    for (const job of jobs) {
      const result = await translateRow(job);
      if (!result.error) ok++;
      setBulk((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBulk(null);
    invalidateItems();
    queryClient.invalidateQueries({ queryKey: ["admin-catalog-categories"] });
    queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
    toast.success(t("admin.translateAllDone", { count: ok }));
  };

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-marketplace-analytics"],
    queryFn: async (): Promise<MarketplaceAnalytics> => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "marketplace_analytics" },
      });
      if (error) throw error;
      return data as MarketplaceAnalytics;
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [brandManagerOpen, setBrandManagerOpen] = useState(false);
  const [exportingReceipts, setExportingReceipts] = useState(false);

  const [formData, setFormData] = useState<Partial<MarketplaceItemInput>>(emptyForm());
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const resetForm = () => {
    setFormData(emptyForm());
    setSpecs([]);
    setGallery([]);
    setSlugTouched(false);
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = async (item: MarketplaceItem) => {
    setEditingItem(item);
    setSlugTouched(true);
    setFormData({
      name: item.name,
      category: item.category,
      credit_cost: item.credit_cost,
      price_cents: item.price_cents ?? 0,
      compare_at_price_cents: item.compare_at_price_cents ?? null,
      description: item.description || "",
      subtitle: item.subtitle || "",
      long_description: item.long_description || "",
      image_url: item.image_url || "",
      slug: item.slug || "",
      category_id: item.category_id ?? null,
      brand_id: item.brand_id ?? null,
      partner_name: item.partner_name || "",
      stock_quantity: item.stock_quantity,
      sort_order: item.sort_order,
      is_featured: !!item.is_featured,
      status: (item.status as "draft" | "published") || "published",
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
      // GPSR columns not yet in generated types.ts
      manufacturer_name: (item as any).manufacturer_name || "",
      manufacturer_address: (item as any).manufacturer_address || "",
      manufacturer_email: (item as any).manufacturer_email || "",
      eu_responsible_name: (item as any).eu_responsible_name || "",
      eu_responsible_address: (item as any).eu_responsible_address || "",
      eu_responsible_email: (item as any).eu_responsible_email || "",
      product_identifier: (item as any).product_identifier || "",
      safety_warnings: (item as any).safety_warnings || "",
      textile_composition: (item as any).textile_composition || "",
      delivery_days_min: (item as any).delivery_days_min ?? 2,
      delivery_days_max: (item as any).delivery_days_max ?? 4,
      base_price_quantity: (item as any).base_price_quantity ?? null,
      base_price_unit: (item as any).base_price_unit || "",
    });
    setSpecs(Array.isArray(item.specs) ? (item.specs as SpecRow[]) : []);
    setGallery([]);
    setDialogOpen(true);
    // Load existing gallery images for this product.
    const { data } = await (supabase as any)
      .from("marketplace_item_images")
      .select("url, alt")
      .eq("item_id", item.id)
      .order("sort_order", { ascending: true });
    setGallery(((data as { url: string; alt: string | null }[]) ?? []).map((d) => ({ url: d.url, alt: d.alt ?? "" })));
  };

  const setName = (name: string) =>
    setFormData((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `marketplace/${Date.now()}-${Math.floor(performance.now())}.${fileExt}`;
    const { error } = await supabase.storage.from("media").upload(fileName, file);
    if (error) {
      toast.error("Fehler beim Hochladen: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleTitleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) {
      setFormData((f) => ({ ...f, image_url: url }));
      toast.success("Titelbild hochgeladen");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) setGallery((g) => [...g, { url, alt: "" }]);
    }
    setUploading(false);
    e.target.value = "";
  };

  const moveGallery = (index: number, dir: -1 | 1) => {
    setGallery((g) => {
      const next = [...g];
      const target = index + dir;
      if (target < 0 || target >= next.length) return g;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.credit_cost || !formData.image_url) {
      toast.error("Bitte fülle alle Pflichtfelder aus (Name, Beschreibung, Credits, Titelbild)");
      return;
    }
    if (!formData.price_cents || formData.price_cents <= 0) {
      toast.error("Bitte gib einen gültigen Preis in Euro an");
      return;
    }

    const data: MarketplaceItemInput = {
      name: formData.name,
      category: (formData.category as MarketplaceCategory) || "equipment",
      credit_cost: formData.credit_cost,
      price_cents: formData.price_cents,
      compare_at_price_cents: formData.compare_at_price_cents || null,
      description: formData.description,
      subtitle: formData.subtitle || null,
      long_description: formData.long_description || null,
      image_url: formData.image_url,
      slug: (formData.slug || slugify(formData.name || "")) || null,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      partner_name: formData.partner_name || undefined,
      stock_quantity: formData.stock_quantity,
      sort_order: formData.sort_order || 0,
      product_type: "purchase",
      is_featured: !!formData.is_featured,
      status: (formData.status as "draft" | "published") || "published",
      specs: specs.filter((s) => s.label.trim() || s.value.trim()),
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      manufacturer_name: formData.manufacturer_name || null,
      manufacturer_address: formData.manufacturer_address || null,
      manufacturer_email: formData.manufacturer_email || null,
      eu_responsible_name: formData.eu_responsible_name || null,
      eu_responsible_address: formData.eu_responsible_address || null,
      eu_responsible_email: formData.eu_responsible_email || null,
      product_identifier: formData.product_identifier || null,
      safety_warnings: formData.safety_warnings || null,
      textile_composition: formData.textile_composition || null,
      delivery_days_min: formData.delivery_days_min ?? 2,
      delivery_days_max: formData.delivery_days_max ?? 4,
      base_price_quantity: formData.base_price_quantity || null,
      base_price_unit: formData.base_price_unit || null,
    };

    setSaving(true);
    try {
      let itemId: string;
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...data });
        itemId = editingItem.id;
      } else {
        const created = await createMutation.mutateAsync(data);
        itemId = (created as { id: string }).id;
      }
      await syncImages.mutateAsync({
        itemId,
        images: gallery.filter((g) => g.url).map((g) => ({ url: g.url, alt: g.alt || null })),
      });
      // Auto-translate the German product copy into *_en (fire-and-forget; DE stays visible
      // immediately, EN fills in once DeepL returns).
      translateRow({ table: "marketplace_items", id: itemId, fields: PRODUCT_TRANSLATE_FIELDS }).then((result) => {
        toastTranslateResult(result);
        invalidateItems();
      });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Fehler beim Speichern: " + (err?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  const exportReceipts = async () => {
    setExportingReceipts(true);
    try {
      const { data, error } = await (supabase as any)
        .from("receipts")
        .select("*")
        .order("receipt_number", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) {
        toast.info("Keine Belege vorhanden");
        return;
      }
      const num = (cents: unknown) => (((cents as number) ?? 0) / 100).toFixed(2).replace(".", ",");
      const esc = (v: unknown) => {
        const s = String(v ?? "");
        return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = "Belegnummer;Typ;Datum;Beschreibung;Brutto;Rabatt;Zahlbetrag;Netto;USt-Satz;USt-Betrag;Währung";
      const lines = rows.map((r) =>
        [
          esc(r.receipt_number),
          esc(r.receipt_type),
          r.issued_at ? new Date(r.issued_at as string).toLocaleDateString("de-DE") : "",
          esc(r.description),
          num(r.gross_cents),
          num(r.discount_cents),
          num(r.paid_cents),
          num(r.net_cents),
          String(r.tax_rate ?? 0).replace(".", ","),
          num(r.tax_cents),
          esc(r.currency ?? "EUR"),
        ].join(";"),
      );
      // BOM, damit deutsches Excel Umlaute korrekt liest
      const csv = "\uFEFF" + [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `p2g-belege-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Export fehlgeschlagen: " + (err?.message ?? ""));
    } finally {
      setExportingReceipts(false);
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate(itemToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      },
    });
  };

  const categoryName = (id?: string | null) => categories?.find((c) => c.id === id)?.name;
  const brandName = (id?: string | null) => brands?.find((b) => b.id === id)?.name;

  const filteredItems =
    items?.filter((item) => {
      if (filterCategory !== "all" && item.category_id !== filterCategory) return false;
      if (filterActive === "active" && !item.is_active) return false;
      if (filterActive === "inactive" && item.is_active) return false;
      return true;
    }) || [];

  return (
    <AdminLayout>
      <Helmet>
        <title>Marketplace | Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Marketplace Verwaltung
            </h1>
            <p className="text-muted-foreground">Produkte, Kategorien und Marken verwalten</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCatManagerOpen(true)}>
              <Tag className="w-4 h-4 mr-2" />
              Kategorien
            </Button>
            <Button variant="outline" onClick={() => setBrandManagerOpen(true)}>
              <Award className="w-4 h-4 mr-2" />
              Marken
            </Button>
            {(!!items?.length || !!categories?.length) && (
              <Button variant="outline" onClick={translateAll} disabled={!!bulk}>
                {bulk ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("admin.translateAllRunning", { done: bulk.done, total: bulk.total })}
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4 mr-2" /> {t("admin.translateAll")}
                  </>
                )}
              </Button>
            )}
            <Button onClick={openCreateDialog} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Neues Produkt
            </Button>
          </div>
        </div>

        {/* Analytics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Umsätze & Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Umsatz (bezahlt)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{formatEuro(analytics?.revenue_cents ?? 0)}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Bestellungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{analytics?.order_count ?? 0}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Eingelöste Punkte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">
                    {(analytics?.points_redeemed ?? 0).toLocaleString("de-DE")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Empfehlungen (Referrals)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !analytics?.referrers.length ? (
                <div className="text-center py-8 text-muted-foreground">Noch keine Empfehlungen.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nutzer</TableHead>
                        <TableHead className="text-right">Geworben</TableHead>
                        <TableHead className="text-right">Punkte</TableHead>
                        <TableHead className="text-right">Wert (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.referrers.map((r) => (
                        <TableRow key={r.user_id}>
                          <TableCell className="font-medium">
                            {r.display_name || r.username || r.user_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-right">{r.referred_count}</TableCell>
                          <TableCell className="text-right font-mono">
                            {r.points.toLocaleString("de-DE")}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatEuro(r.eur_value_cents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Kategorie</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Produkte ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Keine Produkte gefunden.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Bild</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Aktiv</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {item.is_featured && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryName(item.category_id) || CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{brandName(item.brand_id) || item.partner_name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatEuro(item.price_cents ?? 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.status === "draft" ? "secondary" : "default"}>
                            {item.status === "draft" ? "Entwurf" : "Live"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={(checked) =>
                              toggleStatusMutation.mutate({ id: item.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setItemToDelete(item);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders & fulfillment */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold">Bestellungen</h2>
          <Button variant="outline" size="sm" onClick={exportReceipts} disabled={exportingReceipts}>
            {exportingReceipts ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Belege exportieren (CSV)
          </Button>
        </div>
        <MarketplaceOrdersSection />
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Produkt bearbeiten" : "Neues Produkt erstellen"}</DialogTitle>
            <DialogDescription>Alle Felder mit * sind Pflichtfelder.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Title image */}
            <div className="space-y-2">
              <Label>Titelbild *</Label>
              <div className="flex gap-4 items-start">
                {formData.image_url && (
                  <div className="w-24 h-24 rounded overflow-hidden bg-muted shrink-0">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input type="file" accept="image/*" onChange={handleTitleImageUpload} disabled={uploading} />
                  <p className="text-xs text-muted-foreground">Oder URL direkt eingeben:</p>
                  <Input
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="space-y-2">
              <Label>Weitere Bilder (Galerie)</Label>
              {gallery.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {gallery.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded overflow-hidden bg-muted group border border-border/60">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-black/70 rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                        title="Entfernen"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute bottom-0.5 left-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => moveGallery(i, -1)}
                          className="bg-black/70 rounded p-0.5"
                          title="Nach vorne"
                        >
                          <ArrowUp className="w-3 h-3 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGallery(i, 1)}
                          className="bg-black/70 rounded p-0.5"
                          title="Nach hinten"
                        >
                          <ArrowDown className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploading} />
              <p className="text-xs text-muted-foreground">
                Mehrere Bilder möglich. Reihenfolge steuert die Galerie auf der Produktseite (Titelbild zuerst).
              </p>
            </div>

            {/* Name + slug */}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setName(e.target.value)} placeholder="Produktname" />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={formData.slug ?? ""}
                onChange={(e) => {
                  setSlugTouched(true);
                  setFormData({ ...formData, slug: slugify(e.target.value) });
                }}
                placeholder="produktname"
              />
              <p className="text-xs text-muted-foreground font-mono">/marketplace/{formData.slug || "…"}</p>
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label>Untertitel</Label>
              <Input
                value={formData.subtitle ?? ""}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Kurzer Zusatz, z.B. „Kontrolle & Power für Fortgeschrittene“"
              />
            </div>

            {/* Category + brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produktkategorie</Label>
                <Select
                  value={formData.category_id ?? "none"}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— keine —</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {!c.is_active ? " (inaktiv)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marke</Label>
                <Select
                  value={formData.brand_id ?? "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? null : v;
                    setFormData({ ...formData, brand_id: id, partner_name: brandName(id) ?? formData.partner_name });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Marke wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— keine —</SelectItem>
                    {brands?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                        {!b.is_active ? " (inaktiv)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price + compare + credits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preis (€) *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={formData.price_cents ? (formData.price_cents / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>UVP (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.compare_at_price_cents ? (formData.compare_at_price_cents / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      compare_at_price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                    })
                  }
                  placeholder="Streichpreis"
                />
              </div>
              <div className="space-y-2">
                <Label>Punkte-Rabatt (max.) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.credit_cost}
                  onChange={(e) => setFormData({ ...formData, credit_cost: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Short description */}
            <div className="space-y-2">
              <Label>Kurzbeschreibung *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kurze Beschreibung für Produktkarten..."
                rows={2}
              />
            </div>

            {/* Long description */}
            <div className="space-y-2">
              <Label>Langbeschreibung</Label>
              <Textarea
                value={formData.long_description ?? ""}
                onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                placeholder="Ausführliche Produktbeschreibung für die Produktseite..."
                rows={4}
              />
            </div>

            {/* Specs */}
            <div className="space-y-2">
              <Label>Spezifikationen</Label>
              <div className="space-y-2">
                {specs.map((spec, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Merkmal (z.B. Gewicht)"
                      value={spec.label}
                      onChange={(e) =>
                        setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))
                      }
                    />
                    <Input
                      className="flex-1"
                      placeholder="Wert (z.B. 365 g)"
                      value={spec.value}
                      onChange={(e) =>
                        setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, value: e.target.value } : row)))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setSpecs((s) => s.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setSpecs((s) => [...s, { label: "", value: "" }])}>
                  <Plus className="w-4 h-4 mr-2" />
                  Merkmal hinzufügen
                </Button>
              </div>
            </div>

            {/* Partner name (legacy free-text, prefilled from brand) */}
            <div className="space-y-2">
              <Label>Marken-/Partner-Text (Anzeige)</Label>
              <Input
                value={formData.partner_name}
                onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                placeholder="z.B. Adidas, Babolat"
              />
            </div>

            {/* Stock + sort + featured */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bestand (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.stock_quantity ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_quantity: e.target.value ? parseInt(e.target.value) : null })
                  }
                  placeholder="Unbegrenzt"
                />
              </div>
              <div className="space-y-2">
                <Label>Sortierung</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status ?? "published"}
                  onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Live</SelectItem>
                    <SelectItem value="draft">Entwurf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <Label className="cursor-pointer">Featured (hervorheben)</Label>
                <p className="text-xs text-muted-foreground">Zeigt das Produkt prominent im Shop.</p>
              </div>
              <Switch
                checked={!!formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>

            {/* GPSR / Kennzeichnung */}
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Produktsicherheit &amp; Kennzeichnung (GPSR)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hersteller Name</Label>
                  <Input
                    value={formData.manufacturer_name ?? ""}
                    onChange={(e) => setFormData({ ...formData, manufacturer_name: e.target.value })}
                    placeholder="z.B. Babolat VS S.A."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hersteller E-Mail</Label>
                  <Input
                    type="email"
                    value={formData.manufacturer_email ?? ""}
                    onChange={(e) => setFormData({ ...formData, manufacturer_email: e.target.value })}
                    placeholder="kontakt@hersteller.de"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hersteller Anschrift</Label>
                <Input
                  value={formData.manufacturer_address ?? ""}
                  onChange={(e) => setFormData({ ...formData, manufacturer_address: e.target.value })}
                  placeholder="Straße, PLZ Ort, Land"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  EU-Verantwortlicher: Nur nötig, wenn der Hersteller außerhalb der EU sitzt.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EU-Verantwortlicher Name</Label>
                    <Input
                      value={formData.eu_responsible_name ?? ""}
                      onChange={(e) => setFormData({ ...formData, eu_responsible_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EU-Verantwortlicher E-Mail</Label>
                    <Input
                      type="email"
                      value={formData.eu_responsible_email ?? ""}
                      onChange={(e) => setFormData({ ...formData, eu_responsible_email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>EU-Verantwortlicher Anschrift</Label>
                  <Input
                    value={formData.eu_responsible_address ?? ""}
                    onChange={(e) => setFormData({ ...formData, eu_responsible_address: e.target.value })}
                    placeholder="Straße, PLZ Ort, Land"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Produkt-ID / Charge</Label>
                <Input
                  value={formData.product_identifier ?? ""}
                  onChange={(e) => setFormData({ ...formData, product_identifier: e.target.value })}
                  placeholder="z.B. Artikelnummer, GTIN oder Chargennummer"
                />
              </div>
              <div className="space-y-2">
                <Label>Warnhinweise</Label>
                <Textarea
                  value={formData.safety_warnings ?? ""}
                  onChange={(e) => setFormData({ ...formData, safety_warnings: e.target.value })}
                  placeholder="Sicherheits- und Warnhinweise zum Produkt..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Materialzusammensetzung</Label>
                <Input
                  value={formData.textile_composition ?? ""}
                  onChange={(e) => setFormData({ ...formData, textile_composition: e.target.value })}
                  placeholder="z.B. 90 % Polyester, 10 % Elasthan"
                />
                <p className="text-xs text-muted-foreground">Pflicht bei Textilien.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lieferzeit min (Werktage)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.delivery_days_min ?? 2}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_days_min: e.target.value ? parseInt(e.target.value) : 2 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lieferzeit max (Werktage)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.delivery_days_max ?? 4}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_days_max: e.target.value ? parseInt(e.target.value) : 4 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grundpreis-Menge</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={formData.base_price_quantity ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base_price_quantity: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grundpreis-Einheit</Label>
                  <Input
                    value={formData.base_price_unit ?? ""}
                    onChange={(e) => setFormData({ ...formData, base_price_unit: e.target.value })}
                    placeholder="z.B. m, kg"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Grundpreis: Nur bei Ware nach Maß/Gewicht.</p>
            </div>

            {/* SEO */}
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">SEO (optional)</p>
              <div className="space-y-2">
                <Label>Meta-Titel</Label>
                <Input
                  value={formData.meta_title ?? ""}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="Wird für Suchmaschinen/Teilen genutzt"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta-Beschreibung</Label>
                <Textarea
                  value={formData.meta_description ?? ""}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{itemToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Taxonomy managers */}
      <CatalogManagerDialog kind="category" open={catManagerOpen} onOpenChange={setCatManagerOpen} />
      <CatalogManagerDialog kind="brand" open={brandManagerOpen} onOpenChange={setBrandManagerOpen} />
    </AdminLayout>
  );
};

export default AdminMarketplace;

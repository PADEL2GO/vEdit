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
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  useAdminMarketplaceItems,
  useCreateMarketplaceItem,
  useUpdateMarketplaceItem,
  useDeleteMarketplaceItem,
  useToggleMarketplaceItemStatus,
  MarketplaceItemInput,
} from "@/hooks/useAdminMarketplace";
import type { MarketplaceItem, MarketplaceCategory, ProductType } from "@/hooks/useMarketplaceItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  rental: "Verleih (Code)",
  purchase: "Kauf (Versand)",
};

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  courtbooking: "Courtbuchung",
  equipment: "Equipment",
  other: "Sonstiges",
  events: "Events",
};

const AdminMarketplace = () => {
  const { data: items, isLoading } = useAdminMarketplaceItems();
  const createMutation = useCreateMarketplaceItem();
  const updateMutation = useUpdateMarketplaceItem();
  const deleteMutation = useDeleteMarketplaceItem();
  const toggleStatusMutation = useToggleMarketplaceItemStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<MarketplaceItemInput>>({
    name: "",
    category: "courtbooking",
    credit_cost: 0,
    description: "",
    image_url: "",
    partner_name: "",
    stock_quantity: null,
    sort_order: 0,
    product_type: "rental",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "courtbooking",
      credit_cost: 0,
      description: "",
      image_url: "",
      partner_name: "",
      stock_quantity: null,
      sort_order: 0,
      product_type: "rental",
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: MarketplaceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      credit_cost: item.credit_cost,
      description: item.description || "",
      image_url: item.image_url || "",
      partner_name: item.partner_name || "",
      stock_quantity: item.stock_quantity,
      sort_order: item.sort_order,
      product_type: item.product_type || "rental",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.credit_cost || !formData.image_url) {
      toast.error("Bitte fülle alle Pflichtfelder aus (Name, Beschreibung, Credits, Bild)");
      return;
    }

    const data: MarketplaceItemInput = {
      name: formData.name,
      category: formData.category as MarketplaceCategory,
      credit_cost: formData.credit_cost,
      description: formData.description,
      image_url: formData.image_url,
      partner_name: formData.partner_name || undefined,
      stock_quantity: formData.stock_quantity,
      sort_order: formData.sort_order || 0,
      product_type: formData.product_type as ProductType,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      });
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `marketplace/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Bild erfolgreich hochgeladen");
    } catch (error: any) {
      toast.error("Fehler beim Hochladen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Filter items
  const filteredItems = items?.filter(item => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
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
            <p className="text-muted-foreground">
              Produkte für den Marketplace verwalten
            </p>
          </div>
          <Button onClick={openCreateDialog} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Neues Produkt
          </Button>
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
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
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
              <div className="text-center py-12 text-muted-foreground">
                Keine Produkte gefunden.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Bild</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
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
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.product_type === "purchase" ? "default" : "secondary"}>
                            {PRODUCT_TYPE_LABELS[item.product_type] || "Verleih"}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.partner_name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.credit_cost}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                            >
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
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Produkt bearbeiten" : "Neues Produkt erstellen"}
            </DialogTitle>
            <DialogDescription>
              Alle Felder mit * sind Pflichtfelder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Bild *</Label>
              <div className="flex gap-4 items-start">
                {formData.image_url && (
                  <div className="w-24 h-24 rounded overflow-hidden bg-muted shrink-0">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Oder URL direkt eingeben:
                  </p>
                  <Input
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Produktname"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as MarketplaceCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type */}
            <div className="space-y-2">
              <Label>Produktart *</Label>
              <Select
                value={formData.product_type}
                onValueChange={(v) => setFormData({ ...formData, product_type: v as ProductType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Verleih: User erhält Code für Automaten. Kauf: Versand erforderlich.
              </p>
            </div>

            {/* Credit Cost */}
            <div className="space-y-2">
              <Label>Credit-Kosten *</Label>
              <Input
                type="number"
                min={1}
                value={formData.credit_cost}
                onChange={(e) => setFormData({ ...formData, credit_cost: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Beschreibung *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Produktbeschreibung..."
                rows={3}
              />
            </div>

            {/* Partner Name */}
            <div className="space-y-2">
              <Label>Partner-Name</Label>
              <Input
                value={formData.partner_name}
                onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                placeholder="z.B. Adidas, Red Bull, P2G"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Stock Quantity */}
              <div className="space-y-2">
                <Label>Bestand (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.stock_quantity ?? ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    stock_quantity: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="Unbegrenzt"
                />
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label>Sortierung</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || uploading}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
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
    </AdminLayout>
  );
};

export default AdminMarketplace;

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Check, X, Pencil } from "lucide-react";
import {
  useAdminCatalogCategories,
  useAdminCatalogBrands,
  useUpsertTaxonomy,
  useDeleteTaxonomy,
  slugify,
  type MarketplaceCategoryRow,
  type MarketplaceBrandRow,
} from "@/hooks/useMarketplaceCatalog";

interface Props {
  kind: "category" | "brand";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Row = MarketplaceCategoryRow | MarketplaceBrandRow;

export function CatalogManagerDialog({ kind, open, onOpenChange }: Props) {
  const isCategory = kind === "category";
  const catQuery = useAdminCatalogCategories();
  const brandQuery = useAdminCatalogBrands();
  const query = isCategory ? catQuery : brandQuery;
  const rows: Row[] = (query.data as Row[]) ?? [];

  const upsert = useUpsertTaxonomy(kind);
  const del = useDeleteTaxonomy(kind);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const title = isCategory ? "Kategorien verwalten" : "Marken verwalten";
  const placeholder = isCategory ? "z.B. Schläger" : "z.B. Adidas";

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    upsert.mutate(
      { name, slug: slugify(name), sort_order: rows.length + 1, is_active: true },
      { onSuccess: () => setNewName("") },
    );
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setEditName(row.name);
  };

  const saveEdit = (row: Row) => {
    const name = editName.trim();
    if (!name) return;
    upsert.mutate(
      { id: row.id, name, slug: slugify(name), sort_order: row.sort_order, is_active: row.is_active },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isCategory
              ? "Produktkategorien für den Shop (z.B. Schläger, Bälle, Bekleidung)."
              : "Marken für die Produkte (z.B. Adidas, Babolat, Bullpadel)."}
          </DialogDescription>
        </DialogHeader>

        {/* Add new */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label>Neuer Eintrag</Label>
            <Input
              value={newName}
              placeholder={placeholder}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={!newName.trim() || upsert.isPending}>
            {upsert.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {query.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Noch keine Einträge.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                {editingId === row.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(row)}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(row)}>
                      <Check className="w-4 h-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{row.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{row.slug}</div>
                    </div>
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={(checked) =>
                        upsert.mutate({
                          id: row.id,
                          name: row.name,
                          slug: row.slug,
                          sort_order: row.sort_order,
                          is_active: checked,
                        })
                      }
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`"${row.name}" wirklich löschen?`)) del.mutate(row.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

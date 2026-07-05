import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Marketplace catalog (Phase 1): categories, brands and per-product image
// galleries. New tables are not yet in the generated Supabase types, so the
// client is cast to `any` at the call site (per CLAUDE.md temporary pattern).
// -----------------------------------------------------------------------------

export interface MarketplaceCategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MarketplaceBrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MarketplaceItemImage {
  id: string;
  item_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

// German-friendly slug: umlauts spelled out, diacritics stripped, non-alnum → "-".
export const slugify = (s: string): string =>
  (s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const db = supabase as any;

// ---- Categories ------------------------------------------------------------
export const useAdminCatalogCategories = () =>
  useQuery({
    queryKey: ["admin-catalog-categories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketplace_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceCategoryRow[];
    },
  });

export const useCatalogCategories = () =>
  useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceCategoryRow[];
    },
  });

// ---- Brands ----------------------------------------------------------------
export const useAdminCatalogBrands = () =>
  useQuery({
    queryKey: ["admin-catalog-brands"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketplace_brands")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceBrandRow[];
    },
  });

export const useCatalogBrands = () =>
  useQuery({
    queryKey: ["catalog-brands"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketplace_brands")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceBrandRow[];
    },
  });

type TaxonomyKind = "category" | "brand";
const TABLE: Record<TaxonomyKind, string> = {
  category: "marketplace_categories",
  brand: "marketplace_brands",
};
const KEYS: Record<TaxonomyKind, string[]> = {
  category: ["admin-catalog-categories", "catalog-categories"],
  brand: ["admin-catalog-brands", "catalog-brands"],
};

export interface TaxonomyInput {
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
  image_url?: string | null; // category
  logo_url?: string | null; // brand
}

export const useUpsertTaxonomy = (kind: TaxonomyKind) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: TaxonomyInput & { id?: string }) => {
      const payload = { ...values, slug: values.slug || slugify(values.name) };
      if (id) {
        const { error } = await db.from(TABLE[kind]).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from(TABLE[kind]).insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      KEYS[kind].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(kind === "category" ? "Kategorie gespeichert" : "Marke gespeichert");
    },
    onError: (e: any) => toast.error("Fehler: " + e.message),
  });
};

export const useDeleteTaxonomy = (kind: TaxonomyKind) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(TABLE[kind]).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      KEYS[kind].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      toast.success("Gelöscht");
    },
    onError: (e: any) => toast.error("Fehler: " + e.message),
  });
};

// ---- Product image gallery -------------------------------------------------
export const useItemImages = (itemId: string | null | undefined) =>
  useQuery({
    queryKey: ["admin-item-images", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await db
        .from("marketplace_item_images")
        .select("*")
        .eq("item_id", itemId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceItemImage[];
    },
  });

// Replace-all strategy: images are just URL references, so re-writing the full
// ordered set on save keeps the editor simple and the order authoritative.
export const useSyncItemImages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      images,
    }: {
      itemId: string;
      images: { url: string; alt?: string | null }[];
    }) => {
      const { error: delErr } = await db
        .from("marketplace_item_images")
        .delete()
        .eq("item_id", itemId);
      if (delErr) throw delErr;
      if (images.length) {
        const rows = images.map((img, i) => ({
          item_id: itemId,
          url: img.url,
          alt: img.alt ?? null,
          sort_order: i,
        }));
        const { error: insErr } = await db.from("marketplace_item_images").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-item-images", vars.itemId] });
    },
  });
};

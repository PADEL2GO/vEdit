import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceItem } from "./useMarketplaceItems";
import type { MarketplaceItemImage } from "./useMarketplaceCatalog";

export interface MarketplaceProductData {
  product: MarketplaceItem | null;
  gallery: MarketplaceItemImage[];
  related: MarketplaceItem[];
}

const db = supabase as any;

/**
 * Loads a single marketplace product by its slug together with its image gallery
 * and up to three related products (same category, then featured fallback).
 * Only active/published products are returned to the public.
 */
export const useMarketplaceProduct = (slug: string | undefined) =>
  useQuery({
    queryKey: ["marketplace-product", slug],
    enabled: !!slug,
    queryFn: async (): Promise<MarketplaceProductData> => {
      const { data: product, error } = await db
        .from("marketplace_items")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .neq("status", "draft")
        .maybeSingle();
      if (error) throw error;
      if (!product) return { product: null, gallery: [], related: [] };

      const p = product as MarketplaceItem;

      const [{ data: images }, { data: relatedRaw }] = await Promise.all([
        db
          .from("marketplace_item_images")
          .select("*")
          .eq("item_id", p.id)
          .order("sort_order", { ascending: true }),
        db
          .from("marketplace_items")
          .select("*")
          .eq("is_active", true)
          .neq("status", "draft")
          .neq("id", p.id)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .limit(24),
      ]);

      const relatedAll = (relatedRaw ?? []) as MarketplaceItem[];
      // Prefer same-category products, then top up with anything else.
      const sameCat = relatedAll.filter((r) => p.category_id && r.category_id === p.category_id);
      const others = relatedAll.filter((r) => !sameCat.includes(r));
      const related = [...sameCat, ...others].slice(0, 3);

      return {
        product: p,
        gallery: (images ?? []) as MarketplaceItemImage[],
        related,
      };
    },
  });

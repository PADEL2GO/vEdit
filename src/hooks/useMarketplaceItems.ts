import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MarketplaceCategory = "courtbooking" | "equipment" | "other" | "events";
export type ProductType = "rental" | "purchase";

export interface MarketplaceItem {
  id: string;
  name: string;
  category: MarketplaceCategory;
  credit_cost: number;
  description: string | null;
  partner_name: string | null;
  image_url: string | null;
  is_active: boolean;
  stock_quantity: number | null;
  sort_order: number;
  product_type: ProductType;
}

export const useMarketplaceItems = (category?: MarketplaceCategory) => {
  return useQuery({
    queryKey: ["marketplace-items", category],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MarketplaceItem[];
    },
  });
};

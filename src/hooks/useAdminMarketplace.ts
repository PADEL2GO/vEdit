import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MarketplaceCategory, MarketplaceItem, ProductType } from "./useMarketplaceItems";

export interface MarketplaceItemInput {
  name: string;
  category: MarketplaceCategory;
  credit_cost: number;
  description: string;
  image_url: string;
  partner_name?: string;
  stock_quantity?: number | null;
  sort_order?: number;
  is_active?: boolean;
  product_type?: ProductType;
}

// Fetch all items (including inactive) for admin
export const useAdminMarketplaceItems = () => {
  return useQuery({
    queryKey: ["admin-marketplace-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as MarketplaceItem[];
    },
  });
};

export type FulfillmentStatus = "pending" | "shipped" | "delivered" | "cancelled";

export interface MarketplaceRedemption {
  id: string;
  user_id: string;
  item_id: string;
  credit_cost: number;
  status: string;
  reference_code: string | null;
  fulfillment_status: FulfillmentStatus;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  created_at: string;
  item?: {
    name: string;
    category: string;
    product_type: ProductType;
  };
  user_email?: string;
  user_display_name?: string;
}

// Fetch all redemptions for admin
export const useAdminRedemptions = () => {
  return useQuery({
    queryKey: ["admin-marketplace-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_redemptions")
        .select(`
          *,
          item:marketplace_items(name, category, product_type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MarketplaceRedemption[];
    },
  });
};

// Update fulfillment status
export const useUpdateFulfillmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fulfillment_status }: { id: string; fulfillment_status: FulfillmentStatus }) => {
      const { data, error } = await supabase
        .from("marketplace_redemptions")
        .update({ fulfillment_status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-redemptions"] });
      toast.success("Status aktualisiert");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });
};

// Create new item
export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: MarketplaceItemInput) => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .insert([{
          ...item,
          is_active: item.is_active ?? true,
          sort_order: item.sort_order ?? 0,
          product_type: item.product_type ?? "rental",
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
      toast.success("Produkt erfolgreich erstellt");
    },
    onError: (error) => {
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });
};

// Update item
export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<MarketplaceItemInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .update(item)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
      toast.success("Produkt erfolgreich aktualisiert");
    },
    onError: (error) => {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });
};

// Delete item
export const useDeleteMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketplace_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
      toast.success("Produkt erfolgreich gelöscht");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });
};

// Toggle active status
export const useToggleMarketplaceItemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
      toast.success(data.is_active ? "Produkt aktiviert" : "Produkt deaktiviert");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });
};

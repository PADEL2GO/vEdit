import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserOrderFulfillment = "pending" | "shipped" | "delivered" | "cancelled";

export interface UserRedemption {
  id: string;
  item_id: string;
  credit_cost: number;
  status: "success" | "failed" | "pending" | "cancelled" | "refunded";
  fulfillment_status: UserOrderFulfillment;
  reference_code: string | null;
  amount_cents: number | null;
  quantity: number | null;
  play_spent: number | null;
  reward_spent: number | null;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  created_at: string;
  item?: {
    name: string;
    category: string;
    image_url: string | null;
  };
}

export const useUserRedemptions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["marketplace-redemptions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("marketplace_redemptions")
        .select(`
          *,
          item:marketplace_items(name, category, image_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as UserRedemption[];
    },
    enabled: !!user,
  });
};

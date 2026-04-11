import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserRedemption {
  id: string;
  item_id: string;
  credit_cost: number;
  status: "success" | "failed" | "pending";
  reference_code: string | null;
  created_at: string;
  item?: {
    name: string;
    category: string;
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
          item:marketplace_items(name, category)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserRedemption[];
    },
    enabled: !!user,
  });
};

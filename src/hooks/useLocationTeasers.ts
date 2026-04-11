import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocationTeaser {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  city: string | null;
  expected_date: string | null;
  club_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useLocationTeasers() {
  return useQuery({
    queryKey: ["location-teasers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_teasers" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LocationTeaser[];
    },
  });
}

export function useAllLocationTeasers() {
  return useQuery({
    queryKey: ["location-teasers-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_teasers" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LocationTeaser[];
    },
  });
}

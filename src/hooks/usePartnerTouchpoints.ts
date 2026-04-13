import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerTouchpointSlide {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["partner-touchpoint-slides"];

export function usePartnerTouchpoints(onlyActive = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, onlyActive],
    queryFn: async () => {
      let q = supabase
        .from("partner_touchpoint_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PartnerTouchpointSlide[];
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `partner-touchpoints/${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("partner_touchpoint_slides")
        .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartnerTouchpointSlide> & { id: string }) => {
      const { error } = await supabase
        .from("partner_touchpoint_slides")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const createMutation = useMutation({
    mutationFn: async (slide: { title: string; description?: string }) => {
      const { data: maxRow } = await supabase
        .from("partner_touchpoint_slides")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;
      const { error } = await supabase.from("partner_touchpoint_slides").insert({
        title: slide.title,
        description: slide.description || null,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_touchpoint_slides")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { ...query, uploadImageMutation, updateMutation, createMutation, deleteMutation };
}

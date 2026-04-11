import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerTile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bg_color: string | null;
  website_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  partner_type: 'equipment' | 'local';
  region: string | null;
  description: string | null;
}

export function usePartnerTiles(onlyActive = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["partner-tiles", onlyActive],
    queryFn: async () => {
      let q = supabase
        .from("partner_tiles")
        .select("*")
        .order("sort_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as PartnerTile[];
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `partner-tiles/${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("partner_tiles")
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-tiles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartnerTile> & { id: string }) => {
      const { error } = await supabase
        .from("partner_tiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-tiles"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (tile: { name: string; slug: string; bg_color?: string; partner_type?: string }) => {
      const { data: maxRow } = await supabase
        .from("partner_tiles")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("partner_tiles").insert({
        name: tile.name,
        slug: tile.slug,
        bg_color: tile.bg_color || "#FFFFFF",
        sort_order: nextOrder,
        partner_type: tile.partner_type || "equipment",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-tiles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_tiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-tiles"] }),
  });

  return { ...query, uploadLogoMutation, updateMutation, createMutation, deleteMutation };
}

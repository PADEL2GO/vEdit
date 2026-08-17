import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/lib/uploadMedia";

export interface SkyPadelGalleryImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  alt_text_en: string | null;
  alt_text_en_locked: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export function useSkyPadelGallery(onlyActive = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["skypadel-gallery", onlyActive],
    queryFn: async () => {
      let q = supabase
        .from("skypadel_gallery")
        .select("*")
        .order("sort_order", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as SkyPadelGalleryImage[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, altText }: { file: File; altText?: string }) => {
      const publicUrl = await uploadMediaFile(
        file,
        `skypadel-gallery/${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );

      // Get max sort_order
      const { data: maxRow } = await supabase
        .from("skypadel_gallery")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error: insertError } = await supabase.from("skypadel_gallery").insert({
        image_url: publicUrl,
        alt_text: altText || null,
        sort_order: nextOrder,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skypadel_gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, alt_text, sort_order, is_active }: Partial<SkyPadelGalleryImage> & { id: string }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (alt_text !== undefined) updates.alt_text = alt_text;
      if (sort_order !== undefined) updates.sort_order = sort_order;
      if (is_active !== undefined) updates.is_active = is_active;
      const { error } = await supabase.from("skypadel_gallery").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] }),
  });

  return { ...query, uploadMutation, deleteMutation, updateMutation };
}

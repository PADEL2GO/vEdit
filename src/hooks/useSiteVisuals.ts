import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SiteVisual {
  id: string;
  key: string;
  label: string;
  category: string;
  description: string | null;
  image_url: string | null;
  placeholder_url: string;
  created_at: string;
  updated_at: string;
}

// Fetch all visuals
export function useSiteVisuals() {
  return useQuery({
    queryKey: ["site-visuals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_visuals" as any)
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true });

      if (error) throw error;
      return data as unknown as SiteVisual[];
    },
  });
}

// Fetch a single visual by key
export function useSiteVisual(key: string) {
  return useQuery({
    queryKey: ["site-visual", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_visuals" as any)
        .select("*")
        .eq("key", key)
        .single();

      if (error) throw error;
      return data as unknown as SiteVisual;
    },
    enabled: !!key,
  });
}

// Upload visual image
export function useUploadVisual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      // Create unique filename
      const ext = file.name.split(".").pop();
      const fileName = `visuals/${key.replace(/\./g, "_")}_${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from("site_visuals" as any)
        .update({ image_url: urlData.publicUrl })
        .eq("key", key);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visuals"] });
      queryClient.invalidateQueries({ queryKey: ["site-visual"] });
      toast.success("Bild erfolgreich hochgeladen");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen des Bildes");
    },
  });
}

// Set visual URL directly (YouTube / Vimeo / direct video URL)
export function useSetVisualUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, url }: { key: string; url: string }) => {
      const { error } = await supabase
        .from("site_visuals" as any)
        .update({ image_url: url || null })
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visuals"] });
      queryClient.invalidateQueries({ queryKey: ["site-visual"] });
      toast.success("URL gespeichert");
    },
    onError: (error) => {
      console.error("Set URL error:", error);
      toast.error("Fehler beim Speichern der URL");
    },
  });
}

// Delete visual image (reset to placeholder)
export function useDeleteVisualImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("site_visuals" as any)
        .update({ image_url: null })
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visuals"] });
      queryClient.invalidateQueries({ queryKey: ["site-visual"] });
      toast.success("Bild zurückgesetzt");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Fehler beim Zurücksetzen");
    },
  });
}

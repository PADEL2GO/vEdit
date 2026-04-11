import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SiteSettings {
  id: string;
  pin_lock_vereine: boolean;
  pin_lock_partner: boolean;
  pin_lock_vereine_activated_at: string | null;
  pin_lock_partner_activated_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", "global")
        .single();

      if (error) {
        console.error("Error fetching site settings:", error);
        return;
      }

      setSettings(data as SiteSettings);
    } catch (error) {
      console.error("Error fetching site settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(
    async (key: "pin_lock_vereine" | "pin_lock_partner", value: boolean) => {
      setIsSaving(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        // Build update object - if enabling lock, also update the activated_at timestamp
        const updateData: Record<string, unknown> = { 
          [key]: value, 
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id 
        };
        
        // When ENABLING the lock, update the activated_at timestamp to invalidate old unlocks
        if (value === true) {
          const activatedAtKey = key === "pin_lock_vereine" 
            ? "pin_lock_vereine_activated_at" 
            : "pin_lock_partner_activated_at";
          updateData[activatedAtKey] = new Date().toISOString();
        }
        
        const { error } = await supabase
          .from("site_settings")
          .update(updateData)
          .eq("id", "global");

        if (error) {
          console.error("Error updating site setting:", error);
          toast.error("Einstellung konnte nicht gespeichert werden");
          return false;
        }

        // Refetch to get the updated activated_at timestamp
        await fetchSettings();
        
        toast.success(value 
          ? "Sperre aktiviert – alle bisherigen Entsperrungen wurden ungültig" 
          : "Sperre deaktiviert"
        );
        return true;
      } catch (error) {
        console.error("Error updating site setting:", error);
        toast.error("Einstellung konnte nicht gespeichert werden");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchSettings]
  );

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    refetch: fetchSettings,
  };
};

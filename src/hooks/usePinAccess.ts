import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "p2g_access_pins";

interface PinAccessEntry {
  unlocked: boolean;
  unlocked_at: string | null;
}

interface PinAccessState {
  vereine: PinAccessEntry;
  partner: PinAccessEntry;
}

interface SiteSettings {
  pin_lock_vereine: boolean;
  pin_lock_partner: boolean;
  pin_lock_vereine_activated_at: string | null;
  pin_lock_partner_activated_at: string | null;
}

export const usePinAccess = (pageKey: "vereine" | "partner") => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lockEnabled, setLockEnabled] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // First check if lock is enabled in DB
        const { data: settings, error } = await supabase
          .from("site_settings")
          .select("pin_lock_vereine, pin_lock_partner, pin_lock_vereine_activated_at, pin_lock_partner_activated_at")
          .eq("id", "global")
          .maybeSingle();

        if (error) {
          throw error;
        }

        // If settings row is missing, default to locked
        if (!settings) {
          setLockEnabled(true);
          setIsUnlocked(false);
          setIsLoading(false);
          return;
        }

        const typedSettings = settings as SiteSettings;
        const isLockEnabled =
          pageKey === "vereine"
            ? typedSettings.pin_lock_vereine
            : typedSettings.pin_lock_partner;

        setLockEnabled(isLockEnabled);

        // If lock is disabled, content is always unlocked
        if (!isLockEnabled) {
          setIsUnlocked(true);
          setIsLoading(false);
          return;
        }

        // If lock is enabled, check local storage for PIN access with timestamp validation
        const lockActivatedAt = pageKey === "vereine"
          ? typedSettings.pin_lock_vereine_activated_at
          : typedSettings.pin_lock_partner_activated_at;
          
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed: PinAccessState = JSON.parse(stored);
            const entry = parsed[pageKey];
            
            // Check if entry exists and has the new format
            if (entry && typeof entry === "object" && entry.unlocked) {
              // Compare timestamps: if lock was activated after the unlock, invalidate
              if (lockActivatedAt && entry.unlocked_at) {
                const lockTime = new Date(lockActivatedAt).getTime();
                const unlockTime = new Date(entry.unlocked_at).getTime();
                
                if (lockTime > unlockTime) {
                  // Lock was activated after this user unlocked - they need to re-enter PIN
                  setIsUnlocked(false);
                } else {
                  // Unlock is still valid
                  setIsUnlocked(true);
                }
              } else {
                // No lock timestamp or no unlock timestamp - treat as unlocked
                setIsUnlocked(true);
              }
            } else if ((entry as unknown) === true) {
              // Legacy format (boolean) - invalidate it since we can't compare timestamps
              setIsUnlocked(false);
            } else {
              setIsUnlocked(false);
            }
          } catch {
            setIsUnlocked(false);
          }
        } else {
          setIsUnlocked(false);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching site settings:", err);
        // Default to locked if error
        setLockEnabled(true);
        setIsUnlocked(false);
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [pageKey]);

  const validatePin = useCallback(
    async (pin: string): Promise<boolean> => {
      try {
        // Validate PIN server-side via edge function
        const { data, error } = await supabase.functions.invoke("validate-pin", {
          body: { pin, pageKey },
        });

        if (error || !data?.valid) {
          return false;
        }

        // Store unlocked state with current timestamp
        const stored = localStorage.getItem(STORAGE_KEY);
        let state: PinAccessState = { 
          vereine: { unlocked: false, unlocked_at: null }, 
          partner: { unlocked: false, unlocked_at: null } 
        };
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            state = {
              vereine: typeof parsed.vereine === "object" 
                ? parsed.vereine 
                : { unlocked: false, unlocked_at: null },
              partner: typeof parsed.partner === "object" 
                ? parsed.partner 
                : { unlocked: false, unlocked_at: null },
            };
          } catch {
            // ignore
          }
        }
        state[pageKey] = { 
          unlocked: true, 
          unlocked_at: new Date().toISOString() 
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setIsUnlocked(true);
        return true;
      } catch (err) {
        console.error("PIN validation error:", err);
        return false;
      }
    },
    [pageKey]
  );

  const lock = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const state: PinAccessState = {
          vereine: typeof parsed.vereine === "object" 
            ? parsed.vereine 
            : { unlocked: false, unlocked_at: null },
          partner: typeof parsed.partner === "object" 
            ? parsed.partner 
            : { unlocked: false, unlocked_at: null },
        };
        state[pageKey] = { unlocked: false, unlocked_at: null };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore
      }
    }
    setIsUnlocked(false);
  }, [pageKey]);

  return { isUnlocked, isLoading, validatePin, lock, lockEnabled };
};

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Hardcoded superadmin emails — always granted admin access regardless of user_roles table
const SUPERADMIN_EMAILS = ["fsteinfelder@padel2go.eu"];

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Superadmin bypass — no DB lookup needed
      if (user.email && SUPERADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading, user };
}

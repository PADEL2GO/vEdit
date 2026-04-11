import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * Gate for routes that are only accessible after the admin has launched the app.
 * - While settings are loading → spinner
 * - Admin users → always pass through (so they can preview)
 * - app_launched = false → redirect to /booking
 * - app_launched = true → render the nested route
 */
export function RequireAppLaunched() {
  const { app_launched, isLoading } = useFeatureToggles();
  const { isAdmin, loading: adminLoading } = useAdminAuth();

  if (isLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admins always have full access so they can preview all sections
  if (isAdmin || app_launched) {
    return <Outlet />;
  }

  return <Navigate to="/booking" replace />;
}

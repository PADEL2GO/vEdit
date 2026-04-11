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
  const { app_launched, isLoading: featuresLoading } = useFeatureToggles();
  const { isAdmin, loading: adminLoading } = useAdminAuth();

  // Let admins through as soon as their identity resolves — don't wait for
  // the feature-toggle fetch (which requires the DB migration to be run).
  if (!adminLoading && isAdmin) {
    return <Outlet />;
  }

  // Still resolving admin status or feature flags
  if (adminLoading || featuresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-admin: check the launch flag
  if (app_launched) {
    return <Outlet />;
  }

  return <Navigate to="/booking" replace />;
}

import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * Gate for the dashboard marketplace route only — independent of the master
 * app_launched flag so the store can go live on its own.
 * - While admin status / feature flags are loading → spinner
 * - Admin users → always pass through (so they can preview)
 * - feature_marketplace_enabled = false → redirect to the public /marketplace
 * - feature_marketplace_enabled = true → render the nested route
 */
export function RequireMarketplaceEnabled() {
  const { marketplace_enabled, isLoading: featuresLoading } = useFeatureToggles();
  const { isAdmin, loading: adminLoading } = useAdminAuth();

  // Let admins through as soon as their identity resolves — don't wait for
  // the feature-toggle fetch.
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

  // Non-admin: check the marketplace flag
  if (marketplace_enabled) {
    return <Outlet />;
  }

  return <Navigate to="/marketplace" replace />;
}

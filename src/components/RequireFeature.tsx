import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useFeatureToggles, type FeatureName } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface RequireFeatureProps {
  feature: FeatureName;
}

/**
 * Per-feature route guard for the 3-state visibility model.
 * canSee(feature) already folds in admin identity, so "demo" features
 * pass only for admins and "hidden" features never pass.
 * - While admin status / feature flags are loading -> spinner
 * - canSee -> render the nested route
 * - otherwise -> redirect to /dashboard
 */
export function RequireFeature({ feature }: RequireFeatureProps) {
  const { canSee, isLoading: featuresLoading } = useFeatureToggles();
  const { loading: adminLoading } = useAdminAuth();

  if (adminLoading || featuresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (canSee(feature)) {
    return <Outlet />;
  }

  return <Navigate to="/dashboard" replace />;
}

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ClubSidebar } from "./ClubSidebar";
import { ClubCourtProvider, useClubCourt } from "./ClubCourtContext";
import { Separator } from "@/components/ui/separator";
import { Building2, CircleDot } from "lucide-react";
import { Outlet, Navigate } from "react-router-dom";
import { useClubAuth } from "@/hooks/useClubAuth";
import { SPORT_CHIP_CLASSES } from "@/components/admin/courts/types";
import LegalFooterLinks from "@/components/LegalFooterLinks";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export function ClubLayout() {
  const { t } = useTranslation("club");
  const { user, loading: authLoading } = useAuth();
  const { isClubUser, isLoading: clubLoading, club, primaryAssignment } = useClubAuth();

  // Loading state
  if (authLoading || clubLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 animate-pulse">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not a club user
  if (!isClubUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // No assignment yet
  if (!primaryAssignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-semibold">{t("layout.noCourtTitle")}</h1>
          <p className="text-muted-foreground max-w-md">
            {club ? (
              <>{t("layout.noCourtWithClubPrefix")}<strong>{club.name}</strong>{t("layout.noCourtWithClubSuffix")}</>
            ) : (
              t("layout.noCourtWithoutClub")
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClubCourtProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <ClubSidebar />
          <SidebarInset className="flex-1">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex min-w-0 items-center gap-2">
                {club ? (
                  <Building2 className="h-4 w-4 shrink-0 text-yellow-500" />
                ) : (
                  <CircleDot className="h-4 w-4 shrink-0 text-yellow-500" />
                )}
                <span className="shrink-0 text-sm font-medium">{t("common.clubPanel")}</span>
                <ActiveCourtBadge />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
              <Outlet />
              <LegalFooterLinks />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ClubCourtProvider>
  );
}

/**
 * Zeigt in der Kopfzeile jeder Portal-Seite, welcher Court gerade gemeint ist.
 * Bei nur einem zugewiesenen Court bleibt die Kopfzeile unverändert.
 */
function ActiveCourtBadge() {
  const { t } = useTranslation("club");
  const { courtName, sport, canSwitch } = useClubCourt();

  if (!canSwitch || !courtName) return null;

  return (
    <>
      <Separator orientation="vertical" className="mx-1 h-4 shrink-0" />
      <span className="truncate text-sm font-medium text-muted-foreground">{courtName}</span>
      <span
        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SPORT_CHIP_CLASSES[sport]}`}
      >
        {t(`common.sport.${sport}`)}
      </span>
    </>
  );
}

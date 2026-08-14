import { useLocation, useNavigate } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { CalendarDays, Home, Settings, LogOut, CircleDot, Users, UserCheck, Building2, LayoutDashboard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useClubQuota } from "@/hooks/useClubQuota";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { assignmentSport, SPORT_DOT_CLASSES, useClubCourt } from "./ClubCourtContext";

const menuItems = [
  { titleKey: "sidebar.menu.overview", url: "/club", icon: Home },
  { titleKey: "sidebar.menu.bookMembers", url: "/club/bookings", icon: Users },
  { titleKey: "sidebar.menu.members", url: "/club/members", icon: UserCheck },
  { titleKey: "sidebar.menu.calendar", url: "/club/calendar", icon: CalendarDays },
  { titleKey: "sidebar.menu.utilization", url: "/club/utilization", icon: BarChart3 },
  { titleKey: "sidebar.menu.courtFeatures", url: "/club/court", icon: Settings },
];

export function ClubSidebar() {
  const { t } = useTranslation("club");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { club, clubId } = useClubAuth();
  const {
    assignments,
    courtId,
    courtName,
    locationName,
    monthlyFreeMinutes,
    canSwitch,
    selectCourt,
  } = useClubCourt();
  const { summary, remainingFormatted, allowanceFormatted } = useClubQuota(
    clubId,
    courtId,
    monthlyFreeMinutes,
    user?.id // Legacy fallback
  );

  const isActive = (url: string) => {
    if (url === "/club") {
      return location.pathname === "/club";
    }
    return location.pathname.startsWith(url);
  };

  // Display club name if available, otherwise fall back to court name
  const displayName = club?.name ?? courtName ?? t("common.clubPanel");
  const displayLocation = locationName ?? t("common.clubPortal");

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
            {club ? (
              <Building2 className="h-5 w-5 text-white" />
            ) : (
              <CircleDot className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {displayLocation}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Court-Auswahl — nur wenn dem Verein mehr als ein Court zugewiesen ist */}
        {canSwitch && (
          <div className="border-b border-border/50 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("courtSwitcher.label")}
            </p>
            <Select value={courtId ?? undefined} onValueChange={selectCourt}>
              <SelectTrigger className="h-9 text-sm" aria-label={t("courtSwitcher.label")}>
                <SelectValue placeholder={t("courtSwitcher.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => {
                  const sport = assignmentSport(assignment);
                  return (
                    <SelectItem key={assignment.court_id} value={assignment.court_id}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${SPORT_DOT_CLASSES[sport]}`} />
                        <span>{assignment.court?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t(`common.sport.${sport}`)}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quota Display */}
        <div className="p-4 border-b border-border/50">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {club ? t("sidebar.quotaClub") : t("sidebar.quotaMonthly")}
              </span>
              <span className="font-medium text-foreground">
                {remainingFormatted} / {allowanceFormatted}
              </span>
            </div>
            <Progress value={100 - summary.percentUsed} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {canSwitch && courtName
                ? t("sidebar.remainingThisMonthForCourt", { courtName })
                : t("sidebar.remainingThisMonth")}
            </p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-colors"
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={() => navigate("/dashboard/booking")}
          >
            <LayoutDashboard className="h-4 w-4" />
            {t("sidebar.myDashboard")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            {t("sidebar.toHomepage")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {t("sidebar.signOut")}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

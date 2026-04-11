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
import { CalendarDays, Home, Settings, LogOut, CircleDot, Users, Building2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useClubQuota } from "@/hooks/useClubQuota";
import { Progress } from "@/components/ui/progress";

const menuItems = [
  { title: "Übersicht", url: "/club", icon: Home },
  { title: "Mitglieder buchen", url: "/club/bookings", icon: Users },
  { title: "Kalender", url: "/club/calendar", icon: CalendarDays },
  { title: "Court Features", url: "/club/court", icon: Settings },
];

export function ClubSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { club, clubId, courtName, locationName, primaryAssignment } = useClubAuth();
  const { summary, remainingFormatted, allowanceFormatted } = useClubQuota(
    clubId,
    primaryAssignment?.court_id ?? null,
    primaryAssignment?.monthly_free_minutes ?? 2400,
    user?.id // Legacy fallback
  );

  const isActive = (url: string) => {
    if (url === "/club") {
      return location.pathname === "/club";
    }
    return location.pathname.startsWith(url);
  };

  // Display club name if available, otherwise fall back to court name
  const displayName = club?.name ?? courtName ?? "Club Panel";
  const displayLocation = locationName ?? "Club Portal";

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
        {/* Quota Display */}
        <div className="p-4 border-b border-border/50">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {club ? "Euer Club-Kontingent" : "Monatskontingent"}
              </span>
              <span className="font-medium text-foreground">
                {remainingFormatted} / {allowanceFormatted}
              </span>
            </div>
            <Progress value={100 - summary.percentUsed} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Verbleibend diesen Monat
            </p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-colors"
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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
            Mein Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            Zur Startseite
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

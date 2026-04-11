import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Image,
  PartyPopper,
  ShoppingCart,
  Coins,
  Bell,
  Rocket,
  Building2,
  Ticket,
  Megaphone,
  ImagePlus,
  Palette,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import padel2goLogo from "@/assets/padel2go-logo.png";

const menuItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Buchungen", url: "/admin/bookings", icon: Calendar },
  { title: "Courts & Standorte", url: "/admin/courts", icon: MapPin },
  { title: "Clubs", url: "/admin/clubs", icon: Building2 },
  { title: "Events", url: "/admin/events", icon: PartyPopper },
  { title: "Marketplace", url: "/admin/marketplace", icon: ShoppingCart },
  { title: "P2G Points", url: "/admin/p2g-points", icon: Coins },
  { title: "Vouchers", url: "/admin/vouchers", icon: Ticket },
  { title: "Location Teasers", url: "/admin/location-teasers", icon: Megaphone },
  { title: "SkyPadel Galerie", url: "/admin/skypadel-gallery", icon: ImagePlus },
  { title: "Partner-Kacheln", url: "/admin/partner-tiles", icon: Palette },
  { title: "Benutzer", url: "/admin/users", icon: Users },
  { title: "Mitteilungen", url: "/admin/notifications", icon: Bell },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Visuals", url: "/admin/visuals", icon: Image },
  { title: "Features", url: "/admin/features", icon: Rocket },
  { title: "Einstellungen", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <Link to="/admin" className="flex items-center gap-3">
          <img src={padel2goLogo} alt="PADEL2GO" className="h-8 w-auto" />
          <div>
            <span className="font-bold text-lg text-foreground">PADEL2GO</span>
            <span className="block text-xs text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-colors"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Zur Homepage
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

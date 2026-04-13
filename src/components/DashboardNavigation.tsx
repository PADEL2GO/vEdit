import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, User, Settings, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { TubelightNavBar } from "@/components/ui/tubelight-navbar";
import { NotificationCenter } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useFriendships } from "@/hooks/useFriendships";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import wordmark from "@/assets/padel2go-wordmark.png";

const DashboardNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { isClubUser } = useClubAuth();
  const { pendingReceived } = useFriendships();
  const pendingReceivedCount = pendingReceived.length;
  const features = useFeatureToggles();

  // All possible nav items with their required feature flag
  const allNavItems = [
    { name: "Mein P2G", url: "/dashboard/home", feature: null },
    { name: "Booking", url: "/dashboard/booking", feature: null },
    { name: "Lobbys", url: "/lobbies", feature: "lobbies_enabled" },
    { name: "P2G Points", url: "/dashboard/p2g-points", feature: "p2g_enabled" },
    { name: "Marketplace", url: "/dashboard/marketplace", feature: "marketplace_enabled" },
    { name: "League", url: "/dashboard/league", feature: "league_enabled" },
    { name: "Events", url: "/dashboard/events", feature: "events_enabled" },
  ];

  // Admins see everything; before launch non-admins only see Übersicht + Booking;
  // after launch filter by individual feature flags
  const dashboardItems = isAdmin
    ? allNavItems.map(({ feature, ...item }) => item)
    : !features.app_launched
    ? [{ name: "Übersicht", url: "/dashboard/home" }, { name: "Booking", url: "/dashboard/booking" }]
    : allNavItems
        .filter(item => !item.feature || features[item.feature as keyof typeof features])
        .map(({ feature, ...item }) => item);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <NavLink to="/dashboard/home" className="flex items-center shrink-0 will-change-transform">
            <img
              src={wordmark}
              alt="PADEL2GO"
              className="h-6 md:h-8 w-auto"
              style={{ transform: "translateZ(0)" }}
            />
          </NavLink>

          {/* Desktop Navigation - Tubelight Style */}
          <div className="hidden lg:flex items-center">
            <TubelightNavBar items={dashboardItems} />
          </div>

          {/* Desktop User Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Notification Center */}
            <NotificationCenter />
            
            {/* Friends Link with Badge */}
            <Button 
              variant="ghost" 
              size="icon"
              asChild
              className="relative rounded-full border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-primary/10 hover:text-primary"
            >
              <NavLink to="/dashboard/friends">
                <Users className="w-4 h-4" />
                {pendingReceivedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingReceivedCount > 9 ? "9+" : pendingReceivedCount}
                  </span>
                )}
              </NavLink>
            </Button>
            
            {isClubUser && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="rounded-full px-4 border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-yellow-500/10 hover:text-yellow-500"
              >
                <NavLink to="/club">
                  <Building2 className="w-4 h-4 mr-2" />
                  Club
                </NavLink>
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="rounded-full px-4 border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-primary/10 hover:text-primary"
              >
                <NavLink to="/admin">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </NavLink>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="rounded-full px-4 border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-primary/10 hover:text-primary"
            >
              <NavLink to="/account">
                <User className="w-4 h-4 mr-2" />
                Profil
              </NavLink>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="rounded-full px-4 border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground rounded-full hover:bg-primary/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {dashboardItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.url}
                  className="px-4 py-3 min-h-[48px] flex items-center text-muted-foreground hover:text-primary transition-all duration-200 rounded-xl hover:bg-primary/10 font-medium"
                  activeClassName="text-primary bg-primary/15"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </NavLink>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-primary/10 hover:text-primary" asChild>
                  <NavLink to="/dashboard/friends" onClick={() => setIsOpen(false)}>
                    <Users className="w-4 h-4 mr-2" /> 
                    Freunde
                    {pendingReceivedCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingReceivedCount}
                      </span>
                    )}
                  </NavLink>
                </Button>
                {isClubUser && (
                  <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-yellow-500/10 hover:text-yellow-500" asChild>
                    <NavLink to="/club" onClick={() => setIsOpen(false)}>
                      <Building2 className="w-4 h-4 mr-2" /> Club Portal
                    </NavLink>
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-primary/10 hover:text-primary" asChild>
                    <NavLink to="/admin" onClick={() => setIsOpen(false)}>
                      <Settings className="w-4 h-4 mr-2" /> Admin
                    </NavLink>
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-primary/10 hover:text-primary" asChild>
                  <NavLink to="/account" onClick={() => setIsOpen(false)}>
                    <User className="w-4 h-4 mr-2" /> Profil
                  </NavLink>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start rounded-xl hover:bg-destructive/10 hover:text-destructive" 
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Ausloggen
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default DashboardNavigation;

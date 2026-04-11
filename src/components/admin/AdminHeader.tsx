import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const { user } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() || "AD";

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <h1 className="text-sm font-medium text-foreground">Admin Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground hidden md:block">
            {user?.email}
          </span>
        </div>
      </div>
    </header>
  );
}

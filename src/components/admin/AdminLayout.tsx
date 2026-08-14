import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import LegalFooterLinks from "@/components/LegalFooterLinks";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, hasAdminAccess, pages, loading, user } = useAdminAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // Eigene Rolle: nur die zugewiesenen Seiten. Wer eine fremde Seite direkt
  // aufruft, landet auf seiner ersten erlaubten — kein Sackgassen-Fehler.
  // Der Vollzugriff überspringt diese Prüfung.
  if (!isAdmin) {
    const allowed = pages.some((p) => p.route === pathname);
    if (!allowed) {
      const fallback = pages[0]?.route;
      return <Navigate to={fallback ?? "/"} replace />;
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <AdminHeader />
          <main className="p-6">
            {children}
          </main>
          <LegalFooterLinks />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

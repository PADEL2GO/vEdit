import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Building2, BarChart3, Video } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LocationForm, QUERY_KEY, Location, AdminLocationCard } from "@/components/admin/courts";
import { AdminCourtCard } from "@/components/admin/courts/AdminCourtCard";
import { LocationAnalyticsTab } from "@/components/admin/courts/LocationAnalyticsTab";
import { CameraApiKeysTab, CameraSessionsTab, CameraTestSimulator } from "@/components/admin/cameras";

export default function AdminCourts() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("standorte");

  const { data: locations, isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(`
          id,
          name,
          slug,
          address,
          description,
          is_online,
          is_24_7,
          amenities,
          postal_code,
          city,
          country,
          lat,
          lng,
          main_image_url,
          gallery_image_urls,
          opening_hours_json,
          rewards_enabled,
          ai_analysis_enabled,
          vending_enabled,
          features_json,
          courts (id, name, is_active, location_id)
        `)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Location[];
    },
  });

  // Flatten all courts with their location info
  const allCourts = locations?.flatMap(location => 
    (location.courts || []).map(court => ({
      court,
      location: {
        id: location.id,
        name: location.name,
        main_image_url: location.main_image_url,
        city: location.city,
      }
    }))
  ) || [];

  const totalLocations = locations?.length || 0;
  const onlineLocations = locations?.filter(l => l.is_online).length || 0;
  const totalCourts = allCourts.length;
  const activeCourts = allCourts.filter(c => c.court.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Courts & Standorte</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalLocations} Standorte ({onlineLocations} online) • {totalCourts} Courts ({activeCourts} aktiv)
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Neuer Standort
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Neuer Standort</DialogTitle>
              </DialogHeader>
              <LocationForm
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 w-full sm:w-auto flex">
            <TabsTrigger value="standorte" className="flex-1 sm:flex-initial data-[state=active]:bg-background">
              <MapPin className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Standorte</span>
              <span className="xs:hidden">Std.</span>
              <span className="ml-1">({totalLocations})</span>
            </TabsTrigger>
            <TabsTrigger value="courts" className="flex-1 sm:flex-initial data-[state=active]:bg-background">
              <Building2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Courts</span>
              <span className="xs:hidden">Cts.</span>
              <span className="ml-1">({totalCourts})</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 sm:flex-initial data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Analytics</span>
              <span className="xs:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="cameras" className="flex-1 sm:flex-initial data-[state=active]:bg-background">
              <Video className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">KI-Kameras</span>
              <span className="xs:hidden">Cam</span>
            </TabsTrigger>
          </TabsList>

          {/* Standorte Tab */}
          <TabsContent value="standorte" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="bg-card border-border animate-pulse">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-20 bg-muted rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : locations && locations.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {locations.map((location) => (
                  <AdminLocationCard key={location.id} location={location} />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Keine Standorte konfiguriert</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Courts Tab */}
          <TabsContent value="courts" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-card border-border animate-pulse">
                    <div className="aspect-[21/9] bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : allCourts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allCourts.map(({ court, location }, index) => (
                  <AdminCourtCard
                    key={court.id}
                    court={court}
                    location={location}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Keine Courts konfiguriert</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            {isLoading ? (
              <Card className="bg-card border-border animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="h-10 bg-muted rounded w-1/3" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-24 bg-muted rounded" />
                    ))}
                  </div>
                </div>
              </Card>
            ) : locations ? (
              <LocationAnalyticsTab locations={locations} />
            ) : null}
          </TabsContent>

          {/* KI-Kameras Tab */}
          <TabsContent value="cameras" className="mt-6 space-y-8">
            <CameraSessionsTab />
            <CameraApiKeysTab />
            <CameraTestSimulator />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

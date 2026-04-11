import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  ExternalLink, 
  Search,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { EventForm, EVENT_TYPES } from "@/components/admin/events";
import type { Event, Location } from "@/components/admin/events";

export default function AdminEvents() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          locations:location_id (id, name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Event[];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["admin-locations-for-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as Location[];
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ eventId, isPublished }: { eventId: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ is_published: isPublished })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["public-events"] });
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ eventId, featured }: { eventId: string; featured: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ featured })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Featured-Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["public-events"] });
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event gelöscht");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["public-events"] });
    },
    onError: () => {
      toast.error("Fehler beim Löschen");
    },
  });

  const filteredEvents = events?.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "published" && event.is_published) ||
      (filterStatus === "draft" && !event.is_published);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = events?.filter((e) => e.is_published).length || 0;
  const draftCount = events?.filter((e) => !e.is_published).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground">
              {publishedCount} veröffentlicht, {draftCount} Entwürfe
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Neues Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Neues Event erstellen</DialogTitle>
              </DialogHeader>
              <EventForm
                locations={locations || []}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["admin-events"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Titel oder Stadt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Events</SelectItem>
              <SelectItem value="published">Veröffentlicht</SelectItem>
              <SelectItem value="draft">Entwürfe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Laden...</div>
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Standort</TableHead>
                    <TableHead className="text-muted-foreground">Datum</TableHead>
                    <TableHead className="text-muted-foreground">Featured</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Tickets</TableHead>
                    <TableHead className="text-muted-foreground text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {event.image_url ? (
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{event.title}</p>
                            <div className="flex items-center gap-2">
                              {event.city && (
                                <span className="text-sm text-muted-foreground">{event.city}</span>
                              )}
                              {event.event_type && (
                                <Badge variant="outline" className="text-xs">
                                  {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {event.locations?.name || "-"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {event.start_at
                          ? format(new Date(event.start_at), "dd. MMM yyyy", { locale: de })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={event.featured}
                          onCheckedChange={(checked) =>
                            toggleFeaturedMutation.mutate({
                              eventId: event.id,
                              featured: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={event.is_published}
                            onCheckedChange={(checked) =>
                              togglePublishMutation.mutate({
                                eventId: event.id,
                                isPublished: checked,
                              })
                            }
                          />
                          <Badge
                            variant={event.is_published ? "default" : "secondary"}
                            className={
                              event.is_published
                                ? "bg-green-500/20 text-green-500 border-green-500/30"
                                : ""
                            }
                          >
                            {event.is_published ? "Live" : "Entwurf"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={event.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingEvent(event)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-foreground">
                                  Event bearbeiten
                                </DialogTitle>
                              </DialogHeader>
                              <EventForm
                                event={event}
                                locations={locations || []}
                                onSuccess={() => {
                                  setEditingEvent(null);
                                  queryClient.invalidateQueries({ queryKey: ["admin-events"] });
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">
                                  Event löschen?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{event.title}" wird unwiderruflich gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border">
                                  Abbrechen
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEventMutation.mutate(event.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine Events gefunden</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

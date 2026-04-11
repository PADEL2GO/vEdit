import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, CircleDot, Search, Building2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ClubOwnerAssignment {
  id: string;
  user_id: string;
  court_id: string;
  monthly_free_minutes: number;
  created_at: string;
  user?: {
    email?: string;
    profile?: {
      display_name: string | null;
      username: string | null;
    };
  };
  court?: {
    name: string;
    location?: {
      name: string;
    };
  };
}

const WEEKDAYS_LEGACY = [
  { value: 1, label: "Montag" },
];

export default function AdminClubOwners() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState(2400);

  // Fetch all assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["admin-club-owner-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_owner_assignments")
        .select(`
          *,
          court:courts (
            name,
            location:locations (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user info separately
      const userIds = data.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);

      return data.map(assignment => ({
        ...assignment,
        user: {
          profile: profiles?.find(p => p.user_id === assignment.user_id),
        },
      })) as ClubOwnerAssignment[];
    },
  });

  // Fetch club owners (users with club_owner role)
  const { data: clubOwners } = useQuery({
    queryKey: ["admin-club-owner-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "club_owner");

      if (error) throw error;

      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);

      return profiles || [];
    },
  });

  // Fetch all courts
  const { data: courts } = useQuery({
    queryKey: ["admin-all-courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select(`
          id,
          name,
          location:locations (
            name
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  // Create assignment mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !selectedCourtId) {
        throw new Error("Bitte wählen Sie einen Benutzer und Court aus");
      }

      const { error } = await supabase
        .from("club_owner_assignments")
        .insert({
          user_id: selectedUserId,
          court_id: selectedCourtId,
          monthly_free_minutes: weeklyMinutes,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zuweisung erfolgreich erstellt");
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-club-owner-assignments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Erstellen");
    },
  });

  // Delete assignment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("club_owner_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zuweisung gelöscht");
      queryClient.invalidateQueries({ queryKey: ["admin-club-owner-assignments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedCourtId("");
    setWeeklyMinutes(2400);
  };

  const filteredAssignments = assignments?.filter((a) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      a.user?.profile?.display_name?.toLowerCase().includes(search) ||
      a.user?.profile?.username?.toLowerCase().includes(search) ||
      a.court?.name?.toLowerCase().includes(search) ||
      a.court?.location?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CircleDot className="h-6 w-6 text-yellow-500" />
              Club Owners
            </h1>
            <p className="text-muted-foreground">
              Verwalten Sie Club-Owner-Zuweisungen und Kontingente
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Zuweisung
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Club Owner Zuweisung</DialogTitle>
                <DialogDescription>
                  Weisen Sie einem Club Owner einen Court zu und legen Sie das Kontingent fest.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Club Owner</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Benutzer auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clubOwners?.map((owner) => (
                        <SelectItem key={owner.user_id} value={owner.user_id}>
                          {owner.display_name || owner.username || owner.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clubOwners?.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Keine Benutzer mit der Rolle "club_owner" gefunden. 
                      Weisen Sie zuerst einem Benutzer die Rolle zu.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Court</Label>
                  <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Court auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courts?.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {court.name} ({court.location?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monatskontingent (Stunden)</Label>
                  <Input
                    type="number"
                    value={weeklyMinutes / 60}
                    onChange={(e) => setWeeklyMinutes(Number(e.target.value) * 60)}
                    min={0}
                    max={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    = {weeklyMinutes} Minuten pro Monat
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Erstelle..." : "Erstellen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, Court oder Standort..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Zuweisungen
            </CardTitle>
            <CardDescription>
              {filteredAssignments?.length ?? 0} Zuweisung(en)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club Owner</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Kontingent</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Laden...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Keine Zuweisungen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments?.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <CircleDot className="h-3 w-3 mr-1" />
                            Club
                          </Badge>
                          <span className="font-medium">
                            {assignment.user?.profile?.display_name || 
                             assignment.user?.profile?.username || 
                             assignment.user_id.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.court?.name}</TableCell>
                      <TableCell>{assignment.court?.location?.name}</TableCell>
                      <TableCell>
                        {assignment.monthly_free_minutes / 60}h / Monat
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(assignment.created_at), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(assignment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-4">
            <h3 className="font-medium mb-2">So richten Sie einen Club Owner ein:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Gehen Sie zu "Benutzer" und weisen Sie einem Account die Rolle "club_owner" zu</li>
              <li>Kommen Sie hierher und klicken Sie auf "Neue Zuweisung"</li>
              <li>Wählen Sie den Club Owner und den zugehörigen Court</li>
              <li>Legen Sie das Monatskontingent fest (z.B. 40 Stunden)</li>
              <li>Der Club Owner kann sich nun einloggen und das Club Panel nutzen</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

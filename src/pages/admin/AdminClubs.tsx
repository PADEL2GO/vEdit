import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Plus, 
  Minus,
  Trash2, 
  Search, 
  Building2, 
  Users, 
  MapPin, 
  Edit, 
  Clock, 
  UserPlus,
  UserMinus,
  X
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const WEEKDAYS = [
  { value: 0, label: "Sonntag" },
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
];

interface Club {
  id: string;
  name: string;
  description: string | null;
  primary_contact_email: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  court_assignments?: ClubCourtAssignment[];
  club_users?: ClubUser[];
}

interface ClubCourtAssignment {
  id: string;
  club_id: string;
  court_id: string;
  monthly_free_minutes: number;
  court?: {
    id: string;
    name: string;
    location?: {
      id: string;
      name: string;
    };
  };
}

interface ClubUser {
  id: string;
  club_id: string;
  user_id: string;
  role_in_club: string;
  is_active: boolean;
  created_at: string;
  profile?: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function AdminClubs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  
  // Dialog states
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [isCourtDialogOpen, setIsCourtDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  
  // Club form state
  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [clubEmail, setClubEmail] = useState("");
  
  // Court assignment form state
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState(2400);
  
  // User form state
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userRoleInClub, setUserRoleInClub] = useState<"manager" | "staff">("staff");

  // Fetch all clubs with assignments and users
  const { data: clubs, isLoading } = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(`
          *,
          court_assignments:club_court_assignments (
            *,
            court:courts (
              id,
              name,
              location:locations (
                id,
                name
              )
            )
          ),
          club_users (
            *
          )
        `)
        .order("name");

      if (error) throw error;

      // Fetch profiles for club users
      const allUserIds = data.flatMap(club => 
        club.club_users?.map((cu: ClubUser) => cu.user_id) || []
      );
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", allUserIds);

        return data.map(club => ({
          ...club,
          club_users: club.club_users?.map((cu: ClubUser) => ({
            ...cu,
            profile: profiles?.find(p => p.user_id === cu.user_id),
          })),
        })) as Club[];
      }

      return data as Club[];
    },
  });

  // Fetch all courts for assignment
  const { data: courts } = useQuery({
    queryKey: ["admin-all-courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select(`
          id,
          name,
          location:locations (
            id,
            name
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  // Search users for adding to club
  const { data: searchedUsers } = useQuery({
    queryKey: ["admin-search-users", userSearchTerm],
    queryFn: async () => {
      if (userSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .or(`username.ilike.%${userSearchTerm}%,display_name.ilike.%${userSearchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: userSearchTerm.length >= 2,
  });

  // Create/Update club mutation
  const clubMutation = useMutation({
    mutationFn: async () => {
      if (!clubName.trim()) {
        throw new Error("Club-Name ist erforderlich");
      }

      if (editingClub) {
        const { error } = await supabase
          .from("clubs")
          .update({
            name: clubName.trim(),
            description: clubDescription.trim() || null,
            primary_contact_email: clubEmail.trim() || null,
          })
          .eq("id", editingClub.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clubs")
          .insert({
            name: clubName.trim(),
            description: clubDescription.trim() || null,
            primary_contact_email: clubEmail.trim() || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingClub ? "Club aktualisiert" : "Club erstellt");
      setIsClubDialogOpen(false);
      resetClubForm();
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Speichern");
    },
  });

  // Delete club mutation
  const deleteClubMutation = useMutation({
    mutationFn: async (clubId: string) => {
      const { error } = await supabase
        .from("clubs")
        .delete()
        .eq("id", clubId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Club gelöscht");
      setSelectedClub(null);
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  // Toggle club active status
  const toggleClubMutation = useMutation({
    mutationFn: async ({ clubId, isActive }: { clubId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("clubs")
        .update({ is_active: isActive })
        .eq("id", clubId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Aktualisieren");
    },
  });

  // Add court assignment mutation
  const addCourtMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClub || !selectedCourtId) {
        throw new Error("Bitte wählen Sie einen Court aus");
      }

      const { error } = await supabase
        .from("club_court_assignments")
        .insert({
          club_id: selectedClub.id,
          court_id: selectedCourtId,
          monthly_free_minutes: weeklyMinutes,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Dieser Court ist bereits diesem Club zugewiesen");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Court-Zuweisung erstellt");
      setIsCourtDialogOpen(false);
      resetCourtForm();
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Erstellen");
    },
  });

  // Update court assignment mutation
  const updateCourtMutation = useMutation({
    mutationFn: async ({ 
      assignmentId, 
      monthlyMinutes, 
    }: { 
      assignmentId: string; 
      monthlyMinutes: number;
    }) => {
      const { error } = await supabase
        .from("club_court_assignments")
        .update({
          monthly_free_minutes: monthlyMinutes,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kontingent aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club-court-assignments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Aktualisieren");
    },
  });

  // Delete court assignment mutation
  const deleteCourtMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("club_court_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Court-Zuweisung gelöscht");
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  // Add club user mutation
  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClub || !selectedUserId) {
        throw new Error("Bitte wählen Sie einen Benutzer aus");
      }

      const { error } = await supabase
        .from("club_users")
        .insert({
          club_id: selectedClub.id,
          user_id: selectedUserId,
          role_in_club: userRoleInClub,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Dieser Benutzer ist bereits Mitglied dieses Clubs");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Benutzer hinzugefügt");
      setIsUserDialogOpen(false);
      resetUserForm();
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Hinzufügen");
    },
  });

  // Toggle club user active status
  const toggleUserMutation = useMutation({
    mutationFn: async ({ usersId, isActive }: { usersId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("club_users")
        .update({ is_active: isActive })
        .eq("id", usersId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benutzer-Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Aktualisieren");
    },
  });

  // Remove club user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (clubUserId: string) => {
      const { error } = await supabase
        .from("club_users")
        .delete()
        .eq("id", clubUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benutzer entfernt");
      queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Entfernen");
    },
  });

  const resetClubForm = () => {
    setClubName("");
    setClubDescription("");
    setClubEmail("");
    setEditingClub(null);
  };

  const resetCourtForm = () => {
    setSelectedCourtId("");
    setWeeklyMinutes(2400);
  };

  const resetUserForm = () => {
    setUserSearchTerm("");
    setSelectedUserId("");
    setUserRoleInClub("staff");
  };

  const openEditClubDialog = (club: Club) => {
    setEditingClub(club);
    setClubName(club.name);
    setClubDescription(club.description || "");
    setClubEmail(club.primary_contact_email || "");
    setIsClubDialogOpen(true);
  };

  const filteredClubs = clubs?.filter((club) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      club.name.toLowerCase().includes(search) ||
      club.description?.toLowerCase().includes(search) ||
      club.primary_contact_email?.toLowerCase().includes(search)
    );
  });

  // Get available courts (not already assigned to selected club)
  const availableCourts = courts?.filter(court => 
    !selectedClub?.court_assignments?.some(a => a.court_id === court.id)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Clubs
            </h1>
            <p className="text-muted-foreground">
              Verwalten Sie Clubs, Court-Zuweisungen und Mitglieder
            </p>
          </div>
          <Dialog open={isClubDialogOpen} onOpenChange={(open) => {
            setIsClubDialogOpen(open);
            if (!open) resetClubForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neuer Club
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClub ? "Club bearbeiten" : "Neuer Club"}</DialogTitle>
                <DialogDescription>
                  {editingClub 
                    ? "Aktualisieren Sie die Club-Informationen." 
                    : "Erstellen Sie einen neuen Club für Vereinsmitglieder."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Club Name *</Label>
                  <Input
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="z.B. TC Musterstadt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={clubDescription}
                    onChange={(e) => setClubDescription(e.target.value)}
                    placeholder="Kurze Beschreibung des Clubs..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontakt-Email</Label>
                  <Input
                    type="email"
                    value={clubEmail}
                    onChange={(e) => setClubEmail(e.target.value)}
                    placeholder="kontakt@tennisclub.de"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClubDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={() => clubMutation.mutate()}
                  disabled={clubMutation.isPending}
                >
                  {clubMutation.isPending ? "Speichern..." : (editingClub ? "Aktualisieren" : "Erstellen")}
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
                placeholder="Suchen nach Club-Name, Beschreibung oder Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clubs List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clubs ({filteredClubs?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Laden...</div>
              ) : filteredClubs?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Keine Clubs gefunden
                </div>
              ) : (
                <div className="divide-y">
                  {filteredClubs?.map((club) => (
                    <div
                      key={club.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedClub?.id === club.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedClub(club)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{club.name}</span>
                            {!club.is_active && (
                              <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {club.court_assignments?.length ?? 0} Courts
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {club.club_users?.filter(u => u.is_active)?.length ?? 0} User
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Club Details */}
          <Card className="lg:col-span-2">
            {selectedClub ? (
              <>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{selectedClub.name}</CardTitle>
                      <Switch
                        checked={selectedClub.is_active}
                        onCheckedChange={(checked) => 
                          toggleClubMutation.mutate({ clubId: selectedClub.id, isActive: checked })
                        }
                      />
                    </div>
                    <CardDescription>
                      {selectedClub.description || "Keine Beschreibung"}
                    </CardDescription>
                    {selectedClub.primary_contact_email && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedClub.primary_contact_email}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditClubDialog(selectedClub)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Club wirklich löschen? Alle Zuweisungen werden entfernt.")) {
                          deleteClubMutation.mutate(selectedClub.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="courts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="courts" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Courts ({selectedClub.court_assignments?.length ?? 0})
                      </TabsTrigger>
                      <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Mitglieder ({selectedClub.club_users?.filter(u => u.is_active)?.length ?? 0})
                      </TabsTrigger>
                    </TabsList>

                    {/* Courts Tab */}
                    <TabsContent value="courts" className="space-y-4 mt-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Court-Zuweisungen & Kontingente</h3>
                        <Dialog open={isCourtDialogOpen} onOpenChange={(open) => {
                          setIsCourtDialogOpen(open);
                          if (!open) resetCourtForm();
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Court hinzufügen
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Court zuweisen</DialogTitle>
                              <DialogDescription>
                                Weisen Sie dem Club "{selectedClub.name}" einen Court mit Monatskontingent zu.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Court</Label>
                                <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Court auswählen..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableCourts?.map((court) => (
                                      <SelectItem key={court.id} value={court.id}>
                                        {court.name} ({court.location?.name})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {availableCourts?.length === 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Alle verfügbaren Courts sind bereits zugewiesen.
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Monatskontingent (Stunden)</Label>
                                <Input
                                  type="number"
                                  value={weeklyMinutes / 60}
                                  onChange={(e) => setWeeklyMinutes(Number(e.target.value) * 60)}
                                  min={0}
                                  max={120}
                                />
                                <p className="text-xs text-muted-foreground">
                                  = {weeklyMinutes} Minuten pro Monat
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsCourtDialogOpen(false)}>
                                Abbrechen
                              </Button>
                              <Button 
                                onClick={() => addCourtMutation.mutate()}
                                disabled={addCourtMutation.isPending || !selectedCourtId}
                              >
                                {addCourtMutation.isPending ? "Hinzufügen..." : "Hinzufügen"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {selectedClub.court_assignments?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                          Noch keine Courts zugewiesen
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Court</TableHead>
                              <TableHead>Standort</TableHead>
                              <TableHead>Kontingent</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedClub.court_assignments?.map((assignment) => (
                              <TableRow key={assignment.id}>
                                <TableCell className="font-medium">
                                  {assignment.court?.name}
                                </TableCell>
                                <TableCell>
                                  {assignment.court?.location?.name}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={assignment.monthly_free_minutes <= 0 || updateCourtMutation.isPending}
                                      onClick={() => 
                                        updateCourtMutation.mutate({
                                          assignmentId: assignment.id,
                                          monthlyMinutes: Math.max(0, assignment.monthly_free_minutes - 60),
                                        })
                                      }
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                      type="number"
                                      className="w-16 h-8 text-center"
                                      defaultValue={assignment.monthly_free_minutes / 60}
                                      key={assignment.monthly_free_minutes}
                                      onBlur={(e) => {
                                        const newValue = Math.min(120, Math.max(0, Number(e.target.value)));
                                        if (newValue * 60 !== assignment.monthly_free_minutes) {
                                          updateCourtMutation.mutate({
                                            assignmentId: assignment.id,
                                            monthlyMinutes: newValue * 60,
                                          });
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      min={0}
                                      max={120}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={assignment.monthly_free_minutes >= 120 * 60 || updateCourtMutation.isPending}
                                      onClick={() => 
                                        updateCourtMutation.mutate({
                                          assignmentId: assignment.id,
                                          monthlyMinutes: Math.min(120 * 60, assignment.monthly_free_minutes + 60),
                                        })
                                      }
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground">h/Monat</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => deleteCourtMutation.mutate(assignment.id)}
                                    disabled={deleteCourtMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users" className="space-y-4 mt-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Club-Mitglieder</h3>
                        <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
                          setIsUserDialogOpen(open);
                          if (!open) resetUserForm();
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <UserPlus className="h-4 w-4 mr-1" />
                              Benutzer hinzufügen
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Benutzer zu Club hinzufügen</DialogTitle>
                              <DialogDescription>
                                Fügen Sie einen Benutzer zu "{selectedClub.name}" hinzu.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Benutzer suchen</Label>
                                <Input
                                  value={userSearchTerm}
                                  onChange={(e) => {
                                    setUserSearchTerm(e.target.value);
                                    setSelectedUserId("");
                                  }}
                                  placeholder="Username oder Name eingeben..."
                                />
                                {searchedUsers && searchedUsers.length > 0 && !selectedUserId && (
                                  <div className="border rounded-md max-h-40 overflow-y-auto">
                                    {searchedUsers.map((user) => (
                                      <div
                                        key={user.user_id}
                                        className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                                        onClick={() => {
                                          setSelectedUserId(user.user_id);
                                          setUserSearchTerm(user.display_name || user.username || "");
                                        }}
                                      >
                                        <span>{user.display_name || user.username}</span>
                                        {user.username && user.display_name && (
                                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {selectedUserId && (
                                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                    <span className="flex-1">{userSearchTerm}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setSelectedUserId("");
                                        setUserSearchTerm("");
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Rolle im Club</Label>
                                <Select 
                                  value={userRoleInClub} 
                                  onValueChange={(v) => setUserRoleInClub(v as "manager" | "staff")}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                                Abbrechen
                              </Button>
                              <Button 
                                onClick={() => addUserMutation.mutate()}
                                disabled={addUserMutation.isPending || !selectedUserId}
                              >
                                {addUserMutation.isPending ? "Hinzufügen..." : "Hinzufügen"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {selectedClub.club_users?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                          Noch keine Mitglieder hinzugefügt
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Benutzer</TableHead>
                              <TableHead>Rolle</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Hinzugefügt</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedClub.club_users?.map((clubUser) => (
                              <TableRow key={clubUser.id}>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">
                                      {clubUser.profile?.display_name || clubUser.profile?.username || "Unbekannt"}
                                    </span>
                                    {clubUser.profile?.username && clubUser.profile?.display_name && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        @{clubUser.profile.username}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={clubUser.role_in_club === "manager" ? "default" : "secondary"}>
                                    {clubUser.role_in_club === "manager" ? "Manager" : "Staff"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={clubUser.is_active}
                                    onCheckedChange={(checked) =>
                                      toggleUserMutation.mutate({ usersId: clubUser.id, isActive: checked })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(clubUser.created_at), "dd.MM.yyyy", { locale: de })}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm("Benutzer wirklich aus dem Club entfernen?")) {
                                        removeUserMutation.mutate(clubUser.id);
                                      }
                                    }}
                                    disabled={removeUserMutation.isPending}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Wählen Sie einen Club aus der Liste aus</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Help Card */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-4">
            <h3 className="font-medium mb-2">So richten Sie einen Club ein:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Klicken Sie auf "Neuer Club" und geben Sie den Club-Namen ein</li>
              <li>Wählen Sie den erstellten Club aus der Liste aus</li>
              <li>Fügen Sie unter "Courts" die gewünschten Courts mit Monatskontingent hinzu</li>
              <li>Fügen Sie unter "Mitglieder" die Benutzer hinzu, die das Club-Portal nutzen sollen</li>
              <li>Die Club-Mitglieder können sich einloggen und werden zum Club-Portal weitergeleitet</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

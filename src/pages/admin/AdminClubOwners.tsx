import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash2, Search } from "lucide-react";
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

const SETUP_STEPS = [
  'Gehen Sie zu "Benutzer" und weisen Sie einem Account die Rolle "club_owner" zu',
  'Kommen Sie hierher und klicken Sie auf "Neue Zuweisung"',
  "Wählen Sie den Club Owner und den zugehörigen Court",
  "Legen Sie das Monatskontingent fest (z.B. 40 Stunden)",
  "Der Club Owner kann sich nun einloggen und das Club Panel nutzen",
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

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
      <div className="flex animate-fade-up flex-col gap-[18px]">
        {/* Kopfzeile: Beschreibung + Legacy-Badge + Neue Zuweisung */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <p className="text-sm text-muted-foreground">
              Club-Owner-Zuweisungen und Kontingente verwalten
            </p>
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[hsl(41_100%_65%/0.28)] bg-[hsl(41_100%_65%/0.09)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#FFC44D]">
              Legacy-Modell
            </span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 w-full gap-[7px] rounded-[10px] bg-gradient-lime px-[15px] text-[13px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.28)] transition-opacity hover:opacity-90 sm:w-auto">
                <Plus className="h-[15px] w-[15px]" />
                Neue Zuweisung
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[470px] rounded-[20px] border-[hsl(0_0%_15%)] bg-[linear-gradient(180deg,hsl(0_0%_7%),hsl(0_0%_4%))]">
              <DialogHeader className="gap-[5px] space-y-0 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  Zuweisung
                </span>
                <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
                  Club Owner Zuweisung
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                  Weisen Sie einem Club Owner einen Court zu und legen Sie das Kontingent fest.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-[18px] py-2">
                <div className="flex flex-col gap-[7px]">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Club Owner<span className="text-primary"> *</span>
                  </Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] font-semibold">
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
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Keine Benutzer mit der Rolle "club_owner" gefunden.
                      Weisen Sie zuerst einem Benutzer die Rolle zu.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Court<span className="text-primary"> *</span>
                  </Label>
                  <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                    <SelectTrigger className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] font-semibold">
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

                <div className="flex flex-col gap-[7px]">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Monatskontingent (Stunden)<span className="text-primary"> *</span>
                  </Label>
                  <Input
                    type="number"
                    value={weeklyMinutes / 60}
                    onChange={(e) => setWeeklyMinutes(Number(e.target.value) * 60)}
                    min={0}
                    max={200}
                    className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold"
                  />
                  <p className="font-mono text-[11.5px] text-muted-foreground">
                    = {weeklyMinutes.toLocaleString("de-DE")} Minuten pro Monat · max. 200 h
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2.5 sm:gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="h-10 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] transition-opacity hover:opacity-90"
                >
                  {createMutation.isPending ? "Erstelle..." : "Erstellen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Zuweisungen: Suche + Tabelle */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3.5">
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                Zuweisungen{" "}
                <span className="font-mono text-sm font-normal text-muted-foreground">
                  ({filteredAssignments?.length ?? 0})
                </span>
              </span>
              <div className="relative flex w-full items-center sm:w-[280px]">
                <Search className="pointer-events-none absolute left-3 h-[15px] w-[15px] text-muted-foreground" />
                <Input
                  placeholder="Suchen nach Name, Court oder Standort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[38px] rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] pl-9 text-[13.5px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="h-auto px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Club Owner
                    </TableHead>
                    <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Court
                    </TableHead>
                    <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Standort
                    </TableHead>
                    <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Kontingent
                    </TableHead>
                    <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Erstellt
                    </TableHead>
                    <TableHead className="h-auto whitespace-nowrap px-0 pb-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                      Aktion
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className="border-0 border-t border-[hsl(0_0%_12%)] hover:bg-transparent">
                      <TableCell colSpan={6} className="px-0 py-8 text-center text-[13.5px] text-muted-foreground">
                        Laden...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssignments?.length === 0 ? (
                    <TableRow className="border-0 border-t border-[hsl(0_0%_12%)] hover:bg-transparent">
                      <TableCell colSpan={6} className="px-0 py-8 text-center text-[13.5px] text-muted-foreground">
                        Keine Zuweisungen gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments?.map((assignment) => {
                      const ownerName =
                        assignment.user?.profile?.display_name ||
                        assignment.user?.profile?.username ||
                        assignment.user_id.slice(0, 8);
                      return (
                        <TableRow
                          key={assignment.id}
                          className="border-0 border-t border-[hsl(0_0%_12%)] hover:bg-white/[0.02]"
                        >
                          <TableCell className="px-0 py-[13px] pr-3.5">
                            <div className="flex items-center gap-[11px]">
                              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] font-display text-[11px] font-extrabold text-[#FFC44D]">
                                {getInitials(ownerName)}
                              </span>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="whitespace-nowrap text-[13.5px] font-semibold text-foreground">
                                    {ownerName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-[hsl(41_100%_65%/0.28)] bg-[hsl(41_100%_65%/0.1)] px-2 py-px text-[10px] font-bold uppercase tracking-[0.08em] text-[#FFC44D]"
                                  >
                                    Club
                                  </Badge>
                                </div>
                                <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                  {assignment.user?.profile?.username
                                    ? `@${assignment.user.profile.username} · `
                                    : ""}
                                  {assignment.user_id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-0 py-[13px] pr-3.5 text-[13.5px] font-semibold text-foreground">
                            {assignment.court?.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-0 py-[13px] pr-3.5 text-[13.5px] text-[hsl(0_0%_78%)]">
                            {assignment.court?.location?.name}
                          </TableCell>
                          <TableCell className="px-0 py-[13px] pr-3.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-sm font-bold text-primary">
                                {(assignment.monthly_free_minutes / 60).toLocaleString("de-DE")}
                              </span>
                              <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                h / Monat
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-0 py-[13px] pr-3.5 font-mono text-[12.5px] text-[hsl(0_0%_78%)]">
                            {format(new Date(assignment.created_at), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell className="px-0 py-[13px]">
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Zuweisung löschen"
                                className="h-[30px] w-[30px] rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                                onClick={() => deleteMutation.mutate(assignment.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {/* Hilfe-Karte */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-3.5">
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              So richten Sie einen Club Owner ein
            </span>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3">
              {SETUP_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-[11px] rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]"
                >
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-[hsl(0_0%_72%)]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

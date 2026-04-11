import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Users,
  Search,
  Eye,
  Shield,
  ShieldCheck,
  Trash2,
  Coins,
  Calendar,
  Gamepad2,
  Wallet,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  TrendingUp,
  TrendingDown,
  CircleDot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface UserWithDetails {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  age: number | null;
  skill_self_rating: number | null;
  games_played_self: number | null;
  created_at: string;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  profile_completed_at: string | null;
  shipping_address_line1: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  referral_code: string | null;
  roles: string[];
  wallet?: {
    play_credits: number;
    reward_credits: number;
    lifetime_credits: number;
  };
  matchCount?: number;
  bookingCount?: number;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);
  const queryClient = useQueryClient();

  // Fetch all users with extended data
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-all-users-extended"],
    queryFn: async () => {
      // Get profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          display_name,
          username,
          avatar_url,
          age,
          skill_self_rating,
          games_played_self,
          created_at,
          email_verified_at,
          phone_verified_at,
          profile_completed_at,
          shipping_address_line1,
          shipping_city,
          shipping_postal_code,
          shipping_country,
          referral_code
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        if (!rolesMap.has(r.user_id)) {
          rolesMap.set(r.user_id, []);
        }
        rolesMap.get(r.user_id)!.push(r.role);
      });

      // Fetch wallets
      const { data: wallets } = await supabase
        .from("wallets")
        .select("user_id, play_credits, reward_credits, lifetime_credits");

      const walletsMap = new Map(wallets?.map((w) => [w.user_id, w]));

      // Fetch match counts
      const { data: matchCounts } = await supabase
        .from("match_analyses")
        .select("user_id");

      const matchCountMap = new Map<string, number>();
      matchCounts?.forEach((m) => {
        matchCountMap.set(m.user_id, (matchCountMap.get(m.user_id) || 0) + 1);
      });

      // Fetch booking counts
      const { data: bookingCounts } = await supabase
        .from("bookings")
        .select("user_id");

      const bookingCountMap = new Map<string, number>();
      bookingCounts?.forEach((b) => {
        bookingCountMap.set(b.user_id, (bookingCountMap.get(b.user_id) || 0) + 1);
      });

      return profiles?.map((p): UserWithDetails => ({
        ...p,
        roles: rolesMap.get(p.user_id) || [],
        wallet: walletsMap.get(p.user_id) || { play_credits: 0, reward_credits: 0, lifetime_credits: 0 },
        matchCount: matchCountMap.get(p.user_id) || 0,
        bookingCount: bookingCountMap.get(p.user_id) || 0,
      })) || [];
    },
  });

  // Fetch user details (matches, bookings, ledger)
  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["admin-user-details", selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser?.user_id) return null;

      // Fetch matches
      const { data: matches } = await supabase
        .from("match_analyses")
        .select("id, match_id, created_at, result, ai_score, credits_awarded, status, opponent_user_id")
        .eq("user_id", selectedUser.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          price_cents,
          courts (name),
          locations (name)
        `)
        .eq("user_id", selectedUser.user_id)
        .order("start_time", { ascending: false })
        .limit(20);

      // Fetch ledger
      const { data: ledger } = await supabase
        .from("points_ledger")
        .select("id, created_at, credit_type, delta_points, balance_after, description, entry_type")
        .eq("user_id", selectedUser.user_id)
        .order("created_at", { ascending: false })
        .limit(30);

      // Fetch skill stats
      const { data: skillStats } = await supabase
        .from("skill_stats")
        .select("skill_level, ai_rank")
        .eq("user_id", selectedUser.user_id)
        .maybeSingle();

      return { matches, bookings, ledger, skillStats };
    },
    enabled: !!selectedUser?.user_id,
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, role, hasRole }: { userId: string; role: "admin" | "moderator" | "club_owner" | "user"; hasRole: boolean }) => {
      if (hasRole) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert([{
          user_id: userId,
          role: role,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Rolle aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-extended"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "delete_user", userId, confirmPhrase: "DELETE" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Benutzer erfolgreich gelöscht");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmText("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-extended"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.user_id?.toLowerCase().includes(searchLower)
    );
  });

  const openDeleteDialog = (user: UserWithDetails) => {
    setUserToDelete(user);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmText !== "DELETE" || !userToDelete) return;
    deleteUserMutation.mutate(userToDelete.user_id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500">Bestätigt</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive">Storniert</Badge>;
      case "pending":
      case "pending_payment":
        return <Badge className="bg-yellow-500/20 text-yellow-500">Ausstehend</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Benutzer</h1>
            <p className="text-muted-foreground">Vollständige Benutzerverwaltung</p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">{users?.length || 0}</span>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, Username oder ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Benutzerliste ({filteredUsers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Benutzer</TableHead>
                      <TableHead className="text-muted-foreground">Username</TableHead>
                      <TableHead className="text-muted-foreground">Credits</TableHead>
                      <TableHead className="text-muted-foreground">Matches</TableHead>
                      <TableHead className="text-muted-foreground">Buchungen</TableHead>
                      <TableHead className="text-muted-foreground">Rollen</TableHead>
                      <TableHead className="text-muted-foreground">Registriert</TableHead>
                      <TableHead className="text-muted-foreground text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {user.display_name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-foreground font-medium">
                              {user.display_name || "Unbekannt"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.username ? `@${user.username}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-foreground font-medium">
                              {(user.wallet?.reward_credits || 0) + (user.wallet?.play_credits || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                            <span className="text-foreground">{user.matchCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">{user.bookingCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.includes("admin") && (
                              <Badge variant="default" className="bg-primary text-primary-foreground">
                                Admin
                              </Badge>
                            )}
                            {user.roles.includes("moderator") && (
                              <Badge variant="secondary">Mod</Badge>
                            )}
                            {user.roles.includes("club_owner") && (
                              <Badge className="bg-green-600/20 text-green-600 border-green-600/30">
                                🎾 Club
                              </Badge>
                            )}
                            {user.roles.length === 0 && (
                              <Badge variant="outline" className="text-muted-foreground border-border">
                                User
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(user.created_at), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedUser(user);
                                setActiveTab("overview");
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Role Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${
                                    user.roles.length > 0
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {user.roles.includes("admin") ? (
                                    <ShieldCheck className="h-4 w-4" />
                                  ) : user.roles.includes("club_owner") ? (
                                    <CircleDot className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Shield className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleRoleMutation.mutate({
                                      userId: user.user_id,
                                      role: "admin",
                                      hasRole: user.roles.includes("admin"),
                                    })
                                  }
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  {user.roles.includes("admin") ? "Admin entfernen" : "Admin machen"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleRoleMutation.mutate({
                                      userId: user.user_id,
                                      role: "moderator",
                                      hasRole: user.roles.includes("moderator"),
                                    })
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {user.roles.includes("moderator") ? "Moderator entfernen" : "Moderator machen"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleRoleMutation.mutate({
                                      userId: user.user_id,
                                      role: "club_owner",
                                      hasRole: user.roles.includes("club_owner"),
                                    })
                                  }
                                  className="text-green-600"
                                >
                                  <span className="mr-2">🎾</span>
                                  {user.roles.includes("club_owner") ? "Club Owner entfernen" : "Club Owner machen"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Keine Benutzer gefunden
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-hidden grid grid-rows-[auto,1fr,auto]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {selectedUser.display_name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span>{selectedUser.display_name || "Unbekannt"}</span>
                    {selectedUser.username && (
                      <span className="text-muted-foreground font-normal ml-2">
                        @{selectedUser.username}
                      </span>
                    )}
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="min-h-0 overflow-y-auto pr-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="matches">Matches</TabsTrigger>
                  <TabsTrigger value="bookings">Buchungen</TabsTrigger>
                  <TabsTrigger value="wallet">Wallet</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Reward Credits</p>
                      <p className="text-xl font-bold text-amber-500">
                        {selectedUser.wallet?.reward_credits || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Play Credits</p>
                      <p className="text-xl font-bold text-primary">
                        {selectedUser.wallet?.play_credits || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Matches</p>
                      <p className="text-xl font-bold text-foreground">{selectedUser.matchCount || 0}</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Buchungen</p>
                      <p className="text-xl font-bold text-foreground">{selectedUser.bookingCount || 0}</p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Profil-Informationen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">User ID:</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{selectedUser.user_id.slice(0, 8)}...</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Registriert:</span>
                          <span>{format(new Date(selectedUser.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Skill Level:</span>
                          <span>{selectedUser.skill_self_rating || 0}/10</span>
                          {userDetails?.skillStats?.skill_level && (
                            <Badge variant="outline" className="ml-1">
                              AI: {userDetails.skillStats.skill_level}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Alter:</span>
                          <span>{selectedUser.age || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Referral Code:</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{selectedUser.referral_code || "-"}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Lifetime Credits:</span>
                          <span className="font-medium">{selectedUser.wallet?.lifetime_credits || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Verification Status */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Verifizierungsstatus</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          {selectedUser.email_verified_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">E-Mail</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedUser.phone_verified_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Telefon</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedUser.profile_completed_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Profil vollständig</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Address */}
                  {selectedUser.shipping_address_line1 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Lieferadresse
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p>{selectedUser.shipping_address_line1}</p>
                        <p>{selectedUser.shipping_postal_code} {selectedUser.shipping_city}</p>
                        <p>{selectedUser.shipping_country}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Matches Tab */}
                <TabsContent value="matches" className="space-y-4">
                  {isLoadingDetails ? (
                    <p className="text-muted-foreground text-center py-8">Laden...</p>
                  ) : userDetails?.matches && userDetails.matches.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.matches.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <Gamepad2 className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Match #{match.match_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(match.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {match.result && (
                              <Badge
                                className={
                                  match.result === "WIN"
                                    ? "bg-green-500/20 text-green-500"
                                    : match.result === "LOSS"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {match.result}
                              </Badge>
                            )}
                            {match.ai_score !== null && (
                              <span className="text-xs text-muted-foreground">
                                AI: {match.ai_score}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-amber-500">
                              <Coins className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">+{match.credits_awarded}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Keine Matches</p>
                  )}
                </TabsContent>

                {/* Bookings Tab */}
                <TabsContent value="bookings" className="space-y-4">
                  {isLoadingDetails ? (
                    <p className="text-muted-foreground text-center py-8">Laden...</p>
                  ) : userDetails?.bookings && userDetails.bookings.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.bookings.map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {booking.courts?.name} @ {booking.locations?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.start_time), "dd.MM.yyyy HH:mm", { locale: de })}
                                {" - "}
                                {format(new Date(booking.end_time), "HH:mm", { locale: de })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {booking.price_cents && (
                              <span className="text-sm font-medium">
                                {(booking.price_cents / 100).toFixed(2)} €
                              </span>
                            )}
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Keine Buchungen</p>
                  )}
                </TabsContent>

                {/* Wallet Tab */}
                <TabsContent value="wallet" className="space-y-4">
                  {/* Wallet Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Reward Credits</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-500">
                        {selectedUser.wallet?.reward_credits || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Gamepad2 className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Play Credits</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedUser.wallet?.play_credits || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Lifetime</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedUser.wallet?.lifetime_credits || 0}
                      </p>
                    </div>
                  </div>

                  {/* Ledger */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Transaktionshistorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingDetails ? (
                        <p className="text-muted-foreground text-center py-4">Laden...</p>
                      ) : userDetails?.ledger && userDetails.ledger.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {userDetails.ledger.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-2 bg-background rounded border border-border"
                            >
                              <div className="flex items-center gap-3">
                                {entry.delta_points > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                )}
                                <div>
                                  <p className="text-sm text-foreground">
                                    {entry.description || entry.entry_type}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(entry.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                                    {" · "}
                                    <Badge variant="outline" className="text-[10px] px-1">
                                      {entry.credit_type}
                                    </Badge>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-medium ${
                                    entry.delta_points > 0 ? "text-green-500" : "text-destructive"
                                  }`}
                                >
                                  {entry.delta_points > 0 ? "+" : ""}
                                  {entry.delta_points}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  → {entry.balance_after}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Keine Transaktionen</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => selectedUser && openDeleteDialog(selectedUser)}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Benutzer löschen
            </Button>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Benutzer endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Du bist dabei, den Benutzer{" "}
                <strong className="text-foreground">
                  {userToDelete?.display_name || userToDelete?.username || "Unbekannt"}
                </strong>{" "}
                zu löschen.
              </p>
              <p className="text-destructive">
                Diese Aktion ist unwiderruflich! Folgende Daten werden gelöscht:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Profil und Kontodaten</li>
                <li>Wallet und alle Credits</li>
                <li>Alle Buchungen und Zahlungen</li>
                <li>Alle Matches und Analysen</li>
                <li>Alle Rewards und Transaktionen</li>
                <li>Benachrichtigungen und Streaks</li>
              </ul>
              <div className="pt-4">
                <p className="text-sm mb-2">
                  Gib <strong className="text-destructive">DELETE</strong> ein, um zu bestätigen:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="bg-background border-border"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Lösche..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

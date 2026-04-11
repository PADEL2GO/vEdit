import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Send, Users, User, X, Check, ChevronsUpDown, Link, Megaphone, Clock, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

interface Broadcast {
  id: string;
  admin_user_id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  target_type: string;
  target_user_ids: string[] | null;
  recipients_count: number;
  created_at: string;
  expires_at: string | null;
  updated_at: string | null;
}

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [hasCta, setHasCta] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editHasCta, setEditHasCta] = useState(false);
  const [editCtaLabel, setEditCtaLabel] = useState("");
  const [editCtaUrl, setEditCtaUrl] = useState("");
  const [editHasExpiry, setEditHasExpiry] = useState(false);
  const [editExpiresAt, setEditExpiresAt] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBroadcast, setDeletingBroadcast] = useState<Broadcast | null>(null);

  // Fetch all profiles for user selection
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch broadcast history
  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Broadcast[];
    },
  });

  // Count of all users
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Send broadcast mutation
  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-notifications-api", {
        body: {
          action: "send_broadcast",
          title,
          message,
          target_type: targetType,
          target_user_ids: targetType === "specific" ? selectedUsers.map(u => u.user_id) : null,
          cta_label: hasCta && ctaLabel ? ctaLabel : null,
          cta_url: hasCta && ctaUrl ? ctaUrl : null,
          expires_at: hasExpiry && expiresAt ? new Date(expiresAt).toISOString() : null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Mitteilung an ${data.recipients_count} Benutzer gesendet`);
      queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      // Reset form
      setTitle("");
      setMessage("");
      setTargetType("all");
      setSelectedUsers([]);
      setHasCta(false);
      setCtaLabel("");
      setCtaUrl("");
      setHasExpiry(false);
      setExpiresAt("");
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Update broadcast mutation
  const updateBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (!editingBroadcast) throw new Error("No broadcast selected");
      const { error } = await supabase.functions.invoke("admin-notifications-api", {
        body: {
          action: "update_broadcast",
          broadcast_id: editingBroadcast.id,
          title: editTitle,
          message: editMessage,
          cta_label: editHasCta && editCtaLabel ? editCtaLabel : null,
          cta_url: editHasCta && editCtaUrl ? editCtaUrl : null,
          expires_at: editHasExpiry && editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mitteilung aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      setEditDialogOpen(false);
      setEditingBroadcast(null);
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Delete broadcast mutation
  const deleteBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (!deletingBroadcast) throw new Error("No broadcast selected");
      const { error } = await supabase.functions.invoke("admin-notifications-api", {
        body: {
          action: "delete_broadcast",
          broadcast_id: deletingBroadcast.id,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mitteilung gelöscht");
      queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      setDeleteDialogOpen(false);
      setDeletingBroadcast(null);
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Bitte Titel und Nachricht ausfüllen");
      return;
    }
    if (targetType === "specific" && selectedUsers.length === 0) {
      toast.error("Bitte mindestens einen Benutzer auswählen");
      return;
    }
    if (hasCta && (!ctaLabel.trim() || !ctaUrl.trim())) {
      toast.error("Bitte Button-Text und URL ausfüllen");
      return;
    }
    if (hasExpiry && !expiresAt) {
      toast.error("Bitte Ablaufdatum auswählen");
      return;
    }
    sendBroadcastMutation.mutate();
  };

  const openEditDialog = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setEditTitle(broadcast.title);
    setEditMessage(broadcast.message);
    setEditHasCta(!!broadcast.cta_url);
    setEditCtaLabel(broadcast.cta_label || "");
    setEditCtaUrl(broadcast.cta_url || "");
    setEditHasExpiry(!!broadcast.expires_at);
    setEditExpiresAt(broadcast.expires_at ? format(new Date(broadcast.expires_at), "yyyy-MM-dd'T'HH:mm") : "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (broadcast: Broadcast) => {
    setDeletingBroadcast(broadcast);
    setDeleteDialogOpen(true);
  };

  const filteredProfiles = profiles.filter((p) => {
    const search = searchQuery.toLowerCase();
    const name = (p.display_name || "").toLowerCase();
    const username = (p.username || "").toLowerCase();
    return name.includes(search) || username.includes(search);
  });

  const toggleUser = (profile: Profile) => {
    const isSelected = selectedUsers.some((u) => u.user_id === profile.user_id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.user_id !== profile.user_id));
    } else {
      setSelectedUsers([...selectedUsers, profile]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== userId));
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mitteilungen</h1>
          <p className="text-muted-foreground">
            Sende individuelle Mitteilungen an Benutzer
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Notification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Neue Mitteilung erstellen
              </CardTitle>
              <CardDescription>
                Erstelle eine Benachrichtigung für alle oder ausgewählte Benutzer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  placeholder="z.B. Neues Event in deiner Nähe!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Nachricht *</Label>
                <Textarea
                  id="message"
                  placeholder="Schreibe hier deine Nachricht..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Empfänger</Label>
                <RadioGroup
                  value={targetType}
                  onValueChange={(v) => setTargetType(v as "all" | "specific")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Alle Benutzer ({totalUsers})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Bestimmte Benutzer
                    </Label>
                  </div>
                </RadioGroup>

                {targetType === "specific" && (
                  <div className="space-y-2 pl-6">
                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userSearchOpen}
                          className="w-full justify-between"
                        >
                          Benutzer auswählen...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Suche nach Name oder Username..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>Keine Benutzer gefunden.</CommandEmpty>
                            <CommandGroup>
                              {filteredProfiles.slice(0, 20).map((profile) => {
                                const isSelected = selectedUsers.some(
                                  (u) => u.user_id === profile.user_id
                                );
                                return (
                                  <CommandItem
                                    key={profile.user_id}
                                    onSelect={() => toggleUser(profile)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span>
                                      {profile.display_name || profile.username || "Unbekannt"}
                                    </span>
                                    {profile.username && (
                                      <span className="ml-2 text-muted-foreground">
                                        @{profile.username}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((user) => (
                          <Badge
                            key={user.user_id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {user.display_name || user.username || "Unbekannt"}
                            <button
                              type="button"
                              onClick={() => removeUser(user.user_id)}
                              className="ml-1 rounded-full hover:bg-muted"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expiry"
                    checked={hasExpiry}
                    onCheckedChange={(checked) => setHasExpiry(checked === true)}
                  />
                  <Label htmlFor="expiry" className="flex items-center gap-2 cursor-pointer">
                    <Clock className="h-4 w-4" />
                    Zeitlich begrenzt anzeigen
                  </Label>
                </div>

                {hasExpiry && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="expiresAt">Läuft ab am</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cta"
                    checked={hasCta}
                    onCheckedChange={(checked) => setHasCta(checked === true)}
                  />
                  <Label htmlFor="cta" className="flex items-center gap-2 cursor-pointer">
                    <Link className="h-4 w-4" />
                    CTA-Button hinzufügen
                  </Label>
                </div>

                {hasCta && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="ctaLabel">Button-Text</Label>
                      <Input
                        id="ctaLabel"
                        placeholder="z.B. Jetzt Tickets sichern"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaUrl">Button-URL</Label>
                      <Input
                        id="ctaUrl"
                        placeholder="https://..."
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSend}
                disabled={sendBroadcastMutation.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendBroadcastMutation.isPending ? "Wird gesendet..." : "Mitteilung senden"}
              </Button>
            </CardContent>
          </Card>

          {/* Broadcast History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Gesendete Mitteilungen</CardTitle>
              <CardDescription>Verlauf der letzten 50 Mitteilungen</CardDescription>
            </CardHeader>
            <CardContent>
              {broadcastsLoading ? (
                <p className="text-muted-foreground text-center py-8">Laden...</p>
              ) : broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Mitteilungen gesendet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Empfänger</TableHead>
                        <TableHead>Läuft ab</TableHead>
                        <TableHead className="w-[100px]">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {broadcasts.map((broadcast) => (
                        <TableRow key={broadcast.id} className={isExpired(broadcast.expires_at) ? "opacity-50" : ""}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(broadcast.created_at), "dd.MM.yy HH:mm", {
                              locale: de,
                            })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {broadcast.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {broadcast.target_type === "all"
                                ? `Alle (${broadcast.recipients_count})`
                                : `${broadcast.recipients_count} User`}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {broadcast.expires_at ? (
                              <span className={cn(
                                "text-sm",
                                isExpired(broadcast.expires_at) ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {format(new Date(broadcast.expires_at), "dd.MM.yy HH:mm", { locale: de })}
                                {isExpired(broadcast.expires_at) && " (abgelaufen)"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(broadcast)}
                                title="Bearbeiten"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(broadcast)}
                                title="Löschen"
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mitteilung bearbeiten</DialogTitle>
            <DialogDescription>
              Änderungen werden für alle Empfänger sichtbar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Titel</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editMessage">Nachricht</Label>
              <Textarea
                id="editMessage"
                rows={4}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editExpiry"
                  checked={editHasExpiry}
                  onCheckedChange={(checked) => setEditHasExpiry(checked === true)}
                />
                <Label htmlFor="editExpiry" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4" />
                  Zeitlich begrenzt anzeigen
                </Label>
              </div>

              {editHasExpiry && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="editExpiresAt">Läuft ab am</Label>
                  <Input
                    id="editExpiresAt"
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editCta"
                  checked={editHasCta}
                  onCheckedChange={(checked) => setEditHasCta(checked === true)}
                />
                <Label htmlFor="editCta" className="flex items-center gap-2 cursor-pointer">
                  <Link className="h-4 w-4" />
                  CTA-Button
                </Label>
              </div>

              {editHasCta && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="editCtaLabel">Button-Text</Label>
                    <Input
                      id="editCtaLabel"
                      value={editCtaLabel}
                      onChange={(e) => setEditCtaLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCtaUrl">Button-URL</Label>
                    <Input
                      id="editCtaUrl"
                      value={editCtaUrl}
                      onChange={(e) => setEditCtaUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => updateBroadcastMutation.mutate()}
              disabled={updateBroadcastMutation.isPending}
            >
              {updateBroadcastMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitteilung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Mitteilung wird für alle {deletingBroadcast?.recipients_count} Empfänger unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBroadcastMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBroadcastMutation.isPending}
            >
              {deleteBroadcastMutation.isPending ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

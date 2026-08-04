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
import { Card } from "@/components/ui/card";
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
import { Send, Users, User, X, Check, ChevronsUpDown, Link, Megaphone, Clock, Pencil, Trash2, AlertTriangle } from "lucide-react";
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

  const fieldLabelClass = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
  const fieldInputClass = "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]";

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="text-sm text-muted-foreground">
          In-App-Broadcasts an alle oder ausgewählte Benutzer senden.
        </p>

        <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Create Notification Card */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">
                    Neue Mitteilung erstellen
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    Erstelle eine Benachrichtigung für alle oder ausgewählte Benutzer
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="title" className={fieldLabelClass}>
                  Titel<span className="text-primary"> *</span>
                </Label>
                <Input
                  id="title"
                  placeholder="z.B. Neues Event in deiner Nähe!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={fieldInputClass}
                />
              </div>

              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="message" className={fieldLabelClass}>
                  Nachricht<span className="text-primary"> *</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Schreibe hier deine Nachricht..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-[1.55]"
                />
              </div>

              <div className="flex flex-col gap-[9px]">
                <span className={fieldLabelClass}>Empfänger</span>
                <RadioGroup
                  value={targetType}
                  onValueChange={(v) => setTargetType(v as "all" | "specific")}
                  className="gap-2"
                >
                  <Label
                    htmlFor="all"
                    className={cn(
                      "flex cursor-pointer items-center gap-[11px] rounded-xl border px-[13px] py-3 transition-colors",
                      targetType === "all"
                        ? "border-primary/[0.45] bg-primary/[0.07]"
                        : "border-[hsl(0_0%_13%)] bg-white/[0.028] hover:border-[hsl(0_0%_20%)]"
                    )}
                  >
                    <RadioGroupItem
                      value="all"
                      id="all"
                      className="h-[17px] w-[17px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                    />
                    <Users className="h-4 w-4 flex-none text-muted-foreground" />
                    <span className="text-[13.5px] font-semibold text-foreground">
                      Alle Benutzer ({totalUsers.toLocaleString("de-DE")})
                    </span>
                  </Label>
                  <Label
                    htmlFor="specific"
                    className={cn(
                      "flex cursor-pointer items-center gap-[11px] rounded-xl border px-[13px] py-3 transition-colors",
                      targetType === "specific"
                        ? "border-primary/[0.45] bg-primary/[0.07]"
                        : "border-[hsl(0_0%_13%)] bg-white/[0.028] hover:border-[hsl(0_0%_20%)]"
                    )}
                  >
                    <RadioGroupItem
                      value="specific"
                      id="specific"
                      className="h-[17px] w-[17px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                    />
                    <User className="h-4 w-4 flex-none text-muted-foreground" />
                    <span className="text-[13.5px] font-semibold text-foreground">
                      Bestimmte Benutzer
                    </span>
                  </Label>
                </RadioGroup>

                {targetType === "specific" && (
                  <div className="flex flex-col gap-2.5 rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.025] p-[15px]">
                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userSearchOpen}
                          className="h-[38px] w-full justify-between rounded-[10px] border-[hsl(0_0%_16%)] bg-white/[0.05] px-3 text-[13px] font-normal text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                        >
                          Benutzer auswählen...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-full rounded-xl border-[hsl(0_0%_15%)] p-0"
                        align="start"
                      >
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
                                    className="text-[13px]"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 text-primary",
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
                      <div className="flex flex-wrap gap-[7px]">
                        {selectedUsers.map((user) => (
                          <Badge
                            key={user.user_id}
                            variant="outline"
                            className="gap-[7px] whitespace-nowrap rounded-full border-primary/[0.32] bg-primary/10 px-[11px] py-[5px] text-xs font-semibold text-primary"
                          >
                            {user.display_name || user.username || "Unbekannt"}
                            <button
                              type="button"
                              onClick={() => removeUser(user.user_id)}
                              className="flex text-primary/70 transition-colors hover:text-primary"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <span className="text-[11.5px] text-muted-foreground">
                      Max. 20 Treffer je Suche.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-[11px] border-t border-[hsl(0_0%_12%)] pt-3.5">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="expiry"
                    checked={hasExpiry}
                    onCheckedChange={(checked) => setHasExpiry(checked === true)}
                    className="h-[18px] w-[18px] rounded-[5px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="expiry"
                    className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-foreground"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Zeitlich begrenzt anzeigen
                  </Label>
                </div>

                {hasExpiry && (
                  <div className="flex flex-col gap-[7px]">
                    <Label htmlFor="expiresAt" className={fieldLabelClass}>
                      Läuft ab am<span className="text-primary"> *</span>
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                      className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-[13px]"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="cta"
                    checked={hasCta}
                    onCheckedChange={(checked) => setHasCta(checked === true)}
                    className="h-[18px] w-[18px] rounded-[5px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="cta"
                    className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-foreground"
                  >
                    <Link className="h-4 w-4 text-muted-foreground" />
                    CTA-Button hinzufügen
                  </Label>
                </div>

                {hasCta && (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-[11px]">
                    <div className="flex flex-col gap-[7px]">
                      <Label htmlFor="ctaLabel" className={fieldLabelClass}>
                        Button-Text<span className="text-primary"> *</span>
                      </Label>
                      <Input
                        id="ctaLabel"
                        placeholder="z.B. Jetzt Tickets sichern"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-[7px]">
                      <Label htmlFor="ctaUrl" className={fieldLabelClass}>
                        Button-URL<span className="text-primary"> *</span>
                      </Label>
                      <Input
                        id="ctaUrl"
                        placeholder="https://..."
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSend}
                disabled={sendBroadcastMutation.isPending}
                className="h-11 w-full gap-2 rounded-xl bg-gradient-lime text-sm font-bold text-primary-foreground shadow-[0_0_24px_hsl(71_91%_51%/0.28)] hover:opacity-90"
              >
                <Send className="h-4 w-4" />
                {sendBroadcastMutation.isPending ? "Wird gesendet..." : "Mitteilung senden"}
              </Button>
            </div>
          </Card>

          {/* Broadcast History Card */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-[3px]">
                <span className="font-display text-base font-bold tracking-tight text-foreground">
                  Gesendete Mitteilungen
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  Verlauf der letzten 50 Mitteilungen
                </span>
              </div>

              {broadcastsLoading ? (
                <p className="py-8 text-center text-[13.5px] text-muted-foreground">Laden...</p>
              ) : broadcasts.length === 0 ? (
                <p className="py-8 text-center text-[13.5px] text-muted-foreground">
                  Noch keine Mitteilungen gesendet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow className="border-[hsl(0_0%_12%)] hover:bg-transparent">
                        <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                          Datum
                        </TableHead>
                        <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                          Titel
                        </TableHead>
                        <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                          Empfänger
                        </TableHead>
                        <TableHead className="h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                          Läuft ab
                        </TableHead>
                        <TableHead className="h-auto whitespace-nowrap px-0 pb-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]">
                          Aktionen
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {broadcasts.map((broadcast) => (
                        <TableRow
                          key={broadcast.id}
                          className={cn(
                            "border-[hsl(0_0%_12%)] hover:bg-white/[0.02]",
                            isExpired(broadcast.expires_at) && "opacity-55"
                          )}
                        >
                          <TableCell className="whitespace-nowrap px-0 py-3 pr-3.5 font-mono text-xs text-[hsl(0_0%_78%)]">
                            {format(new Date(broadcast.created_at), "dd.MM.yy HH:mm", {
                              locale: de,
                            })}
                          </TableCell>
                          <TableCell className="px-0 py-3 pr-3.5">
                            <span className="block max-w-[200px] truncate text-[13px] font-semibold text-foreground">
                              {broadcast.title}
                            </span>
                          </TableCell>
                          <TableCell className="px-0 py-3 pr-3.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
                                broadcast.target_type === "all"
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] text-[#7FD4FF]"
                              )}
                            >
                              {broadcast.target_type === "all"
                                ? `Alle (${broadcast.recipients_count.toLocaleString("de-DE")})`
                                : `${broadcast.recipients_count.toLocaleString("de-DE")} User`}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-0 py-3 pr-3.5">
                            {broadcast.expires_at ? (
                              <span
                                className={cn(
                                  "font-mono text-[11.5px]",
                                  isExpired(broadcast.expires_at)
                                    ? "text-[#FF6B6B]"
                                    : "text-[hsl(0_0%_72%)]"
                                )}
                              >
                                {format(new Date(broadcast.expires_at), "dd.MM.yy HH:mm", { locale: de })}
                                {isExpired(broadcast.expires_at) && " (abgelaufen)"}
                              </span>
                            ) : (
                              <span className="font-mono text-[11.5px] text-[hsl(0_0%_72%)]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-0 py-3 text-right">
                            <div className="flex items-center justify-end gap-[7px]">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_82%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                                onClick={() => openEditDialog(broadcast)}
                                title="Bearbeiten"
                              >
                                <Pencil className="h-[13px] w-[13px]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                                onClick={() => openDeleteDialog(broadcast)}
                                title="Löschen"
                              >
                                <Trash2 className="h-[13px] w-[13px]" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[88vh] gap-[17px] overflow-y-auto rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[520px] sm:rounded-[20px]">
          <DialogHeader className="space-y-[5px] text-left">
            <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
              Mitteilung bearbeiten
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#FFC44D]">
              Änderungen werden für alle Empfänger sichtbar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="editTitle" className={fieldLabelClass}>
                Titel
              </Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={fieldInputClass}
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="editMessage" className={fieldLabelClass}>
                Nachricht
              </Label>
              <Textarea
                id="editMessage"
                rows={4}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-[1.55]"
              />
            </div>

            <div className="flex flex-col gap-[11px] border-t border-[hsl(0_0%_12%)] pt-3.5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="editExpiry"
                  checked={editHasExpiry}
                  onCheckedChange={(checked) => setEditHasExpiry(checked === true)}
                  className="h-[18px] w-[18px] rounded-[5px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="editExpiry"
                  className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-foreground"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Zeitlich begrenzt anzeigen
                </Label>
              </div>

              {editHasExpiry && (
                <div className="flex flex-col gap-[7px]">
                  <Label htmlFor="editExpiresAt" className={fieldLabelClass}>
                    Läuft ab am
                  </Label>
                  <Input
                    id="editExpiresAt"
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-[13px]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="editCta"
                  checked={editHasCta}
                  onCheckedChange={(checked) => setEditHasCta(checked === true)}
                  className="h-[18px] w-[18px] rounded-[5px] border-[hsl(0_0%_35%)] data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="editCta"
                  className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-foreground"
                >
                  <Link className="h-4 w-4 text-muted-foreground" />
                  CTA-Button
                </Label>
              </div>

              {editHasCta && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-[11px]">
                  <div className="flex flex-col gap-[7px]">
                    <Label htmlFor="editCtaLabel" className={fieldLabelClass}>
                      Button-Text
                    </Label>
                    <Input
                      id="editCtaLabel"
                      value={editCtaLabel}
                      onChange={(e) => setEditCtaLabel(e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <Label htmlFor="editCtaUrl" className={fieldLabelClass}>
                      Button-URL
                    </Label>
                    <Input
                      id="editCtaUrl"
                      value={editCtaUrl}
                      onChange={(e) => setEditCtaUrl(e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2.5 border-t border-[hsl(0_0%_12%)] pt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="h-[42px] rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => updateBroadcastMutation.mutate()}
              disabled={updateBroadcastMutation.isPending}
              className="h-[42px] rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] hover:opacity-90"
            >
              {updateBroadcastMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="gap-4 rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[440px] sm:rounded-[20px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <AlertDialogHeader className="space-y-[7px] text-left">
            <AlertDialogTitle className="font-display text-[19px] font-extrabold tracking-tight text-foreground">
              Mitteilung löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-[1.55] text-[hsl(0_0%_68%)]">
              Diese Mitteilung wird für alle {deletingBroadcast?.recipients_count} Empfänger unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-4 text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBroadcastMutation.mutate()}
              className="h-10 rounded-[11px] bg-[#FF6B6B] px-[18px] text-[13.5px] font-bold text-[#0A0A0A] hover:bg-[#ff8585]"
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

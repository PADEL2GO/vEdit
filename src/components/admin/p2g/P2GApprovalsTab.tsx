import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Instagram,
  Clock,
  ExternalLink,
  User,
  AlertCircle,
  CheckCheck,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface PendingReward {
  id: string;
  user_id: string;
  definition_key: string;
  points: number;
  source_type: string;
  metadata: {
    instagramHandle?: string;
    postUrl?: string;
    submittedAt?: string;
  };
  created_at: string;
  reward_definitions?: {
    title: string;
    description: string;
    category: string;
    approval_required?: boolean;
    awarding_mode?: string;
  };
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  _inconsistent?: boolean;
}

export function P2GApprovalsTab() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "list_pending_approvals" },
      });
      if (error) throw error;
      return data.rewards as PendingReward[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (rewardInstanceId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "approve_reward", rewardInstanceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reward freigegeben");
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-credit-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Freigeben", { description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ rewardInstanceId, reason }: { rewardInstanceId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "reject_reward", rewardInstanceId, reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reward abgelehnt");
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Ablehnen", { description: error.message });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (rewardInstanceIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "bulk_approve_rewards", rewardInstanceIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success(`${result.approved} Rewards freigegeben`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-credit-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Bulk-Freigeben", { description: error.message });
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ rewardInstanceIds, reason }: { rewardInstanceIds: string[]; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "bulk_reject_rewards", rewardInstanceIds, reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success(`${result.rejected} Rewards abgelehnt`);
      setSelectedIds(new Set());
      setBulkRejectDialogOpen(false);
      setBulkRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Bulk-Ablehnen", { description: error.message });
    },
  });

  const handleReject = () => {
    if (rejectingId) {
      rejectMutation.mutate({ rewardInstanceId: rejectingId, reason: rejectReason });
    }
  };

  const handleBulkReject = () => {
    if (selectedIds.size > 0) {
      bulkRejectMutation.mutate({ 
        rewardInstanceIds: Array.from(selectedIds), 
        reason: bulkRejectReason 
      });
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size > 0) {
      bulkApproveMutation.mutate(Array.from(selectedIds));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (data && selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else if (data) {
      setSelectedIds(new Set(data.map(r => r.id)));
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "instagram":
        return <Instagram className="w-4 h-4 text-pink-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const isBulkActionPending = bulkApproveMutation.isPending || bulkRejectMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Info Note */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Freigaben</strong> = Rewards, die manuell geprüft werden müssen (z.B. Instagram-Tags). 
            <strong> Gesperrt</strong> = Lock-Policy, wird automatisch aktiv (z.B. nach Buchungsabschluss).
          </span>
        </p>
      </div>

      {/* Stats */}
      <Card className="bg-yellow-500/10 border-yellow-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-3xl font-bold">{data?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Ausstehende Freigaben</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {data && data.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.size === data.length && data.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {selectedIds.size === data.length ? "Alle abwählen" : "Alle auswählen"}
                </label>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedIds.size} ausgewählt
                  </Badge>
                )}
              </div>
              
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkRejectDialogOpen(true)}
                    disabled={isBulkActionPending}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {selectedIds.size} ablehnen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={isBulkActionPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {bulkApproveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4 mr-1" />
                    )}
                    {selectedIds.size} freigeben
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Ausstehende Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
              <p>Keine ausstehenden Freigaben</p>
              <p className="text-xs mt-1">Alle Rewards mit manueller Prüfung wurden bearbeitet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((reward) => (
                <div
                  key={reward.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${
                    selectedIds.has(reward.id) 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border/50 bg-card/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.has(reward.id)}
                      onCheckedChange={() => toggleSelection(reward.id)}
                      className="mt-3"
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reward.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {reward.profile?.display_name || reward.profile?.username || "Unbekannt"}
                        </span>
                        {reward.profile?.username && (
                          <span className="text-sm text-muted-foreground">
                            @{reward.profile.username}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSourceIcon(reward.source_type)}
                        <Badge variant="outline" className="text-xs">
                          {reward.reward_definitions?.title || reward.definition_key}
                        </Badge>
                        <span className="text-primary font-semibold">
                          +{reward.points} Credits
                        </span>
                        {reward._inconsistent && (
                          <Badge variant="destructive" className="text-xs">
                            Status inkonsistent
                          </Badge>
                        )}
                      </div>
                      
                      {/* Instagram Details */}
                      {reward.source_type === "instagram" && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2">
                          {reward.metadata?.instagramHandle && (
                            <span className="flex items-center gap-1">
                              <Instagram className="w-3 h-3" />
                              {reward.metadata.instagramHandle}
                            </span>
                          )}
                          {reward.metadata?.postUrl && (
                            <a
                              href={reward.metadata.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Post ansehen
                            </a>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Eingereicht: {format(new Date(reward.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectingId(reward.id);
                        setRejectReason("");
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending || isBulkActionPending}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Ablehnen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(reward.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending || isBulkActionPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                      )}
                      Freigeben
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Reward ablehnen
            </DialogTitle>
            <DialogDescription>
              Bitte gib einen Grund für die Ablehnung an. Der Nutzer wird benachrichtigt.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Grund für Ablehnung (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {selectedIds.size} Rewards ablehnen
            </DialogTitle>
            <DialogDescription>
              Du bist dabei, {selectedIds.size} Rewards abzulehnen. Alle Nutzer werden benachrichtigt.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Grund für Ablehnung (gilt für alle, optional)"
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            rows={3}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={bulkRejectMutation.isPending}
            >
              {bulkRejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              {selectedIds.size} ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
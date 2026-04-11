import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface WalletWithProfile {
  user_id: string;
  play_credits: number;
  reward_credits: number;
  lifetime_credits: number;
  updated_at: string;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface LedgerEntry {
  id: string;
  delta_points: number;
  entry_type: string;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export function P2GWalletsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"reward" | "play">("reward");
  const [adjustMode, setAdjustMode] = useState<"add" | "subtract">("add");
  const queryClient = useQueryClient();

  // Fetch all wallets
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async (): Promise<WalletWithProfile[]> => {
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "list_wallets" },
      });
      if (error) throw error;
      return data.wallets;
    },
  });

  // Fetch selected user details
  const { data: userDetails, isLoading: userDetailsLoading } = useQuery({
    queryKey: ["admin-wallet-details", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: { action: "get_wallet", userId: selectedUserId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  // Adjust credits mutation
  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("No user selected");
      const amount = parseInt(adjustAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      
      const finalAmount = adjustMode === "subtract" ? -amount : amount;
      
      const { data, error } = await supabase.functions.invoke("admin-credits", {
        body: {
          action: "adjust_credits",
          userId: selectedUserId,
          amount: finalAmount,
          reason: adjustReason,
          creditType: adjustType,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Credits erfolgreich angepasst");
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-details", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-credit-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Filter wallets
  const filteredWallets = wallets?.filter((wallet) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      wallet.profile?.display_name?.toLowerCase().includes(searchLower) ||
      wallet.profile?.username?.toLowerCase().includes(searchLower) ||
      wallet.user_id.toLowerCase().includes(searchLower)
    );
  });

  const openAdjustDialog = (mode: "add" | "subtract") => {
    setAdjustMode(mode);
    setAdjustDialogOpen(true);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Wallets List */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Benutzer-Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, Username oder ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {walletsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead className="text-right">Reward</TableHead>
                      <TableHead className="text-right">Play</TableHead>
                      <TableHead className="text-right">Lifetime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWallets?.map((wallet) => (
                      <TableRow
                        key={wallet.user_id}
                        className={`cursor-pointer transition-colors ${
                          selectedUserId === wallet.user_id
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedUserId(wallet.user_id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={wallet.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {wallet.profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {wallet.profile?.display_name || "Unbekannt"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {wallet.profile?.username ? `@${wallet.profile.username}` : wallet.user_id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {wallet.reward_credits}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {wallet.play_credits}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {wallet.lifetime_credits}
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

      {/* User Detail Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benutzer Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <p className="text-muted-foreground text-center py-8">
                Wähle einen Benutzer aus der Liste
              </p>
            ) : userDetailsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : userDetails ? (
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={userDetails.profile?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {userDetails.profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {userDetails.profile?.display_name || "Unbekannt"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userDetails.profile?.username ? `@${userDetails.profile.username}` : "Kein Username"}
                    </p>
                  </div>
                </div>

                {/* Wallet Balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Reward Credits</p>
                    <p className="text-xl font-bold">{userDetails.wallet?.reward_credits || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Play Credits</p>
                    <p className="text-xl font-bold">{userDetails.wallet?.play_credits || 0}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => openAdjustDialog("add")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openAdjustDialog("subtract")}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Abziehen
                  </Button>
                </div>

                {/* Recent Ledger */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Letzte Transaktionen</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userDetails.ledger?.map((entry: LedgerEntry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {entry.delta_points > 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {entry.delta_points > 0 ? "+" : ""}{entry.delta_points}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {entry.description || entry.entry_type}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd.MM", { locale: de })}
                        </p>
                      </div>
                    ))}
                    {(!userDetails.ledger || userDetails.ledger.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Keine Transaktionen
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Credits {adjustMode === "add" ? "hinzufügen" : "abziehen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credit-Typ</Label>
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as "reward" | "play")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reward">Reward Credits</SelectItem>
                  <SelectItem value="play">Play Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Betrag</Label>
              <Input
                type="number"
                placeholder="z.B. 100"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Grund (optional)</Label>
              <Textarea
                placeholder="Interner Vermerk..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending || !adjustAmount}
            >
              {adjustMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : adjustMode === "add" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Minus className="w-4 h-4 mr-2" />
              )}
              {adjustMode === "add" ? "Hinzufügen" : "Abziehen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

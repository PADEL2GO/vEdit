import { useState } from "react";
import { Card } from "@/components/ui/card";
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

const TABLE_HEAD_CLASSES =
  "h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]";

const FIELD_LABEL_CLASSES = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const DIALOG_INPUT_CLASSES =
  "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function P2GWalletsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"reward" | "play">("reward");
  const [adjustMode, setAdjustMode] = useState<"add" | "subtract">("add");
  const [valueMode, setValueMode] = useState<"relative" | "set">("relative");
  const [targetValue, setTargetValue] = useState("");
  const [lifetimeValue, setLifetimeValue] = useState("");
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
      if (!adjustReason.trim()) throw new Error("Grund ist erforderlich");

      if (valueMode === "set") {
        const target = parseInt(targetValue);
        if (isNaN(target) || target < 0) throw new Error("Invalid target value");
        const lifetime = lifetimeValue.trim() === "" ? undefined : parseInt(lifetimeValue);
        if (lifetime !== undefined && isNaN(lifetime)) throw new Error("Invalid lifetime value");

        const { data, error } = await supabase.functions.invoke("admin-credits", {
          body: {
            action: "set_credits",
            userId: selectedUserId,
            creditType: adjustType.toUpperCase(),
            targetValue: target,
            lifetimeValue: lifetime,
            reason: adjustReason,
          },
        });
        if (error) throw error;
        return data;
      }

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
      setTargetValue("");
      setLifetimeValue("");
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
    setValueMode("relative");
    setAdjustDialogOpen(true);
  };

  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Wallets List */}
      <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <h2 className="font-display text-base font-bold tracking-tight text-foreground">
              Benutzer-Wallets
            </h2>
            <label className="relative flex min-w-[min(240px,100%)] items-center">
              <Search className="pointer-events-none absolute left-[11px] h-[15px] w-[15px] text-[hsl(0_0%_58%)]" />
              <Input
                placeholder="Name, Username oder ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[38px] w-full rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] pl-9 text-[13.5px]"
              />
            </label>
          </div>

          {walletsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow className="border-[hsl(0_0%_12%)] hover:bg-transparent">
                    <TableHead className={TABLE_HEAD_CLASSES}>Benutzer</TableHead>
                    <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>Reward</TableHead>
                    <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>Play</TableHead>
                    <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>Lifetime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets?.map((wallet) => (
                    <TableRow
                      key={wallet.user_id}
                      className={`cursor-pointer border-[hsl(0_0%_12%)] transition-colors ${
                        selectedUserId === wallet.user_id
                          ? "bg-primary/[0.07] hover:bg-primary/[0.07]"
                          : "hover:bg-white/[0.02]"
                      }`}
                      onClick={() => setSelectedUserId(wallet.user_id)}
                    >
                      <TableCell className="px-0 py-[11px] pr-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-[30px] w-[30px] border border-primary/[0.26]">
                            <AvatarImage src={wallet.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 font-display text-[11px] font-extrabold text-primary">
                              {wallet.profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col gap-px">
                            <span className="whitespace-nowrap text-[13px] font-semibold text-foreground">
                              {wallet.profile?.display_name || "Unbekannt"}
                            </span>
                            <span className="whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
                              {wallet.profile?.username ? `@${wallet.profile.username}` : wallet.user_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-0 py-[11px] pr-4 text-right">
                        <span className="whitespace-nowrap font-mono text-[13px] font-bold text-primary">
                          {wallet.reward_credits.toLocaleString("de-DE")}
                        </span>
                      </TableCell>
                      <TableCell className="px-0 py-[11px] pr-4 text-right">
                        <span className="whitespace-nowrap font-mono text-[12.5px] text-[#7FD4FF]">
                          {wallet.play_credits.toLocaleString("de-DE")}
                        </span>
                      </TableCell>
                      <TableCell className="px-0 py-[11px] pr-4 text-right">
                        <span className="whitespace-nowrap font-mono text-[12.5px] text-muted-foreground">
                          {wallet.lifetime_credits.toLocaleString("de-DE")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWallets?.length === 0 && (
                    <TableRow className="border-[hsl(0_0%_12%)] hover:bg-transparent">
                      <TableCell colSpan={4} className="px-0 py-8 text-center text-[13.5px] text-muted-foreground">
                        Keine Wallets gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* User Detail Panel */}
      <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
        <div className="flex flex-col gap-[18px]">
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">
            Benutzer Details
          </h2>

          {!selectedUserId ? (
            <p className="py-8 text-center text-[13.5px] text-muted-foreground">
              Wähle einen Benutzer aus der Liste
            </p>
          ) : userDetailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userDetails ? (
            <>
              {/* User Info */}
              <div className="flex items-center gap-[13px]">
                <Avatar className="h-[46px] w-[46px]">
                  <AvatarImage src={userDetails.profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-lime font-display text-[15px] font-extrabold text-primary-foreground">
                    {userDetails.profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="font-display text-[17px] font-extrabold leading-tight tracking-tight text-foreground">
                    {userDetails.profile?.display_name || "Unbekannt"}
                  </h3>
                  <p className="font-mono text-[11.5px] text-muted-foreground">
                    {userDetails.profile?.username ? `@${userDetails.profile.username}` : "Kein Username"}
                  </p>
                </div>
              </div>

              {/* Wallet Balances */}
              <div className="grid grid-cols-2 gap-[11px]">
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-primary/[0.26] bg-gradient-to-br from-primary/[0.09] to-primary/[0.02] p-[15px]">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    Reward Credits
                  </p>
                  <p className="font-mono text-2xl font-bold leading-none text-primary">
                    {(userDetails.wallet?.reward_credits || 0).toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-[hsl(200_100%_75%/0.22)] bg-[hsl(200_100%_75%/0.05)] p-[15px]">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    Play Credits
                  </p>
                  <p className="font-mono text-2xl font-bold leading-none text-[#7FD4FF]">
                    {(userDetails.wallet?.play_credits || 0).toLocaleString("de-DE")}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                <Button
                  className="h-10 flex-1 gap-[7px] rounded-[11px] bg-gradient-lime text-[13px] font-bold text-primary-foreground hover:opacity-90"
                  onClick={() => openAdjustDialog("add")}
                >
                  <Plus className="h-[15px] w-[15px]" />
                  Hinzufügen
                </Button>
                <Button
                  variant="outline"
                  className="h-10 flex-1 gap-[7px] rounded-[11px] border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.08)] text-[13px] font-bold text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                  onClick={() => openAdjustDialog("subtract")}
                >
                  <Minus className="h-[15px] w-[15px]" />
                  Abziehen
                </Button>
              </div>

              {/* Recent Ledger */}
              <div className="flex flex-col gap-[11px] border-t border-[hsl(0_0%_12%)] pt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Letzte Transaktionen
                </h4>
                <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                  {userDetails.ledger?.map((entry: LedgerEntry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-[11px] border border-[hsl(0_0%_12%)] bg-white/[0.03] px-3 py-2.5"
                    >
                      <span
                        className={`min-w-[62px] whitespace-nowrap font-mono text-[13px] font-bold ${
                          entry.delta_points > 0 ? "text-primary" : "text-[#FF6B6B]"
                        }`}
                      >
                        {entry.delta_points > 0 ? "+" : ""}
                        {entry.delta_points.toLocaleString("de-DE")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[hsl(0_0%_72%)]">
                        {entry.description || entry.entry_type}
                      </span>
                      <span className="flex-none whitespace-nowrap font-mono text-[11px] text-[hsl(0_0%_58%)]">
                        {format(new Date(entry.created_at), "dd.MM", { locale: de })}
                      </span>
                    </div>
                  ))}
                  {(!userDetails.ledger || userDetails.ledger.length === 0) && (
                    <p className="py-4 text-center text-[13px] text-muted-foreground">
                      Keine Transaktionen
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-h-[88vh] gap-[17px] overflow-y-auto rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[470px] sm:rounded-[20px]">
          <DialogHeader className="space-y-0 text-left">
            <span className="mb-[5px] block font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Wallet
            </span>
            <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
              {valueMode === "set"
                ? "Credits auf Wert setzen"
                : `Credits ${adjustMode === "add" ? "hinzufügen" : "abziehen"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-[17px]">
            <div className="flex flex-col gap-[7px]">
              <Label className={FIELD_LABEL_CLASSES}>Modus</Label>
              <div className="flex gap-[3px] rounded-[11px] border border-[hsl(0_0%_14%)] bg-white/[0.04] p-[3px]">
                <Button
                  type="button"
                  variant="ghost"
                  className={`h-auto flex-1 whitespace-nowrap rounded-lg px-3 py-[7px] text-[12.5px] font-bold ${
                    valueMode === "relative"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-[hsl(0_0%_62%)] hover:bg-white/5 hover:text-foreground"
                  }`}
                  onClick={() => setValueMode("relative")}
                >
                  Anpassen (+/-)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={`h-auto flex-1 whitespace-nowrap rounded-lg px-3 py-[7px] text-[12.5px] font-bold ${
                    valueMode === "set"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-[hsl(0_0%_62%)] hover:bg-white/5 hover:text-foreground"
                  }`}
                  onClick={() => setValueMode("set")}
                >
                  Auf Wert setzen
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <Label className={FIELD_LABEL_CLASSES}>
                Credit-Typ<span className="text-primary"> *</span>
              </Label>
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as "reward" | "play")}
              >
                <SelectTrigger className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reward">Reward Credits</SelectItem>
                  <SelectItem value="play">Play Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {valueMode === "set" ? (
              <>
                <div className="flex flex-col gap-[7px]">
                  <Label className={FIELD_LABEL_CLASSES}>
                    Zielwert<span className="text-primary"> *</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="z.B. 500"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className={DIALOG_INPUT_CLASSES}
                  />
                </div>
                <div className="flex flex-col gap-[7px]">
                  <Label className={FIELD_LABEL_CLASSES}>Lifetime Credits (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Unverändert lassen wenn leer"
                    value={lifetimeValue}
                    onChange={(e) => setLifetimeValue(e.target.value)}
                    className={DIALOG_INPUT_CLASSES}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-[7px]">
                <Label className={FIELD_LABEL_CLASSES}>
                  Betrag<span className="text-primary"> *</span>
                </Label>
                <Input
                  type="number"
                  placeholder="z.B. 100"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className={DIALOG_INPUT_CLASSES}
                />
              </div>
            )}
            <div className="flex flex-col gap-[7px]">
              <Label className={FIELD_LABEL_CLASSES}>
                Grund<span className="text-primary"> *</span>
              </Label>
              <Textarea
                placeholder="Interner Vermerk..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={2}
                className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-normal"
              />
              <p className="text-[11.5px] text-muted-foreground">
                Ohne Grund ist Speichern deaktiviert.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2.5">
            <Button
              variant="outline"
              className="h-[42px] rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
              onClick={() => setAdjustDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => adjustMutation.mutate()}
              disabled={
                adjustMutation.isPending ||
                !adjustReason.trim() ||
                (valueMode === "set" ? !targetValue : !adjustAmount)
              }
              className="h-[42px] gap-2 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] hover:opacity-90"
            >
              {adjustMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : valueMode === "set" ? null : adjustMode === "add" ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {valueMode === "set"
                ? "Wert setzen"
                : adjustMode === "add"
                ? "Hinzufügen"
                : "Abziehen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

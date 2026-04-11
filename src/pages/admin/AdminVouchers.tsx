import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Copy, Ticket, Percent, Euro, Gift } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface VoucherCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;   // 'free' | 'percentage' | 'fixed'
  discount_value: number;  // percentage (1-100) or cents
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function discountBadge(v: VoucherCode) {
  if (v.discount_type === "percentage") {
    return <Badge variant="outline" className="gap-1"><Percent className="h-3 w-3" />{v.discount_value} %</Badge>;
  }
  if (v.discount_type === "fixed") {
    const euros = (v.discount_value / 100).toFixed(2).replace(".", ",");
    return <Badge variant="outline" className="gap-1"><Euro className="h-3 w-3" />{euros} €</Badge>;
  }
  return <Badge variant="outline" className="gap-1"><Gift className="h-3 w-3" />Gratis</Badge>;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AdminVouchers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editVoucher, setEditVoucher] = useState<VoucherCode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"free" | "percentage" | "fixed">("free");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VoucherCode[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (voucher: Partial<VoucherCode>) => {
      const { error } = await supabase.from("voucher_codes").insert({
        code: voucher.code!.toUpperCase(),
        description: voucher.description || null,
        discount_type: voucher.discount_type || "free",
        discount_value: voucher.discount_value || 0,
        is_active: voucher.is_active ?? true,
        max_uses: voucher.max_uses || null,
        valid_from: voucher.valid_from || new Date().toISOString(),
        valid_until: voucher.valid_until || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher erstellt");
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Fehler", { description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (voucher: Partial<VoucherCode> & { id: string }) => {
      const { error } = await supabase
        .from("voucher_codes")
        .update({
          code: voucher.code?.toUpperCase(),
          description: voucher.description,
          discount_type: voucher.discount_type,
          discount_value: voucher.discount_value,
          is_active: voucher.is_active,
          max_uses: voucher.max_uses,
          valid_from: voucher.valid_from,
          valid_until: voucher.valid_until,
        })
        .eq("id", voucher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher aktualisiert");
      setEditVoucher(null);
    },
    onError: (err: Error) => {
      toast.error("Fehler", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voucher_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher gelöscht");
    },
    onError: (err: Error) => {
      toast.error("Fehler", { description: err.message });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("voucher_codes")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
  });

  const resetForm = () => {
    setFormCode("");
    setFormDescription("");
    setFormDiscountType("free");
    setFormDiscountValue("");
    setFormMaxUses("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setFormCode(generateCode());
    setCreateOpen(true);
  };

  const openEdit = (v: VoucherCode) => {
    setEditVoucher(v);
    setFormCode(v.code);
    setFormDescription(v.description || "");
    setFormDiscountType((v.discount_type as "free" | "percentage" | "fixed") || "free");
    setFormDiscountValue(
      v.discount_type === "fixed"
        ? ((v.discount_value || 0) / 100).toFixed(2)
        : v.discount_value?.toString() || ""
    );
    setFormMaxUses(v.max_uses?.toString() || "");
    setFormValidFrom(v.valid_from ? v.valid_from.slice(0, 16) : "");
    setFormValidUntil(v.valid_until ? v.valid_until.slice(0, 16) : "");
    setFormIsActive(v.is_active);
  };

  const parseDiscountValue = (): number => {
    if (formDiscountType === "free") return 0;
    const raw = parseFloat(formDiscountValue || "0");
    if (isNaN(raw) || raw <= 0) return 0;
    if (formDiscountType === "fixed") return Math.round(raw * 100); // euros → cents
    return Math.min(100, Math.round(raw)); // percentage: cap at 100
  };

  const handleCreate = () => {
    if (!formCode.trim()) return toast.error("Code ist erforderlich");
    if (formDiscountType !== "free" && (!formDiscountValue || parseDiscountValue() === 0)) {
      return toast.error("Rabattwert erforderlich");
    }
    createMutation.mutate({
      code: formCode.trim(),
      description: formDescription.trim() || null,
      discount_type: formDiscountType,
      discount_value: parseDiscountValue(),
      max_uses: formMaxUses ? parseInt(formMaxUses) : null,
      valid_from: formValidFrom || new Date().toISOString(),
      valid_until: formValidUntil || null,
      is_active: formIsActive,
    });
  };

  const handleUpdate = () => {
    if (!editVoucher || !formCode.trim()) return;
    if (formDiscountType !== "free" && (!formDiscountValue || parseDiscountValue() === 0)) {
      return toast.error("Rabattwert erforderlich");
    }
    updateMutation.mutate({
      id: editVoucher.id,
      code: formCode.trim(),
      description: formDescription.trim() || null,
      discount_type: formDiscountType,
      discount_value: parseDiscountValue(),
      max_uses: formMaxUses ? parseInt(formMaxUses) : null,
      valid_from: formValidFrom || editVoucher.valid_from,
      valid_until: formValidUntil || null,
      is_active: formIsActive,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code kopiert!");
  };

  const isExpired = (v: VoucherCode) =>
    v.valid_until && new Date(v.valid_until) < new Date();

  const isUsedUp = (v: VoucherCode) =>
    v.max_uses !== null && v.current_uses >= v.max_uses;

  const getStatusBadge = (v: VoucherCode) => {
    if (!v.is_active) return <Badge variant="secondary">Inaktiv</Badge>;
    if (isExpired(v)) return <Badge variant="destructive">Abgelaufen</Badge>;
    if (isUsedUp(v)) return <Badge variant="outline">Aufgebraucht</Badge>;
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aktiv</Badge>;
  };

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Code</Label>
        <div className="flex gap-2">
          <Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="FREEPLAY" />
          <Button type="button" variant="outline" size="sm" onClick={() => setFormCode(generateCode())}>
            Generieren
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Beschreibung (optional)</Label>
        <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="z.B. Promo-Aktion März" />
      </div>

      {/* Discount type + value */}
      <div className="space-y-2">
        <Label>Rabatt-Typ</Label>
        <Select value={formDiscountType} onValueChange={(v) => { setFormDiscountType(v as "free" | "percentage" | "fixed"); setFormDiscountValue(""); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">
              <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Gratis (100 % Rabatt)</span>
            </SelectItem>
            <SelectItem value="percentage">
              <span className="flex items-center gap-2"><Percent className="h-4 w-4" /> Prozentualer Rabatt</span>
            </SelectItem>
            <SelectItem value="fixed">
              <span className="flex items-center gap-2"><Euro className="h-4 w-4" /> Festbetrag-Rabatt</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formDiscountType === "percentage" && (
        <div className="space-y-2">
          <Label>Rabatt in % <span className="text-muted-foreground text-xs">(1–99, für 100 % → Typ "Gratis" wählen)</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type="number" min="1" max="99"
              value={formDiscountValue}
              onChange={(e) => setFormDiscountValue(e.target.value)}
              placeholder="z.B. 20"
              className="w-32"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
      )}

      {formDiscountType === "fixed" && (
        <div className="space-y-2">
          <Label>Rabatt in € <span className="text-muted-foreground text-xs">(wird vom Courtpreis abgezogen)</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type="number" min="0.50" step="0.01"
              value={formDiscountValue}
              onChange={(e) => setFormDiscountValue(e.target.value)}
              placeholder="z.B. 10.00"
              className="w-32"
            />
            <span className="text-muted-foreground">€</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Max. Nutzungen</Label>
        <div className="flex gap-2 items-center">
          <Input type="number" min="1" value={formMaxUses} onChange={(e) => setFormMaxUses(e.target.value)} placeholder="Unbegrenzt" className="w-40" />
          <Button type="button" variant="outline" size="sm" onClick={() => setFormMaxUses("1")}>Einmalig</Button>
        </div>
        <p className="text-xs text-muted-foreground">Leer lassen für unbegrenzte Nutzungen.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gültig ab</Label>
          <Input type="datetime-local" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Gültig bis (optional)</Label>
          <Input type="datetime-local" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
        <Label>Aktiv</Label>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" />
              Voucher Codes
            </h1>
            <p className="text-muted-foreground">Gutscheincodes für kostenlose Buchungen verwalten</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Neuer Voucher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Voucher erstellen</DialogTitle>
              </DialogHeader>
              {formFields}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  Erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Rabatt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nutzungen</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Laden...
                    </TableCell>
                  </TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Noch keine Voucher erstellt
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded">
                            {v.code}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(v.code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {v.description || "–"}
                      </TableCell>
                      <TableCell>{discountBadge(v)}</TableCell>
                      <TableCell>{getStatusBadge(v)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {v.current_uses}/{v.max_uses ?? "∞"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.valid_until
                          ? format(new Date(v.valid_until), "dd.MM.yyyy HH:mm", { locale: de })
                          : "Unbegrenzt"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Switch
                            checked={v.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: v.id, is_active: checked })
                            }
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Voucher löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Der Code <strong>{v.code}</strong> wird unwiderruflich gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(v.id)}>
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editVoucher} onOpenChange={(open) => !open && setEditVoucher(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Voucher bearbeiten</DialogTitle>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

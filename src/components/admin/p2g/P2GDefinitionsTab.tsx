import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Gift, Calendar, Hash, Trophy, Star, Plus, Loader2, Zap, Hand, Percent, Coins, Info } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface PointsRule {
  type: "fixed" | "percentage";
  value: number;
  divisor?: number; // For percentage: 100 = per Euro, 1 = per Cent
}

interface Caps {
  daily?: number;
  monthly?: number;
  total?: number;
}

interface RewardDefinitionRow {
  key: string;
  title: string;
  description: string | null;
  display_rule_text: string | null;
  category: string;
  points_rule: Json;
  caps: Json;
  expiry_days: number | null;
  is_active: boolean | null;
  awarding_mode: string;
  approval_required: boolean;
  created_at: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  engagement: <Star className="h-4 w-4" />,
  social: <Gift className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  referral: <Trophy className="h-4 w-4" />,
};

const CATEGORIES = ["engagement", "social", "booking", "referral"];
const AWARDING_MODES = [
  { value: "AUTO_CLAIM", label: "Automatisch", icon: Zap },
  { value: "USER_CLAIM", label: "Manuell (User klickt)", icon: Hand },
];

const POINTS_RULE_TYPES = [
  { value: "fixed", label: "Fester Betrag", icon: Coins, description: "Feste Anzahl Credits" },
  { value: "percentage", label: "Prozent vom Buchungswert", icon: Percent, description: "% des Buchungsbetrags" },
];

export function P2GDefinitionsTab() {
  const queryClient = useQueryClient();
  const [editingReward, setEditingReward] = useState<RewardDefinitionRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    key: "",
    title: "",
    description: "",
    displayRuleText: "",
    category: "engagement",
    // Points rule fields
    pointsRuleType: "fixed" as "fixed" | "percentage",
    pointsValue: 0,
    pointsDivisor: 100, // Default: per Euro (100 cents)
    // Caps
    dailyCap: "",
    monthlyCap: "",
    totalCap: "",
    expiryDays: "",
    isActive: true,
    awardingMode: "USER_CLAIM",
    approvalRequired: false,
  });

  const { data: definitions, isLoading } = useQuery({
    queryKey: ["admin", "reward-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_definitions")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as RewardDefinitionRow[];
    },
  });

  // Build points_rule based on type
  const buildPointsRule = (): PointsRule => {
    if (formData.pointsRuleType === "percentage") {
      return {
        type: "percentage",
        value: formData.pointsValue,
        divisor: formData.pointsDivisor,
      };
    }
    return {
      type: "fixed",
      value: formData.pointsValue,
    };
  };

  // Calculate example credits for percentage type
  const exampleCredits = useMemo(() => {
    if (formData.pointsRuleType !== "percentage") return null;
    const exampleBookingCents = 4000; // 40€
    const credits = Math.floor((exampleBookingCents * formData.pointsValue) / formData.pointsDivisor / 100);
    return credits;
  }, [formData.pointsRuleType, formData.pointsValue, formData.pointsDivisor]);

  const updateMutation = useMutation({
    mutationFn: async (reward: RewardDefinitionRow) => {
      const caps: Caps = {};
      if (formData.dailyCap) caps.daily = parseInt(formData.dailyCap);
      if (formData.monthlyCap) caps.monthly = parseInt(formData.monthlyCap);
      if (formData.totalCap) caps.total = parseInt(formData.totalCap);

      const pointsRule = buildPointsRule();

      const { error } = await supabase
        .from("reward_definitions")
        .update({
          title: formData.title,
          description: formData.description || null,
          display_rule_text: formData.displayRuleText || null,
          category: formData.category,
          points_rule: pointsRule as unknown as Json,
          caps: Object.keys(caps).length > 0 ? (caps as unknown as Json) : null,
          expiry_days: formData.expiryDays ? parseInt(formData.expiryDays) : null,
          is_active: formData.isActive,
          awarding_mode: formData.awardingMode,
          approval_required: formData.approvalRequired,
        })
        .eq("key", reward.key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reward-definitions"] });
      toast.success("Reward Definition aktualisiert");
      setEditingReward(null);
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const caps: Caps = {};
      if (formData.dailyCap) caps.daily = parseInt(formData.dailyCap);
      if (formData.monthlyCap) caps.monthly = parseInt(formData.monthlyCap);
      if (formData.totalCap) caps.total = parseInt(formData.totalCap);

      const pointsRule = buildPointsRule();

      const { error } = await supabase.from("reward_definitions").insert({
        key: formData.key,
        title: formData.title,
        description: formData.description || null,
        display_rule_text: formData.displayRuleText || null,
        category: formData.category,
        points_rule: pointsRule as unknown as Json,
        caps: Object.keys(caps).length > 0 ? (caps as unknown as Json) : null,
        expiry_days: formData.expiryDays ? parseInt(formData.expiryDays) : null,
        is_active: formData.isActive,
        awarding_mode: formData.awardingMode,
        approval_required: formData.approvalRequired,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reward-definitions"] });
      toast.success("Reward Definition erstellt");
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ key, isActive }: { key: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("reward_definitions")
        .update({ is_active: isActive })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reward-definitions"] });
      toast.success("Status aktualisiert");
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      title: "",
      description: "",
      displayRuleText: "",
      category: "engagement",
      pointsRuleType: "fixed",
      pointsValue: 0,
      pointsDivisor: 100,
      dailyCap: "",
      monthlyCap: "",
      totalCap: "",
      expiryDays: "",
      isActive: true,
      awardingMode: "USER_CLAIM",
      approvalRequired: false,
    });
  };

  const openEditDialog = (reward: RewardDefinitionRow) => {
    setEditingReward(reward);
    const caps = (reward.caps || {}) as Caps;
    const pointsRule = (reward.points_rule || { type: "fixed", value: 0 }) as unknown as PointsRule;
    
    // Determine type - handle legacy "percent" as "percentage"
    let ruleType: "fixed" | "percentage" = "fixed";
    if (pointsRule.type === "percentage" || (pointsRule.type as string) === "percent") {
      ruleType = "percentage";
    }
    
    setFormData({
      key: reward.key,
      title: reward.title,
      description: reward.description || "",
      displayRuleText: reward.display_rule_text || "",
      category: reward.category,
      pointsRuleType: ruleType,
      pointsValue: pointsRule.value || 0,
      pointsDivisor: pointsRule.divisor || 100,
      dailyCap: caps.daily?.toString() || "",
      monthlyCap: caps.monthly?.toString() || "",
      totalCap: caps.total?.toString() || "",
      expiryDays: reward.expiry_days?.toString() || "",
      isActive: reward.is_active ?? true,
      awardingMode: reward.awarding_mode || "USER_CLAIM",
      approvalRequired: reward.approval_required ?? false,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreating(true);
  };

  const formatCaps = (caps: Caps | null) => {
    if (!caps) return "-";
    const parts = [];
    if (caps.daily) parts.push(`${caps.daily}/Tag`);
    if (caps.monthly) parts.push(`${caps.monthly}/Monat`);
    if (caps.total) parts.push(`${caps.total} gesamt`);
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  // Format points display in table
  const formatPointsDisplay = (pointsRule: PointsRule) => {
    if (!pointsRule) return "0";
    if (pointsRule.type === "percentage" || (pointsRule.type as string) === "percent") {
      return `${pointsRule.value}% Payback`;
    }
    return `${pointsRule.value} Credits`;
  };

  const groupedDefinitions = definitions?.reduce((acc, def) => {
    if (!acc[def.category]) acc[def.category] = [];
    acc[def.category].push(def);
    return acc;
  }, {} as Record<string, RewardDefinitionRow[]>);

  const dialogOpen = !!editingReward || isCreating;
  const isEditing = !!editingReward;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reward Definitionen</h2>
          <p className="text-sm text-muted-foreground">Reward-Typen, Punkte und Limits verwalten</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Definition
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDefinitions &&
            Object.entries(groupedDefinitions).map(([category, rewards]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg capitalize">
                    {categoryIcons[category] || <Hash className="h-4 w-4" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead className="text-center">Punkte</TableHead>
                        <TableHead>Modus</TableHead>
                        <TableHead>Limits</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.map((reward) => (
                        <TableRow key={reward.key}>
                          <TableCell className="font-mono text-xs">{reward.key}</TableCell>
                          <TableCell className="font-medium">{reward.title}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="secondary"
                              className={(reward.points_rule as unknown as PointsRule)?.type === "percentage" || ((reward.points_rule as unknown as PointsRule)?.type as string) === "percent"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : ""
                              }
                            >
                              {formatPointsDisplay(reward.points_rule as unknown as PointsRule)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                reward.awarding_mode === "AUTO_CLAIM"
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              }
                            >
                              {reward.awarding_mode === "AUTO_CLAIM" ? (
                                <>
                                  <Zap className="w-3 h-3 mr-1" />
                                  Auto
                                </>
                              ) : (
                                <>
                                  <Hand className="w-3 h-3 mr-1" />
                                  Manuell
                                </>
                              )}
                            </Badge>
                            {reward.approval_required && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                +Prüfung
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatCaps(reward.caps as Caps | null)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={reward.is_active ?? true}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ key: reward.key, isActive: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(reward)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => { setEditingReward(null); setIsCreating(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Reward Definition bearbeiten" : "Neue Reward Definition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key (eindeutig)</Label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
                disabled={isEditing}
                placeholder="z.B. DAILY_LOGIN"
                className={isEditing ? "bg-muted" : ""}
              />
            </div>
            <div>
              <Label>Titel</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Täglicher Login Bonus"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Interne Beschreibung"
              />
            </div>
            <div>
              <Label>Anzeige-Text (Frontend)</Label>
              <Input
                value={formData.displayRuleText}
                onChange={(e) => setFormData({ ...formData, displayRuleText: e.target.value })}
                placeholder="z.B. Einmalig pro Tag"
              />
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Points Rule Section */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <Label className="text-base font-medium flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Credit-Berechnung
              </Label>
              
              <div>
                <Label className="text-sm text-muted-foreground">Berechnungsart</Label>
                <Select
                  value={formData.pointsRuleType}
                  onValueChange={(val: "fixed" | "percentage") => setFormData({ ...formData, pointsRuleType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POINTS_RULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.pointsRuleType === "fixed" ? (
                <div>
                  <Label className="text-sm text-muted-foreground">Credits</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.pointsValue}
                    onChange={(e) => setFormData({ ...formData, pointsValue: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="z.B. 5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Feste Anzahl Credits pro Aktion
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Prozentsatz (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.pointsValue}
                        onChange={(e) => setFormData({ ...formData, pointsValue: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        placeholder="z.B. 10"
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Basis (Divisor)</Label>
                    <Select
                      value={formData.pointsDivisor.toString()}
                      onValueChange={(val) => setFormData({ ...formData, pointsDivisor: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">Pro Euro (÷100)</SelectItem>
                        <SelectItem value="1">Pro Cent (÷1)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Standard: Pro Euro (Buchungsbetrag in Cents ÷ 100)
                    </p>
                  </div>

                  {/* Live Preview */}
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-primary" />
                      <span className="font-medium">Beispielrechnung:</span>
                    </div>
                    <p className="text-sm mt-1">
                      40€ Buchung → <span className="font-bold text-primary">{exampleCredits} Credits</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formel: (4000 Cents × {formData.pointsValue}%) ÷ {formData.pointsDivisor} ÷ 100
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vergabe-Modus</Label>
                <Select
                  value={formData.awardingMode}
                  onValueChange={(val) => setFormData({ ...formData, awardingMode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AWARDING_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          <mode.icon className="w-4 h-4" />
                          {mode.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={formData.approvalRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, approvalRequired: checked })}
                />
                <Label className="mb-0">Admin-Prüfung nötig</Label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Täglich max.</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={formData.dailyCap}
                  onChange={(e) => setFormData({ ...formData, dailyCap: e.target.value })}
                />
              </div>
              <div>
                <Label>Monatlich max.</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={formData.monthlyCap}
                  onChange={(e) => setFormData({ ...formData, monthlyCap: e.target.value })}
                />
              </div>
              <div>
                <Label>Gesamt max.</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={formData.totalCap}
                  onChange={(e) => setFormData({ ...formData, totalCap: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ablauf (Tage)</Label>
                <Input
                  type="number"
                  placeholder="Nie"
                  value={formData.expiryDays}
                  onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label className="mb-0">Aktiv</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingReward(null); setIsCreating(false); }}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (isEditing && editingReward) {
                  updateMutation.mutate(editingReward);
                } else {
                  createMutation.mutate();
                }
              }}
              disabled={updateMutation.isPending || createMutation.isPending || !formData.key || !formData.title}
            >
              {(updateMutation.isPending || createMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

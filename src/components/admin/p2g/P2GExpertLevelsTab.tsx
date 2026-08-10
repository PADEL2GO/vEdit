import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExpertLevel {
  id: number;
  name: string;
  min_points: number;
  max_points: number | null;
  sort_order: number;
  gradient: string | null;
  emoji: string | null;
  description: string | null;
  perks: string[] | null;
  multiplier: number | null;
}

const GRADIENT_OPTIONS = [
  { value: "from-zinc-400 to-zinc-500", label: "Grau", preview: "bg-gradient-to-r from-zinc-400 to-zinc-500" },
  { value: "from-amber-500 to-orange-500", label: "Orange", preview: "bg-gradient-to-r from-amber-500 to-orange-500" },
  { value: "from-blue-400 to-cyan-500", label: "Blau", preview: "bg-gradient-to-r from-blue-400 to-cyan-500" },
  { value: "from-lime-400 to-green-500", label: "Grün", preview: "bg-gradient-to-r from-lime-400 to-green-500" },
  { value: "from-orange-500 to-red-500", label: "Rot-Orange", preview: "bg-gradient-to-r from-orange-500 to-red-500" },
  { value: "from-purple-500 to-pink-500", label: "Lila", preview: "bg-gradient-to-r from-purple-500 to-pink-500" },
  { value: "from-cyan-400 to-violet-500", label: "Cyan-Violett", preview: "bg-gradient-to-r from-cyan-400 to-violet-500" },
  { value: "from-yellow-400 to-lime-400", label: "Gold", preview: "bg-gradient-to-r from-yellow-400 to-lime-400" },
];

const EMOJI_OPTIONS = ["🌱", "🎾", "⚡", "🔥", "💎", "👑", "🏆", "🌟", "✨", "🚀"];

const TABLE_HEAD_CLASSES =
  "h-auto whitespace-nowrap px-0 pb-3 pr-3.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[hsl(0_0%_65%)]";

const FIELD_LABEL_CLASSES = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const FIELD_INPUT_CLASSES = "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]";

const NUMBER_INPUT_CLASSES =
  "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function P2GExpertLevelsTab() {
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<ExpertLevel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    minPoints: 0,
    maxPoints: 0,
    sortOrder: 0,
    multiplier: 1,
    gradient: "",
    emoji: "",
    description: "",
    perks: "",
  });

  const { data: levels, isLoading } = useQuery({
    queryKey: ["admin", "expert-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_levels_config")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as ExpertLevel[];
    },
  });

  const buildPayload = () => {
    const perksArray = formData.perks
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 0);
    return {
      name: formData.name,
      min_points: formData.minPoints,
      max_points: formData.maxPoints || null,
      sort_order: formData.sortOrder,
      multiplier: formData.multiplier,
      gradient: formData.gradient,
      emoji: formData.emoji,
      description: formData.description || null,
      perks: perksArray,
    };
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "expert-levels"] });
    queryClient.invalidateQueries({ queryKey: ["p2g-expert-levels"] });
    queryClient.invalidateQueries({ queryKey: ["expert-levels-config"] });
  };

  const closeDialog = () => { setEditingLevel(null); setIsCreating(false); };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (isCreating) {
        const { error } = await supabase.from("expert_levels_config").insert(buildPayload() as any);
        if (error) throw error;
      } else {
        if (!editingLevel) return;
        const { error } = await supabase
          .from("expert_levels_config")
          .update(buildPayload() as any)
          .eq("id", editingLevel.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(isCreating ? "Expert Level hinzugefügt" : "Expert Level aktualisiert");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("expert_levels_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Expert Level gelöscht");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  const openEditDialog = (level: ExpertLevel) => {
    setIsCreating(false);
    setEditingLevel(level);
    setFormData({
      name: level.name,
      minPoints: level.min_points,
      maxPoints: level.max_points || 0,
      sortOrder: level.sort_order,
      multiplier: level.multiplier ?? 1,
      gradient: level.gradient || "",
      emoji: level.emoji || "",
      description: level.description || "",
      perks: (level.perks || []).join("\n"),
    });
  };

  const openNewDialog = () => {
    setIsCreating(true);
    setEditingLevel({ id: -1 } as ExpertLevel);
    const nextSort = (levels?.reduce((m, l) => Math.max(m, l.sort_order), 0) ?? 0) + 1;
    const lastMax = levels?.reduce((m, l) => Math.max(m, l.max_points ?? l.min_points), 0) ?? 0;
    setFormData({
      name: "",
      minPoints: lastMax > 0 ? lastMax + 1 : 0,
      maxPoints: 0,
      sortOrder: nextSort,
      multiplier: 1,
      gradient: "from-zinc-400 to-zinc-500",
      emoji: "✨",
      description: "",
      perks: "",
    });
  };

  const formatPoints = (points: number | null) => {
    if (points === null) return "∞";
    return points.toLocaleString("de-DE");
  };

  const formatMultiplier = (value: number) =>
    value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  const previewPerks = formData.perks.split("\n").filter(p => p.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3.5">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                Expert Levels verwalten
              </h2>
              <p className="text-[12.5px] text-muted-foreground">
                Schwellenwerte, Multiplikator, Namen, Farben und Perks der Expert Levels konfigurieren
              </p>
            </div>
            <Button
              onClick={openNewDialog}
              className="h-9 gap-[6px] rounded-[10px] bg-gradient-lime px-3.5 text-[13px] font-bold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-[15px] w-[15px]" />
              Neues Level
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow className="border-[hsl(0_0%_12%)] hover:bg-transparent">
                  <TableHead className={`${TABLE_HEAD_CLASSES} w-16`}>Nr.</TableHead>
                  <TableHead className={TABLE_HEAD_CLASSES}>Level</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>Von</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>Bis</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASSES} pr-4 text-right`}>× Mult.</TableHead>
                  <TableHead className={TABLE_HEAD_CLASSES}>Gradient</TableHead>
                  <TableHead className={TABLE_HEAD_CLASSES}>Perks</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASSES} pr-0 text-right`}>Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels?.map((level) => (
                  <TableRow key={level.id} className="border-[hsl(0_0%_12%)] hover:bg-white/[0.02]">
                    <TableCell className="px-0 py-3 pr-3.5 font-mono text-[12.5px] text-[hsl(0_0%_58%)]">
                      {level.sort_order}
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{level.emoji}</span>
                        <span className="whitespace-nowrap text-[13.5px] font-bold text-foreground">
                          {level.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-4 text-right">
                      <span className="whitespace-nowrap font-mono text-[12.5px] text-[hsl(0_0%_78%)]">
                        {formatPoints(level.min_points)}
                      </span>
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-4 text-right">
                      <span className="whitespace-nowrap font-mono text-[12.5px] text-[hsl(0_0%_78%)]">
                        {formatPoints(level.max_points)}
                      </span>
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-4 text-right">
                      <span className="whitespace-nowrap font-mono text-[13px] font-bold text-primary">
                        ×{formatMultiplier(Number(level.multiplier ?? 1))}
                      </span>
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-3.5">
                      <span
                        className={`block h-3 w-[74px] rounded-full bg-gradient-to-r ${level.gradient || "from-gray-400 to-gray-500"}`}
                      />
                    </TableCell>
                    <TableCell className="px-0 py-3 pr-3.5">
                      <Badge
                        variant="outline"
                        className="whitespace-nowrap rounded-full border-[hsl(0_0%_16%)] bg-white/5 px-[9px] py-[3px] font-mono text-[11.5px] font-normal text-[hsl(0_0%_78%)]"
                      >
                        {level.perks?.length || 0} {(level.perks?.length || 0) === 1 ? "Perk" : "Perks"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-0 py-3">
                      <div className="flex items-center justify-end gap-[7px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_82%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                          onClick={() => openEditDialog(level)}
                        >
                          <Pencil className="h-[13px] w-[13px]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                          onClick={() => {
                            if (confirm(`Level "${level.name}" wirklich löschen?`)) deleteMutation.mutate(level.id);
                          }}
                        >
                          <Trash2 className="h-[13px] w-[13px]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {levels?.length === 0 && (
                  <TableRow className="border-[hsl(0_0%_12%)] hover:bg-transparent">
                    <TableCell colSpan={8} className="px-0 py-8 text-center text-[13.5px] text-muted-foreground">
                      Keine Expert Levels vorhanden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingLevel} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[88vh] gap-[18px] overflow-y-auto rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[560px] sm:rounded-[20px]">
          <DialogHeader className="space-y-[5px] text-left">
            <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
              {isCreating ? "Neues Expert Level" : "Expert Level bearbeiten"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              Schwellen, Multiplikator und Aussehen dieses Levels festlegen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Preview Card */}
            <div className="flex flex-col gap-[7px]">
              <Label className={FIELD_LABEL_CLASSES}>Vorschau</Label>
              <div
                className={`flex flex-col gap-2.5 rounded-[17px] bg-gradient-to-br p-[19px] ${formData.gradient || "from-gray-400 to-gray-500"}`}
              >
                <div className="flex items-center gap-[11px]">
                  <span className="text-[26px] leading-none">{formData.emoji || "?"}</span>
                  <div className="flex min-w-0 flex-col gap-px">
                    <span className="font-display text-[19px] font-extrabold leading-tight tracking-tight text-[#0A0A0A]">
                      {formData.name || "Level Name"}
                    </span>
                    <span className="font-mono text-[11.5px] text-[hsl(0_0%_12%)]">
                      {formatPoints(formData.minPoints)} – {formatPoints(formData.maxPoints || null)} Punkte · ×{formatMultiplier(formData.multiplier)}
                    </span>
                  </div>
                </div>
                {previewPerks.length > 0 && (
                  <div className="flex flex-wrap gap-[7px]">
                    {previewPerks.slice(0, 2).map((perk, i) => (
                      <span
                        key={i}
                        className="whitespace-nowrap rounded-full bg-white/[0.32] px-2.5 py-1 text-[11.5px] font-bold text-[#0A0A0A]"
                      >
                        {perk}
                      </span>
                    ))}
                    {previewPerks.length > 2 && (
                      <span className="whitespace-nowrap rounded-full bg-white/[0.32] px-2.5 py-1 text-[11.5px] font-bold text-[#0A0A0A]">
                        +{previewPerks.length - 2} weitere
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="name" className={FIELD_LABEL_CLASSES}>
                  Name<span className="text-primary"> *</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="emoji" className={FIELD_LABEL_CLASSES}>Emoji</Label>
                <Select
                  value={formData.emoji}
                  onValueChange={(value) => setFormData({ ...formData, emoji: value })}
                >
                  <SelectTrigger className={FIELD_INPUT_CLASSES}>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOJI_OPTIONS.map((emoji) => (
                      <SelectItem key={emoji} value={emoji}>
                        <span className="text-xl">{emoji}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="minPoints" className={FIELD_LABEL_CLASSES}>Min Punkte</Label>
                <Input
                  id="minPoints"
                  type="number"
                  value={formData.minPoints}
                  onChange={(e) => setFormData({ ...formData, minPoints: parseInt(e.target.value) || 0 })}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="maxPoints" className={FIELD_LABEL_CLASSES}>Max Punkte</Label>
                <Input
                  id="maxPoints"
                  type="number"
                  value={formData.maxPoints || ""}
                  placeholder="∞ (leer lassen)"
                  onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) || 0 })}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="multiplier" className={FIELD_LABEL_CLASSES}>Payback-Multiplikator</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.05"
                  min="1"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })}
                  className={NUMBER_INPUT_CLASSES}
                />
                <p className="text-[11.5px] text-muted-foreground">z. B. 1,5 = +50% Punkte pro Buchung</p>
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label htmlFor="sortOrder" className={FIELD_LABEL_CLASSES}>Reihenfolge</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px]">
              <Label className={FIELD_LABEL_CLASSES}>Gradient</Label>
              <Select
                value={formData.gradient}
                onValueChange={(value) => setFormData({ ...formData, gradient: value })}
              >
                <SelectTrigger className={FIELD_INPUT_CLASSES}>
                  <SelectValue placeholder="Farbverlauf wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADIENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2.5">
                        <div className={`h-3.5 w-12 rounded-full ${option.preview}`} />
                        <span className="text-[13.5px]">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="description" className={FIELD_LABEL_CLASSES}>Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
                rows={2}
                className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-normal"
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="perks" className={FIELD_LABEL_CLASSES}>Perks (einer pro Zeile)</Label>
              <Textarea
                id="perks"
                value={formData.perks}
                onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                placeholder="3% Rabatt auf Buchungen&#10;Erste Badges freischalten&#10;Erweiterte Rewards im Store"
                rows={5}
                className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-sm leading-normal"
              />
              <p className="text-[11.5px] text-muted-foreground">
                {formData.perks.split("\n").filter(p => p.trim()).length} Perks definiert
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2.5 border-t border-[hsl(0_0%_12%)] pt-4">
            <Button
              variant="outline"
              className="h-[42px] rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
              onClick={closeDialog}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !formData.name.trim()}
              className="h-[42px] gap-2 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] hover:opacity-90"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreating ? "Hinzufügen" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Loader2, CheckCircle } from "lucide-react";
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

export function P2GExpertLevelsTab() {
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<ExpertLevel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    minPoints: 0,
    maxPoints: 0,
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
      return data as ExpertLevel[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLevel) return;
      
      // Parse perks from textarea (one perk per line)
      const perksArray = formData.perks
        .split("\n")
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      const { error } = await supabase
        .from("expert_levels_config")
        .update({
          name: formData.name,
          min_points: formData.minPoints,
          max_points: formData.maxPoints || null,
          gradient: formData.gradient,
          emoji: formData.emoji,
          description: formData.description || null,
          perks: perksArray,
        })
        .eq("id", editingLevel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "expert-levels"] });
      queryClient.invalidateQueries({ queryKey: ["p2g-expert-levels"] });
      toast.success("Expert Level aktualisiert");
      setEditingLevel(null);
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  const openEditDialog = (level: ExpertLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      minPoints: level.min_points,
      maxPoints: level.max_points || 0,
      gradient: level.gradient || "",
      emoji: level.emoji || "",
      description: level.description || "",
      perks: (level.perks || []).join("\n"),
    });
  };

  const formatPoints = (points: number | null) => {
    if (points === null) return "∞";
    return points.toLocaleString("de-DE");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expert Levels verwalten</CardTitle>
          <CardDescription>
            Schwellenwerte, Namen, Farben und Perks der Expert Levels konfigurieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nr.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Von</TableHead>
                <TableHead className="text-right">Bis</TableHead>
                <TableHead>Gradient</TableHead>
                <TableHead>Emoji</TableHead>
                <TableHead className="text-center">Perks</TableHead>
                <TableHead className="w-20">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels?.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.sort_order}</TableCell>
                  <TableCell className="font-semibold">{level.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPoints(level.min_points)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPoints(level.max_points)}
                  </TableCell>
                  <TableCell>
                    <div
                      className={`h-6 w-20 rounded bg-gradient-to-r ${level.gradient || "from-gray-400 to-gray-500"}`}
                    />
                  </TableCell>
                  <TableCell className="text-xl">{level.emoji}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={level.perks && level.perks.length > 0 ? "default" : "secondary"}>
                      {level.perks?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(level)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingLevel} onOpenChange={(open) => !open && setEditingLevel(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expert Level bearbeiten</DialogTitle>
            <DialogDescription>
              Passe die Einstellungen für dieses Expert Level an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview Card */}
            <div className="mb-6">
              <Label className="text-xs text-muted-foreground mb-2 block">Vorschau</Label>
              <div
                className={`relative rounded-lg p-4 bg-gradient-to-br ${formData.gradient || "from-gray-400 to-gray-500"} text-white`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{formData.emoji || "?"}</span>
                  <div>
                    <div className="font-bold">{formData.name || "Level Name"}</div>
                    <div className="text-sm opacity-90">
                      {formatPoints(formData.minPoints)} - {formatPoints(formData.maxPoints || null)} Punkte
                    </div>
                  </div>
                </div>
                {formData.perks && formData.perks.trim() && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="text-xs opacity-70 mb-1">Perks:</div>
                    <ul className="space-y-1">
                      {formData.perks.split("\n").filter(p => p.trim()).slice(0, 2).map((perk, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3" />
                          {perk}
                        </li>
                      ))}
                      {formData.perks.split("\n").filter(p => p.trim()).length > 2 && (
                        <li className="text-xs opacity-70">
                          +{formData.perks.split("\n").filter(p => p.trim()).length - 2} weitere
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Select
                  value={formData.emoji}
                  onValueChange={(value) => setFormData({ ...formData, emoji: value })}
                >
                  <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPoints">Min Punkte</Label>
                <Input
                  id="minPoints"
                  type="number"
                  value={formData.minPoints}
                  onChange={(e) => setFormData({ ...formData, minPoints: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPoints">Max Punkte</Label>
                <Input
                  id="maxPoints"
                  type="number"
                  value={formData.maxPoints || ""}
                  placeholder="∞ (leer lassen)"
                  onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gradient</Label>
              <Select
                value={formData.gradient}
                onValueChange={(value) => setFormData({ ...formData, gradient: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Farbverlauf wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADIENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-12 rounded ${option.preview}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perks">Perks (einer pro Zeile)</Label>
              <Textarea
                id="perks"
                value={formData.perks}
                onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                placeholder="3% Rabatt auf Buchungen&#10;Erste Badges freischalten&#10;Erweiterte Rewards im Store"
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formData.perks.split("\n").filter(p => p.trim()).length} Perks definiert
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLevel(null)}>
              Abbrechen
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

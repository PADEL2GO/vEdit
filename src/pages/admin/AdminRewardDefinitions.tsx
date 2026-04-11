import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Pencil, Gift, Calendar, Hash, Trophy, Star } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface PointsRule {
  type: "fixed" | "percent" | "tiered";
  value: number;
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
  category: string;
  points_rule: Json;
  caps: Json;
  expiry_days: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  engagement: <Star className="h-4 w-4" />,
  social: <Gift className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  referral: <Trophy className="h-4 w-4" />,
};

export default function AdminRewardDefinitions() {
  const queryClient = useQueryClient();
  const [editingReward, setEditingReward] = useState<RewardDefinitionRow | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "engagement",
    pointsValue: 0,
    dailyCap: "",
    monthlyCap: "",
    totalCap: "",
    expiryDays: "",
    isActive: true,
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

  const updateMutation = useMutation({
    mutationFn: async (reward: RewardDefinitionRow) => {
      const caps: Caps = {};
      if (formData.dailyCap) caps.daily = parseInt(formData.dailyCap);
      if (formData.monthlyCap) caps.monthly = parseInt(formData.monthlyCap);
      if (formData.totalCap) caps.total = parseInt(formData.totalCap);

      const { error } = await supabase
        .from("reward_definitions")
        .update({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          points_rule: { type: "fixed", value: formData.pointsValue } as unknown as Json,
          caps: Object.keys(caps).length > 0 ? caps as unknown as Json : null,
          expiry_days: formData.expiryDays ? parseInt(formData.expiryDays) : null,
          is_active: formData.isActive,
        })
        .eq("key", reward.key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reward-definitions"] });
      toast.success("Reward definition updated");
      setEditingReward(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
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
      toast.success("Status updated");
    },
  });

  const openEditDialog = (reward: RewardDefinitionRow) => {
    setEditingReward(reward);
    const caps = (reward.caps || {}) as Caps;
    const pointsRule = (reward.points_rule || { value: 0 }) as unknown as PointsRule;
    setFormData({
      title: reward.title,
      description: reward.description || "",
      category: reward.category,
      pointsValue: pointsRule.value || 0,
      dailyCap: caps.daily?.toString() || "",
      monthlyCap: caps.monthly?.toString() || "",
      totalCap: caps.total?.toString() || "",
      expiryDays: reward.expiry_days?.toString() || "",
      isActive: reward.is_active ?? true,
    });
  };

  const formatCaps = (caps: Caps | null) => {
    if (!caps) return "No limits";
    const parts = [];
    if (caps.daily) parts.push(`${caps.daily}/day`);
    if (caps.monthly) parts.push(`${caps.monthly}/month`);
    if (caps.total) parts.push(`${caps.total} total`);
    return parts.length > 0 ? parts.join(", ") : "No limits";
  };

  const groupedDefinitions = definitions?.reduce((acc, def) => {
    if (!acc[def.category]) acc[def.category] = [];
    acc[def.category].push(def);
    return acc;
  }, {} as Record<string, RewardDefinitionRow[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reward Definitions</h1>
            <p className="text-muted-foreground">Manage reward types, points, and limits</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {groupedDefinitions && Object.entries(groupedDefinitions).map(([category, rewards]) => (
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
                        <TableHead>Title</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                        <TableHead>Caps</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.map((reward) => (
                        <TableRow key={reward.key}>
                          <TableCell className="font-mono text-xs">{reward.key}</TableCell>
                          <TableCell className="font-medium">{reward.title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{(reward.points_rule as unknown as PointsRule)?.value || 0}</Badge>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(reward)}
                            >
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

        <Dialog open={!!editingReward} onOpenChange={() => setEditingReward(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Reward Definition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Key</Label>
                <Input value={editingReward?.key || ""} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Points Value</Label>
                  <Input
                    type="number"
                    value={formData.pointsValue}
                    onChange={(e) =>
                      setFormData({ ...formData, pointsValue: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Daily Cap</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={formData.dailyCap}
                    onChange={(e) => setFormData({ ...formData, dailyCap: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Monthly Cap</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={formData.monthlyCap}
                    onChange={(e) => setFormData({ ...formData, monthlyCap: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Total Cap</Label>
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
                  <Label>Expiry (days)</Label>
                  <Input
                    type="number"
                    placeholder="Never"
                    value={formData.expiryDays}
                    onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReward(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editingReward && updateMutation.mutate(editingReward)}
                disabled={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

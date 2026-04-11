import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllLocationTeasers, type LocationTeaser } from "@/hooks/useLocationTeasers";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Image as ImageIcon } from "lucide-react";

interface TeaserForm {
  title: string;
  city: string;
  description: string;
  expected_date: string;
  sort_order: number;
  is_active: boolean;
  image_url: string;
  club_url: string;
}

const emptyForm: TeaserForm = {
  title: "",
  city: "",
  description: "",
  expected_date: "",
  sort_order: 0,
  is_active: true,
  image_url: "",
  club_url: "",
};

export default function AdminLocationTeasers() {
  const { data: teasers, isLoading } = useAllLocationTeasers();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TeaserForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: TeaserForm & { id?: string }) => {
      const payload = {
        title: data.title,
        city: data.city || null,
        description: data.description || null,
        expected_date: data.expected_date || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        image_url: data.image_url || null,
        club_url: data.club_url || null,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        const { error } = await (supabase as any)
          .from("location_teasers")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("location_teasers")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-teasers"] });
      queryClient.invalidateQueries({ queryKey: ["location-teasers-all"] });
      toast.success(editId ? "Teaser aktualisiert" : "Teaser erstellt");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("location_teasers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-teasers"] });
      queryClient.invalidateQueries({ queryKey: ["location-teasers-all"] });
      toast.success("Teaser gelöscht");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: LocationTeaser) => {
    setEditId(t.id);
    setForm({
      title: t.title,
      city: t.city || "",
      description: t.description || "",
      expected_date: t.expected_date || "",
      sort_order: t.sort_order,
      is_active: t.is_active,
      image_url: t.image_url || "",
      club_url: t.club_url || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `location-teasers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) {
      toast.error("Upload fehlgeschlagen");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Location Teasers</h1>
            <p className="text-muted-foreground text-sm">Kommende Standorte auf der Homepage verwalten</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Neuer Teaser
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : !teasers?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Noch keine Teaser vorhanden.
          </Card>
        ) : (
          <div className="grid gap-4">
            {teasers.map((t) => (
              <Card key={t.id} className="p-4 flex items-center gap-4">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.title}</span>
                    {t.city && <span className="text-xs text-muted-foreground">· {t.city}</span>}
                    {!t.is_active && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Inaktiv</span>
                    )}
                  </div>
                  {t.expected_date && <span className="text-xs text-muted-foreground">{t.expected_date}</span>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Teaser wirklich löschen?")) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Teaser bearbeiten" : "Neuer Teaser"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...form, id: editId || undefined });
            }}
          >
            <div>
              <Label>Titel *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <Label>Stadt</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Vereins-Website (URL)</Label>
              <Input
                value={form.club_url}
                onChange={(e) => setForm((f) => ({ ...f, club_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Input value={form.expected_date} onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))} />
            </div>
            <div>
              <Label>Bild</Label>
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
              )}
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Hochladen…</p>}
            </div>
            <div>
              <Label>Sortierung</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Aktiv (auf Homepage sichtbar)</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Speichern…" : "Speichern"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

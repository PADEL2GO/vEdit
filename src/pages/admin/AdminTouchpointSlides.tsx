import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { usePartnerTouchpoints } from "@/hooks/usePartnerTouchpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Trash2, Plus, ImageIcon } from "lucide-react";

const AdminTouchpointSlides = () => {
  const { data: slides, isLoading, uploadImageMutation, updateMutation, createMutation, deleteMutation } = usePartnerTouchpoints(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImageMutation.mutateAsync({ id, file });
      toast.success("Bild hochgeladen");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, is_active });
      toast.success(is_active ? "Aktiviert" : "Deaktiviert");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSortChange = async (id: string, sort_order: number) => {
    await updateMutation.mutateAsync({ id, sort_order });
  };

  const handleTitleChange = async (id: string, title: string) => {
    await updateMutation.mutateAsync({ id, title });
  };

  const handleDescriptionChange = async (id: string, description: string) => {
    await updateMutation.mutateAsync({ id, description });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Titel erforderlich");
      return;
    }
    try {
      await createMutation.mutateAsync({ title: newTitle, description: newDescription });
      setNewTitle("");
      setNewDescription("");
      toast.success("Slide hinzugefügt");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slide wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Slide gelöscht");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner Touchpoint Slides</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bilder und Texte für das Karussell auf der Partner-Seite ("Wo deine Marke auf PADEL2GO trifft").
          </p>
        </div>

        {/* Add New */}
        <Card className="bg-card border-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Neuer Slide</h2>
          <Input
            placeholder="Titel (z. B. Branding am Court)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="bg-background border-border"
          />
          <Textarea
            placeholder="Beschreibung (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="bg-background border-border"
            rows={2}
          />
          <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Slide hinzufügen
          </Button>
        </Card>

        {/* Slide List */}
        {isLoading ? (
          <p className="text-muted-foreground">Lädt...</p>
        ) : (
          <div className="space-y-4">
            {(slides || []).map(slide => (
              <Card key={slide.id} className="bg-card border-border p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image Preview */}
                  <div className="relative w-full sm:w-48 h-32 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border">
                    {slide.image_url ? (
                      <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                    <button
                      onClick={() => fileInputRefs.current[slide.id]?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
                    >
                      <Upload className="w-5 h-5 mr-1" /> Bild
                    </button>
                    <input
                      ref={el => { fileInputRefs.current[slide.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleImageUpload(slide.id, e)}
                    />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-3">
                    <Input
                      defaultValue={slide.title}
                      onBlur={e => handleTitleChange(slide.id, e.target.value)}
                      className="bg-background border-border font-medium"
                      placeholder="Titel"
                    />
                    <Textarea
                      defaultValue={slide.description || ""}
                      onBlur={e => handleDescriptionChange(slide.id, e.target.value)}
                      className="bg-background border-border"
                      placeholder="Beschreibung"
                      rows={2}
                    />
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Reihenfolge</span>
                        <Input
                          type="number"
                          defaultValue={slide.sort_order}
                          onBlur={e => handleSortChange(slide.id, Number(e.target.value))}
                          className="bg-background border-border w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slide.is_active}
                          onCheckedChange={v => handleToggleActive(slide.id, v)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {slide.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(slide.id)}
                        className="text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {(slides || []).length === 0 && (
              <Card className="bg-card border-border p-12 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Noch keine Slides. Füge den ersten hinzu.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTouchpointSlides;

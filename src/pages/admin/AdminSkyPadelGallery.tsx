import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSkyPadelGallery } from "@/hooks/useSkyPadelGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const AdminSkyPadelGallery = () => {
  const { data: images, isLoading, uploadMutation, deleteMutation, updateMutation } = useSkyPadelGallery(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync({ file });
      }
      toast.success(`${files.length} Bild(er) hochgeladen`);
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bild wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Bild gelöscht");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSortChange = async (id: string, newSort: number) => {
    await updateMutation.mutateAsync({ id, sort_order: newSort });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SkyPadel Galerie</h1>
            <p className="text-muted-foreground text-sm">Bilder für die „Für Vereine"-Seite verwalten</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Lädt…" : "Bilder hochladen"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : !images?.length ? (
          <Card className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
            <p>Noch keine Bilder hochgeladen</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {images.map((img) => (
              <Card key={img.id} className="p-4 flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
                <img
                  src={img.image_url}
                  alt={img.alt_text || "Gallery"}
                  className="w-28 h-20 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Alt-Text (optional)"
                    defaultValue={img.alt_text || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (img.alt_text || "")) {
                        updateMutation.mutate({ id: img.id, alt_text: e.target.value });
                      }
                    }}
                  />
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      Reihenfolge:
                      <Input
                        type="number"
                        className="w-20"
                        defaultValue={img.sort_order}
                        onBlur={(e) => handleSortChange(img.id, Number(e.target.value))}
                      />
                    </label>
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      Aktiv:
                      <Switch
                        checked={img.is_active}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: img.id, is_active: checked })
                        }
                      />
                    </label>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(img.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSkyPadelGallery;

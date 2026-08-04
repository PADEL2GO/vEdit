import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSkyPadelGallery, type SkyPadelGalleryImage } from "@/hooks/useSkyPadelGallery";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TranslatableField } from "@/components/admin/TranslatableField";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const AdminSkyPadelGallery = () => {
  const { data: images, isLoading, uploadMutation, deleteMutation, updateMutation } = useSkyPadelGallery(false);
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const runTranslate = (id: string) => {
    translateRow({ table: "skypadel_gallery", id, fields: ["alt_text"] }).then((result) => {
      toastTranslateResult(result);
      queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] });
    });
  };

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

  const activeCount = images?.filter((img) => img.is_active).length ?? 0;

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Bilder für die „Für Vereine“-Seite verwalten
            {images?.length ? (
              <>
                {" — "}
                <span className="font-bold text-foreground">
                  {images.length} {images.length === 1 ? "Bild" : "Bilder"}
                </span>
                , {activeCount} aktiv
              </>
            ) : null}
          </p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 gap-2 rounded-[10px] bg-gradient-lime px-[15px] text-[13px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.28)] hover:opacity-90"
            >
              <Upload className="h-[15px] w-[15px]" />
              {uploading ? "Lädt…" : "Bilder hochladen"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : !images?.length ? (
          <Card className="flex flex-col items-center gap-3 rounded-2xl border-border bg-gradient-card p-10 sm:p-12">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
              <ImageIcon className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">Noch keine Bilder hochgeladen</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {images.map((img) => (
              <Card key={img.id} className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-[15px]">
                  <span className="flex flex-none cursor-grab pt-8 text-[hsl(0_0%_40%)]">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <img
                    src={img.image_url}
                    alt={img.alt_text || "Gallery"}
                    className="h-20 w-28 flex-none rounded-[10px] border border-[hsl(0_0%_15%)] object-cover"
                  />
                  <div className="flex min-w-[240px] flex-1 flex-col gap-2">
                    <GalleryAltTextEditor
                      image={img}
                      onSave={async (payload) => {
                        await (supabase as any)
                          .from("skypadel_gallery")
                          .update({ ...payload, updated_at: new Date().toISOString() })
                          .eq("id", img.id);
                        runTranslate(img.id);
                        queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] });
                      }}
                    />
                  </div>
                  <div className="flex flex-none flex-wrap items-start gap-3.5 sm:pt-[22px]">
                    <label className="flex flex-col gap-[5px]">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        Reihenfolge
                      </span>
                      <Input
                        type="number"
                        className="h-[34px] w-[68px] rounded-[9px] border-[hsl(0_0%_16%)] bg-white/[0.05] text-center font-mono text-[13px] font-bold"
                        defaultValue={img.sort_order}
                        onBlur={(e) => handleSortChange(img.id, Number(e.target.value))}
                      />
                    </label>
                    <label className="flex flex-col items-center gap-[5px]">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        Aktiv
                      </span>
                      <Switch
                        className="mt-[5px]"
                        checked={img.is_active}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: img.id, is_active: checked })
                        }
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Bild löschen"
                      onClick={() => handleDelete(img.id)}
                      className="mt-[18px] h-[34px] w-[34px] flex-none rounded-[9px] border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

interface AltTextPayload {
  alt_text: string | null;
  alt_text_en: string | null;
  alt_text_en_locked: boolean;
}

const GalleryAltTextEditor = ({
  image,
  onSave,
}: {
  image: SkyPadelGalleryImage;
  onSave: (payload: AltTextPayload) => Promise<void>;
}) => {
  const [de, setDe] = useState(image.alt_text || "");
  const [en, setEn] = useState(image.alt_text_en || "");
  const [locked, setLocked] = useState(!!image.alt_text_en_locked);
  const [saving, setSaving] = useState(false);

  const hasChanged =
    de !== (image.alt_text || "") ||
    en !== (image.alt_text_en || "") ||
    locked !== !!image.alt_text_en_locked;

  const handleSave = async () => {
    if (!hasChanged) return;
    setSaving(true);
    try {
      await onSave({
        alt_text: de.trim() || null,
        alt_text_en: en.trim() || null,
        alt_text_en_locked: locked,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TranslatableField
        label="Alt-Text"
        deValue={de}
        onDeChange={setDe}
        enValue={en}
        onEnChange={setEn}
        locked={locked}
        onLockedChange={setLocked}
        placeholder="Alt-Text (optional)"
        disabled={saving}
      />
      {hasChanged && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 rounded-lg bg-gradient-lime px-3 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSkyPadelGallery;

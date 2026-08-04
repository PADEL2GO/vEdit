import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { usePartnerTouchpoints, type PartnerTouchpointSlide } from "@/hooks/usePartnerTouchpoints";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TranslatableField } from "@/components/admin/TranslatableField";
import { toast } from "sonner";
import { ImagePlus, Trash2, Plus, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const TRANSLATABLE_FIELDS = ["title", "description"];

const AdminTouchpointSlides = () => {
  const { data: slides, isLoading, uploadImageMutation, updateMutation, deleteMutation } = usePartnerTouchpoints(false);
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const runTranslate = (id: string) => {
    translateRow({ table: "partner_touchpoint_slides", id, fields: TRANSLATABLE_FIELDS }).then((result) => {
      toastTranslateResult(result);
      queryClient.invalidateQueries({ queryKey: ["partner-touchpoint-slides"] });
    });
  };

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

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Titel erforderlich");
      return;
    }
    setCreating(true);
    try {
      const { data: maxRow } = await (supabase as any)
        .from("partner_touchpoint_slides")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;
      const { data: inserted, error } = await (supabase as any)
        .from("partner_touchpoint_slides")
        .insert({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          sort_order: nextOrder,
        })
        .select("id")
        .single();
      if (error) throw error;
      setNewTitle("");
      setNewDescription("");
      toast.success("Slide hinzugefügt");
      if (inserted?.id) runTranslate(inserted.id);
      queryClient.invalidateQueries({ queryKey: ["partner-touchpoint-slides"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
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
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <p className="max-w-[660px] text-sm text-muted-foreground">
          Bilder und Texte für das Karussell auf der Partner-Seite — „Wo deine Marke auf PADEL2GO trifft“.
        </p>

        {/* Add New */}
        <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
          <div className="flex flex-col gap-3.5">
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              Neuer Slide
            </span>
            <label className="flex flex-col gap-[7px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Titel<span className="text-primary"> *</span>
              </span>
              <Input
                placeholder="Titel (z. B. Branding am Court)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]"
              />
            </label>
            <label className="flex flex-col gap-[7px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Beschreibung
              </span>
              <Textarea
                placeholder="Beschreibung (optional)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="min-h-[62px] rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-relaxed"
                rows={2}
              />
            </label>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="h-10 w-full gap-[7px] rounded-[10px] bg-gradient-lime px-[17px] text-[13px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] hover:brightness-110 sm:w-auto sm:self-start"
            >
              <Plus className="h-[15px] w-[15px]" />
              {creating ? "Hinzufügen…" : "Slide hinzufügen"}
            </Button>
          </div>
        </Card>

        {/* Slide List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lädt...</p>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {(slides || []).map(slide => (
              <Card key={slide.id} className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Image Preview */}
                  <div className="relative h-32 w-full flex-none overflow-hidden rounded-xl border border-[hsl(0_0%_15%)] bg-white/[0.03] sm:w-48">
                    {slide.image_url ? (
                      <img src={slide.image_url} alt={slide.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRefs.current[slide.id]?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                    >
                      <ImagePlus className="h-[19px] w-[19px] text-primary" />
                      <span className="text-xs font-bold text-foreground">Bild ändern</span>
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
                  <div className="min-w-0 flex-[1_1_260px]">
                    <TouchpointTextEditor
                      slide={slide}
                      onSave={async (payload) => {
                        await updateMutation.mutateAsync({ id: slide.id, ...payload });
                        runTranslate(slide.id);
                      }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex min-w-[120px] flex-none flex-row flex-wrap items-center gap-4 sm:flex-col sm:items-stretch sm:gap-[13px]">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        Reihenfolge
                      </span>
                      <Input
                        type="number"
                        defaultValue={slide.sort_order}
                        onBlur={e => handleSortChange(slide.id, Number(e.target.value))}
                        className="h-9 w-16 rounded-[9px] border-[hsl(0_0%_16%)] bg-white/[0.05] text-center font-mono text-[13px] font-bold"
                      />
                    </label>
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={slide.is_active}
                        onCheckedChange={v => handleToggleActive(slide.id, v)}
                      />
                      <span
                        className={`text-xs font-bold ${slide.is_active ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {slide.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(slide.id)}
                      className="ml-auto h-[34px] w-[34px] rounded-[9px] border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] p-0 text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B] sm:ml-0 sm:self-start"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {(slides || []).length === 0 && (
              <Card className="rounded-2xl border-border bg-gradient-card p-10 text-center sm:p-12">
                <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Noch keine Slides. Füge den ersten hinzu.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

interface TouchpointPayload {
  title: string;
  title_en: string | null;
  title_en_locked: boolean;
  description: string | null;
  description_en: string | null;
  description_en_locked: boolean;
}

const TouchpointTextEditor = ({
  slide,
  onSave,
}: {
  slide: PartnerTouchpointSlide;
  onSave: (payload: TouchpointPayload) => Promise<void>;
}) => {
  const [titleDe, setTitleDe] = useState(slide.title || "");
  const [titleEn, setTitleEn] = useState(slide.title_en || "");
  const [titleLocked, setTitleLocked] = useState(!!slide.title_en_locked);
  const [descDe, setDescDe] = useState(slide.description || "");
  const [descEn, setDescEn] = useState(slide.description_en || "");
  const [descLocked, setDescLocked] = useState(!!slide.description_en_locked);
  const [saving, setSaving] = useState(false);

  const hasChanged =
    titleDe !== (slide.title || "") ||
    titleEn !== (slide.title_en || "") ||
    titleLocked !== !!slide.title_en_locked ||
    descDe !== (slide.description || "") ||
    descEn !== (slide.description_en || "") ||
    descLocked !== !!slide.description_en_locked;

  const handleSave = async () => {
    if (!hasChanged) return;
    if (!titleDe.trim()) {
      toast.error("Titel erforderlich");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: titleDe.trim(),
        title_en: titleEn.trim() || null,
        title_en_locked: titleLocked,
        description: descDe.trim() || null,
        description_en: descEn.trim() || null,
        description_en_locked: descLocked,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <TranslatableField
        label="Titel"
        deValue={titleDe}
        onDeChange={setTitleDe}
        enValue={titleEn}
        onEnChange={setTitleEn}
        locked={titleLocked}
        onLockedChange={setTitleLocked}
        placeholder="Titel"
        disabled={saving}
      />
      <TranslatableField
        label="Beschreibung"
        deValue={descDe}
        onDeChange={setDescDe}
        enValue={descEn}
        onEnChange={setDescEn}
        locked={descLocked}
        onLockedChange={setDescLocked}
        placeholder="Beschreibung"
        multiline
        rows={2}
        disabled={saving}
      />
      {hasChanged && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 rounded-lg bg-gradient-lime px-3 text-xs font-bold text-primary-foreground hover:brightness-110"
          >
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminTouchpointSlides;

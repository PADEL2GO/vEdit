import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Newspaper, Image as ImageIcon, Loader2, Languages, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArticleEditor } from "@/components/admin/news/ArticleEditor";
import { VoiceInArticle } from "@/components/admin/news/VoiceInArticle";
import {
  useAdminArticles,
  useSaveArticle,
  useDeleteArticle,
  uploadArticleImage,
} from "@/hooks/useAdminArticles";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { AUDIENCE_LABELS, type Article, type ArticleAudience } from "@/types/article";

const ARTICLE_TRANSLATE_FIELDS = ["title", "excerpt", "body_html"];

interface ArticleForm {
  title: string;
  excerpt: string;
  body_html: string;
  cover_image_url: string;
  source_url: string;
  audience: ArticleAudience;
  is_published: boolean;
  sort_order: number;
}

const emptyForm: ArticleForm = {
  title: "",
  excerpt: "",
  body_html: "",
  cover_image_url: "",
  source_url: "",
  audience: "everyone",
  is_published: false,
  sort_order: 0,
};

export default function AdminNews() {
  const { data: articles, isLoading } = useAdminArticles();
  const saveMutation = useSaveArticle();
  const deleteMutation = useDeleteArticle();
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [genUrls, setGenUrls] = useState<string[]>(["", "", ""]);
  const [generating, setGenerating] = useState(false);

  const runGenerator = async () => {
    const urls = genUrls.map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news-from-urls", { body: { urls } });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error ?? error?.message);
      }
      const results = ((data as { results?: Array<{ url: string; ok: boolean; title?: string; error?: string; translated?: boolean }> })?.results) ?? [];
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (okCount > 0) {
        toast.success(`${okCount} Artikel als Entwurf erstellt`, {
          description: "Jetzt Titelbild hinterlegen und veröffentlichen.",
        });
      }
      for (const f of failed) {
        toast.error(`Fehlgeschlagen: ${f.url}`, { description: f.error });
      }
      if (okCount > 0) {
        setGenUrls(["", "", ""]);
        invalidateArticles();
      }
    } catch (err) {
      toast.error("Generator fehlgeschlagen", { description: (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const invalidateArticles = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    queryClient.invalidateQueries({ queryKey: ["articles", "logged_in"] });
    queryClient.invalidateQueries({ queryKey: ["articles", "logged_out"] });
  };

  const runTranslate = (id: string) => {
    translateRow({ table: "articles", id, fields: ARTICLE_TRANSLATE_FIELDS }).then((result) => {
      toastTranslateResult(result);
      invalidateArticles();
    });
  };

  // Backfill: translate every existing article (sequential to respect DeepL rate limits).
  // Locked/empty fields are skipped server-side, so re-running is idempotent.
  const translateAll = async () => {
    if (!articles?.length) return;
    setBulk({ done: 0, total: articles.length });
    let ok = 0;
    for (const a of articles) {
      const result = await translateRow({ table: "articles", id: a.id, fields: ARTICLE_TRANSLATE_FIELDS });
      if (!result.error) ok++;
      setBulk((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBulk(null);
    invalidateArticles();
    toast.success(t("admin.translateAllDone", { count: ok }));
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [existingPublishedAt, setExistingPublishedAt] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [uploadingCover, setUploadingCover] = useState(false);
  // Bumped whenever AI-generation replaces the body — forces Tiptap (uncontrolled) to remount.
  const [editorKey, setEditorKey] = useState(0);

  const openCreate = () => {
    setEditId(null);
    setExistingPublishedAt(null);
    setForm(emptyForm);
    setEditorKey(0);
    setDialogOpen(true);
  };

  const openEdit = (a: Article) => {
    setEditId(a.id);
    setExistingPublishedAt(a.published_at);
    setEditorKey(0);
    setForm({
      title: a.title,
      excerpt: a.excerpt ?? "",
      body_html: a.body_html ?? "",
      cover_image_url: a.cover_image_url ?? "",
      source_url: a.source_url ?? "",
      audience: a.audience,
      is_published: a.is_published,
      sort_order: a.sort_order,
    });
    setDialogOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadArticleImage(file);
      setForm((f) => ({ ...f, cover_image_url: url }));
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Titel ist erforderlich");
      return;
    }
    saveMutation.mutate(
      {
        ...form,
        id: editId ?? undefined,
        existingPublishedAt,
      },
      {
        onSuccess: (newId: string) => {
          setDialogOpen(false);
          if (newId) runTranslate(newId);
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              News / Artikel
            </h1>
            <p className="text-muted-foreground text-sm">
              Artikel für die Startseite und das eingeloggte Dashboard verwalten
            </p>
          </div>
          <div className="flex gap-2">
            {!!articles?.length && (
              <Button variant="outline" onClick={translateAll} disabled={!!bulk}>
                {bulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("admin.translateAllRunning", { done: bulk.done, total: bulk.total })}
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4 mr-2" /> {t("admin.translateAll")}
                  </>
                )}
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Neuer Artikel
            </Button>
          </div>
        </div>

        {/* Wochen-News-Generator: 3 Quell-URLs → 3 KI-Entwürfe (DE + EN) */}
        <Card className="p-5 border-primary/30">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold">Wochen-News-Generator (KI)</h2>
              <p className="text-sm text-muted-foreground">
                Bis zu 3 URLs aus der Padel-Presse einfügen — pro URL entsteht ein eigenständig
                formulierter Artikel als <strong>Entwurf</strong> (DE + automatische EN-Übersetzung,
                mit KI-Kennzeichnung und Quellenlink). Danach: Titelbild hinterlegen und veröffentlichen.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {genUrls.map((url, idx) => (
              <Input
                key={idx}
                value={url}
                onChange={(e) => setGenUrls((prev) => prev.map((u, i) => (i === idx ? e.target.value : u)))}
                placeholder={`https://… (Quelle ${idx + 1}${idx > 0 ? " – optional" : ""})`}
                disabled={generating}
              />
            ))}
          </div>
          <Button className="mt-3" onClick={runGenerator} disabled={generating || !genUrls.some((u) => u.trim())}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Artikel werden generiert…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Artikel generieren
              </>
            )}
          </Button>
        </Card>

        {isLoading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : !articles?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Noch keine Artikel vorhanden.
          </Card>
        ) : (
          <div className="grid gap-4">
            {articles.map((a) => (
              <Card key={a.id} className="p-4 flex items-center gap-4">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {a.cover_image_url ? (
                    <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {a.is_published ? (
                      <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Veröffentlicht</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Entwurf</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{AUDIENCE_LABELS[a.audience]}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Artikel wirklich löschen?")) deleteMutation.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <VoiceInArticle
              onGenerated={({ title, excerpt, body_html }) => {
                setForm((f) => ({ ...f, title, excerpt, body_html }));
                setEditorKey((k) => k + 1);
              }}
            />

            <div>
              <Label>Titel *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Kurzbeschreibung (Vorschau)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                placeholder="Kurzer Anreißer, der in der Artikelkarte angezeigt wird."
              />
            </div>

            <div>
              <Label>Quelle / Link (optional)</Label>
              <Input
                type="url"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wird als "Zur Quelle"-Link unter dem Artikel angezeigt.
              </p>
            </div>

            <div>
              <Label>Titelbild</Label>
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt="Vorschau"
                  className="w-full h-36 object-cover rounded-lg mb-2"
                />
              )}
              <Input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
              {uploadingCover && <p className="text-xs text-muted-foreground mt-1">Hochladen…</p>}
            </div>

            <div>
              <Label>Inhalt</Label>
              <ArticleEditor
                key={`${editId ?? "new"}-${editorKey}`}
                value={form.body_html}
                onChange={(html) => setForm((f) => ({ ...f, body_html: html }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sichtbar für</Label>
                <Select
                  value={form.audience}
                  onValueChange={(v) => setForm((f) => ({ ...f, audience: v as ArticleAudience }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">{AUDIENCE_LABELS.everyone}</SelectItem>
                    <SelectItem value="logged_in">{AUDIENCE_LABELS.logged_in}</SelectItem>
                    <SelectItem value="logged_out">{AUDIENCE_LABELS.logged_out}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sortierung</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
              />
              <Label>Veröffentlicht (für Nutzer sichtbar)</Label>
            </div>

            <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploadingCover}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Speichern…
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

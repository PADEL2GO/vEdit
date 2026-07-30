import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Eye,
  Flame,
  GripVertical,
  Image as ImageIcon,
  Languages,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Sparkles,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArticleEditor } from "@/components/admin/news/ArticleEditor";
import { VoiceInArticle } from "@/components/admin/news/VoiceInArticle";
import {
  slugify,
  uploadArticleImage,
  useAdminArticles,
  useDeleteArticle,
  useReorderArticles,
  useSaveArticle,
} from "@/hooks/useAdminArticles";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { AUDIENCE_LABELS, TOPICS, topicColor, type Article, type ArticleAudience } from "@/types/article";

const ARTICLE_TRANSLATE_FIELDS = ["title", "excerpt", "body_html", "title_highlight", "lead"];

interface ArticleForm {
  title: string;
  title_highlight: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  lead: string;
  body_html: string;
  cover_image_url: string;
  cover_alt: string;
  source_url: string;
  audience: ArticleAudience;
  topic: string;
  is_featured: boolean;
  featured_rank: number;
  reading_minutes: number;
  location_id: string;
  cta_title: string;
  cta_subtitle: string;
  cta_label: string;
  cta_url: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
  sort_order: number;
}

const emptyForm: ArticleForm = {
  title: "",
  title_highlight: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  lead: "",
  body_html: "",
  cover_image_url: "",
  cover_alt: "",
  source_url: "",
  audience: "everyone",
  topic: "Inside P2G",
  is_featured: false,
  featured_rank: 0,
  reading_minutes: 3,
  location_id: "",
  cta_title: "",
  cta_subtitle: "",
  cta_label: "",
  cta_url: "",
  seo_title: "",
  seo_description: "",
  is_published: false,
  sort_order: 0,
};

/** Live-Vorschau: 4:5-Card + Artikel-Kopf, exakt in der Topic-Farbe des Formulars. */
function ArticlePreview({ form }: { form: ArticleForm }) {
  const acc = topicColor(form.topic);
  const dateLabel = format(new Date(), "dd.MM.yyyy");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Live-Vorschau</p>

      <div className="w-full max-w-[260px]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-border bg-black">
          {form.cover_image_url ? (
            <img src={form.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50">
              Kein Cover (4:5)
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(190deg, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.85) 92%)" }}
          />
          <span
            className="absolute left-3 top-3 rounded-full border bg-black/60 px-2.5 py-1 font-stat text-[9px] uppercase tracking-[0.16em] backdrop-blur-md"
            style={{ color: acc, borderColor: `${acc}59` }}
          >
            {form.topic}
          </span>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3.5">
            <span className="font-stat text-[10px] tracking-[0.1em] text-white/60">
              {dateLabel} · {form.reading_minutes || 3} Min
            </span>
            <h3 className="m-0 font-display text-base font-bold leading-[1.18] text-white">
              {form.title || "Titel…"}
            </h3>
          </div>
        </div>
        {form.excerpt && <p className="mt-2 px-0.5 text-xs leading-normal text-muted-foreground">{form.excerpt}</p>}
      </div>

      <div className="rounded-2xl border border-border bg-black p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border bg-black/60 px-2.5 py-1 font-stat text-[9px] uppercase tracking-[0.16em]"
            style={{ color: acc, borderColor: `${acc}59` }}
          >
            {form.topic}
          </span>
          <span className="font-stat text-[10px] text-white/50">{dateLabel} · {form.reading_minutes || 3} Min</span>
        </div>
        <h4 className="mb-0 mt-2.5 font-display text-lg font-extrabold leading-tight text-white">
          {form.title || "Titel…"}
          {form.title_highlight && (
            <>
              {" "}
              <span className="italic" style={{ color: acc }}>
                {form.title_highlight}
              </span>
            </>
          )}
        </h4>
        {form.lead && <p className="mb-0 mt-2 text-xs leading-relaxed text-white/70">{form.lead}</p>}
      </div>
    </div>
  );
}

/** Zeichenzähler, der ab Überschreitung des Limits rot wird. */
function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit;
  return (
    <span className={`text-xs tabular-nums ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
      {value.length}/{limit}
    </span>
  );
}

export default function AdminNews() {
  const { data: articles, isLoading } = useAdminArticles();
  const saveMutation = useSaveArticle();
  const deleteMutation = useDeleteArticle();
  const reorderMutation = useReorderArticles();
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [genUrls, setGenUrls] = useState<string[]>(["", "", ""]);
  const [generating, setGenerating] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["admin-locations-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Drag-and-Drop-Reihenfolge ──
  const [order, setOrder] = useState<string[] | null>(null);
  const dragIndex = useRef<number | null>(null);

  const list = useMemo(() => {
    if (!articles) return [];
    if (!order) return articles;
    const byId = new Map(articles.map((a) => [a.id, a]));
    return order.map((id) => byId.get(id)).filter(Boolean) as Article[];
  }, [articles, order]);

  const onDragStart = (index: number) => {
    dragIndex.current = index;
    setOrder(list.map((a) => a.id));
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setOrder((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = index;
  };

  const onDragEnd = () => {
    dragIndex.current = null;
    if (!order || !articles) return;
    const serverOrder = articles.map((a) => a.id);
    if (order.join() !== serverOrder.join()) {
      reorderMutation.mutate(order, { onSettled: () => setOrder(null) });
    } else {
      setOrder(null);
    }
  };

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

  // Lesezeit-Vorschlag aus der Wortzahl (~200 Wörter/Minute)
  const readingSuggestion = useMemo(() => {
    const words = form.body_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }, [form.body_html]);

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
      title_highlight: a.title_highlight ?? "",
      slug: a.slug ?? "",
      slugTouched: true,
      excerpt: a.excerpt ?? "",
      lead: a.lead ?? "",
      body_html: a.body_html ?? "",
      cover_image_url: a.cover_image_url ?? "",
      cover_alt: a.cover_alt ?? "",
      source_url: a.source_url ?? "",
      audience: a.audience,
      topic: (a.topic as string) || "Inside P2G",
      is_featured: a.is_featured ?? false,
      featured_rank: a.featured_rank ?? 0,
      reading_minutes: a.reading_minutes ?? 3,
      location_id: a.location_id ?? "",
      cta_title: a.cta_title ?? "",
      cta_subtitle: a.cta_subtitle ?? "",
      cta_label: a.cta_label ?? "",
      cta_url: a.cta_url ?? "",
      seo_title: a.seo_title ?? "",
      seo_description: a.seo_description ?? "",
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
    const { slugTouched: _ignored, ...payload } = form;
    saveMutation.mutate(
      {
        ...payload,
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
              Artikel für /news, die Startseite und das Dashboard verwalten — Reihenfolge per Drag &amp; Drop
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
                formulierter Artikel als <strong>Entwurf</strong> — inkl. Topic, Titel-Highlight, Lead,
                Lesezeit und SEO-Feldern (DE + automatische EN-Übersetzung, mit KI-Kennzeichnung und
                Quellenlink). Danach: Titelbild (4:5) hinterlegen, prüfen und veröffentlichen.
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
        ) : !list.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Noch keine Artikel vorhanden.
          </Card>
        ) : (
          <div className="grid gap-3">
            {reorderMutation.isPending && (
              <p className="text-xs text-muted-foreground">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Reihenfolge wird gespeichert…
              </p>
            )}
            {list.map((a, index) => (
              <Card
                key={a.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                onDrop={(e) => e.preventDefault()}
                className="p-4 flex items-center gap-3 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5 flex-shrink-0 text-muted-foreground/50" />
                <div className="h-20 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {a.cover_image_url ? (
                    <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {a.is_featured && <Flame className="mr-1 inline h-3.5 w-3.5 text-primary" />}
                    {a.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {a.is_published ? (
                      <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Veröffentlicht</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Entwurf</Badge>
                    )}
                    <Badge
                      variant="outline"
                      style={{ color: topicColor(a.topic), borderColor: `${topicColor(a.topic)}66` }}
                    >
                      {a.topic}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{AUDIENCE_LABELS[a.audience]}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {a.like_count ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {a.view_count ?? 0}
                    </span>
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
            <VoiceInArticle
              onGenerated={({ title, excerpt, body_html }) => {
                setForm((f) => ({ ...f, title, excerpt, body_html }));
                setEditorKey((k) => k + 1);
              }}
            />

            <div>
              <div className="flex items-center justify-between">
                <Label>Titel *</Label>
                <CharCount value={form.title} limit={60} />
              </div>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slugTouched ? f.slug : slugify(e.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Titel-Highlight</Label>
                  <CharCount value={form.title_highlight} limit={30} />
                </div>
                <Input
                  value={form.title_highlight}
                  onChange={(e) => setForm((f) => ({ ...f, title_highlight: e.target.value }))}
                  placeholder="z. B. zwei Courts, ein Statement."
                />
                <p className="text-xs text-muted-foreground mt-1">Wird in der H1 lime + kursiv angehängt.</p>
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))}
                  placeholder="wird-aus-titel-erzeugt"
                />
                <p className="text-xs text-muted-foreground mt-1">/news/{form.slug || "…"}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Kurzbeschreibung (Vorschau)</Label>
                <CharCount value={form.excerpt} limit={120} />
              </div>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                placeholder="Kurzer Anreißer unter der Card im News-Grid."
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Lead (Einstiegsabsatz)</Label>
                <CharCount value={form.lead} limit={280} />
              </div>
              <Textarea
                value={form.lead}
                onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))}
                rows={3}
                placeholder="Fett gesetzter Einstieg im Artikel-Hero (optional)."
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
              <Label>Titelbild (4:5 Hochformat, min. 1080×1350)</Label>
              {form.cover_image_url && (
                <div className="mb-2 w-36 overflow-hidden rounded-lg">
                  <img src={form.cover_image_url} alt="Vorschau" className="aspect-[4/5] w-full object-cover" />
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
              {uploadingCover && <p className="text-xs text-muted-foreground mt-1">Hochladen…</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Unten liegt ein dunkler Verlauf mit Titel — wichtige Bildelemente in die obere Hälfte legen.
              </p>
              <Input
                className="mt-2"
                value={form.cover_alt}
                onChange={(e) => setForm((f) => ({ ...f, cover_alt: e.target.value }))}
                placeholder="Alt-Text (Barrierefreiheit)"
              />
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
                <Label>Topic</Label>
                <Select
                  value={form.topic}
                  onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: topicColor(topic) }}
                          />
                          {topic}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lesezeit (Minuten)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.reading_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, reading_minutes: parseInt(e.target.value) || 1 }))}
                />
                <button
                  type="button"
                  className="text-xs text-primary mt-1 hover:underline"
                  onClick={() => setForm((f) => ({ ...f, reading_minutes: readingSuggestion }))}
                >
                  Vorschlag aus Wortzahl: {readingSuggestion} Min übernehmen
                </button>
              </div>
              <div>
                <Label>Standort-Verknüpfung</Label>
                <Select
                  value={form.location_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, location_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Standort</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Zeigt die Standort-Karte in der Artikel-Sidebar.</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                />
                <Label>Highlight (obere Rail)</Label>
              </div>
              {form.is_featured && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <Input
                    type="number"
                    className="h-8 w-20"
                    value={form.featured_rank}
                    onChange={(e) => setForm((f) => ({ ...f, featured_rank: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Call-to-Action im Artikel (optional)</summary>
              <div className="mt-3 space-y-3">
                <Input
                  value={form.cta_title}
                  onChange={(e) => setForm((f) => ({ ...f, cta_title: e.target.value }))}
                  placeholder="CTA-Titel, z. B. Slot in München sichern."
                />
                <Input
                  value={form.cta_subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, cta_subtitle: e.target.value }))}
                  placeholder="CTA-Untertitel, z. B. Buchung ab 9 € p. P."
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={form.cta_label}
                    onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                    placeholder="Buttontext (Default: Court buchen)"
                  />
                  <Input
                    value={form.cta_url}
                    onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                    placeholder="Button-Link, z. B. /booking"
                  />
                </div>
              </div>
            </details>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">SEO (optional)</summary>
              <div className="mt-3 space-y-3">
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                  placeholder="SEO-Titel (Default: Artikeltitel)"
                />
                <Textarea
                  value={form.seo_description}
                  onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                  rows={2}
                  placeholder="SEO-Beschreibung (Default: Kurzbeschreibung)"
                />
              </div>
            </details>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
              />
              <Label>Veröffentlicht (für Nutzer sichtbar)</Label>
            </div>
            </div>

            <div className="lg:sticky lg:top-2 self-start">
              <ArticlePreview form={form} />
            </div>
            </div>

            <Button type="submit" className="mt-4 w-full" disabled={saveMutation.isPending || uploadingCover}>
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

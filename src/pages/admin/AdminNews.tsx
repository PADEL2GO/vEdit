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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  UserRound,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArticleEditor } from "@/components/admin/news/ArticleEditor";
import { VoiceInArticle } from "@/components/admin/news/VoiceInArticle";
import { WritingStyleManager, useWritingStyles } from "@/components/admin/news/WritingStyleManager";
import {
  slugify,
  uploadArticleImage,
  useAdminArticles,
  useAdminNewsAuthors,
  useDeleteArticle,
  useDeleteNewsAuthor,
  usePublishArticle,
  useReorderArticles,
  useSaveArticle,
  useSaveNewsAuthor,
} from "@/hooks/useAdminArticles";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { AUDIENCE_LABELS, TOPICS, topicColor, type Article, type ArticleAudience, type NewsAuthor } from "@/types/article";

const ARTICLE_TRANSLATE_FIELDS = ["title", "excerpt", "body_html", "title_highlight", "lead"];

interface ArticleForm {
  title: string;
  title_highlight: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  lead: string;
  body_html: string;
  title_en: string;
  title_highlight_en: string;
  excerpt_en: string;
  lead_en: string;
  body_html_en: string;
  cover_image_url: string;
  cover_alt: string;
  source_url: string;
  audience: ArticleAudience;
  topic: string;
  is_featured: boolean;
  featured_rank: number;
  reading_minutes: number;
  location_id: string;
  author_id: string;
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
  title_en: "",
  title_highlight_en: "",
  excerpt_en: "",
  lead_en: "",
  body_html_en: "",
  cover_image_url: "",
  cover_alt: "",
  source_url: "",
  audience: "everyone",
  topic: "Inside P2G",
  is_featured: false,
  featured_rank: 0,
  reading_minutes: 3,
  location_id: "",
  author_id: "",
  cta_title: "",
  cta_subtitle: "",
  cta_label: "",
  cta_url: "",
  seo_title: "",
  seo_description: "",
  is_published: false,
  sort_order: 0,
};

/** Autoren-Verwaltung: Name, Rolle (DE/EN) und Foto — erscheint als „Geschrieben von". */
function AuthorManager() {
  const { data: authors = [] } = useAdminNewsAuthors();
  const saveMutation = useSaveNewsAuthor();
  const deleteMutation = useDeleteNewsAuthor();
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const save = (a: NewsAuthor, patch: Partial<NewsAuthor>) =>
    saveMutation.mutate({
      id: a.id,
      name: patch.name ?? a.name,
      role: (patch.role ?? a.role) ?? "",
      role_en: (patch.role_en ?? a.role_en) ?? "",
      avatar_url: (patch.avatar_url ?? a.avatar_url) ?? "",
    });

  const uploadAvatar = async (a: NewsAuthor, file: File) => {
    try {
      const url = await uploadArticleImage(file);
      save(a, { avatar_url: url });
    } catch {
      toast.error("Foto-Upload fehlgeschlagen");
    }
  };

  const addAuthor = () => {
    if (!newName.trim()) return;
    saveMutation.mutate(
      { name: newName.trim(), role: newRole.trim(), role_en: "", avatar_url: "" },
      {
        onSuccess: () => {
          setNewName("");
          setNewRole("");
          toast.success("Autor angelegt");
        },
      },
    );
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="font-bold">Autoren</h2>
          <p className="text-sm text-muted-foreground">
            Erscheinen als „Geschrieben von" auf der Artikelseite — Foto anklicken zum Hochladen.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {authors.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <label
              className={a.user_id ? "cursor-default" : "cursor-pointer"}
              title={a.user_id ? "Profilbild kommt aus dem verknüpften Account und bleibt automatisch synchron" : "Foto hochladen"}
            >
              {a.avatar_url ? (
                <img src={a.avatar_url} alt={a.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-primary-foreground">
                  {a.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              {!a.user_id && (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadAvatar(a, file);
                  }}
                />
              )}
            </label>
            <Input
              defaultValue={a.name}
              className="h-8 flex-1"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== a.name) save(a, { name: v });
              }}
            />
            <Input
              defaultValue={a.role ?? ""}
              placeholder="Rolle, z. B. Founder"
              className="h-8 w-44"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (a.role ?? "")) save(a, { role: v });
              }}
            />
            <Input
              defaultValue={a.role_en ?? ""}
              placeholder="Rolle EN"
              className="h-8 w-36"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (a.role_en ?? "")) save(a, { role_en: v });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => {
                if (confirm(`Autor „${a.name}" löschen? Artikel behalten dann keinen Autor.`)) deleteMutation.mutate(a.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          className="h-9 flex-1"
          onKeyDown={(e) => e.key === "Enter" && addAuthor()}
        />
        <Input
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          placeholder="Rolle (optional)"
          className="h-9 w-44"
          onKeyDown={(e) => e.key === "Enter" && addAuthor()}
        />
        <Button onClick={addAuthor} disabled={!newName.trim() || saveMutation.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Anlegen
        </Button>
      </div>
    </Card>
  );
}

const EN_FIELDS = ["title_en", "title_highlight_en", "excerpt_en", "lead_en", "body_html_en"] as const;

const isEmptyHtml = (v: string) => !v.trim() || v.trim() === "<p></p>";

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

      <div
        className="rounded-2xl border border-border p-4"
        style={{ background: `radial-gradient(120% 120% at 85% 0%, ${acc}26, transparent 60%), #000` }}
      >
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
  const publishMutation = usePublishArticle();
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [genUrls, setGenUrls] = useState<string[]>(["", "", ""]);
  const [genFiles, setGenFiles] = useState<File[]>([]);
  const [genStyleId, setGenStyleId] = useState<string>("none");
  const [styleManagerOpen, setStyleManagerOpen] = useState(false);
  const { data: writingStyles = [] } = useWritingStyles();
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft">("all");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: authors = [] } = useAdminNewsAuthors();

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

  const isFiltered = statusFilter !== "all" || topicFilter !== null;
  const visibleList = useMemo(
    () =>
      list.filter(
        (a) =>
          (statusFilter === "all" || (statusFilter === "live") === a.is_published) &&
          (topicFilter === null || a.topic === topicFilter),
      ),
    [list, statusFilter, topicFilter],
  );

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

  // Quell-Dateien (PDF/HTML/TXT) für den Generator sammeln — max. 3 Quellen gesamt (URLs + Dateien).
  const addGenFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    const urlCount = genUrls.filter((u) => u.trim()).length;
    setGenFiles((prev) => {
      let next = [...prev];
      for (const f of picked) {
        const lower = f.name.toLowerCase();
        const isPdf = lower.endsWith(".pdf") || f.type === "application/pdf";
        const isHtml = lower.endsWith(".html") || lower.endsWith(".htm") || f.type === "text/html";
        const isTxt = lower.endsWith(".txt") || f.type === "text/plain";
        if (!isPdf && !isHtml && !isTxt) {
          toast.error(`${f.name}: Bitte nur PDF-, HTML- oder TXT-Dateien`);
          continue;
        }
        if (f.size > 15 * 1024 * 1024) {
          toast.error(`${f.name}: Datei zu groß (max. 15 MB)`);
          continue;
        }
        if (urlCount + next.length >= 3) {
          toast.error("Maximal 3 Quellen (URLs + Dateien) pro Durchlauf");
          break;
        }
        next = [...next, f];
      }
      return next;
    });
  };

  const readFileBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error(`${f.name} konnte nicht gelesen werden`));
      reader.readAsDataURL(f);
    });

  const runGenerator = async () => {
    const urls = genUrls.map((u) => u.trim()).filter(Boolean);
    if (!urls.length && !genFiles.length) return;
    setGenerating(true);
    try {
      const fileKind = (f: File) => {
        const lower = f.name.toLowerCase();
        if (lower.endsWith(".pdf") || f.type === "application/pdf") return "pdf";
        if (lower.endsWith(".txt") || f.type === "text/plain") return "txt";
        return "html";
      };
      const files = await Promise.all(
        genFiles.map(async (f) => ({
          name: f.name,
          kind: fileKind(f),
          data: await readFileBase64(f),
        })),
      );
      const { data, error } = await supabase.functions.invoke("generate-news-from-urls", {
        body: { urls, files, style_id: genStyleId !== "none" ? genStyleId : undefined },
      });
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
        setGenFiles([]);
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
    setTranslatingId(id);
    translateRow({ table: "articles", id, fields: ARTICLE_TRANSLATE_FIELDS })
      .then((result) => {
        toastTranslateResult(result);
        invalidateArticles();
      })
      .finally(() => setTranslatingId(null));
  };

  const isTranslated = (a: Article) => !!a.title_en?.trim() && !!a.body_html_en?.trim();

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
  const [langTab, setLangTab] = useState<"de" | "en">("de");
  const [initialEn, setInitialEn] = useState<Record<string, string>>({});
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
    setInitialEn(Object.fromEntries(EN_FIELDS.map((f) => [f, ""])));
    setLangTab("de");
    setEditorKey(0);
    setDialogOpen(true);
  };

  const openEdit = (a: Article) => {
    setEditId(a.id);
    setExistingPublishedAt(a.published_at);
    setInitialEn(Object.fromEntries(EN_FIELDS.map((f) => [f, (a[f] ?? "") as string])));
    setLangTab("de");
    setEditorKey(0);
    setForm({
      title: a.title,
      title_highlight: a.title_highlight ?? "",
      slug: a.slug ?? "",
      slugTouched: true,
      excerpt: a.excerpt ?? "",
      lead: a.lead ?? "",
      body_html: a.body_html ?? "",
      title_en: a.title_en ?? "",
      title_highlight_en: a.title_highlight_en ?? "",
      excerpt_en: a.excerpt_en ?? "",
      lead_en: a.lead_en ?? "",
      body_html_en: a.body_html_en ?? "",
      cover_image_url: a.cover_image_url ?? "",
      cover_alt: a.cover_alt ?? "",
      source_url: a.source_url ?? "",
      audience: a.audience,
      topic: (a.topic as string) || "Inside P2G",
      is_featured: a.is_featured ?? false,
      featured_rank: a.featured_rank ?? 0,
      reading_minutes: a.reading_minutes ?? 3,
      location_id: a.location_id ?? "",
      author_id: a.author_id ?? "",
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
    const enUpdates: Record<string, string | boolean | null> = {};
    for (const f of EN_FIELDS) {
      if (form[f] !== initialEn[f]) {
        const v = f === "body_html_en" && isEmptyHtml(form[f]) ? "" : form[f].trim();
        enUpdates[f] = v || null;
        enUpdates[`${f}_locked`] = !!v;
      }
    }
    saveMutation.mutate(
      {
        ...payload,
        id: editId ?? undefined,
        existingPublishedAt,
        enUpdates,
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
                Bis zu 3 Quellen — URLs aus der Padel-Presse und/oder hochgeladene Dateien (PDF, z.B.
                Pressemitteilungen, HTML oder TXT-Notizen) — pro Quelle entsteht ein eigenständig
                formulierter Artikel als <strong>Entwurf</strong> — inkl. Topic, Titel-Highlight, Lead,
                Lesezeit und SEO-Feldern (DE + automatische EN-Übersetzung, mit KI-Kennzeichnung und bei
                URLs mit Quellenlink). Optional orientiert sich die KI an einem gespeicherten
                Schreibstil. Danach: Titelbild (4:5) hinterlegen, prüfen und veröffentlichen.
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
            {genFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() => setGenFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={generating}
                      title="Entfernen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Oder Quell-Dateien hochladen (PDF / HTML / TXT):</p>
            <Input type="file" accept=".pdf,.html,.htm,.txt" multiple onChange={addGenFiles} disabled={generating} />
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-muted-foreground">Schreibstil:</span>
              <Select value={genStyleId} onValueChange={setGenStyleId} disabled={generating}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Schreibstil wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standard (kein eigener Stil)</SelectItem>
                  {writingStyles.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setStyleManagerOpen(true)} disabled={generating}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Schreibstile verwalten
              </Button>
            </div>
          </div>
          <Button
            className="mt-3"
            onClick={runGenerator}
            disabled={generating || (!genUrls.some((u) => u.trim()) && !genFiles.length)}
          >
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

        <WritingStyleManager open={styleManagerOpen} onOpenChange={setStyleManagerOpen} />

        <AuthorManager />

        {isLoading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : !visibleList.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Noch keine Artikel vorhanden.
          </Card>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {([["all", "Alle"], ["live", "Live"], ["draft", "Entwurf"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white/[0.04] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setTopicFilter(null)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  topicFilter === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white/[0.04] text-muted-foreground hover:text-foreground"
                }`}
              >
                Alle Topics
              </button>
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    topicFilter === topic
                      ? { background: topicColor(topic), borderColor: topicColor(topic), color: "#0A0A0A" }
                      : { borderColor: "hsl(var(--border))", background: "rgba(255,255,255,0.04)", color: `${topicColor(topic)}D9` }
                  }
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: topicFilter === topic ? "#0A0A0A" : topicColor(topic) }} />
                  {topic}
                </button>
              ))}
              {isFiltered && (
                <span className="text-xs text-muted-foreground">Sortieren per Drag &amp; Drop nur ohne aktive Filter</span>
              )}
            </div>
            {reorderMutation.isPending && (
              <p className="text-xs text-muted-foreground">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Reihenfolge wird gespeichert…
              </p>
            )}
            {visibleList.map((a, index) => (
              <Card
                key={a.id}
                draggable={!isFiltered}
                onDragStart={() => !isFiltered && onDragStart(index)}
                onDragOver={(e) => !isFiltered && onDragOver(e, index)}
                onDragEnd={onDragEnd}
                onDrop={(e) => e.preventDefault()}
                className={`p-4 flex items-center gap-3 ${isFiltered ? "" : "cursor-grab active:cursor-grabbing"}`}
              >
                <GripVertical className={`h-5 w-5 flex-shrink-0 ${isFiltered ? "text-muted-foreground/15" : "text-muted-foreground/50"}`} />
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
                    <Badge
                      variant="outline"
                      style={{ color: topicColor(a.topic), borderColor: `${topicColor(a.topic)}66` }}
                    >
                      {a.topic}
                    </Badge>
                    {isTranslated(a) && (
                      <Badge variant="outline" className="gap-1 border-sky-500/40 text-sky-500">
                        <Languages className="h-3 w-3" /> Übersetzt
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{AUDIENCE_LABELS[a.audience]}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {a.like_count ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {a.view_count ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="mr-1 flex cursor-pointer flex-col items-center gap-1">
                    <Switch
                      checked={a.is_published}
                      disabled={publishMutation.isPending}
                      onCheckedChange={(v) =>
                        publishMutation.mutate({ id: a.id, publish: v, publishedAt: a.published_at })
                      }
                    />
                    <span className={`text-[10.5px] font-semibold ${a.is_published ? "text-green-500" : "text-muted-foreground"}`}>
                      {a.is_published ? "Live" : "Entwurf"}
                    </span>
                  </label>
                  <Button
                    variant="outline"
                    size="icon"
                    title={isTranslated(a) ? "Erneut übersetzen (DE → EN)" : "Ins Englische übersetzen"}
                    onClick={() => runTranslate(a.id)}
                    disabled={translatingId === a.id}
                  >
                    {translatingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                  </Button>
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

            <Tabs value={langTab} onValueChange={(v) => setLangTab(v as "de" | "en")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="de">Deutsch</TabsTrigger>
                <TabsTrigger value="en">English</TabsTrigger>
              </TabsList>

              <TabsContent value="de" className="mt-4 space-y-4">
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
                  <p className="text-xs text-muted-foreground mt-1">Wird in der H1 in Topic-Farbe + kursiv angehängt.</p>
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
                  <Label>Inhalt</Label>
                  <ArticleEditor
                    key={`de-${editId ?? "new"}-${editorKey}`}
                    value={form.body_html}
                    onChange={(html) => setForm((f) => ({ ...f, body_html: html }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="mt-4 space-y-4">
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Leere Felder zeigen auf der englischen Seite automatisch die deutsche Fassung.
                  Von Hand geänderte Felder werden gesperrt und von der Auto-Übersetzung nicht mehr überschrieben.
                </p>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Title (EN)</Label>
                    <CharCount value={form.title_en} limit={60} />
                  </div>
                  <Input
                    value={form.title_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                    placeholder={form.title || "English title"}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Title-Highlight (EN)</Label>
                    <CharCount value={form.title_highlight_en} limit={30} />
                  </div>
                  <Input
                    value={form.title_highlight_en}
                    onChange={(e) => setForm((f) => ({ ...f, title_highlight_en: e.target.value }))}
                    placeholder={form.title_highlight || "—"}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Excerpt (EN)</Label>
                    <CharCount value={form.excerpt_en} limit={120} />
                  </div>
                  <Textarea
                    value={form.excerpt_en}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt_en: e.target.value }))}
                    rows={2}
                    placeholder={form.excerpt || "English excerpt"}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Lead (EN)</Label>
                    <CharCount value={form.lead_en} limit={280} />
                  </div>
                  <Textarea
                    value={form.lead_en}
                    onChange={(e) => setForm((f) => ({ ...f, lead_en: e.target.value }))}
                    rows={3}
                    placeholder={form.lead || "English lead paragraph"}
                  />
                </div>

                <div>
                  <Label>Content (EN)</Label>
                  <ArticleEditor
                    key={`en-${editId ?? "new"}-${editorKey}`}
                    value={form.body_html_en}
                    onChange={(html) => setForm((f) => ({ ...f, body_html_en: html }))}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))}
                  placeholder="wird-aus-titel-erzeugt"
                />
                <p className="text-xs text-muted-foreground mt-1">/news/{form.slug || "…"}</p>
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
                Wird nur auf den 4:5-News-Cards gezeigt (unten liegt ein dunkler Verlauf mit Titel —
                wichtige Bildelemente in die obere Hälfte). Die Artikelseite nutzt als Hero den
                Farb-Shader in Topic-Farbe.
              </p>
              <Input
                className="mt-2"
                value={form.cover_alt}
                onChange={(e) => setForm((f) => ({ ...f, cover_alt: e.target.value }))}
                placeholder="Alt-Text (Barrierefreiheit)"
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
                <Label>Autor</Label>
                <Select
                  value={form.author_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, author_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Autor</SelectItem>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Erscheint als „Geschrieben von".</p>
              </div>
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
              <ArticlePreview
                form={
                  langTab === "en"
                    ? {
                        ...form,
                        title: form.title_en || form.title,
                        title_highlight: form.title_highlight_en || form.title_highlight,
                        excerpt: form.excerpt_en || form.excerpt,
                        lead: form.lead_en || form.lead,
                      }
                    : form
                }
              />
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

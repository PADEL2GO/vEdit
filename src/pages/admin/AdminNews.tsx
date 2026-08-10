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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  FileUp,
  Flame,
  Globe,
  GripVertical,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  Languages,
  Loader2,
  Lock,
  Newspaper,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserX,
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

const AUDIENCE_ICONS: Record<ArticleAudience, typeof Globe> = {
  everyone: Globe,
  logged_in: Lock,
  logged_out: UserX,
};

const fieldLabelClass = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const inputClass = "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]";
const areaClass = "rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px] leading-relaxed";
const selectTriggerClass = "h-[38px] rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13px] font-semibold";
const hintClass = "text-[11px] leading-[1.45] text-[hsl(0_0%_58%)]";
const iconBtnClass =
  "h-[30px] w-[30px] rounded-lg border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_82%)]";

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
  const [pendingDelete, setPendingDelete] = useState<NewsAuthor | null>(null);

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
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-[3px]">
          <span className="font-display text-[15px] font-bold tracking-tight text-foreground">Autoren</span>
          <p className="text-[11.5px] leading-normal text-muted-foreground">
            Erscheinen als „Geschrieben von" auf der Artikelseite — Foto anklicken zum Hochladen.
          </p>
        </div>

        <div className="flex flex-col gap-[9px]">
          {authors.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3 py-[11px]"
            >
              <label
                className={`flex-none ${a.user_id ? "cursor-default" : "cursor-pointer"}`}
                title={a.user_id ? "Profilbild kommt aus dem verknüpften Account und bleibt automatisch synchron" : "Foto hochladen"}
              >
                {a.avatar_url ? (
                  <img
                    src={a.avatar_url}
                    alt={a.name}
                    className="h-[38px] w-[38px] rounded-full border border-[hsl(0_0%_18%)] object-cover"
                  />
                ) : (
                  <span
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border font-display text-xs font-extrabold ${
                      a.user_id
                        ? "border-primary bg-gradient-lime text-primary-foreground"
                        : "border-[hsl(0_0%_18%)] bg-white/[0.06] text-[hsl(0_0%_82%)]"
                    }`}
                  >
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
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Input
                  defaultValue={a.name}
                  className="h-[30px] rounded-lg border-[hsl(0_0%_14%)] bg-white/[0.04] px-[9px] text-[13px] font-semibold"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== a.name) save(a, { name: v });
                  }}
                />
                <div className="flex gap-1.5">
                  <Input
                    defaultValue={a.role ?? ""}
                    placeholder="Rolle, z. B. Founder"
                    className="h-7 min-w-0 flex-1 rounded-lg border-[hsl(0_0%_14%)] bg-white/[0.04] px-[9px] text-[11.5px] text-[hsl(0_0%_78%)]"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (a.role ?? "")) save(a, { role: v });
                    }}
                  />
                  <Input
                    defaultValue={a.role_en ?? ""}
                    placeholder="Rolle EN"
                    className="h-7 min-w-0 flex-1 rounded-lg border-[hsl(200_100%_75%/0.16)] bg-[hsl(200_100%_75%/0.04)] px-[9px] text-[11.5px] text-[hsl(0_0%_78%)]"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (a.role_en ?? "")) save(a, { role_en: v });
                    }}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-none rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                onClick={() => setPendingDelete(a)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[hsl(0_0%_12%)] pt-[13px]">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="h-9 min-w-[110px] flex-1 rounded-[9px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[12.5px]"
            onKeyDown={(e) => e.key === "Enter" && addAuthor()}
          />
          <Input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Rolle (optional)"
            className="h-9 min-w-[110px] flex-1 rounded-[9px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[12.5px]"
            onKeyDown={(e) => e.key === "Enter" && addAuthor()}
          />
          <Button
            onClick={addAuthor}
            disabled={!newName.trim() || saveMutation.isPending}
            className="h-9 rounded-[9px] bg-gradient-lime px-3.5 text-[12.5px] font-bold text-primary-foreground hover:opacity-90"
          >
            <Plus className="mr-1 h-4 w-4" /> Anlegen
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="gap-4 rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[430px] sm:rounded-[20px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <AlertDialogHeader className="space-y-[7px] text-left">
            <AlertDialogTitle className="font-display text-[19px] font-extrabold tracking-tight text-foreground">
              Autor wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-[1.55] text-[hsl(0_0%_68%)]">
              <strong className="text-foreground">„{pendingDelete?.name}“</strong> wird gelöscht.
              Artikel behalten dann keinen Autor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-4 text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
              }}
              className="h-10 rounded-[11px] bg-[#FF6B6B] px-[18px] text-[13.5px] font-bold text-[#0A0A0A] hover:bg-[#ff8585]"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Live-Vorschau</p>

      <div className="w-full">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] border border-[hsl(0_0%_15%)] bg-black">
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
        className="rounded-2xl border border-[hsl(0_0%_15%)] p-4"
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
    <span
      className={`whitespace-nowrap font-mono text-[10.5px] tabular-nums ${over ? "font-semibold text-destructive" : "text-[hsl(0_0%_58%)]"}`}
    >
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
  const [pendingDeleteArticle, setPendingDeleteArticle] = useState<Article | null>(null);
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
      <div className="flex animate-fade-up flex-col gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Artikel für /news, die Startseite und das Dashboard verwalten — Reihenfolge per Drag &amp; Drop.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {!!articles?.length && (
              <Button
                variant="outline"
                onClick={translateAll}
                disabled={!!bulk}
                className="h-9 rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 px-3.5 text-[12.5px] font-bold text-[hsl(0_0%_85%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
              >
                {bulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("admin.translateAllRunning", { done: bulk.done, total: bulk.total })}
                  </>
                ) : (
                  <>
                    <Languages className="mr-2 h-4 w-4" /> {t("admin.translateAll")}
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={openCreate}
              className="h-9 rounded-[10px] bg-gradient-lime px-[15px] text-[13px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.28)] hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" /> Neuer Artikel
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* Wochen-News-Generator: 3 Quell-URLs → 3 KI-Entwürfe (DE + EN) */}
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-[15px]">
              <div className="flex items-start gap-3">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                    Wochen-News-Generator (KI)
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    Bis zu 3 Quellen — URLs aus der Padel-Presse und/oder hochgeladene Dateien (PDF, z.B.
                    Pressemitteilungen, HTML oder TXT-Notizen) — pro Quelle entsteht ein eigenständig
                    formulierter Artikel als <strong className="text-foreground">Entwurf</strong> — inkl. Topic,
                    Titel-Highlight, Lead, Lesezeit und SEO-Feldern (DE + automatische EN-Übersetzung, mit
                    KI-Kennzeichnung und bei URLs mit Quellenlink). Optional orientiert sich die KI an einem
                    gespeicherten Schreibstil. Danach: Titelbild (4:5) hinterlegen, prüfen und veröffentlichen.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-[9px]">
                {genUrls.map((url, idx) => (
                  <Input
                    key={idx}
                    value={url}
                    onChange={(e) => setGenUrls((prev) => prev.map((u, i) => (i === idx ? e.target.value : u)))}
                    placeholder={`https://… (Quelle ${idx + 1}${idx > 0 ? " – optional" : ""})`}
                    disabled={generating}
                    className="h-[38px] rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13px]"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-[9px]">
                <label
                  className={`flex h-11 items-center justify-center gap-2 rounded-[11px] border border-dashed border-[hsl(0_0%_20%)] bg-white/[0.03] transition-colors hover:border-primary/50 ${
                    generating ? "pointer-events-none opacity-60" : "cursor-pointer"
                  }`}
                >
                  <FileUp className="h-[15px] w-[15px] flex-none text-[hsl(0_0%_58%)]" />
                  <span className="px-2.5 text-center text-[12.5px] text-muted-foreground">
                    Quell-Dateien (PDF / HTML / TXT, max. 15 MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.html,.htm,.txt"
                    multiple
                    onChange={addGenFiles}
                    disabled={generating}
                    className="hidden"
                  />
                </label>
                {genFiles.length > 0 && (
                  <div className="flex flex-wrap gap-[7px]">
                    {genFiles.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[hsl(0_0%_16%)] bg-white/5 px-[11px] py-[5px] font-mono text-[11px] text-[hsl(0_0%_82%)]"
                      >
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setGenFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          disabled={generating}
                          title="Entfernen"
                          className="flex text-[hsl(0_0%_55%)] transition-colors hover:text-foreground"
                        >
                          <X className="h-[11px] w-[11px]" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2.5">
                <div className="flex min-w-[min(180px,100%)] flex-1 flex-col gap-[7px]">
                  <span className={fieldLabelClass}>Schreibstil</span>
                  <Select value={genStyleId} onValueChange={setGenStyleId} disabled={generating}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Schreibstil wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Standard (kein eigener Stil)</SelectItem>
                      {writingStyles.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStyleManagerOpen(true)}
                  disabled={generating}
                  className="h-[38px] rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 px-3.5 text-[12.5px] font-bold text-[hsl(0_0%_85%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Schreibstile verwalten
                </Button>
              </div>

              <Button
                onClick={runGenerator}
                disabled={generating || (!genUrls.some((u) => u.trim()) && !genFiles.length)}
                className="h-10 self-start rounded-[11px] bg-gradient-lime px-[17px] text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] hover:opacity-90"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Artikel werden generiert…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-[15px] w-[15px]" /> Artikel generieren
                  </>
                )}
              </Button>
            </div>
          </Card>

          <AuthorManager />
        </div>

        <WritingStyleManager open={styleManagerOpen} onOpenChange={setStyleManagerOpen} />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : !list.length ? (
          <Card className="rounded-2xl border-border bg-gradient-card p-8 text-center text-sm text-muted-foreground">
            <Newspaper className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Noch keine Artikel vorhanden.
          </Card>
        ) : (
          <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-[11px]">
                <div className="flex flex-wrap gap-2">
                  {([["all", "Alle"], ["live", "Live"], ["draft", "Entwurf"]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-bold transition-colors ${
                        statusFilter === key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_70%)] hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTopicFilter(null)}
                    className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-bold transition-colors ${
                      topicFilter === null
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_70%)] hover:text-foreground"
                    }`}
                  >
                    Alle Topics
                  </button>
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                      className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-bold transition-colors ${
                        topicFilter === topic ? "" : "text-[hsl(0_0%_70%)] hover:text-foreground"
                      }`}
                      style={
                        topicFilter === topic
                          ? { background: topicColor(topic), borderColor: topicColor(topic), color: "#0A0A0A" }
                          : { borderColor: "hsl(0 0% 16%)", background: "rgba(255,255,255,0.05)" }
                      }
                    >
                      <span
                        className="h-[7px] w-[7px] flex-none rounded-full"
                        style={{ background: topicFilter === topic ? "#0A0A0A" : topicColor(topic) }}
                      />
                      {topic}
                    </button>
                  ))}
                </div>
                {isFiltered && (
                  <span className="text-[11.5px] text-[#FFC44D]">
                    Sortieren per Drag &amp; Drop nur ohne aktive Filter.
                  </span>
                )}
              </div>

              {reorderMutation.isPending && (
                <p className="text-xs text-muted-foreground">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Reihenfolge wird gespeichert…
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                {visibleList.map((a, index) => {
                  const acc = topicColor(a.topic);
                  const AudienceIcon = AUDIENCE_ICONS[a.audience] ?? Globe;
                  return (
                    <div
                      key={a.id}
                      draggable={!isFiltered}
                      onDragStart={() => !isFiltered && onDragStart(index)}
                      onDragOver={(e) => !isFiltered && onDragOver(e, index)}
                      onDragEnd={onDragEnd}
                      onDrop={(e) => e.preventDefault()}
                      className={`flex flex-wrap items-center gap-3.5 rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-[13px] py-3 transition-colors hover:border-[hsl(0_0%_20%)] ${
                        isFiltered ? "" : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <GripVertical
                        className={`h-4 w-4 flex-none ${isFiltered ? "text-muted-foreground/20" : "text-[hsl(0_0%_40%)]"}`}
                      />
                      <div className="h-[65px] w-[52px] flex-none overflow-hidden rounded-[9px] border border-[hsl(0_0%_15%)] bg-white/[0.04]">
                        {a.cover_image_url ? (
                          <img src={a.cover_image_url} alt={a.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {a.is_featured && <Flame className="h-3.5 w-3.5 flex-none text-[#FF8A1F]" />}
                          <span className="text-[13.5px] font-bold leading-snug text-foreground">{a.title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-[7px]">
                          <Badge
                            variant="outline"
                            className="rounded-full border px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em]"
                            style={{ color: acc, borderColor: `${acc}59`, background: `${acc}1F` }}
                          >
                            {a.topic}
                          </Badge>
                          {isTranslated(a) && (
                            <Badge
                              variant="outline"
                              className="rounded-full border-[hsl(200_100%_75%/0.28)] bg-[hsl(200_100%_75%/0.1)] px-2 py-[3px] font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-[#7FD4FF]"
                            >
                              Übersetzt
                            </Badge>
                          )}
                          <span className="inline-flex items-center gap-[5px] whitespace-nowrap text-[11px] text-muted-foreground">
                            <AudienceIcon className="h-[11px] w-[11px]" />
                            {AUDIENCE_LABELS[a.audience]}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-none items-center gap-3.5">
                        <span className="inline-flex items-center gap-[5px] whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">
                          <Heart className="h-3 w-3" /> {a.like_count ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-[5px] whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">
                          <Eye className="h-3 w-3" /> {a.view_count ?? 0}
                        </span>
                      </div>

                      <div className="flex flex-none items-center gap-2">
                        <label className="mr-1 flex cursor-pointer items-center gap-2">
                          <Switch
                            checked={a.is_published}
                            disabled={publishMutation.isPending}
                            onCheckedChange={(v) =>
                              publishMutation.mutate({ id: a.id, publish: v, publishedAt: a.published_at })
                            }
                          />
                          <span
                            className={`min-w-[48px] text-[11.5px] font-bold ${a.is_published ? "text-primary" : "text-[#FFC44D]"}`}
                          >
                            {a.is_published ? "Live" : "Entwurf"}
                          </span>
                        </label>
                        <Button
                          variant="outline"
                          size="icon"
                          title={isTranslated(a) ? "Erneut übersetzen (DE → EN)" : "Ins Englische übersetzen"}
                          onClick={() => runTranslate(a.id)}
                          disabled={translatingId === a.id}
                          className={`${iconBtnClass} hover:border-[hsl(200_100%_75%/0.4)] hover:bg-white/5 hover:text-[#7FD4FF]`}
                        >
                          {translatingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Languages className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(a)}
                          className={`${iconBtnClass} hover:border-primary/40 hover:bg-white/5 hover:text-primary`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-[30px] w-[30px] rounded-lg border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                          onClick={() => setPendingDeleteArticle(a)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!visibleList.length && (
                <p className="py-5 text-center text-[13.5px] text-muted-foreground">Keine Artikel gefunden</p>
              )}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-32px)] max-w-[1080px] gap-0 overflow-y-auto rounded-[18px] border-[hsl(0_0%_15%)] bg-[linear-gradient(180deg,hsl(0_0%_7%),hsl(0_0%_4%))] p-0 sm:rounded-[22px]">
          <DialogHeader className="sticky top-0 space-y-0 border-b border-[hsl(0_0%_14%)] bg-[hsl(0_0%_6%/0.95)] px-5 py-[18px] pr-12 text-left backdrop-blur-xl sm:px-6 sm:pr-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Artikel</span>
            <DialogTitle className="mt-1 font-display text-[21px] font-extrabold tracking-tight text-foreground">
              {editId ? "Artikel bearbeiten" : "Neuer Artikel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-6">
            <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-5">
                <VoiceInArticle
                  onGenerated={({ title, excerpt, body_html }) => {
                    setForm((f) => ({ ...f, title, excerpt, body_html }));
                    setEditorKey((k) => k + 1);
                  }}
                />

                <Tabs value={langTab} onValueChange={(v) => setLangTab(v as "de" | "en")}>
                  <TabsList className="h-auto w-full justify-start gap-[22px] rounded-none border-b border-[hsl(0_0%_12%)] bg-transparent p-0">
                    <TabsTrigger
                      value="de"
                      className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 pt-0 text-[13.5px] font-bold text-[hsl(0_0%_60%)] shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Deutsch
                    </TabsTrigger>
                    <TabsTrigger
                      value="en"
                      className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 pt-0 text-[13.5px] font-bold text-[hsl(0_0%_60%)] shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      English
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="de" className="mt-5 flex flex-col gap-5">
                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>
                          Titel <span className="text-primary">*</span>
                        </Label>
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
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Titel-Highlight</Label>
                        <CharCount value={form.title_highlight} limit={30} />
                      </div>
                      <Input
                        value={form.title_highlight}
                        onChange={(e) => setForm((f) => ({ ...f, title_highlight: e.target.value }))}
                        placeholder="z. B. zwei Courts, ein Statement."
                        className={inputClass}
                      />
                      <p className={hintClass}>Wird in der H1 in Topic-Farbe + kursiv angehängt.</p>
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Kurzbeschreibung (Vorschau)</Label>
                        <CharCount value={form.excerpt} limit={120} />
                      </div>
                      <Textarea
                        value={form.excerpt}
                        onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                        rows={2}
                        placeholder="Kurzer Anreißer unter der Card im News-Grid."
                        className={areaClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Lead (Einstiegsabsatz)</Label>
                        <CharCount value={form.lead} limit={280} />
                      </div>
                      <Textarea
                        value={form.lead}
                        onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))}
                        rows={3}
                        placeholder="Fett gesetzter Einstieg im Artikel-Hero (optional)."
                        className={areaClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <Label className={fieldLabelClass}>Inhalt</Label>
                      <ArticleEditor
                        key={`de-${editId ?? "new"}-${editorKey}`}
                        value={form.body_html}
                        onChange={(html) => setForm((f) => ({ ...f, body_html: html }))}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="en" className="mt-5 flex flex-col gap-5">
                    <p className="rounded-[11px] border border-[hsl(200_100%_75%/0.2)] bg-[hsl(200_100%_75%/0.06)] px-[13px] py-[11px] text-xs leading-relaxed text-[#7FD4FF]">
                      Leere Felder zeigen auf der englischen Seite automatisch die deutsche Fassung.
                      Von Hand geänderte Felder werden gesperrt und von der Auto-Übersetzung nicht mehr überschrieben.
                    </p>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Title (EN)</Label>
                        <CharCount value={form.title_en} limit={60} />
                      </div>
                      <Input
                        value={form.title_en}
                        onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                        placeholder={form.title || "English title"}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Title-Highlight (EN)</Label>
                        <CharCount value={form.title_highlight_en} limit={30} />
                      </div>
                      <Input
                        value={form.title_highlight_en}
                        onChange={(e) => setForm((f) => ({ ...f, title_highlight_en: e.target.value }))}
                        placeholder={form.title_highlight || "—"}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Excerpt (EN)</Label>
                        <CharCount value={form.excerpt_en} limit={120} />
                      </div>
                      <Textarea
                        value={form.excerpt_en}
                        onChange={(e) => setForm((f) => ({ ...f, excerpt_en: e.target.value }))}
                        rows={2}
                        placeholder={form.excerpt || "English excerpt"}
                        className={areaClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <div className="flex items-center justify-between gap-3">
                        <Label className={fieldLabelClass}>Lead (EN)</Label>
                        <CharCount value={form.lead_en} limit={280} />
                      </div>
                      <Textarea
                        value={form.lead_en}
                        onChange={(e) => setForm((f) => ({ ...f, lead_en: e.target.value }))}
                        rows={3}
                        placeholder={form.lead || "English lead paragraph"}
                        className={areaClass}
                      />
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <Label className={fieldLabelClass}>Content (EN)</Label>
                      <ArticleEditor
                        key={`en-${editId ?? "new"}-${editorKey}`}
                        value={form.body_html_en}
                        onChange={(html) => setForm((f) => ({ ...f, body_html_en: html }))}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <details className="group rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] transition-colors hover:border-[hsl(0_0%_20%)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-[15px] py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13.5px] font-bold text-foreground">Call-to-Action im Artikel (optional)</span>
                      <span className="text-[11.5px] text-muted-foreground">CTA-Titel, Untertitel, Buttontext &amp; Link</span>
                    </span>
                    <ChevronDown className="h-4 w-4 flex-none text-[hsl(0_0%_58%)] transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="flex flex-col gap-3 px-[15px] pb-4">
                    <Input
                      value={form.cta_title}
                      onChange={(e) => setForm((f) => ({ ...f, cta_title: e.target.value }))}
                      placeholder="CTA-Titel, z. B. Slot in München sichern."
                      className={inputClass}
                    />
                    <Input
                      value={form.cta_subtitle}
                      onChange={(e) => setForm((f) => ({ ...f, cta_subtitle: e.target.value }))}
                      placeholder="CTA-Untertitel, z. B. Buchung ab 9 € p. P."
                      className={inputClass}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        value={form.cta_label}
                        onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                        placeholder="Buttontext (Default: Court buchen)"
                        className={inputClass}
                      />
                      <Input
                        value={form.cta_url}
                        onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                        placeholder="Button-Link, z. B. /booking"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </details>

                <details className="group rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] transition-colors hover:border-[hsl(0_0%_20%)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-[15px] py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13.5px] font-bold text-foreground">SEO (optional)</span>
                      <span className="text-[11.5px] text-muted-foreground">SEO-Titel und SEO-Beschreibung</span>
                    </span>
                    <ChevronDown className="h-4 w-4 flex-none text-[hsl(0_0%_58%)] transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="flex flex-col gap-3 px-[15px] pb-4">
                    <Input
                      value={form.seo_title}
                      onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                      placeholder="SEO-Titel (Default: Artikeltitel)"
                      className={inputClass}
                    />
                    <Textarea
                      value={form.seo_description}
                      onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                      rows={2}
                      placeholder="SEO-Beschreibung (Default: Kurzbeschreibung)"
                      className={areaClass}
                    />
                  </div>
                </details>
              </div>

              <div className="flex min-w-0 flex-col gap-4 self-start">
                <div className="rounded-[15px] border border-[hsl(0_0%_12%)] bg-white/[0.025] p-4">
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

                <div className="flex flex-col gap-[9px]">
                  <Label className={fieldLabelClass}>Titelbild · 4:5 Hochformat, min. 1080 × 1350</Label>
                  {form.cover_image_url && (
                    <div className="w-36 overflow-hidden rounded-lg border border-[hsl(0_0%_15%)]">
                      <img src={form.cover_image_url} alt="Vorschau" className="aspect-[4/5] w-full object-cover" />
                    </div>
                  )}
                  <label
                    className={`flex h-[52px] items-center justify-center gap-2 rounded-[11px] border border-dashed border-[hsl(0_0%_20%)] bg-white/[0.03] transition-colors hover:border-primary/50 ${
                      uploadingCover ? "pointer-events-none opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <ImagePlus className="h-4 w-4 flex-none text-[hsl(0_0%_58%)]" />
                    <span className="text-[12.5px] text-muted-foreground">Titelbild wählen</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                  {uploadingCover && <p className={hintClass}>Hochladen…</p>}
                  <p className={hintClass}>
                    Wird nur auf den 4:5-News-Cards gezeigt (unten liegt ein dunkler Verlauf mit Titel —
                    wichtige Bildelemente in die obere Hälfte). Die Artikelseite nutzt als Hero den
                    Farb-Shader in Topic-Farbe.
                  </p>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>Alt-Text (Barrierefreiheit)</Label>
                  <Input
                    value={form.cover_alt}
                    onChange={(e) => setForm((f) => ({ ...f, cover_alt: e.target.value }))}
                    placeholder="Bildbeschreibung"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>Slug (URL)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))}
                    placeholder="wird-aus-titel-erzeugt"
                    className={inputClass}
                  />
                  <p className="font-mono text-[10.5px] tracking-[0.02em] text-muted-foreground">
                    /news/{form.slug || "…"}
                  </p>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>Quelle / Link (optional)</Label>
                  <Input
                    type="url"
                    value={form.source_url}
                    onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                    placeholder="https://…"
                    className={inputClass}
                  />
                  <p className={hintClass}>Wird als „Zur Quelle"-Link unter dem Artikel angezeigt.</p>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>
                    Topic <span className="text-primary">*</span>
                  </Label>
                  <Select value={form.topic} onValueChange={(v) => setForm((f) => ({ ...f, topic: v }))}>
                    <SelectTrigger className={selectTriggerClass}>
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

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>
                    Sichtbar für <span className="text-primary">*</span>
                  </Label>
                  <Select
                    value={form.audience}
                    onValueChange={(v) => setForm((f) => ({ ...f, audience: v as ArticleAudience }))}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">{AUDIENCE_LABELS.everyone}</SelectItem>
                      <SelectItem value="logged_in">{AUDIENCE_LABELS.logged_in}</SelectItem>
                      <SelectItem value="logged_out">{AUDIENCE_LABELS.logged_out}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>Autor</Label>
                  <Select
                    value={form.author_id || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, author_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className={selectTriggerClass}>
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
                  <p className={hintClass}>Erscheint als „Geschrieben von".</p>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>
                    Lesezeit (Minuten) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.reading_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, reading_minutes: parseInt(e.target.value) || 1 }))}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    className="self-start text-[11px] font-semibold text-primary hover:underline"
                    onClick={() => setForm((f) => ({ ...f, reading_minutes: readingSuggestion }))}
                  >
                    Vorschlag aus Wortzahl: {readingSuggestion} Min übernehmen
                  </button>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className={fieldLabelClass}>Standort-Verknüpfung</Label>
                  <Select
                    value={form.location_id || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, location_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className={selectTriggerClass}>
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
                  <p className={hintClass}>Zeigt die Standort-Karte in der Artikel-Sidebar.</p>
                </div>

                <div className="flex items-center gap-[13px] rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Label className="text-[13px] font-bold text-foreground">Highlight (obere Rail)</Label>
                    <span className="text-[11.5px] text-muted-foreground">Position nur bei aktivem Highlight</span>
                    {form.is_featured && (
                      <div className="mt-2 flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">Position</Label>
                        <Input
                          type="number"
                          className="h-8 w-20 rounded-lg border-[hsl(0_0%_15%)] bg-white/[0.04] font-mono text-xs"
                          value={form.featured_rank}
                          onChange={(e) => setForm((f) => ({ ...f, featured_rank: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                  />
                </div>

                <div className="flex items-center gap-[13px] rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Label className="text-[13px] font-bold text-foreground">Veröffentlicht</Label>
                    <span className="text-[11.5px] text-muted-foreground">Für Nutzer sichtbar</span>
                  </div>
                  <Switch
                    checked={form.is_published}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={saveMutation.isPending || uploadingCover}
                  className="h-[46px] w-full rounded-xl bg-gradient-lime text-sm font-bold text-primary-foreground shadow-[0_0_24px_hsl(71_91%_51%/0.28)] hover:opacity-90"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Speichern…
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteArticle}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteArticle(null);
        }}
      >
        <AlertDialogContent className="gap-4 rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[430px] sm:rounded-[20px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <AlertDialogHeader className="space-y-[7px] text-left">
            <AlertDialogTitle className="font-display text-[19px] font-extrabold tracking-tight text-foreground">
              Artikel wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-[1.55] text-[hsl(0_0%_68%)]">
              Der Artikel <strong className="text-foreground">„{pendingDeleteArticle?.title}“</strong>{" "}
              wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-4 text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteArticle) deleteMutation.mutate(pendingDeleteArticle.id);
              }}
              className="h-10 rounded-[11px] bg-[#FF6B6B] px-[18px] text-[13.5px] font-bold text-[#0A0A0A] hover:bg-[#ff8585]"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

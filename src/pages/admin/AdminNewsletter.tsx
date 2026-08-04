import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Save,
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Heading2,
  AlignLeft,
  Image as ImageIcon,
  MousePointerClick,
  MailCheck,
  Clock,
  MailX,
  RotateCcw,
  Pencil,
  FilePlus2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Block model ────────────────────────────────────────────────────────────

type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "button"; label: string; url: string };

interface Campaign {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

// newsletter_campaigns / newsletter_sends and the new newsletter_subscribers
// columns are not in the generated Supabase types yet — table access goes
// through this cast (repo convention; see CLAUDE.md).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── HTML preview renderer (mirrors supabase/functions/_shared/newsletter.ts) ──

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderBlock = (b: Block): string => {
  switch (b?.type) {
    case "heading":
      return `<h2 style="margin:24px 0 8px;font-size:20px;font-weight:800;color:#C7F011;">${esc(b.text)}</h2>`;
    case "text":
      return `<p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.6;">${esc(b.text).replace(/\n/g, "<br>")}</p>`;
    case "image":
      return `<img src="${esc(b.url)}" alt="${esc(b.alt ?? "")}" style="display:block;width:100%;max-width:100%;border-radius:12px;margin:0 0 20px;" />`;
    case "button":
      return `<div style="text-align:center;margin:8px 0 24px;"><a href="${esc(b.url)}" style="display:inline-block;background:#C7F011;color:#000;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">${esc(b.label)}</a></div>`;
    default:
      return "";
  }
};

const renderNewsletterHtml = (subject: string, preheader: string, blocks: Block[]): string => {
  const body = blocks.map(renderBlock).join("");
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">${pre}
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:40px 20px;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#101010;border:1px solid rgba(199,240,17,0.18);border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <tr><td style="padding:28px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:26px;font-weight:800;color:#FAFAFA;letter-spacing:-0.5px;">PADEL<span style="color:#C7F011;">2</span>GO</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">${body}</td></tr>
      <tr><td style="padding:20px 32px;background:rgba(0,0,0,0.3);text-align:center;">
        <p style="margin:0 0 6px;color:#5a5a5a;font-size:12px;">© ${new Date().getFullYear()} PADEL2GO ·
          <a href="https://www.padel2go-official.de/impressum" style="color:#8a8a8a;">Impressum</a></p>
        <p style="margin:0;color:#5a5a5a;font-size:12px;">
          Du erhältst diese E-Mail als Newsletter-Abonnent. <a href="#" style="color:#C7F011;">Abmelden</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "border-[hsl(0_0%_18%)] bg-white/5 text-[hsl(0_0%_72%)]",
  sending: "border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] text-[#FFC44D]",
  sent: "border-primary/30 bg-primary/10 text-primary",
  failed: "border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  sending: "Versand läuft",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
};

const BLOCK_META: Record<Block["type"], { label: string; icon: LucideIcon; badge: string }> = {
  heading: { label: "Überschrift", icon: Heading2, badge: "border-primary/30 bg-primary/10 text-primary" },
  text: { label: "Text", icon: AlignLeft, badge: "border-[hsl(0_0%_18%)] bg-white/5 text-[hsl(0_0%_82%)]" },
  image: {
    label: "Bild",
    icon: ImageIcon,
    badge: "border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] text-[#7FD4FF]",
  },
  button: {
    label: "Button",
    icon: MousePointerClick,
    badge: "border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] text-[#FFC44D]",
  },
};

const FIELD_INPUT = "h-[38px] rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 text-[13px]";

const MOVE_BTN =
  "h-[26px] w-[26px] rounded-[7px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground disabled:text-[hsl(0_0%_30%)]";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNewsletter() {
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [counts, setCounts] = useState({ confirmed: 0, pending: 0, unsubscribed: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [savingDraft, setSavingDraft] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Synchronous in-flight guard: React state updates are async, so a state flag
  // alone is set too late to stop a fast double-click. busyRef flips immediately
  // (before the first await) so only one save/test/launch action can run at a
  // time — prevents a double-launch creating two campaigns + double-mailing.
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadCounts = async () => {
    const table = () => db.from("newsletter_subscribers").select("*", { count: "exact", head: true });
    const [conf, pend, unsub] = await Promise.all([
      table().not("confirmed_at", "is", null).is("unsubscribed_at", null),
      table().is("confirmed_at", null).is("unsubscribed_at", null),
      table().not("unsubscribed_at", "is", null),
    ]);
    setCounts({
      confirmed: conf.count ?? 0,
      pending: pend.count ?? 0,
      unsubscribed: unsub.count ?? 0,
    });
  };

  const loadCampaigns = async () => {
    const { data } = await db
      .from("newsletter_campaigns")
      .select("id, subject, status, recipient_count, sent_count, failed_count, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setCampaigns((data ?? []) as Campaign[]);
  };

  useEffect(() => {
    loadCounts();
    loadCampaigns();
  }, []);

  // ── Block ops ───────────────────────────────────────────────────────────────
  const addBlock = (b: Block) => setBlocks((p) => [...p, b]);
  const updateBlock = (i: number, patch: Partial<Block>) =>
    setBlocks((p) => p.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b)));
  const removeBlock = (i: number) => setBlocks((p) => p.filter((_, j) => j !== i));
  const moveBlock = (i: number, dir: -1 | 1) =>
    setBlocks((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const uploadImage = async (file: File): Promise<string> => {
    const path = `newsletter/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const handleBlockImage = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIndex(i);
    try {
      const url = await uploadImage(file);
      updateBlock(i, { url });
      toast.success("Bild hochgeladen");
    } catch (err) {
      toast.error((err as Error).message || "Upload fehlgeschlagen");
    } finally {
      setUploadingIndex(null);
    }
  };

  // ── Campaign actions ──────────────────────────────────────────────────────
  const resetEditor = () => {
    setCampaignId(null);
    setSubject("");
    setPreheader("");
    setBlocks([]);
  };

  const editCampaign = (c: Campaign) => {
    db.from("newsletter_campaigns")
      .select("id, subject, preheader, blocks")
      .eq("id", c.id)
      .single()
      .then(({ data }: { data: { subject?: string; preheader?: string; blocks?: Block[] } | null }) => {
        if (!data) return;
        setCampaignId(c.id);
        setSubject(data.subject ?? "");
        setPreheader(data.preheader ?? "");
        setBlocks((data.blocks ?? []) as Block[]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  };

  // Unguarded save — the actual persistence, shared by all three actions. The
  // public actions own the busy guard; this must NOT re-acquire it (they call it
  // internally after already holding the guard). Returns the campaign id.
  const persist = async (): Promise<string | null> => {
    if (!subject.trim()) {
      toast.error("Bitte einen Betreff eingeben");
      return null;
    }
    const payload = { subject, preheader, blocks };
    if (campaignId) {
      const { error } = await db.from("newsletter_campaigns").update(payload).eq("id", campaignId);
      if (error) throw error;
      await loadCampaigns();
      return campaignId;
    }
    const { data, error } = await db
      .from("newsletter_campaigns")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    const id = (data as { id: string }).id;
    setCampaignId(id);
    await loadCampaigns();
    return id;
  };

  const saveDraft = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setSavingDraft(true);
    try {
      const id = await persist();
      if (id) toast.success("Entwurf gespeichert");
    } catch (err) {
      toast.error((err as Error).message || "Speichern fehlgeschlagen");
    } finally {
      setSavingDraft(false);
      busyRef.current = false;
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setTesting(true);
    try {
      const id = await persist();
      if (!id) return;
      const { data: u } = await supabase.auth.getUser();
      const testTo = u.user?.email;
      if (!testTo) {
        toast.error("Keine E-Mail-Adresse für den Test gefunden");
        return;
      }
      const { error } = await supabase.functions.invoke("newsletter-send", {
        body: { campaign_id: id, test_to: testTo },
      });
      toast[error ? "error" : "success"](
        error ? "Test fehlgeschlagen" : `Test-Mail an ${testTo} verschickt`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Test fehlgeschlagen");
    } finally {
      setTesting(false);
      busyRef.current = false;
      setBusy(false);
    }
  };

  const launch = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setSending(true);
    try {
      const id = await persist();
      if (!id) return;
      if (!window.confirm("Newsletter jetzt an ALLE bestätigten Abonnenten senden?")) return;
      const { error } = await supabase.functions.invoke("newsletter-send", {
        body: { campaign_id: id },
      });
      toast[error ? "error" : "success"](error ? "Versand fehlgeschlagen" : "Versand gestartet");
      await loadCampaigns();
    } catch (err) {
      toast.error((err as Error).message || "Versand fehlgeschlagen");
    } finally {
      setSending(false);
      busyRef.current = false;
      setBusy(false);
    }
  };

  const resetCampaign = async (id: string) => {
    const { error } = await db.from("newsletter_campaigns").update({ status: "draft" }).eq("id", id);
    if (error) {
      toast.error("Zurücksetzen fehlgeschlagen");
      return;
    }
    toast.success("Status auf Entwurf zurückgesetzt");
    await loadCampaigns();
  };

  const previewHtml = useMemo(
    () => renderNewsletterHtml(subject, preheader, blocks),
    [subject, preheader, blocks],
  );

  // ── Block editor ──────────────────────────────────────────────────────────
  const renderEditor = (b: Block, i: number) => {
    const meta = BLOCK_META[b.type];
    const MetaIcon = meta.icon;
    return (
      <div
        key={i}
        className="flex flex-col gap-2.5 rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.03] p-3.5"
      >
        <div className="flex items-center justify-between gap-3">
          <Badge
            variant="outline"
            className={`gap-[7px] whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-normal uppercase tracking-[0.1em] ${meta.badge}`}
          >
            <MetaIcon className="h-[11px] w-[11px]" />
            {meta.label}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className={MOVE_BTN}
              onClick={() => moveBlock(i, -1)}
              disabled={i === 0}
              title="Nach oben"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={MOVE_BTN}
              onClick={() => moveBlock(i, 1)}
              disabled={i === blocks.length - 1}
              title="Nach unten"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[26px] w-[26px] rounded-[7px] border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
              onClick={() => removeBlock(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {b.type === "heading" && (
          <Input
            value={b.text}
            onChange={(e) => updateBlock(i, { text: e.target.value })}
            placeholder="Überschrift"
            className={FIELD_INPUT}
          />
        )}

        {b.type === "text" && (
          <Textarea
            value={b.text}
            onChange={(e) => updateBlock(i, { text: e.target.value })}
            placeholder="Textabsatz… (Zeilenumbrüche bleiben erhalten)"
            className="min-h-[100px] rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 text-[13px] leading-relaxed"
          />
        )}

        {b.type === "image" && (
          <div className="flex flex-col gap-[9px]">
            {b.url ? (
              <img
                src={b.url}
                alt={b.alt ?? ""}
                className="h-[120px] w-full rounded-[11px] border border-[hsl(0_0%_15%)] object-cover"
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-[9px]">
              <label className="inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 px-3 text-xs font-bold text-[hsl(0_0%_82%)] transition-colors hover:border-primary/40 hover:text-primary">
                {uploadingIndex === i ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-3 w-3" />
                    {b.url ? "Bild ersetzen" : "Bild hochladen"}
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleBlockImage(i, e)}
                  disabled={uploadingIndex === i}
                />
              </label>
              <Input
                value={b.alt ?? ""}
                onChange={(e) => updateBlock(i, { alt: e.target.value })}
                placeholder="Alt-Text (optional)"
                className="h-8 min-w-[130px] flex-1 rounded-lg border-[hsl(0_0%_16%)] bg-white/5 text-xs"
              />
            </div>
          </div>
        )}

        {b.type === "button" && (
          <div className="flex flex-wrap gap-[9px]">
            <Input
              value={b.label}
              onChange={(e) => updateBlock(i, { label: e.target.value })}
              placeholder="Button-Text"
              className={`min-w-[130px] flex-1 ${FIELD_INPUT}`}
            />
            <Input
              value={b.url}
              onChange={(e) => updateBlock(i, { url: e.target.value })}
              placeholder="https://…"
              className="h-[38px] min-w-[150px] flex-1 rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 font-mono text-xs"
            />
          </div>
        )}
      </div>
    );
  };

  const kpis = [
    { label: "Bestätigte Abonnenten", value: counts.confirmed, icon: MailCheck, color: "text-primary" },
    { label: "Ausstehende Bestätigung", value: counts.pending, icon: Clock, color: "text-[#FFC44D]" },
    { label: "Abgemeldet", value: counts.unsubscribed, icon: MailX, color: "text-[#FF6B6B]" },
  ];

  return (
    <AdminLayout>
      <div className="flex animate-fade-up flex-col gap-[18px]">
        {/* Kopfzeile */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Komponiere den PADEL2GO-Newsletter und versende ihn an bestätigte Abonnenten.
          </p>
          <Button
            variant="outline"
            onClick={resetEditor}
            className="h-9 gap-[7px] rounded-[10px] border-[hsl(0_0%_16%)] bg-white/5 px-3.5 text-[12.5px] font-bold text-[hsl(0_0%_85%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Neuer Entwurf
          </Button>
        </div>

        {/* Abonnenten-KPIs */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-2xl border-border bg-gradient-card p-5">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[12.5px] font-semibold text-[hsl(0_0%_72%)]">{k.label}</span>
                  <k.icon className={`h-[15px] w-[15px] flex-none ${k.color}`} />
                </div>
                <span className={`font-mono text-[27px] font-bold leading-none ${k.color}`}>
                  {k.value.toLocaleString("de-DE")}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Editor + Vorschau/Verlauf */}
        <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Editor + Aktionen */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">Inhalt</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {campaignId ? "Bestehenden Entwurf bearbeiten" : "Neuen Entwurf komponieren"}
                  </span>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Betreff<span className="text-primary"> *</span>
                  </Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Betreff der E-Mail"
                    className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]"
                  />
                </div>
                <div className="flex flex-col gap-[7px]">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Vorschautext (Preheader)
                  </Label>
                  <Input
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]"
                  />
                  <span className="text-[11.5px] text-muted-foreground">
                    Kurzer Text, der in der Inbox-Vorschau erscheint.
                  </span>
                </div>

                <div className="flex flex-col gap-[11px] border-t border-[hsl(0_0%_12%)] pt-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Blöcke
                    </span>
                    <div className="flex flex-wrap gap-[7px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBlock({ type: "heading", text: "" })}
                        className="h-[30px] gap-1.5 rounded-lg border-primary/30 bg-primary/[0.09] px-[11px] text-[11.5px] font-bold text-primary hover:bg-primary/[0.18] hover:text-primary"
                      >
                        <Heading2 className="h-3 w-3" /> Überschrift
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBlock({ type: "text", text: "" })}
                        className="h-[30px] gap-1.5 rounded-lg border-primary/30 bg-primary/[0.09] px-[11px] text-[11.5px] font-bold text-primary hover:bg-primary/[0.18] hover:text-primary"
                      >
                        <AlignLeft className="h-3 w-3" /> Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBlock({ type: "image", url: "", alt: "" })}
                        className="h-[30px] gap-1.5 rounded-lg border-primary/30 bg-primary/[0.09] px-[11px] text-[11.5px] font-bold text-primary hover:bg-primary/[0.18] hover:text-primary"
                      >
                        <ImageIcon className="h-3 w-3" /> Bild
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBlock({ type: "button", label: "", url: "" })}
                        className="h-[30px] gap-1.5 rounded-lg border-primary/30 bg-primary/[0.09] px-[11px] text-[11.5px] font-bold text-primary hover:bg-primary/[0.18] hover:text-primary"
                      >
                        <MousePointerClick className="h-3 w-3" /> Button
                      </Button>
                    </div>
                  </div>

                  {blocks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Noch keine Blöcke — füge oben Inhalte hinzu.
                    </p>
                  )}
                  {blocks.length > 0 && (
                    <div className="flex flex-col gap-2.5">{blocks.map((b, i) => renderEditor(b, i))}</div>
                  )}
                </div>
              </div>
            </Card>

            {/* Aktionen */}
            <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
              <div className="flex flex-wrap gap-2.5">
                <Button
                  onClick={saveDraft}
                  disabled={busy}
                  variant="outline"
                  className="h-11 min-w-[150px] flex-1 gap-2 rounded-xl border-[hsl(0_0%_16%)] bg-white/5 text-[13.5px] font-bold text-[hsl(0_0%_85%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                >
                  {savingDraft ? (
                    <Loader2 className="h-[15px] w-[15px] animate-spin" />
                  ) : (
                    <Save className="h-[15px] w-[15px]" />
                  )}
                  Entwurf speichern
                </Button>
                <Button
                  onClick={sendTest}
                  disabled={busy}
                  variant="secondary"
                  className="h-11 min-w-[150px] flex-1 gap-2 rounded-xl border border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.08)] text-[13.5px] font-bold text-[#7FD4FF] hover:bg-[hsl(200_100%_75%/0.16)]"
                >
                  {testing ? (
                    <Loader2 className="h-[15px] w-[15px] animate-spin" />
                  ) : (
                    <MailCheck className="h-[15px] w-[15px]" />
                  )}
                  Test an mich
                </Button>
                <Button
                  onClick={launch}
                  disabled={busy}
                  className="h-11 min-w-[150px] flex-1 gap-2 rounded-xl bg-gradient-lime text-[13.5px] font-bold text-primary-foreground shadow-[0_0_24px_hsl(71_91%_51%/0.28)] transition-opacity hover:opacity-90"
                >
                  {sending ? (
                    <Loader2 className="h-[15px] w-[15px] animate-spin" />
                  ) : (
                    <Send className="h-[15px] w-[15px]" />
                  )}
                  An alle senden
                </Button>
              </div>
            </Card>
          </div>

          {/* Vorschau + Verlauf */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">
                    Live-Vorschau
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    So sieht der Newsletter im Postfach aus
                  </span>
                </div>
                <iframe
                  title="Vorschau"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[600px] w-full rounded-[15px] border border-[hsl(0_0%_15%)] bg-black"
                />
              </div>
            </Card>

            <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground">Verlauf</span>
                  <span className="text-[12.5px] text-muted-foreground">Zuletzt erstellte Kampagnen</span>
                </div>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Noch keine Kampagnen.</p>
                ) : (
                  <div className="flex flex-col gap-[9px]">
                    {campaigns.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.03] px-[13px] py-3"
                      >
                        <div className="flex min-w-[160px] flex-1 flex-col gap-[3px]">
                          <span className="truncate text-[13px] font-semibold text-foreground">
                            {c.subject || "(kein Betreff)"}
                          </span>
                          <span className="font-mono text-[10.5px] text-muted-foreground">
                            {c.sent_count}/{c.recipient_count} gesendet
                            {c.failed_count > 0 && ` · ${c.failed_count} fehlgeschlagen`}
                            {c.sent_at && ` · ${new Date(c.sent_at).toLocaleString("de-DE")}`}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`flex-none gap-[7px] whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-normal uppercase tracking-[0.1em] ${STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}`}
                        >
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                        {c.status === "sending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetCampaign(c.id)}
                            className="h-7 flex-none gap-1.5 rounded-lg border border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.09)] px-[11px] text-[11.5px] font-bold text-[#FFC44D] hover:bg-[hsl(41_100%_65%/0.18)] hover:text-[#FFC44D]"
                          >
                            <RotateCcw className="h-3 w-3" /> Zurücksetzen
                          </Button>
                        )}
                        {c.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editCampaign(c)}
                            className="h-7 flex-none gap-1.5 rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 px-[11px] text-[11.5px] font-bold text-[hsl(0_0%_82%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" /> Bearbeiten
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

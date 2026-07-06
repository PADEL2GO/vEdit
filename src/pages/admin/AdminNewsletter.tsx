import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowUp,
  ArrowDown,
  Heading as HeadingIcon,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  CheckCircle2,
  Clock,
  MailX,
  RotateCcw,
  Pencil,
  FilePlus2,
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
  draft: "bg-muted text-muted-foreground border-border",
  sending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  sent: "bg-green-500/15 text-green-600 border-green-500/30",
  failed: "bg-red-500/15 text-red-500 border-red-500/30",
};

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
  const blockLabel = (b: Block) =>
    b.type === "heading" ? "Überschrift" : b.type === "text" ? "Text" : b.type === "image" ? "Bild" : "Button";

  const renderEditor = (b: Block, i: number) => (
    <div key={i} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {blockLabel(b)}
        </Badge>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveBlock(i, 1)}
            disabled={i === blocks.length - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeBlock(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {b.type === "heading" && (
        <Input
          value={b.text}
          onChange={(e) => updateBlock(i, { text: e.target.value })}
          placeholder="Überschrift"
        />
      )}

      {b.type === "text" && (
        <Textarea
          value={b.text}
          onChange={(e) => updateBlock(i, { text: e.target.value })}
          placeholder="Textabsatz… (Zeilenumbrüche bleiben erhalten)"
          className="min-h-[100px]"
        />
      )}

      {b.type === "image" && (
        <div className="space-y-2">
          {b.url ? (
            <img src={b.url} alt={b.alt ?? ""} className="w-full rounded-lg object-cover max-h-48" />
          ) : null}
          <label className="flex items-center justify-center w-full h-11 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors text-sm text-muted-foreground">
            {uploadingIndex === i ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : b.url ? (
              "Bild ersetzen"
            ) : (
              "Bild hochladen"
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
          />
        </div>
      )}

      {b.type === "button" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={b.label}
            onChange={(e) => updateBlock(i, { label: e.target.value })}
            placeholder="Button-Text"
          />
          <Input
            value={b.url}
            onChange={(e) => updateBlock(i, { url: e.target.value })}
            placeholder="https://…"
          />
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Newsletter
            </h1>
            <p className="text-muted-foreground mt-1">
              Komponiere den PADEL2GO-Newsletter und versende ihn an bestätigte Abonnenten.
            </p>
          </div>
          <Button variant="outline" onClick={resetEditor}>
            <FilePlus2 className="h-4 w-4 mr-2" />
            Neuer Entwurf
          </Button>
        </div>

        {/* Subscriber counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{counts.confirmed}</div>
                <div className="text-xs text-muted-foreground">Bestätigte Abonnenten</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{counts.pending}</div>
                <div className="text-xs text-muted-foreground">Ausstehende Bestätigung</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <MailX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{counts.unsubscribed}</div>
                <div className="text-xs text-muted-foreground">Abgemeldet</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Composer + Preview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Composer */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Inhalt</CardTitle>
              <CardDescription>
                {campaignId ? "Bestehenden Entwurf bearbeiten" : "Neuen Entwurf komponieren"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 border-t border-border/50 pt-4">
              <div className="space-y-1">
                <Label className="text-sm">Betreff</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff der E-Mail"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Vorschautext (Preheader)</Label>
                <Input
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Kurzer Text, der in der Inbox-Vorschau erscheint"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm">Blöcke</Label>
                {blocks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Noch keine Blöcke — füge unten Inhalte hinzu.
                  </p>
                )}
                {blocks.map((b, i) => renderEditor(b, i))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => addBlock({ type: "heading", text: "" })}>
                  <HeadingIcon className="h-4 w-4 mr-1.5" /> Überschrift
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock({ type: "text", text: "" })}>
                  <Type className="h-4 w-4 mr-1.5" /> Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock({ type: "image", url: "", alt: "" })}>
                  <ImageIcon className="h-4 w-4 mr-1.5" /> Bild
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock({ type: "button", label: "", url: "" })}
                >
                  <MousePointerClick className="h-4 w-4 mr-1.5" /> Button
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Live-Vorschau</CardTitle>
              <CardDescription>So sieht der Newsletter im Postfach aus</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/50 pt-4">
              <iframe
                title="Vorschau"
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-[600px] rounded-xl border border-border bg-black"
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="border-border">
          <CardContent className="flex flex-wrap gap-3 pt-5 pb-5">
            <Button onClick={saveDraft} disabled={busy} variant="outline">
              {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Entwurf speichern
            </Button>
            <Button onClick={sendTest} disabled={busy} variant="secondary">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Test an mich
            </Button>
            <Button onClick={launch} disabled={busy}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              An alle senden
            </Button>
          </CardContent>
        </Card>

        {/* Campaign history */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Verlauf</CardTitle>
            <CardDescription>Zuletzt erstellte Kampagnen</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-border/50 pt-4">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Kampagnen.</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5 flex-wrap"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{c.subject || "(kein Betreff)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.sent_count}/{c.recipient_count} gesendet
                        {c.failed_count > 0 && ` · ${c.failed_count} fehlgeschlagen`}
                        {c.sent_at && ` · ${new Date(c.sent_at).toLocaleString("de-DE")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}>
                        {c.status}
                      </Badge>
                      {c.status === "sending" && (
                        <Button variant="ghost" size="sm" onClick={() => resetCampaign(c.id)}>
                          <RotateCcw className="h-4 w-4 mr-1.5" /> Zurücksetzen
                        </Button>
                      )}
                      {c.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => editCampaign(c)}>
                          <Pencil className="h-4 w-4 mr-1.5" /> Bearbeiten
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

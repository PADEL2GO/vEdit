import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface WritingStyle {
  id: string;
  name: string;
  sample_text: string;
}

export function useWritingStyles() {
  return useQuery({
    queryKey: ["news-writing-styles"],
    queryFn: async (): Promise<WritingStyle[]> => {
      const { data, error } = await (supabase as any)
        .from("news_writing_styles")
        .select("id, name, sample_text")
        .order("name");
      if (error) throw error;
      return (data ?? []) as WritingStyle[];
    },
  });
}

export function WritingStyleManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: styles = [], isLoading } = useWritingStyles();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<WritingStyle | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sample, setSample] = useState("");

  const formOpen = creating || !!editing;

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setName("");
    setSample("");
  };

  const startEdit = (s: WritingStyle) => {
    setEditing(s);
    setCreating(false);
    setName(s.name);
    setSample(s.sample_text);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["news-writing-styles"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Bitte einen Namen für den Schreibstil angeben");
      if (!sample.trim()) throw new Error("Bitte mindestens einen Beispieltext einfügen");
      const payload = { name: name.trim(), sample_text: sample.trim(), updated_at: new Date().toISOString() };
      const table = (supabase as any).from("news_writing_styles");
      const { error } = editing
        ? await table.update(payload).eq("id", editing.id)
        : await table.insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(editing ? "Schreibstil aktualisiert" : "Schreibstil gespeichert");
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("news_writing_styles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Schreibstil gelöscht");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-32px)] max-w-[560px] gap-[17px] overflow-y-auto rounded-[20px] border-[hsl(0_0%_15%)] bg-[linear-gradient(180deg,hsl(0_0%_7%),hsl(0_0%_4%))] p-6">
        <DialogHeader className="space-y-0 pr-8 text-left">
          <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Schreibstile für den KI-Generator
          </DialogTitle>
          <DialogDescription className="mt-[5px] text-[12.5px] leading-[1.5] text-[hsl(0_0%_65%)]">
            Speichere eigene Texte oder Artikel als Stil-Vorlage. Die KI übernimmt daraus Tonalität,
            Satzbau und Struktur — nie Inhalte. Je mehr Beispieltext, desto genauer trifft sie den Stil.
          </DialogDescription>
        </DialogHeader>

        {formOpen ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Übersicht
            </button>
            <div className="flex flex-col gap-[7px]">
              <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Name<span className="text-primary"> *</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='z. B. "Locker & direkt" oder "Sachlich / Pressestil"'
                className="h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] px-[13px] text-[13.5px] text-foreground focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Beispieltexte<span className="text-primary"> *</span>
              </Label>
              <Textarea
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                rows={14}
                placeholder={"Einen oder mehrere Beispiel-Artikel bzw. Texte hier einfügen — mehrere Texte einfach durch Leerzeilen trennen."}
                className="rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] px-[13px] py-[11px] text-[13px] leading-[1.55] text-foreground focus-visible:ring-1 focus-visible:ring-primary"
              />
              <p className="text-[11.5px] text-[hsl(0_0%_58%)]">
                {sample.length.toLocaleString("de-DE")} Zeichen — die KI nutzt bis zu 8.000 Zeichen als Stil-Referenz.
              </p>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={closeForm}
                disabled={saveMutation.isPending}
                className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-4 text-[13px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/[0.08] hover:text-foreground"
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-10 rounded-[11px] bg-gradient-lime px-[18px] text-[13px] font-bold text-primary-foreground hover:opacity-90"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editing ? "Speichern" : "Stil anlegen"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {isLoading ? (
              <p className="text-[13px] text-muted-foreground">Laden…</p>
            ) : styles.length === 0 ? (
              <p className="text-[13px] leading-[1.55] text-muted-foreground">
                Noch keine Schreibstile gespeichert. Lege den ersten an und füge eigene Texte als Vorlage ein.
              </p>
            ) : (
              styles.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{s.name}</p>
                    <p className="whitespace-nowrap font-mono text-[11px] text-[hsl(0_0%_65%)]">
                      {s.sample_text.length.toLocaleString("de-DE")} Zeichen Beispieltext
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(s)}
                    className="h-[30px] rounded-lg border-[hsl(0_0%_16%)] bg-white/5 px-[11px] text-xs font-bold text-[hsl(0_0%_82%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(s.id)}
                    disabled={deleteMutation.isPending}
                    title="Löschen"
                    className="h-[30px] w-[30px] flex-none rounded-lg border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                  >
                    <Trash2 className="h-[13px] w-[13px]" />
                  </Button>
                </div>
              ))
            )}
            <Button
              variant="outline"
              onClick={startCreate}
              className="mt-1 h-10 self-start rounded-[11px] border-0 bg-gradient-lime px-4 text-[13px] font-bold text-primary-foreground hover:opacity-90 hover:text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Neuen Schreibstil anlegen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

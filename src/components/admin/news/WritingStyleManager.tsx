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
import { ArrowLeft, Loader2, Pencil, PenLine, Plus, Trash2 } from "lucide-react";
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            Schreibstile für den KI-Generator
          </DialogTitle>
          <DialogDescription>
            Speichere eigene Texte oder Artikel als Stil-Vorlage. Die KI übernimmt daraus Tonalität,
            Satzbau und Struktur — nie Inhalte. Je mehr Beispieltext, desto genauer trifft sie den Stil.
          </DialogDescription>
        </DialogHeader>

        {formOpen ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </button>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='z. B. "Locker & direkt" oder "Sachlich / Pressestil"'
              />
            </div>
            <div className="space-y-2">
              <Label>Beispieltexte *</Label>
              <Textarea
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                rows={14}
                placeholder={"Einen oder mehrere Beispiel-Artikel bzw. Texte hier einfügen — mehrere Texte einfach durch Leerzeilen trennen."}
              />
              <p className="text-xs text-muted-foreground">
                {sample.length.toLocaleString("de-DE")} Zeichen — die KI nutzt bis zu 8.000 Zeichen als Stil-Referenz.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
                Abbrechen
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editing ? "Speichern" : "Stil anlegen"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Laden…</p>
            ) : styles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Schreibstile gespeichert. Lege den ersten an und füge eigene Texte als Vorlage ein.
              </p>
            ) : (
              styles.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.sample_text.length.toLocaleString("de-DE")} Zeichen Beispieltext
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(s.id)}
                    disabled={deleteMutation.isPending}
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
            <Button variant="outline" onClick={startCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Neuen Schreibstil anlegen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

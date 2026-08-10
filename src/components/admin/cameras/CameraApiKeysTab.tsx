import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertTriangle, Plus, Key, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface CameraApiKey {
  id: string;
  location_id: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  locations?: { name: string };
}

interface Location {
  id: string;
  name: string;
}

// Generate a secure random API key (CSPRNG, rejection sampling avoids modulo bias)
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const maxValid = Math.floor(256 / chars.length) * chars.length;
  const randomChar = () => {
    const buf = new Uint8Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= maxValid);
    return chars.charAt(buf[0] % chars.length);
  };
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 8; i++) {
      segment += randomChar();
    }
    segments.push(segment);
  }
  return `p2g_cam_${segments.join("-")}`;
}

// Hash API key using SHA-256 with salt
async function hashApiKey(key: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const FIELD_LABEL_CLASSES =
  "font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground";

const INPUT_CLASSES =
  "h-10 rounded-[10px] border-[hsl(0_0%_15%)] bg-white/[0.04] text-[13.5px]";

export function CameraApiKeysTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CameraApiKey | null>(null);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["admin-locations-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Location[];
    },
  });

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["camera-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camera_api_keys")
        .select("*, locations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CameraApiKey[];
    },
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async ({ name, locationId }: { name: string; locationId: string }) => {
      const rawKey = generateApiKey();
      const salt = crypto.randomUUID();
      const keyHash = await hashApiKey(rawKey, salt);

      const { error } = await supabase
        .from("camera_api_keys")
        .insert({
          name,
          location_id: locationId,
          api_key_hash: keyHash,
          salt,
        });

      if (error) throw error;
      return rawKey;
    },
    onSuccess: (rawKey) => {
      setGeneratedKey(rawKey);
      setShowKey(true);
      queryClient.invalidateQueries({ queryKey: ["camera-api-keys"] });
      toast.success("API Key erstellt! Kopiere ihn jetzt - er wird nur einmal angezeigt.");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("camera_api_keys")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camera-api-keys"] });
      toast.success("Status aktualisiert");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("camera_api_keys")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camera-api-keys"] });
      toast.success("API Key gelöscht");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim() || !selectedLocationId) {
      toast.error("Name und Standort erforderlich");
      return;
    }
    createKeyMutation.mutate({ name: newKeyName, locationId: selectedLocationId });
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("API Key kopiert!");
    }
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setNewKeyName("");
    setSelectedLocationId("");
    setGeneratedKey(null);
    setShowKey(false);
  };

  return (
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <h3 className="font-display text-base font-bold tracking-tight text-foreground">
              Kamera API Keys
            </h3>
            <p className="text-xs text-muted-foreground">
              Verwalte die Authentifizierung für KI-Kamera-Systeme
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-8 flex-none gap-1.5 rounded-[9px] border border-primary/30 bg-primary/[0.09] px-3 text-[12.5px] font-bold text-primary shadow-none hover:bg-primary/[0.18]">
                <Plus className="h-3.5 w-3.5" />
                Neuer API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[20px] border-[hsl(0_0%_15%)] bg-[linear-gradient(180deg,hsl(0_0%_7%),hsl(0_0%_4%))]">
              <DialogHeader className="gap-[5px] space-y-0 text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  Kamera
                </span>
                <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">
                  Neuen API Key erstellen
                </DialogTitle>
              </DialogHeader>

              {!generatedKey ? (
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-[7px]">
                    <Label htmlFor="key-name" className={FIELD_LABEL_CLASSES}>Name</Label>
                    <Input
                      id="key-name"
                      placeholder="z.B. Bamberg Court 1 Cam"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className={INPUT_CLASSES}
                    />
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <Label className={FIELD_LABEL_CLASSES}>Standort</Label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger className={INPUT_CLASSES}>
                        <SelectValue placeholder="Standort wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <div className="flex flex-col gap-[9px] rounded-[13px] border border-dashed border-[hsl(0_0%_18%)] bg-white/[0.03] p-3.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0_0%_58%)]">
                      Dein API Key
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] leading-relaxed text-primary">
                        {showKey ? generatedKey : "•".repeat(40)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                        className="h-[30px] w-[30px] flex-none rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_75%)] hover:bg-white/5 hover:text-primary"
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyKey}
                        className="h-[30px] w-[30px] flex-none rounded-lg border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_75%)] hover:bg-white/5 hover:text-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-[#FFC44D]">
                      ⚠️ Dieser Key wird nur einmal angezeigt. Speichere ihn sicher!
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2.5 sm:gap-2.5">
                {!generatedKey ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCloseCreate}
                      className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-[17px] text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createKeyMutation.isPending}
                      className="h-10 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] transition-opacity hover:opacity-90"
                    >
                      {createKeyMutation.isPending ? "Erstelle..." : "Key erstellen"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCloseCreate}
                    className="h-10 rounded-[11px] bg-gradient-lime px-5 text-[13.5px] font-bold text-primary-foreground shadow-[0_0_22px_hsl(71_91%_51%/0.25)] transition-opacity hover:opacity-90"
                  >
                    Schließen
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[13.5px] text-muted-foreground">Lade API Keys...</div>
        ) : apiKeys?.length === 0 ? (
          <div className="flex flex-col items-center rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.02] px-4 py-12 text-center">
            <span className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
              <Key className="h-4 w-4" />
            </span>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Keine API Keys</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Erstelle einen API Key um Kamera-Systeme anzubinden
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="h-8 gap-1.5 rounded-[9px] border border-primary/30 bg-primary/[0.09] px-3 text-[12.5px] font-bold text-primary shadow-none hover:bg-primary/[0.18]"
            >
              <Plus className="h-3.5 w-3.5" />
              Ersten Key erstellen
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {apiKeys?.map((key) => (
              <div
                key={key.id}
                className="flex flex-col gap-2.5 rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
                      <Key className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-[13.5px] font-semibold text-foreground">
                      {key.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        key.is_active
                          ? "flex-none whitespace-nowrap rounded-full border-primary/[0.28] bg-primary/[0.09] px-2.5 py-0.5 text-[10.5px] font-bold text-primary"
                          : "flex-none whitespace-nowrap rounded-full border-[hsl(0_0%_16%)] bg-white/5 px-2.5 py-0.5 text-[10.5px] font-bold text-muted-foreground"
                      }
                    >
                      {key.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: key.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(key)}
                      className="h-8 w-8 rounded-[9px] border border-[hsl(0_100%_71%/0.26)] bg-[hsl(0_100%_71%/0.07)] text-[#FF6B6B] hover:bg-[hsl(0_100%_71%/0.16)] hover:text-[#FF6B6B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[hsl(0_0%_58%)]">
                  <span>Standort: {key.locations?.name || "Unbekannt"}</span>
                  <span>
                    Erstellt: {format(new Date(key.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </span>
                  {key.last_used_at && (
                    <span>
                      Zuletzt verwendet: {format(new Date(key.last_used_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lösch-Bestätigung */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent className="gap-4 rounded-[20px] border-[hsl(0_0%_15%)] bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)] p-6 sm:max-w-[430px] sm:rounded-[20px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <AlertDialogHeader className="space-y-[7px] text-left">
            <AlertDialogTitle className="font-display text-[19px] font-extrabold tracking-tight text-foreground">
              API Key wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-[1.55] text-[hsl(0_0%_68%)]">
              Der API Key <strong className="text-foreground">{pendingDelete?.name}</strong> wird
              dauerhaft entfernt — verbundene Kamera-Systeme verlieren damit ihren Zugriff.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="h-10 rounded-[11px] border-[hsl(0_0%_16%)] bg-white/5 px-4 text-[13.5px] font-bold text-[hsl(0_0%_80%)] hover:bg-white/10 hover:text-foreground">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingDelete) deleteMutation.mutate(pendingDelete.id); }}
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

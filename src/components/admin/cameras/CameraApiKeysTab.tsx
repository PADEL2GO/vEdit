import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Key, Copy, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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

// Generate a secure random API key
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 8; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
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

export function CameraApiKeysTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kamera API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Verwalte die Authentifizierung für KI-Kamera-Systeme
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neuer API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen API Key erstellen</DialogTitle>
            </DialogHeader>
            
            {!generatedKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    placeholder="z.B. Bamberg Court 1 Cam"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Standort</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger>
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
              <div className="space-y-4 py-4">
                <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                  <p className="text-sm font-medium mb-2">Dein API Key:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded text-sm font-mono break-all">
                      {showKey ? generatedKey : "•".repeat(40)}
                    </code>
                    <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCopyKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-destructive mt-2">
                    ⚠️ Dieser Key wird nur einmal angezeigt. Speichere ihn sicher!
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              {!generatedKey ? (
                <>
                  <Button variant="outline" onClick={handleCloseCreate}>Abbrechen</Button>
                  <Button onClick={handleCreate} disabled={createKeyMutation.isPending}>
                    {createKeyMutation.isPending ? "Erstelle..." : "Key erstellen"}
                  </Button>
                </>
              ) : (
                <Button onClick={handleCloseCreate}>Schließen</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Lade API Keys...</div>
      ) : apiKeys?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Keine API Keys</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Erstelle einen API Key um Kamera-Systeme anzubinden
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Key erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys?.map((key) => (
            <Card key={key.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{key.name}</CardTitle>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Standort: {key.locations?.name || "Unbekannt"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: key.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("API Key wirklich löschen?")) {
                          deleteMutation.mutate(key.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Erstellt: {format(new Date(key.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </span>
                  {key.last_used_at && (
                    <span>
                      Zuletzt verwendet: {format(new Date(key.last_used_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

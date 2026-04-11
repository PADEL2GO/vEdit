import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Instagram, Music2, Globe, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Artist {
  id?: string;
  name: string;
  role: string;
  image_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  website_url: string | null;
  sort_order: number;
}

interface ArtistManagerProps {
  artists: Artist[];
  onChange: (artists: Artist[]) => void;
}

const ARTIST_ROLES = [
  { value: "DJ", label: "DJ" },
  { value: "live_act", label: "Live Act" },
  { value: "host", label: "Host / Moderator" },
  { value: "trainer", label: "Trainer / Coach" },
  { value: "pro_player", label: "Pro-Spieler" },
  { value: "influencer", label: "Influencer" },
  { value: "other", label: "Sonstige" },
];

export function ArtistManager({ artists, onChange }: ArtistManagerProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const addArtist = () => {
    onChange([
      ...artists,
      {
        name: "",
        role: "DJ",
        image_url: null,
        instagram_url: null,
        spotify_url: null,
        website_url: null,
        sort_order: artists.length,
      },
    ]);
  };

  const removeArtist = (index: number) => {
    const updated = artists.filter((_, i) => i !== index);
    onChange(updated.map((a, i) => ({ ...a, sort_order: i })));
  };

  const updateArtist = (index: number, field: keyof Artist, value: string | null) => {
    const updated = [...artists];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `artists/${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(fileName);
      updateArtist(index, "image_url", publicUrl.publicUrl);
      toast.success("Bild hochgeladen");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Artists & Performer</Label>
        <Button type="button" variant="outline" size="sm" onClick={addArtist}>
          <Plus className="h-4 w-4 mr-1" />
          Artist hinzufügen
        </Button>
      </div>

      {artists.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          Noch keine Artists hinzugefügt
        </div>
      ) : (
        <div className="space-y-4">
          {artists.map((artist, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-background/50 space-y-4"
            >
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                
                {/* Image Upload */}
                <div className="shrink-0">
                  {artist.image_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => updateArtist(index, "image_url", null)}
                        className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-bl"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-16 h-16 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                      {uploadingIndex === index ? (
                        <div className="animate-pulse text-xs text-muted-foreground">...</div>
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e)}
                        disabled={uploadingIndex === index}
                      />
                    </label>
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      placeholder="Artist Name"
                      value={artist.name}
                      onChange={(e) => updateArtist(index, "name", e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rolle</Label>
                    <Select
                      value={artist.role}
                      onValueChange={(v) => updateArtist(index, "role", v)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARTIST_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => removeArtist(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-3 gap-3 pl-11">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Instagram className="h-3 w-3" /> Instagram
                  </Label>
                  <Input
                    placeholder="@username"
                    value={artist.instagram_url || ""}
                    onChange={(e) => updateArtist(index, "instagram_url", e.target.value || null)}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Music2 className="h-3 w-3" /> Spotify
                  </Label>
                  <Input
                    placeholder="Spotify URL"
                    value={artist.spotify_url || ""}
                    onChange={(e) => updateArtist(index, "spotify_url", e.target.value || null)}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <Input
                    placeholder="https://..."
                    value={artist.website_url || ""}
                    onChange={(e) => updateArtist(index, "website_url", e.target.value || null)}
                    className="bg-background border-border text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

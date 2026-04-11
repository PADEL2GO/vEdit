import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Image as ImageIcon, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArtistManager, BrandManager, HighlightsInput } from "@/components/admin/events";
import type { Artist } from "./ArtistManager";
import type { Brand } from "./BrandManager";

export interface Event {
  id: string;
  location_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
  start_at: string | null;
  end_at: string | null;
  image_url: string | null;
  ticket_url: string;
  is_published: boolean;
  featured: boolean;
  venue_name: string | null;
  event_type: string | null;
  price_label: string | null;
  price_cents: number | null;
  capacity: number | null;
  highlights: string[] | null;
  created_at: string;
  updated_at: string;
  locations?: { id: string; name: string } | null;
}

export interface Location {
  id: string;
  name: string;
}

export const EVENT_TYPES = [
  { value: "party", label: "Party / Social Event" },
  { value: "open_play", label: "Open-Play-Night" },
  { value: "tournament", label: "Turnier" },
  { value: "corporate", label: "Corporate Event" },
  { value: "workshop", label: "Workshop / Clinic" },
  { value: "season_opening", label: "Season Opening" },
  { value: "popup", label: "Pop-Up Event" },
  { value: "other", label: "Sonstiges" },
];

interface EventFormProps {
  event?: Event;
  locations: Location[];
  onSuccess: () => void;
}

export function EventForm({ event, locations, onSuccess }: EventFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    location_id: event?.location_id || "",
    title: event?.title || "",
    venue_name: event?.venue_name || "",
    description: event?.description || "",
    address_line1: event?.address_line1 || "",
    postal_code: event?.postal_code || "",
    city: event?.city || "",
    start_at: event?.start_at ? event.start_at.slice(0, 16) : "",
    end_at: event?.end_at ? event.end_at.slice(0, 16) : "",
    ticket_url: event?.ticket_url || "",
    is_published: event?.is_published || false,
    featured: event?.featured || false,
    event_type: event?.event_type || "party",
    price_label: event?.price_label || "",
    capacity: event?.capacity?.toString() || "",
  });
  const [imageUrl, setImageUrl] = useState(event?.image_url || "");
  const [highlights, setHighlights] = useState<string[]>(event?.highlights || []);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const isEditing = !!event;

  // Load artists and brands when editing
  useEffect(() => {
    if (event?.id) {
      setLoadingRelated(true);
      Promise.all([
        supabase
          .from("event_artists")
          .select("*")
          .eq("event_id", event.id)
          .order("sort_order"),
        supabase
          .from("event_brands")
          .select("*")
          .eq("event_id", event.id)
          .order("sort_order"),
      ])
        .then(([artistsRes, brandsRes]) => {
          if (artistsRes.data) setArtists(artistsRes.data);
          if (brandsRes.data) setBrands(brandsRes.data);
        })
        .finally(() => setLoadingRelated(false));
    }
  }, [event?.id]);

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        location_id: formData.location_id,
        title: formData.title,
        venue_name: formData.venue_name || null,
        description: formData.description || null,
        address_line1: formData.address_line1 || null,
        postal_code: formData.postal_code || null,
        city: formData.city || null,
        ticket_url: formData.ticket_url,
        is_published: formData.is_published,
        featured: formData.featured,
        event_type: formData.event_type,
        price_label: formData.price_label || null,
        image_url: imageUrl || null,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        highlights: highlights.length > 0 ? highlights : null,
      };

      let eventId = event?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", event.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        eventId = data.id;
      }

      // Sync artists
      if (eventId) {
        // Delete existing artists
        await supabase.from("event_artists").delete().eq("event_id", eventId);
        
        // Insert new artists
        if (artists.length > 0) {
          const artistPayload = artists
            .filter((a) => a.name.trim())
            .map((a, i) => ({
              event_id: eventId,
              name: a.name,
              role: a.role,
              image_url: a.image_url,
              instagram_url: a.instagram_url,
              spotify_url: a.spotify_url,
              website_url: a.website_url,
              sort_order: i,
            }));
          if (artistPayload.length > 0) {
            const { error: artistError } = await supabase
              .from("event_artists")
              .insert(artistPayload);
            if (artistError) console.error("Artist insert error:", artistError);
          }
        }

        // Delete existing brands
        await supabase.from("event_brands").delete().eq("event_id", eventId);
        
        // Insert new brands
        if (brands.length > 0) {
          const brandPayload = brands
            .filter((b) => b.name.trim())
            .map((b, i) => ({
              event_id: eventId,
              name: b.name,
              brand_type: b.brand_type,
              logo_url: b.logo_url,
              website_url: b.website_url,
              instagram_url: b.instagram_url,
              sort_order: i,
            }));
          if (brandPayload.length > 0) {
            const { error: brandError } = await supabase
              .from("event_brands")
              .insert(brandPayload);
            if (brandError) console.error("Brand insert error:", brandError);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Event aktualisiert" : "Event erstellt");
      queryClient.invalidateQueries({ queryKey: ["public-events"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Fehler beim Speichern");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `events/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(fileName);
      setImageUrl(publicUrl.publicUrl);
      toast.success("Bild hochgeladen");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl("");
  };

  const isValid = formData.title.trim() && formData.ticket_url.trim() && formData.location_id;

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Event-Bild</Label>
        {imageUrl ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden">
            <img src={imageUrl} alt="Event" className="w-full h-full object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <div className="animate-pulse text-muted-foreground">Hochladen...</div>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Klicken zum Hochladen</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Basic Info Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Standort *</Label>
          <Select
            value={formData.location_id}
            onValueChange={(v) => setFormData((p) => ({ ...p, location_id: v }))}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Standort wählen" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_type">Event-Typ</Label>
          <Select
            value={formData.event_type}
            onValueChange={(v) => setFormData((p) => ({ ...p, event_type: v }))}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Title & Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titel *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="Event-Titel"
            className="bg-background border-border"
          />
        </div>
        {isEditing && event?.slug && (
          <div className="space-y-2">
            <Label>Slug (auto-generiert)</Label>
            <Input
              value={event.slug}
              readOnly
              className="bg-secondary/50 border-border text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* Venue Name */}
      <div className="space-y-2">
        <Label htmlFor="venue_name">Venue / Location Name</Label>
        <Input
          id="venue_name"
          value={formData.venue_name}
          onChange={(e) => setFormData((p) => ({ ...p, venue_name: e.target.value }))}
          placeholder="z.B. Padel Club Berlin"
          className="bg-background border-border"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          placeholder="Beschreibung des Events..."
          className="bg-background border-border min-h-[100px]"
        />
      </div>

      {/* Address */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={formData.address_line1}
            onChange={(e) => setFormData((p) => ({ ...p, address_line1: e.target.value }))}
            placeholder="Straße und Hausnummer"
            className="bg-background border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">PLZ</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))}
            placeholder="12345"
            className="bg-background border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Stadt</Label>
        <Input
          id="city"
          value={formData.city}
          onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
          placeholder="Stadt"
          className="bg-background border-border"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_at">Startdatum</Label>
          <Input
            id="start_at"
            type="datetime-local"
            value={formData.start_at}
            onChange={(e) => setFormData((p) => ({ ...p, start_at: e.target.value }))}
            className="bg-background border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Enddatum</Label>
          <Input
            id="end_at"
            type="datetime-local"
            value={formData.end_at}
            onChange={(e) => setFormData((p) => ({ ...p, end_at: e.target.value }))}
            className="bg-background border-border"
          />
        </div>
      </div>

      {/* Tickets & Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ticket_url">Ticket-Link *</Label>
          <Input
            id="ticket_url"
            type="url"
            value={formData.ticket_url}
            onChange={(e) => setFormData((p) => ({ ...p, ticket_url: e.target.value }))}
            placeholder="https://..."
            className="bg-background border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Kapazität</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
            placeholder="100"
            className="bg-background border-border"
          />
        </div>
      </div>

      {/* Price Label */}
      <div className="space-y-2">
        <Label htmlFor="price_label">Preis-Anzeige</Label>
        <Input
          id="price_label"
          value={formData.price_label}
          onChange={(e) => setFormData((p) => ({ ...p, price_label: e.target.value }))}
          placeholder="z.B. €15 / Gratis für Members"
          className="bg-background border-border"
        />
      </div>

      <Separator className="my-6" />

      {/* Highlights */}
      <HighlightsInput highlights={highlights} onChange={setHighlights} />

      <Separator className="my-6" />

      {/* Artists */}
      {loadingRelated ? (
        <div className="text-center py-4 text-muted-foreground">Lade Artists & Brands...</div>
      ) : (
        <>
          <ArtistManager artists={artists} onChange={setArtists} />

          <Separator className="my-6" />

          {/* Brands */}
          <BrandManager brands={brands} onChange={setBrands} />
        </>
      )}

      <Separator className="my-6" />

      {/* Featured & Published */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div>
            <Label htmlFor="featured" className="text-foreground">Featured Event</Label>
            <p className="text-sm text-muted-foreground">
              Wird als Haupt-Event auf der Events-Seite hervorgehoben
            </p>
          </div>
          <Switch
            id="featured"
            checked={formData.featured}
            onCheckedChange={(checked) => setFormData((p) => ({ ...p, featured: checked }))}
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <Label htmlFor="is_published" className="text-foreground">Veröffentlicht</Label>
            <p className="text-sm text-muted-foreground">
              Event wird im Frontend angezeigt
            </p>
          </div>
          <Switch
            id="is_published"
            checked={formData.is_published}
            onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_published: checked }))}
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => createEventMutation.mutate()}
        disabled={!isValid || createEventMutation.isPending}
      >
        {createEventMutation.isPending
          ? "Speichern..."
          : isEditing
          ? "Event aktualisieren"
          : "Event erstellen"}
      </Button>
    </div>
  );
}

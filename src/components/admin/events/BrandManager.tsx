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
import { Plus, Trash2, GripVertical, Instagram, Globe, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Brand {
  id?: string;
  name: string;
  brand_type: string;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  sort_order: number;
}

interface BrandManagerProps {
  brands: Brand[];
  onChange: (brands: Brand[]) => void;
}

const BRAND_TYPES = [
  { value: "sponsor", label: "Sponsor" },
  { value: "partner", label: "Partner" },
  { value: "media_partner", label: "Medienpartner" },
  { value: "equipment", label: "Equipment-Partner" },
  { value: "food_drinks", label: "Food & Drinks" },
  { value: "other", label: "Sonstige" },
];

export function BrandManager({ brands, onChange }: BrandManagerProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const addBrand = () => {
    onChange([
      ...brands,
      {
        name: "",
        brand_type: "sponsor",
        logo_url: null,
        website_url: null,
        instagram_url: null,
        sort_order: brands.length,
      },
    ]);
  };

  const removeBrand = (index: number) => {
    const updated = brands.filter((_, i) => i !== index);
    onChange(updated.map((b, i) => ({ ...b, sort_order: i })));
  };

  const updateBrand = (index: number, field: keyof Brand, value: string | null) => {
    const updated = [...brands];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `brands/${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(fileName);
      updateBrand(index, "logo_url", publicUrl.publicUrl);
      toast.success("Logo hochgeladen");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Partner & Brands</Label>
        <Button type="button" variant="outline" size="sm" onClick={addBrand}>
          <Plus className="h-4 w-4 mr-1" />
          Brand hinzufügen
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          Noch keine Brands hinzugefügt
        </div>
      ) : (
        <div className="space-y-4">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-background/50 space-y-4"
            >
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />

                {/* Logo Upload */}
                <div className="shrink-0">
                  {brand.logo_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white p-1">
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => updateBrand(index, "logo_url", null)}
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
                        onChange={(e) => handleLogoUpload(index, e)}
                        disabled={uploadingIndex === index}
                      />
                    </label>
                  )}
                </div>

                {/* Name & Type */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      placeholder="Brand Name"
                      value={brand.name}
                      onChange={(e) => updateBrand(index, "name", e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Typ</Label>
                    <Select
                      value={brand.brand_type}
                      onValueChange={(v) => updateBrand(index, "brand_type", v)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAND_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                  onClick={() => removeBrand(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-3 pl-11">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <Input
                    placeholder="https://..."
                    value={brand.website_url || ""}
                    onChange={(e) => updateBrand(index, "website_url", e.target.value || null)}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Instagram className="h-3 w-3" /> Instagram
                  </Label>
                  <Input
                    placeholder="@brandname"
                    value={brand.instagram_url || ""}
                    onChange={(e) => updateBrand(index, "instagram_url", e.target.value || null)}
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

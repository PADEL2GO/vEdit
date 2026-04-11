import { useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSiteVisuals, useUploadVisual, useDeleteVisualImage } from "@/hooks/useSiteVisuals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2, Image as ImageIcon, CheckCircle, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminVisuals() {
  const { data: visuals, isLoading } = useSiteVisuals();
  const uploadMutation = useUploadVisual();
  const deleteMutation = useDeleteVisualImage();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Group visuals by category
  const groupedVisuals = visuals?.reduce((acc, visual) => {
    if (!acc[visual.category]) {
      acc[visual.category] = [];
    }
    acc[visual.category].push(visual);
    return acc;
  }, {} as Record<string, typeof visuals>);

  const handleFileSelect = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      await uploadMutation.mutateAsync({ key, file });
    } finally {
      setUploadingKey(null);
    }
  };

  const handleDelete = async (key: string) => {
    await deleteMutation.mutateAsync(key);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Website Visuals</h1>
          <p className="text-muted-foreground mt-2">
            Verwalte alle Bilder auf der Website. Lade neue Bilder hoch oder setze sie auf den Placeholder zurück.
          </p>
        </div>

        {groupedVisuals && Object.entries(groupedVisuals).map(([category, categoryVisuals]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryVisuals?.map((visual) => {
                  const isUploading = uploadingKey === visual.key;
                  const hasImage = !!visual.image_url;
                  const imageUrl = visual.image_url || visual.placeholder_url;

                  return (
                    <div key={visual.id} className="space-y-3">
                      {/* Image Preview */}
                      <div className={cn(
                        "relative aspect-square rounded-xl border overflow-hidden group",
                        hasImage ? "border-primary/30 bg-primary/5" : "border-border bg-muted"
                      )}>
                        <img
                          src={imageUrl}
                          alt={visual.label}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Status badge */}
                        <div className={cn(
                          "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium",
                          hasImage 
                            ? "bg-primary/90 text-primary-foreground" 
                            : "bg-muted-foreground/80 text-background"
                        )}>
                          {hasImage ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Aktiv
                            </span>
                          ) : (
                            "Placeholder"
                          )}
                        </div>

                        {/* Loading overlay */}
                        {isUploading && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Label & Description */}
                      <div>
                        <h4 className="font-medium text-sm">{visual.label}</h4>
                        {visual.description && (
                          <>
                            {/* Extract recommended size from description */}
                            {visual.description.includes("Empfohlene Größe:") ? (
                              <>
                                <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-primary/10 rounded-md w-fit">
                                  <Maximize2 className="h-3 w-3 text-primary" />
                                  <span className="text-xs font-medium text-primary">
                                    {visual.description.match(/Empfohlene Größe:\s*([^)]+\))/)?.[1] || 
                                     visual.description.match(/Empfohlene Größe:\s*(\d+[×x]\d+\s*px)/i)?.[1] ||
                                     "Größe in Beschreibung"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {visual.description.replace(/Empfohlene Größe:\s*[^.]+\.?\s*/i, "").trim() || visual.description}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {visual.description}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[visual.key] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(visual.key, file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => fileInputRefs.current[visual.key]?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {hasImage ? "Ersetzen" : "Hochladen"}
                        </Button>
                        {hasImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(visual.key)}
                            disabled={isUploading || deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!groupedVisuals || Object.keys(groupedVisuals).length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Visuals gefunden</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

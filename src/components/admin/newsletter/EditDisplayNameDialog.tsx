import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, Check, Crop } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface EditDisplayNameDialogProps {
  campaign: { id: string; title: string; display_name?: string | null; display_image_url?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1] && !urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  return urls;
}

export const EditDisplayNameDialog = ({ campaign, open, onOpenChange }: EditDisplayNameDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(campaign?.display_name || "");
  const [imageUrl, setImageUrl] = useState(campaign?.display_image_url || "");
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState("");

  // Sync state when campaign changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (campaign && campaign.id !== lastId) {
    setLastId(campaign.id);
    setDisplayName(campaign.display_name || "");
    setImageUrl(campaign.display_image_url || "");
  }

  // Fetch html_content to extract images
  const { data: htmlContent } = useQuery({
    queryKey: ["newsletter-campaign-content", campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) return null;
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("html_content")
        .eq("id", campaign.id)
        .single();
      if (error) throw error;
      return (data as any)?.html_content as string | null;
    },
    enabled: open && !!campaign?.id,
  });

  const contentImages = useMemo(() => {
    if (!htmlContent) return [];
    return extractImagesFromHtml(htmlContent);
  }, [htmlContent]);

  const openCropFor = (src: string) => {
    setImageToCrop(src);
    setCropDialogOpen(true);
  };

  const handleCroppedImage = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `newsletter-images/${campaign!.id}-display-cropped.png`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(path);

      // Bust cache with timestamp
      setImageUrl(urlData.publicUrl + "?t=" + Date.now());
      toast.success("Image cropped & uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // Open crop dialog with a local object URL
    const objectUrl = URL.createObjectURL(file);
    openCropFor(objectUrl);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("newsletter_campaigns")
        .update({
          display_name: displayName || null,
          display_image_url: imageUrl || null,
        } as any)
        .eq("id", campaign!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign display settings updated");
      queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-archive"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to update"),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Display Settings</DialogTitle>
            <DialogDescription>
              Set a public-facing name and image for "{campaign?.title}". These appear on the newsletter archive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Public-facing title..."
              />
            </div>

            <div className="space-y-2">
              <Label>Display Image</Label>
              {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={imageUrl} alt="Display" className="w-full h-40 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openCropFor(imageUrl)}
                      title="Crop image"
                    >
                      <Crop className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setImageUrl("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-sm">Click to upload</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Pick from newsletter content images */}
            {contentImages.length > 0 && (
              <div className="space-y-2">
                <Label>Or pick from newsletter</Label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {contentImages.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openCropFor(src)}
                      className={cn(
                        "relative rounded-md overflow-hidden border-2 aspect-video transition-colors",
                        imageUrl === src
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {imageUrl === src && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-primary-foreground bg-primary rounded-full p-0.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || uploading}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        aspectRatio={16 / 9}
        title="Crop Display Image"
        description="Drag to reposition and zoom to select what will appear on the archive card."
      />
    </>
  );
};

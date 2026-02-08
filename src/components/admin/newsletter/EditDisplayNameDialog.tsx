import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface EditDisplayNameDialogProps {
  campaign: { id: string; title: string; display_name?: string | null; display_image_url?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditDisplayNameDialog = ({ campaign, open, onOpenChange }: EditDisplayNameDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(campaign?.display_name || "");
  const [imageUrl, setImageUrl] = useState(campaign?.display_image_url || "");
  const [uploading, setUploading] = useState(false);

  // Sync state when campaign changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (campaign && campaign.id !== lastId) {
    setLastId(campaign.id);
    setDisplayName(campaign.display_name || "");
    setImageUrl(campaign.display_image_url || "");
  }

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

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `newsletter-images/${campaign!.id}-display.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(path);

      setImageUrl(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setImageUrl("")}
                >
                  <X className="h-4 w-4" />
                </Button>
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || uploading}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

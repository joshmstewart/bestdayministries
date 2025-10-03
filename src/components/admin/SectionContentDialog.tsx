import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface SectionContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: {
    id: string;
    section_key: string;
    section_name: string;
    content: Record<string, any>;
  };
  onSave: () => void;
}

const SectionContentDialog = ({ open, onOpenChange, section, onSave }: SectionContentDialogProps) => {
  const [content, setContent] = useState(section.content || {});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedContent = { ...content };

      // Upload image if file is selected
      if (imageFile) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const compressedImage = await compressImage(imageFile, 4.5);
        const fileName = `${user.id}/${Date.now()}_section_${imageFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(fileName, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("app-assets")
          .getPublicUrl(fileName);

        updatedContent.image_url = publicUrl;
        setUploading(false);
      }

      const { error } = await supabase
        .from("homepage_sections")
        .update({ content: updatedContent })
        .eq("id", section.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section content updated successfully",
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        title: "Error",
        description: "Failed to update section content",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const renderFields = () => {
    switch (section.section_key) {
      case "hero":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview || content.image_url ? (
                <div className="relative">
                  <img
                    src={imagePreview || content.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Image
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a hero image
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select Image
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_primary">Primary Button Text</Label>
              <Input
                id="cta_primary"
                value={content.cta_primary_text || ""}
                onChange={(e) => setContent({ ...content, cta_primary_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_secondary">Secondary Button Text</Label>
              <Input
                id="cta_secondary"
                value={content.cta_secondary_text || ""}
                onChange={(e) => setContent({ ...content, cta_secondary_text: e.target.value })}
              />
            </div>
          </>
        );

      case "mission":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content.content || ""}
                onChange={(e) => setContent({ ...content, content: e.target.value })}
                rows={5}
              />
            </div>
          </>
        );

      case "featured_bestie":
      case "latest_album":
        return (
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={content.title || ""}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
            />
          </div>
        );

      case "community_features":
      case "community_gallery":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              />
            </div>
          </>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Content (JSON)</Label>
            <Textarea
              value={JSON.stringify(content, null, 2)}
              onChange={(e) => {
                try {
                  setContent(JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {section.section_name}</DialogTitle>
          <DialogDescription>
            Update the content for this homepage section.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderFields()}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving || uploading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectionContentDialog;

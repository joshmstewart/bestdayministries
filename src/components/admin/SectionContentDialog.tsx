import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("homepage_sections")
        .update({ content })
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
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={content.image_url || ""}
                onChange={(e) => setContent({ ...content, image_url: e.target.value })}
                placeholder="/src/assets/..."
              />
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectionContentDialog;

import { useEffect, useRef, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RichTextEditor, type RichTextEditorRef } from "./RichTextEditor";

interface NewsletterTemplateDialogProps {
  template?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewsletterTemplateDialog = ({ template, open, onOpenChange }: NewsletterTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const editorRef = useRef<RichTextEditorRef>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setDescription(template.description || "");
      setCategory(template.category || "general");
      setSubjectTemplate(template.subject_template || "");
      setPreviewText(template.preview_text_template || "");
      setHtmlContent(template.html_content || "");
    } else {
      setName("");
      setDescription("");
      setCategory("general");
      setSubjectTemplate("");
      setPreviewText("");
      setHtmlContent("");
    }
  }, [template, open]);

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Always save the latest editor HTML to avoid race conditions with React state updates.
      const latestHtml = editorRef.current?.getHTML?.() ?? htmlContent;

      const templateData = {
        name,
        description,
        category,
        subject_template: subjectTemplate,
        preview_text_template: previewText,
        html_content: latestHtml,
        created_by: user.id,
      };

      if (template) {
        const { error } = await supabase
          .from("newsletter_templates")
          .update(templateData)
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("newsletter_templates")
          .insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(template ? "Template updated" : "Template created");
      queryClient.invalidateQueries({ queryKey: ["newsletter-templates"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Monthly Newsletter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line Template</Label>
            <Input
              id="subject"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              placeholder="Your Monthly Update from {{organization_name}}"
            />
            <p className="text-sm text-muted-foreground">
              Use {"{"}{"{"} variables {"}"}{"}"} for dynamic content
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview">Preview Text (Optional)</Label>
            <Input
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="See what's new this month..."
            />
          </div>

          <div className="space-y-2">
            <Label>Email Content</Label>
            <RichTextEditor
              ref={editorRef}
              content={htmlContent}
              onChange={setHtmlContent}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!name || !subjectTemplate || !htmlContent || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

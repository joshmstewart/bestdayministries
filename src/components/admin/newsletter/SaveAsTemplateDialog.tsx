import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignSubject: string;
  campaignPreviewText: string;
  campaignHtmlContent: string;
  sourceTemplateId?: string;
}

export const SaveAsTemplateDialog = ({
  open,
  onOpenChange,
  campaignSubject,
  campaignPreviewText,
  campaignHtmlContent,
  sourceTemplateId,
}: SaveAsTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const [saveMode, setSaveMode] = useState<"new" | "update">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  // Fetch existing templates
  const { data: templates } = useQuery({
    queryKey: ["newsletter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (sourceTemplateId) {
        setSaveMode("update");
        setSelectedTemplateId(sourceTemplateId);
      } else {
        setSaveMode("new");
        setSelectedTemplateId("");
      }
      setName("");
      setDescription("");
      setCategory("general");
    }
  }, [open, sourceTemplateId]);

  // When selecting an existing template to update, show its name
  useEffect(() => {
    if (saveMode === "update" && selectedTemplateId && templates) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setName(template.name);
        setDescription(template.description || "");
        setCategory(template.category || "general");
      }
    }
  }, [selectedTemplateId, saveMode, templates]);

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const templateData = {
        name,
        description,
        category,
        subject_template: campaignSubject,
        preview_text_template: campaignPreviewText,
        html_content: campaignHtmlContent,
        created_by: user.id,
      };

      if (saveMode === "update" && selectedTemplateId) {
        const { error } = await supabase
          .from("newsletter_templates")
          .update(templateData)
          .eq("id", selectedTemplateId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("newsletter_templates")
          .insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        saveMode === "update"
          ? "Template updated successfully"
          : "Template created successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["newsletter-templates"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template");
    },
  });

  const canSave =
    name &&
    campaignSubject &&
    campaignHtmlContent &&
    (saveMode === "new" || selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={saveMode}
            onValueChange={(v) => setSaveMode(v as "new" | "update")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="font-normal cursor-pointer">
                Create a new template
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="update"
                id="update"
                disabled={!templates || templates.length === 0}
              />
              <Label
                htmlFor="update"
                className={`font-normal cursor-pointer ${
                  !templates || templates.length === 0
                    ? "text-muted-foreground"
                    : ""
                }`}
              >
                Update an existing template
              </Label>
            </div>
          </RadioGroup>

          {saveMode === "update" && templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Select Template to Update</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Newsletter"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Subject:</strong> {campaignSubject || "(empty)"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Content:</strong>{" "}
              {campaignHtmlContent
                ? `${campaignHtmlContent.replace(/<[^>]*>/g, "").slice(0, 100)}...`
                : "(empty)"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveTemplateMutation.mutate()}
            disabled={!canSave || saveTemplateMutation.isPending}
          >
            {saveTemplateMutation.isPending
              ? "Saving..."
              : saveMode === "update"
              ? "Update Template"
              : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";

interface NewsletterCampaignDialogProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewsletterCampaignDialog = ({
  campaign,
  open,
  onOpenChange,
}: NewsletterCampaignDialogProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || "");
      setSubject(campaign.subject || "");
      setPreviewText(campaign.preview_text || "");
      setHtmlContent(campaign.html_content || "");
    } else {
      setTitle("");
      setSubject("");
      setPreviewText("");
      setHtmlContent("");
    }
  }, [campaign, open]);

  const saveCampaignMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const campaignData = {
        title,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
        created_by: user.id,
      };

      if (campaign) {
        const { error } = await supabase
          .from("newsletter_campaigns")
          .update(campaignData)
          .eq("id", campaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("newsletter_campaigns")
          .insert(campaignData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(campaign ? "Campaign updated" : "Campaign created");
      queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save campaign");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Campaign Title (Internal)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monthly Newsletter - January 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., ✨ This Month at Best Day Ministries"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview">Preview Text (Optional)</Label>
            <Input
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Text shown in email preview"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Email Content</Label>
            <RichTextEditor
              content={htmlContent}
              onChange={setHtmlContent}
            />
            <p className="text-xs text-muted-foreground">
              Use the formatting toolbar to style your email. Links will be automatically tracked.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveCampaignMutation.mutate()}
            disabled={!title || !subject || !htmlContent || saveCampaignMutation.isPending}
          >
            {saveCampaignMutation.isPending ? "Saving..." : campaign ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
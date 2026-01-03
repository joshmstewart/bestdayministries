import { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "./RichTextEditor";

interface CampaignTemplateDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CampaignTemplateDialog = ({ template, open, onOpenChange }: CampaignTemplateDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "custom",
    subject: "",
    content: "",
    trigger_event: "",
    auto_send: false,
    delay_minutes: 0,
    is_active: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        description: template.description || "",
        template_type: template.template_type || "custom",
        subject: template.subject || "",
        content: template.content || "",
        trigger_event: template.trigger_event || "",
        auto_send: template.auto_send || false,
        delay_minutes: template.delay_minutes || 0,
        is_active: template.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        template_type: "custom",
        subject: "",
        content: "",
        trigger_event: "",
        auto_send: false,
        delay_minutes: 0,
        is_active: true,
      });
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (template) {
        const { error } = await supabase
          .from("campaign_templates")
          .update(formData)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_templates")
          .insert([formData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-templates"] });
      toast({
        title: "Success",
        description: `Template ${template ? "updated" : "created"} successfully.`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit" : "Create"} Campaign Template</DialogTitle>
          <DialogDescription>
            Create automated email templates that can be triggered by specific events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Welcome Email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Sent when someone subscribes to the newsletter"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="template_type">Template Type</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) => setFormData({ ...formData, template_type: value })}
              >
                <SelectTrigger id="template_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="signup_confirmation">Signup Confirmation</SelectItem>
                  <SelectItem value="subscription_success">Subscription Success</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="product_launch">Product Launch</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="trigger_event">Trigger Event</Label>
              <Select
                value={formData.trigger_event || "none"}
                onValueChange={(value) => setFormData({ ...formData, trigger_event: value === "none" ? "" : value })}
              >
                <SelectTrigger id="trigger_event">
                  <SelectValue placeholder="Manual (no trigger)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual (no trigger)</SelectItem>
                  <SelectItem value="newsletter_signup">Newsletter Signup</SelectItem>
                  <SelectItem value="site_signup">Site Signup</SelectItem>
                  <SelectItem value="subscription_created">Subscription Created</SelectItem>
                  <SelectItem value="event_published">Event Published</SelectItem>
                  <SelectItem value="product_published">Product Published</SelectItem>
                  <SelectItem value="vendor_application">Vendor Application (Admin)</SelectItem>
                  <SelectItem value="vendor_approved">Vendor Approved</SelectItem>
                  <SelectItem value="vendor_rejected">Vendor Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Welcome to our community!"
            />
            <p className="text-xs text-muted-foreground">
              Use [PLACEHOLDERS] like [EVENT_NAME], [PRODUCT_NAME], etc. that will be replaced with actual values
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Email Content (HTML)</Label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
            />
            <p className="text-xs text-muted-foreground">
              Use [PLACEHOLDERS] for dynamic content: [EVENT_NAME], [EVENT_DATE], [EVENT_LOCATION], [PRODUCT_NAME], [PRODUCT_DESCRIPTION]
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_send"
                checked={formData.auto_send}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_send: checked as boolean })}
              />
              <Label htmlFor="auto_send" className="cursor-pointer">
                Auto-send when triggered
              </Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delay_minutes">Delay (minutes)</Label>
              <Input
                id="delay_minutes"
                type="number"
                min="0"
                value={formData.delay_minutes}
                onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Template is active
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

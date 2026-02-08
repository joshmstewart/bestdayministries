import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CampaignSequenceSteps } from "./CampaignSequenceSteps";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { NewsletterPreviewDialog } from "./NewsletterPreviewDialog";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import { Eye, Calendar, Monitor, Smartphone, FileText } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

const USER_ROLES = [
  { value: "supporter", label: "Supporters" },
  { value: "bestie", label: "Besties" },
  { value: "caregiver", label: "Guardians" },
  { value: "vendor", label: "Vendors" },
  { value: "moderator", label: "Moderators" },
  { value: "admin", label: "Admins" },
  { value: "owner", label: "Owners" },
];

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
  const [displayName, setDisplayName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [specificEmails, setSpecificEmails] = useState<string>("");
  const [useSpecificEmails, setUseSpecificEmails] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Automation settings
  const [enableAutomation, setEnableAutomation] = useState(false);
  const [triggerEvent, setTriggerEvent] = useState("");
  
  // Sequence settings
  const [enableSequence, setEnableSequence] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<any[]>([]);

  const { data: templates } = useQuery({
    queryKey: ["newsletter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open && !campaign,
  });

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || "");
      setDisplayName(campaign.display_name || "");
      setSubject(campaign.subject || "");
      setPreviewText(campaign.preview_text || "");
      setHtmlContent(campaign.html_content || "");
      
      const targetAudience = campaign.target_audience || { type: "all" };
      setTargetAll(targetAudience.type === "all");
      setUseSpecificEmails(targetAudience.type === "specific_emails");
      if (targetAudience.type === "specific_emails") {
        setSpecificEmails((targetAudience.emails || []).join(", "));
      } else if (targetAudience.type === "all_site_members") {
        setSelectedRoles(['all_site_members']);
      } else if (targetAudience.type === "non_subscribers") {
        setSelectedRoles(['non_subscribers']);
      } else {
        setSelectedRoles(targetAudience.roles || []);
      }
      setScheduledFor(campaign.scheduled_for ? format(new Date(campaign.scheduled_for), "yyyy-MM-dd'T'HH:mm") : "");
      
      // Load automation settings if exists
      // TODO: Fetch automation data from newsletter_automations
      setEnableAutomation(false);
      setTriggerEvent("");
      
      // Load sequence steps if exists
      // TODO: Fetch sequence steps from newsletter_drip_steps
      setEnableSequence(false);
      setSequenceSteps([]);
    } else {
      setTitle("");
      setDisplayName("");
      setSubject("");
      setPreviewText("");
      setHtmlContent("");
      setTargetAll(true);
      setSelectedRoles([]);
      setSpecificEmails("");
      setUseSpecificEmails(false);
      setScheduledFor("");
      setSelectedTemplate("");
      setEnableAutomation(false);
      setTriggerEvent("");
      setEnableSequence(false);
      setSequenceSteps([]);
    }
  }, [campaign, open]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject_template);
      setPreviewText(template.preview_text_template || "");
      setHtmlContent(template.html_content);
      setSelectedTemplate(templateId);
      toast.success("Template loaded");
    }
  };

  const saveCampaignMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const targetAudience = useSpecificEmails
        ? { type: "specific_emails", emails: specificEmails.split(",").map(e => e.trim()).filter(Boolean) }
        : targetAll
        ? { type: "all" }
        : selectedRoles.includes('all_site_members')
        ? { type: "all_site_members" }
        : selectedRoles.includes('non_subscribers')
        ? { type: "non_subscribers" }
        : { type: "roles", roles: selectedRoles };

      const campaignData = {
        title,
        display_name: displayName || null,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
        target_audience: targetAudience,
        created_by: user.id,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        status: (scheduledFor ? 'scheduled' : 'draft') as 'draft' | 'scheduled',
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
          {!campaign && templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">Start from Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Public-facing title shown on newsletter archive"
            />
            <p className="text-xs text-muted-foreground">
              If set, this will be used on the public newsletter page instead of the campaign title.
            </p>
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

          <div className="space-y-4">
            <Label>Target Audience</Label>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="target-specific"
                  name="target-audience"
                  checked={useSpecificEmails}
                  onChange={() => {
                    setUseSpecificEmails(true);
                    setTargetAll(false);
                    setSelectedRoles([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <label
                  htmlFor="target-specific"
                  className="text-sm font-medium leading-none"
                >
                  Send to specific email addresses (for testing)
                </label>
              </div>

              {useSpecificEmails && (
                <div className="pl-6 space-y-2">
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={specificEmails}
                    onChange={(e) => setSpecificEmails(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter comma-separated email addresses
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="target-all"
                  name="target-audience"
                  checked={targetAll && !useSpecificEmails}
                  onChange={() => {
                    setTargetAll(true);
                    setUseSpecificEmails(false);
                    setSelectedRoles([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <label
                  htmlFor="target-all"
                  className="text-sm font-medium leading-none"
                >
                  Send to all newsletter subscribers
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="target-all-members"
                  name="target-audience"
                  checked={!targetAll && !useSpecificEmails && selectedRoles.includes('all_site_members')}
                  onChange={() => {
                    setTargetAll(false);
                    setUseSpecificEmails(false);
                    setSelectedRoles(['all_site_members']);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <label
                  htmlFor="target-all-members"
                  className="text-sm font-medium leading-none"
                >
                  Send to all site members (whether subscribed or not)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="target-non-subscribers"
                  name="target-audience"
                  checked={!targetAll && !useSpecificEmails && selectedRoles.includes('non_subscribers')}
                  onChange={() => {
                    setTargetAll(false);
                    setUseSpecificEmails(false);
                    setSelectedRoles(['non_subscribers']);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <label
                  htmlFor="target-non-subscribers"
                  className="text-sm font-medium leading-none"
                >
                  Send to non-subscribed members only
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="target-by-role"
                  name="target-audience"
                  checked={!targetAll && !useSpecificEmails && !selectedRoles.includes('all_site_members') && !selectedRoles.includes('non_subscribers') && selectedRoles.length > 0}
                  onChange={() => {
                    setTargetAll(false);
                    setUseSpecificEmails(false);
                    setSelectedRoles([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <label
                  htmlFor="target-by-role"
                  className="text-sm font-medium leading-none"
                >
                  Send to specific user roles
                </label>
              </div>

              {!targetAll && !useSpecificEmails && !selectedRoles.includes('all_site_members') && !selectedRoles.includes('non_subscribers') && (
                <div className="space-y-2 pl-6">
                  {USER_ROLES.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role.value]);
                          } else {
                            setSelectedRoles(
                              selectedRoles.filter((r) => r !== role.value)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`role-${role.value}`}
                        className="text-sm leading-none"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled">Schedule Send (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
              {scheduledFor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduledFor("")}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to save as draft, or set a future date/time to schedule
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Email Content</Label>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}>
                <TabsList>
                  <TabsTrigger value="desktop" className="gap-2">
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className={previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""}>
              <RichTextEditor
                content={htmlContent}
                onChange={setHtmlContent}
              />
            </div>

            {previewMode === "mobile" && (
              <Card className="p-4 mt-2 bg-muted">
                <p className="text-sm text-muted-foreground">
                  📱 Mobile preview - your email will be optimized for phone screens
                </p>
              </Card>
            )}
            
            <p className="text-xs text-muted-foreground">
              Use the formatting toolbar to style your email. Links will be automatically tracked.
            </p>
          </div>

          {/* Automation Settings */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base">Automation Trigger</Label>
                <p className="text-sm text-muted-foreground">
                  Send this campaign when an event occurs
                </p>
              </div>
              <Switch
                checked={enableAutomation}
                onCheckedChange={setEnableAutomation}
              />
            </div>

            {enableAutomation && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="trigger-event">Trigger Event</Label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger id="trigger-event">
                      <SelectValue placeholder="Select event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_signup">User Signup</SelectItem>
                      <SelectItem value="subscription_start">Subscription Started</SelectItem>
                      <SelectItem value="subscription_cancelled">Subscription Cancelled</SelectItem>
                      <SelectItem value="purchase">Purchase Made</SelectItem>
                      <SelectItem value="cart_abandoned">Cart Abandoned</SelectItem>
                      <SelectItem value="inactive_30_days">30 Days Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Sequence Settings */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base">Email Sequence</Label>
                <p className="text-sm text-muted-foreground">
                  Add follow-up emails sent after delays
                </p>
              </div>
              <Switch
                checked={enableSequence}
                onCheckedChange={setEnableSequence}
              />
            </div>

            {enableSequence && (
              <CampaignSequenceSteps
                steps={sequenceSteps}
                onChange={setSequenceSteps}
                availableCampaigns={[]}
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPreviewOpen(true)}
            disabled={!htmlContent}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsSaveTemplateOpen(true)}
            disabled={!subject || !htmlContent}
          >
            <FileText className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveCampaignMutation.mutate()}
            disabled={!title || !subject || !htmlContent || saveCampaignMutation.isPending}
          >
            {scheduledFor && <Calendar className="h-4 w-4 mr-2" />}
            {saveCampaignMutation.isPending ? "Saving..." : scheduledFor ? "Schedule" : campaign ? "Update" : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <NewsletterPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        subject={subject}
        previewText={previewText}
        htmlContent={htmlContent}
      />

      <SaveAsTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        campaignSubject={subject}
        campaignPreviewText={previewText}
        campaignHtmlContent={htmlContent}
        sourceTemplateId={selectedTemplate}
      />
    </Dialog>
  );
};
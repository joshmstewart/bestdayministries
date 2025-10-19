import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Mail, Power, PowerOff, Eye, Send } from "lucide-react";
import { CampaignTemplateDialog } from "./CampaignTemplateDialog";
import { NewsletterPreviewDialog } from "./NewsletterPreviewDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CampaignTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<any>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Get current user email for test emails
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["campaign-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("campaign_templates")
        .update({ is_active: !is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-templates"] });
      toast({
        title: "Template updated",
        description: "Template status changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-templates"] });
      toast({
        title: "Template deleted",
        description: "Template has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "welcome": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "signup_confirmation": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "subscription_success": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "event": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "product_launch": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getTriggerLabel = (trigger: string | null) => {
    if (!trigger) return "Manual";
    switch (trigger) {
      case "newsletter_signup": return "Newsletter Signup";
      case "site_signup": return "Site Signup";
      case "subscription_created": return "Subscription Created";
      case "event_published": return "Event Published";
      case "product_published": return "Product Published";
      default: return trigger;
    }
  };

  const handleSendTest = async () => {
    if (!testTemplate || !currentUser?.email) {
      toast({
        title: "Error",
        description: "Unable to send test email",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingTest(true);
      
      const { data, error } = await supabase.functions.invoke("send-test-automated-template", {
        body: { 
          templateId: testTemplate.id,
          testEmail: currentUser.email
        },
      });

      if (error) throw error;

      toast({
        title: "Test email sent!",
        description: `Test email sent to ${currentUser.email}`,
      });
      
      setTestDialogOpen(false);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campaign Templates</h2>
          <p className="text-muted-foreground">
            Create and manage automated email templates for different events
          </p>
        </div>
        <Button onClick={() => { setSelectedTemplate(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No templates yet. Create your first campaign template!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge className={getTypeColor(template.template_type)}>
                        {template.template_type.replace('_', ' ')}
                      </Badge>
                      {template.auto_send && (
                        <Badge variant="outline" className="text-xs">
                          Auto-send
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setPreviewTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                      title="Preview email"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setTestTemplate(template);
                        setTestDialogOpen(true);
                      }}
                      title="Send test email to yourself"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleActiveMutation.mutate({ id: template.id, is_active: template.is_active })}
                      title={template.is_active ? "Active - Click to deactivate" : "Inactive - Click to activate"}
                    >
                      {template.is_active ? (
                        <Power className="w-4 h-4 text-green-600" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setSelectedTemplate(template); setDialogOpen(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this template?")) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span> {template.subject}
                  </div>
                  <div>
                    <span className="font-medium">Trigger:</span> {getTriggerLabel(template.trigger_event)}
                    {template.delay_minutes > 0 && (
                      <span className="text-muted-foreground ml-2">
                        (Delayed by {template.delay_minutes} minutes)
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampaignTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {previewTemplate && (
        <NewsletterPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          subject={previewTemplate.subject || ""}
          previewText=""
          htmlContent={previewTemplate.content || ""}
        />
      )}

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this automated template to yourself to see how it looks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Test email will be sent to: <strong>{currentUser?.email}</strong>
              </p>
              {testTemplate && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p><strong>Template:</strong> {testTemplate.name}</p>
                  <p><strong>Subject:</strong> {testTemplate.subject}</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={isSendingTest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest}
            >
              {isSendingTest ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

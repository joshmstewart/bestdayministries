import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TemplateExample {
  type: string;
  label: string;
  subject: string;
  title: string;
  message: string;
  metadata?: any;
  link?: string;
}

const templateExamples: TemplateExample[] = [
  {
    type: "approval_decision",
    label: "Approval Decision (Approved)",
    subject: "Your post was approved!",
    title: "Your post was approved! 🎉",
    message: 'Great news! Your post "My Amazing Day" has been approved and is now visible to the community.',
    metadata: { status: "approved", itemType: "post", itemTitle: "My Amazing Day" },
    link: "/discussions?postId=123"
  },
  {
    type: "approval_decision",
    label: "Approval Decision (Rejected)",
    subject: "Your post needs revision",
    title: "Your post needs revision",
    message: 'Your post "My Amazing Day" was reviewed and needs some changes before it can be published. Please check the feedback and resubmit.',
    metadata: { status: "rejected", itemType: "post", itemTitle: "My Amazing Day" },
    link: "/discussions?postId=123"
  },
  {
    type: "new_sponsor_message",
    label: "New Sponsor Message",
    subject: "You have a new message!",
    title: "You have a new message! 💌",
    message: "Sarah Johnson sent you a message about \"Thank You\":\n\nThank you so much for sharing your story! It really brightened my day and I wanted to let you know how much it means to me...",
    metadata: { senderName: "Sarah Johnson", messageSubject: "Thank You" },
    link: "/guardian-links"
  },
  {
    type: "message_approved",
    label: "Message Approved",
    subject: "Your message was approved!",
    title: "Your message was approved! ✅",
    message: "Your message to sponsors has been approved and delivered.",
    link: "/bestie-messages"
  },
  {
    type: "message_rejected",
    label: "Message Rejected",
    subject: "Your message needs revision",
    title: "Your message needs revision",
    message: "Your message to sponsors was reviewed and needs changes. Reason: Please add more details about the event",
    metadata: { reason: "Please add more details about the event" },
    link: "/bestie-messages"
  },
  {
    type: "new_sponsorship",
    label: "New Sponsorship",
    subject: "New Sponsorship!",
    title: "New Sponsorship! 🎉",
    message: "John Smith has started a monthly sponsorship of $25.00 for Emma Johnson. Thank you for your support!",
    metadata: { sponsorName: "John Smith", frequency: "monthly", amount: 25, bestieName: "Emma Johnson" },
    link: "/guardian-links"
  },
  {
    type: "sponsorship_update",
    label: "Sponsorship Update",
    subject: "Sponsorship Updated",
    title: "Sponsorship Updated 💝",
    message: "Your monthly sponsorship amount has been updated to $50.00 per month.",
    link: "/guardian-links"
  },
  {
    type: "comment_on_post",
    label: "Comment on Post",
    subject: "New comment on your post",
    title: "New comment on your post 💬",
    message: 'Michael Davis commented on "My Amazing Day":\n\nThis is such a wonderful post! I love hearing about your adventures and it always makes me smile. Keep sharing!',
    metadata: { commenterName: "Michael Davis", postTitle: "My Amazing Day" },
    link: "/discussions?postId=123"
  },
  {
    type: "comment_on_thread",
    label: "Comment on Thread",
    subject: "New reply on a discussion",
    title: "New reply on a discussion you're following 💬",
    message: 'Emily Wilson also commented on "My Amazing Day":\n\nI completely agree with the previous comment! This is so inspiring and I can\'t wait to see what you share next.',
    metadata: { commenterName: "Emily Wilson", postTitle: "My Amazing Day" },
    link: "/discussions?postId=123"
  },
  {
    type: "new_event",
    label: "New Event",
    subject: "New Event: Community Picnic",
    title: "New Event: Community Picnic 📅",
    message: "Join us for a fun community picnic at the park!\n\nWhen: Saturday, June 15, 2024 at 2:00 PM\nWhere: Central Park Pavilion",
    metadata: { eventTitle: "Community Picnic", eventDate: "Saturday, June 15, 2024 at 2:00 PM", eventLocation: "Central Park Pavilion" },
    link: "/events?eventId=456"
  },
  {
    type: "event_update",
    label: "Event Update",
    subject: "Event Update: Community Picnic",
    title: "Event Update: Community Picnic 📅",
    message: "The location for the Community Picnic has been changed to West Park Pavilion due to weather concerns.",
    metadata: { eventTitle: "Community Picnic" },
    link: "/events?eventId=456"
  },
  {
    type: "pending_approval",
    label: "Pending Approval",
    subject: "New content awaiting approval",
    title: "New content awaiting your approval",
    message: "Emma has submitted a new post that needs your review before it can be published to the community.",
    link: "/guardian-approvals"
  }
];

export function EmailTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateExample>(templateExamples[0]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSendTestEmail = async () => {
    setSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to send test emails",
          variant: "destructive",
        });
        return;
      }

      // Call the send-notification-email edge function
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          userId: user.id,
          notificationType: selectedTemplate.type,
          subject: selectedTemplate.subject,
          title: selectedTemplate.title,
          message: selectedTemplate.message,
          link: selectedTemplate.link,
          metadata: selectedTemplate.metadata,
        },
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent! ✅",
        description: "Check your inbox for the test notification email.",
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Failed to Send",
        description: error.message || "An error occurred while sending the test email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const generatePreviewHtml = (template: TemplateExample) => {
    const logoUrl = "https://via.placeholder.com/150x50?text=Logo";
    const appUrl = window.location.origin;
    const actionUrl = template.link ? `${appUrl}${template.link}` : appUrl;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td align="center" style="padding: 30px 20px 20px;">
                      <img src="${logoUrl}" alt="Logo" style="max-width: 150px; height: auto;">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                        ${template.title}
                      </h1>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a; white-space: pre-line;">
                        ${template.message}
                      </p>
                      ${template.link ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              View Details
                            </a>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; color: #888888; text-align: center;">
                        You received this email because you have notifications enabled in your settings.
                        <br>
                        <a href="${appUrl}/profile" style="color: #888888; text-decoration: underline;">Manage preferences</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <CardTitle>Email Template Preview</CardTitle>
        </div>
        <CardDescription>
          Preview how notification emails will appear to users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Select Template Type</label>
          <Select
            value={selectedTemplate.type + selectedTemplate.label}
            onValueChange={(value) => {
              const template = templateExamples.find(t => (t.type + t.label) === value);
              if (template) setSelectedTemplate(template);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templateExamples.map((template) => (
                <SelectItem key={template.type + template.label} value={template.type + template.label}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          
          <Button 
            onClick={handleSendTestEmail} 
            disabled={sending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send Test Email"}
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Email Details</h3>
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <Badge variant="outline">Type</Badge>
                <span className="text-sm text-muted-foreground">{selectedTemplate.type}</span>
              </div>
              <div className="flex gap-2 items-start">
                <Badge variant="outline">Subject</Badge>
                <span className="text-sm text-muted-foreground">{selectedTemplate.subject}</span>
              </div>
              {selectedTemplate.link && (
                <div className="flex gap-2 items-start">
                  <Badge variant="outline">Link</Badge>
                  <span className="text-sm text-muted-foreground">{selectedTemplate.link}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Email Preview</h3>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <iframe
                srcDoc={generatePreviewHtml(selectedTemplate)}
                className="w-full h-[600px] bg-white"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

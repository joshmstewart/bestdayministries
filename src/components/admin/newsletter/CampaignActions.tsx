import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Mail, RotateCcw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  supporter: "Supporters",
  bestie: "Besties",
  caregiver: "Guardians",
  vendor: "Vendors",
  moderator: "Moderators",
  admin: "Admins",
  owner: "Owners",
};

// Plain-words description of who a campaign will be emailed to.
const describeAudience = (targetAudience: any): string => {
  const ta = targetAudience || { type: "all" };
  switch (ta.type) {
    case "specific_emails": {
      const n = ta.emails?.length || 0;
      return `only the ${n} specific email address${n === 1 ? "" : "es"} saved with this campaign`;
    }
    case "all_site_members":
      return "every site member, whether or not they subscribed to the newsletter";
    case "non_subscribers":
      return "site members who have NOT subscribed to the newsletter";
    case "roles": {
      const labels = (ta.roles || []).map((r: string) => ROLE_LABELS[r] || r);
      return labels.length
        ? `site members with these roles: ${labels.join(", ")}`
        : "the role-based audience saved with this campaign (no roles selected)";
    }
    case "all":
    default:
      return "everyone on the active newsletter subscriber list";
  }
};

interface CampaignActionsProps {
  campaignId: string;
  campaignStatus: string;
  failedCount?: number;
  queuedCount?: number;
  processedCount?: number;
  targetAudience?: any;
  recipientCount?: number;
  campaignTitle?: string;
  onSendComplete?: () => void;
}

export const CampaignActions = ({ 
  campaignId, 
  campaignStatus,
  failedCount = 0,
  queuedCount = 0,
  processedCount = 0,
  targetAudience,
  recipientCount,
  campaignTitle,
  onSendComplete
}: CampaignActionsProps) => {
  const [isSending, setIsSending] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [sendConfirmText, setSendConfirmText] = useState("");
  const { toast } = useToast();

  // Get current user email for test emails
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    });
  });

  const handleRetryFailed = async () => {
    try {
      setIsRetrying(true);
      
      // Reset failed queue items to pending
      const { error: queueError } = await supabase
        .from("newsletter_email_queue")
        .update({ 
          status: "pending", 
          attempts: 0,
          error_message: null 
        })
        .eq("campaign_id", campaignId)
        .in("status", ["failed", "permanently_failed"]);

      if (queueError) throw queueError;

      // Update campaign status and reset failed count
      const { error: campaignError } = await supabase
        .from("newsletter_campaigns")
        .update({ 
          status: "sending",
          failed_count: 0 
        })
        .eq("id", campaignId);

      if (campaignError) throw campaignError;

      toast({
        title: "Retrying failed emails",
        description: `${failedCount} emails have been queued for retry. They will be processed automatically.`,
      });
      
      onSendComplete?.();
    } catch (error: any) {
      console.error("Error retrying failed emails:", error);
      toast({
        title: "Failed to retry emails",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleResumeSending = async () => {
    try {
      setIsResuming(true);
      
      // Manually trigger the queue processor
      const { data, error } = await supabase.functions.invoke("process-newsletter-queue", {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Processing resumed",
        description: `Processed ${data?.sent || 0} emails. ${data?.failed || 0} failed.`,
      });
      
      onSendComplete?.();
    } catch (error: any) {
      console.error("Error resuming sending:", error);
      toast({
        title: "Failed to resume sending",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResuming(false);
    }
  };

  const handleSendNewsletter = async () => {
    try {
      setIsSending(true);
      
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: { campaignId },
      });

      if (error) throw error;

      // Handle queue-based response
      if (data.queued) {
        toast({
          title: "Newsletter queued for sending",
          description: `${data.queuedCount} emails queued. Estimated completion: ~${data.estimatedMinutes} minute(s).`,
        });
      } else {
        toast({
          title: "Newsletter sent!",
          description: `Successfully sent to ${data.sentCount} subscribers`,
        });
      }
      
      onSendComplete?.();
    } catch (error: any) {
      console.error("Error sending newsletter:", error);
      toast({
        title: "Failed to send newsletter",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!currentUserEmail) {
      toast({
        title: "Error",
        description: "Unable to determine your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingTest(true);
      
      const { data, error } = await supabase.functions.invoke("send-test-newsletter", {
        body: { 
          campaignId,
          testEmail: currentUserEmail
        },
      });

      if (error) throw error;

      toast({
        title: "Test email sent!",
        description: `Test email sent to ${currentUserEmail}`,
      });
      
      setIsTestDialogOpen(false);
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

  // Check if campaign is stuck (sending status with pending items)
  const pendingCount = queuedCount - processedCount - failedCount;
  const isStuck = campaignStatus === "sending" && pendingCount > 0;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setIsTestDialogOpen(true)}
          variant="outline"
          size="sm"
          disabled={isSending}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Test
        </Button>
        
        {campaignStatus === "draft" && (
          <Button
            onClick={() => {
              setSendConfirmText("");
              setIsSendConfirmOpen(true);
            }}
            disabled={isSending}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Newsletter"}
          </Button>
        )}

        {/* Retry Failed button - shown when there are failed emails */}
        {failedCount > 0 && (campaignStatus === "sending" || campaignStatus === "sent") && (
          <Button
            onClick={handleRetryFailed}
            disabled={isRetrying}
            size="sm"
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRetrying ? "Retrying..." : `Retry ${failedCount} Failed`}
          </Button>
        )}

        {/* Resume Sending button - shown when campaign is stuck in sending state */}
        {isStuck && (
          <Button
            onClick={handleResumeSending}
            disabled={isResuming}
            size="sm"
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            <Play className="w-4 h-4 mr-2" />
            {isResuming ? "Processing..." : "Resume Sending"}
          </Button>
        )}
      </div>

      <Dialog
        open={isSendConfirmOpen}
        onOpenChange={(open) => {
          setIsSendConfirmOpen(open);
          if (!open) setSendConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {campaignTitle ? `Send "${campaignTitle}"?` : "Send this newsletter?"}
            </DialogTitle>
            <DialogDescription>
              This will email the campaign to {describeAudience(targetAudience)}.
              {typeof recipientCount === "number" &&
                ` About ${recipientCount.toLocaleString()} people will receive it.`}{" "}
              Once the emails go out, they cannot be taken back.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="send-confirm-input">
              Type <strong>SEND</strong> (all caps) to confirm.
            </Label>
            <Input
              id="send-confirm-input"
              value={sendConfirmText}
              onChange={(e) => setSendConfirmText(e.target.value)}
              placeholder="SEND"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendConfirmOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsSendConfirmOpen(false);
                handleSendNewsletter();
              }}
              disabled={isSending || sendConfirmText.trim() !== "SEND"}
            >
              {isSending ? "Sending..." : "Send Newsletter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this campaign to yourself to verify how it looks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Test email will be sent to: <strong>{currentUserEmail}</strong>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTestDialogOpen(false)}
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
    </>
  );
};
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mail } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CampaignActionsProps {
  campaignId: string;
  campaignStatus: string;
  onSendComplete?: () => void;
}

export const CampaignActions = ({ 
  campaignId, 
  campaignStatus,
  onSendComplete 
}: CampaignActionsProps) => {
  const [isSending, setIsSending] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
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
            onClick={handleSendNewsletter}
            disabled={isSending}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Newsletter"}
          </Button>
        )}
      </div>

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
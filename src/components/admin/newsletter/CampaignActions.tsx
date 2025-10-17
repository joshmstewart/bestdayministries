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
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { toast } = useToast();

  const handleSendNewsletter = async () => {
    try {
      setIsSending(true);
      
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: { campaignId },
      });

      if (error) throw error;

      toast({
        title: "Newsletter sent!",
        description: `Successfully sent to ${data.sentCount} subscribers`,
      });
      
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
    if (!testEmail) {
      toast({
        title: "Email required",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingTest(true);
      
      const { data, error } = await supabase.functions.invoke("send-test-newsletter", {
        body: { 
          campaignId,
          testEmail 
        },
      });

      if (error) throw error;

      toast({
        title: "Test email sent!",
        description: data.message,
      });
      
      setIsTestDialogOpen(false);
      setTestEmail("");
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
      <div className="flex gap-2">
        <Button
          onClick={() => setIsTestDialogOpen(true)}
          variant="outline"
          disabled={isSending}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Test
        </Button>
        
        {campaignStatus === "draft" && (
          <Button
            onClick={handleSendNewsletter}
            disabled={isSending}
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
              Send a test version of this campaign to verify how it looks. The test email will include a test notice banner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
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
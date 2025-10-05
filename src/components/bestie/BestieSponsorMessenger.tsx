import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";

interface SponsorMessage {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  rejection_reason: string | null;
}

export const BestieSponsorMessenger = () => {
  const { toast } = useToast();
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SponsorMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
    loadMessages();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Check if any guardian allows sponsor messages
      const { data: links } = await supabase
        .from("caregiver_bestie_links")
        .select("allow_sponsor_messages, require_message_approval")
        .eq("bestie_id", user.id);

      if (links && links.length > 0) {
        const canSend = links.some(link => link.allow_sponsor_messages);
        const needsApproval = links.some(link => link.require_message_approval);
        setCanSendMessages(canSend);
        setRequiresApproval(needsApproval);
      }
    } catch (error: any) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sponsor_messages")
        .select("*")
        .eq("bestie_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both subject and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const status = requiresApproval ? 'pending_approval' : 'approved';

      const { error } = await supabase
        .from("sponsor_messages")
        .insert({
          bestie_id: userId,
          subject: subject.trim(),
          message: message.trim(),
          status,
        });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: requiresApproval 
          ? "Your message has been submitted for guardian approval"
          : "Your message will be sent to your sponsors shortly",
      });

      setSubject("");
      setMessage("");
      await loadMessages();

      // If no approval needed, trigger sending immediately
      if (!requiresApproval) {
        // The edge function will be called automatically or via webhook
        // For now, we'll let the admin/guardian manually trigger it
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Pending Approval
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved - Sending Soon
        </Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Sent
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (!canSendMessages) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Your guardian hasn't enabled sponsor messaging yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compose Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Message to Your Sponsors
          </CardTitle>
          <CardDescription>
            {requiresApproval 
              ? "Your guardian will review this message before it's sent to your sponsors"
              : "This message will be sent directly to all your sponsors"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Thank you for your support!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Write your message to your sponsors..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000 characters
            </p>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={sending || !subject.trim() || !message.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : requiresApproval ? "Submit for Approval" : "Send Message"}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{msg.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Sent {new Date(msg.created_at).toLocaleDateString()}</span>
                    {msg.sent_at && (
                      <span>• Delivered {new Date(msg.sent_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {msg.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                      <strong>Reason:</strong> {msg.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
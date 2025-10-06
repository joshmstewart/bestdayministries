import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, Image, RefreshCw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PendingMessage {
  id: string;
  bestie_id: string;
  subject: string;
  message: string;
  image_url: string | null;
  from_guardian: boolean;
  moderation_result: {
    approved: boolean;
    reason: string;
    severity: string;
  } | null;
  moderation_severity: string | null;
  created_at: string;
  bestie: {
    display_name: string;
  };
  sender: {
    display_name: string;
  };
}

export const MessageModerationQueue = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [messages, setMessages] = useState<PendingMessage[]>([]);

  useEffect(() => {
    loadPendingMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('message-moderation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sponsor_messages',
          filter: 'status=eq.pending_moderation'
        },
        () => {
          loadPendingMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("sponsor_messages")
        .select("*")
        .eq("status", "pending_moderation")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data separately to avoid foreign key issues
      const bestieIds = [...new Set(data?.map(m => m.bestie_id) || [])];
      const senderIds = [...new Set(data?.map(m => m.sent_by) || [])];
      const allUserIds = [...new Set([...bestieIds, ...senderIds])];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, display_name")
        .in("id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      const transformedData = (data || []).map(msg => ({
        id: msg.id,
        bestie_id: msg.bestie_id,
        subject: msg.subject,
        message: msg.message,
        image_url: msg.image_url,
        from_guardian: msg.from_guardian,
        moderation_result: msg.moderation_result as { approved: boolean; reason: string; severity: string; } | null,
        moderation_severity: msg.moderation_severity,
        created_at: msg.created_at,
        bestie: { display_name: profileMap.get(msg.bestie_id) || 'Unknown' },
        sender: { display_name: profileMap.get(msg.sent_by) || 'Unknown' },
      }));

      setMessages(transformedData as PendingMessage[]);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (messageId: string) => {
    setProcessing(messageId);
    try {
      const { error } = await supabase
        .from("sponsor_messages")
        .update({ status: 'approved' })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message approved",
        description: "The message will now be sent to sponsors",
      });

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (messageId: string) => {
    setProcessing(messageId);
    try {
      const { error } = await supabase
        .from("sponsor_messages")
        .update({ status: 'rejected' })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message rejected",
        description: "The message will not be sent to sponsors",
      });

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse text-muted-foreground">Loading pending messages...</div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Sponsor Messages - Moderation
          </CardTitle>
          <CardDescription>Review sponsor messages flagged by AI moderation</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No messages pending review. All clear! ✓
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Sponsor Messages - Moderation
              <Badge variant="destructive">{messages.length}</Badge>
            </CardTitle>
            <CardDescription>Review sponsor messages flagged by AI moderation</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadPendingMessages}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {messages.map((msg) => (
            <AccordionItem key={msg.id} value={msg.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{msg.subject}</span>
                      {msg.moderation_severity && (
                        <Badge className={getSeverityColor(msg.moderation_severity)}>
                          {msg.moderation_severity.toUpperCase()} RISK
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      From: {msg.sender.display_name} {msg.from_guardian && '(Guardian)'} → For: {msg.bestie.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 space-y-4">
                  {msg.moderation_result && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="font-semibold text-sm text-orange-900 mb-1">AI Flagged Reason:</p>
                      <p className="text-sm text-orange-800">{msg.moderation_result.reason}</p>
                    </div>
                  )}

                  {msg.image_url && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Image:</p>
                      <img
                        src={msg.image_url}
                        alt="Pending review"
                        className="w-full max-w-md h-auto rounded border"
                      />
                    </div>
                  )}

                  {msg.message && (
                    <div>
                      <p className="font-semibold text-sm mb-1">Message:</p>
                      <p className="text-sm bg-muted p-3 rounded whitespace-pre-line">
                        {msg.message}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleApprove(msg.id)}
                      disabled={processing === msg.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(msg.id)}
                      disabled={processing === msg.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

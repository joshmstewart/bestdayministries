import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, CheckCircle, XCircle, Send, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AudioPlayer from "@/components/AudioPlayer";

interface SponsorMessage {
  id: string;
  bestie_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  audio_url: string | null;
  from_guardian: boolean;
  bestie: {
    display_name: string;
  };
}

export const BestieSponsorMessages = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SponsorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadPendingMessages();
  }, []);

  const loadPendingMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all besties linked to this guardian
      const { data: links } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", user.id);

      if (!links || links.length === 0) {
        setMessages([]);
        return;
      }

      const bestieIds = links.map(link => link.bestie_id);

      // Get pending messages from linked besties
      const { data, error } = await supabase
        .from("sponsor_messages")
        .select(`
          *,
          bestie:profiles!sponsor_messages_bestie_id_fkey(display_name)
        `)
        .in("bestie_id", bestieIds)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map(msg => ({
        ...msg,
        bestie: Array.isArray(msg.bestie) ? msg.bestie[0] : msg.bestie
      }));

      setMessages(transformedData as SponsorMessage[]);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sponsor_messages")
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message approved",
        description: "The message will be sent to sponsors shortly",
      });

      await loadPendingMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (messageId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejecting this message",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sponsor_messages")
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message rejected",
        description: "The bestie will be notified",
      });

      setRejectingId(null);
      setRejectionReason("");
      await loadPendingMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No pending messages to review
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <Card key={msg.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{msg.subject}</CardTitle>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            <CardDescription>
              From {msg.bestie.display_name} • {new Date(msg.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              {msg.audio_url ? (
                <div>
                  <Label className="mb-2 block">Audio Message</Label>
                  <AudioPlayer src={msg.audio_url} />
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{msg.message}</p>
              )}
              {msg.from_guardian && (
                <Badge variant="secondary" className="mt-2">
                  Sent by Guardian
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleApprove(msg.id)}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Send
              </Button>
              
              <AlertDialog open={rejectingId === msg.id} onOpenChange={(open) => !open && setRejectingId(null)}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setRejectingId(msg.id)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Message</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason for rejecting this message. The bestie will be able to see this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Label>Reason for rejection</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="This message needs to be more appropriate because..."
                      rows={4}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setRejectingId(null);
                      setRejectionReason("");
                    }}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleReject(msg.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Reject Message
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
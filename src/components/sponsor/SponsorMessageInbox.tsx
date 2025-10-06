import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface SponsorMessage {
  id: string;
  subject: string;
  message: string;
  audio_url: string | null;
  image_url: string | null;
  video_url: string | null;
  sent_at: string | null;
  created_at: string;
  is_read: boolean;
}

interface SponsorMessageInboxProps {
  bestieId: string;
  bestieName: string;
}

export const SponsorMessageInbox = ({ bestieId, bestieName }: SponsorMessageInboxProps) => {
  const [messages, setMessages] = useState<SponsorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    
    // Set up realtime subscription for new messages
    const channel = supabase
      .channel(`sponsor-messages-${bestieId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sponsor_messages',
          filter: `bestie_id=eq.${bestieId}`
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bestieId]);

  const loadMessages = async () => {
    try {
      // Fetch only approved/sent messages
      const { data, error } = await supabase
        .from("sponsor_messages")
        .select("id, subject, message, audio_url, image_url, video_url, sent_at, created_at, is_read, status")
        .eq("bestie_id", bestieId)
        .in("status", ["approved", "sent"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Update any "approved" messages to "sent" since they're now in the sponsor's inbox
      const approvedMessages = (data || []).filter(msg => msg.status === 'approved');
      if (approvedMessages.length > 0) {
        const { error: updateError } = await supabase
          .from("sponsor_messages")
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .in("id", approvedMessages.map(m => m.id));
        
        if (updateError) {
          console.error("Error updating message status:", updateError);
        }
      }
      
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("sponsor_messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        No messages yet from {bestieName}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h4 className="font-semibold">Messages from {bestieName}</h4>
        <Badge variant="secondary" className="ml-auto">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </Badge>
      </div>

      <Accordion type="single" collapsible className="w-full" onValueChange={(value) => {
        // Mark message as read when accordion is opened
        if (value) {
          const msg = messages.find(m => m.id === value);
          if (msg && !msg.is_read) {
            markAsRead(value);
          }
        }
      }}>
        {messages.map((msg, index) => (
          <AccordionItem key={msg.id} value={msg.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{msg.subject}</div>
                    {!msg.is_read && (
                      <div className="h-2 w-2 rounded-full bg-destructive" title="Unread" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                {index === 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Latest
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pb-1 space-y-3">
                {msg.audio_url && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Audio Message:</div>
                    <AudioPlayer src={msg.audio_url} />
                  </div>
                )}
                {msg.video_url && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Video Message:</div>
                    <VideoPlayer src={msg.video_url} title={msg.subject} />
                  </div>
                )}
                {msg.image_url && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Image:</div>
                    <img
                      src={msg.image_url}
                      alt={msg.subject}
                      className="w-full max-w-md h-auto rounded"
                    />
                  </div>
                )}
                {msg.message && !msg.audio_url && !msg.video_url && (
                  <p className="text-sm text-foreground/80 whitespace-pre-line bg-muted/30 p-3 rounded-lg">
                    {msg.message}
                  </p>
                )}
                {msg.message && (msg.image_url || msg.video_url) && (
                  <p className="text-sm text-foreground/80 mt-2 whitespace-pre-line">
                    {msg.message}
                  </p>
                )}
                {msg.sent_at && (
                  <div className="text-xs text-muted-foreground">
                    Sent: {new Date(msg.sent_at).toLocaleString()}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

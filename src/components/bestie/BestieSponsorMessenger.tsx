import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Clock, CheckCircle, XCircle, Upload, Mic } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { compressImage } from "@/lib/imageUtils";

interface SponsorMessage {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  rejection_reason: string | null;
  audio_url: string | null;
  from_guardian: boolean;
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
  const [messageType, setMessageType] = useState<'text' | 'audio'>('audio');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSubject, setShowSubject] = useState(false);

  useEffect(() => {
    loadPermissions();
    loadMessages();

    // Set up realtime subscription for message status updates
    const channel = supabase
      .channel('bestie-messages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sponsor_messages',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      setUploadedAudioUrl(publicUrl);
      toast({
        title: "Audio uploaded",
        description: "Your audio message is ready to send",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const fileName = `${userId}/${Date.now()}_recording.webm`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      setUploadedAudioUrl(publicUrl);
      setAudioBlob(null); // Clear the blob after successful upload
      toast({
        title: "Recording saved",
        description: "Your audio message is ready to send",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    // Subject is only required for text messages
    if (messageType === 'text' && !subject.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    if (messageType === 'text' && !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (messageType === 'audio' && !uploadedAudioUrl) {
      toast({
        title: "Missing information",
        description: "Please record or upload an audio message",
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
          sent_by: userId,
          from_guardian: false,
          subject: subject.trim() || (messageType === 'audio' ? 'Audio Message' : ''),
          message: messageType === 'text' ? message.trim() : '',
          audio_url: messageType === 'audio' ? uploadedAudioUrl : null,
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
      setMessageType('audio');
      setUploadedAudioUrl(null);
      setAudioBlob(null);
      setShowSubject(false);
      await loadMessages();
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
          {/* Subject field - only shown for text messages or when explicitly requested for audio */}
          {messageType === 'text' ? (
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
          ) : showSubject ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSubject(false);
                    setSubject("");
                  }}
                  className="h-auto p-1 text-xs"
                >
                  Remove
                </Button>
              </div>
              <Input
                id="subject"
                placeholder="Optional subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSubject(true)}
              className="w-full"
            >
              + Add Subject (Optional)
            </Button>
          )}

          {/* Message Type Toggle */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              type="button"
              variant={messageType === 'text' ? 'default' : 'outline'}
              onClick={() => setMessageType('text')}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Text Message
            </Button>
            <Button
              type="button"
              variant={messageType === 'audio' ? 'default' : 'outline'}
              onClick={() => setMessageType('audio')}
              className="flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              Audio Message
            </Button>
          </div>

          {/* Text Message Input */}
          {messageType === 'text' && (
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
          )}

          {/* Audio Message Input */}
          {messageType === 'audio' && (
            <div className="space-y-4">
              <div>
                <Label>Record Audio</Label>
                <div className="mt-2">
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingCancel={() => setUploadedAudioUrl(null)}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div>
                <Label>Upload Audio File</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={uploading}
                  />
                </div>
              </div>

              {uploadedAudioUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="mb-2 block">Preview</Label>
                  <AudioPlayer src={uploadedAudioUrl} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedAudioUrl(null)}
                    className="mt-2"
                  >
                    Remove Audio
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSendMessage}
            disabled={
              sending || 
              (messageType === 'text' && (!subject.trim() || !message.trim())) ||
              (messageType === 'audio' && !uploadedAudioUrl)
            }
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
                      {msg.audio_url ? (
                        <div className="mt-2">
                          <AudioPlayer src={msg.audio_url} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                      )}
                      {msg.from_guardian && (
                        <Badge variant="secondary" className="mt-2">
                          Sent by Guardian
                        </Badge>
                      )}
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Clock, CheckCircle, XCircle, Upload, Mic, Image, Video, X } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
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
  image_url: string | null;
  video_url: string | null;
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
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `sponsor-messages/${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, compressedBlob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Your image is ready to send",
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

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `sponsor-messages/${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      setUploadedVideoUrl(publicUrl);
      toast({
        title: "Video uploaded",
        description: "Your video is ready to send",
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
    if (!subject.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    // Require at least text OR one media attachment
    if (!message.trim() && !uploadedAudioUrl && !uploadedImageUrl && !uploadedVideoUrl) {
      toast({
        title: "Missing content",
        description: "Please enter a message or add at least one media attachment",
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
          subject: subject.trim(),
          message: message.trim(),
          audio_url: uploadedAudioUrl,
          image_url: uploadedImageUrl,
          video_url: uploadedVideoUrl,
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
      setUploadedAudioUrl(null);
      setUploadedImageUrl(null);
      setUploadedVideoUrl(null);
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
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved - Delivered
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
          {/* Subject field */}
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

          {/* Text Message Input */}
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

          {/* Media Attachments Section */}
          <div className="space-y-4 pt-2 border-t">
            <Label className="text-base">Attachments (Optional)</Label>
            
            {/* Audio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                Audio
              </Label>
              {!uploadedAudioUrl ? (
                <>
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingCancel={() => setUploadedAudioUrl(null)}
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={uploading}
                  />
                </>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
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

            {/* Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Image
              </Label>
              {!uploadedImageUrl ? (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="relative">
                    <img
                      src={uploadedImageUrl}
                      alt="Upload preview"
                      className="w-full h-auto max-h-96 object-contain rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => setUploadedImageUrl(null)}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Video */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video
              </Label>
              {!uploadedVideoUrl ? (
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploading}
                />
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="relative">
                    <VideoPlayer src={uploadedVideoUrl} className="w-full" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => setUploadedVideoUrl(null)}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={
              sending || 
              !subject.trim() ||
              (!message.trim() && !uploadedAudioUrl && !uploadedImageUrl && !uploadedVideoUrl)
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
                    {msg.message && (
                      <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                    )}
                    {msg.audio_url && (
                      <div className="mt-2">
                        <AudioPlayer src={msg.audio_url} />
                      </div>
                    )}
                    {msg.image_url && (
                      <div className="mt-2">
                        <img
                          src={msg.image_url}
                          alt="Message attachment"
                          className="w-full max-w-md h-auto rounded"
                        />
                      </div>
                    )}
                    {msg.video_url && (
                      <div className="mt-2">
                        <VideoPlayer src={msg.video_url} className="w-full max-w-md" />
                      </div>
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
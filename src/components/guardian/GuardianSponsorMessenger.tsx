import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Mic, Upload, Image, X, Video } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { compressImage } from "@/lib/imageUtils";

interface LinkedBestie {
  id: string;
  display_name: string;
  allow_sponsor_messages: boolean;
}

export const GuardianSponsorMessenger = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [linkedBesties, setLinkedBesties] = useState<LinkedBestie[]>([]);
  const [selectedBestieId, setSelectedBestieId] = useState<string>("");
  const [messageFrom, setMessageFrom] = useState<'bestie' | 'guardian'>('bestie');
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLinkedBesties();
  }, []);

  const loadLinkedBesties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: links, error } = await supabase
        .from("caregiver_bestie_links")
        .select(`
          bestie_id,
          allow_sponsor_messages,
          bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            id,
            display_name
          )
        `)
        .eq("caregiver_id", user.id)
        .eq("allow_sponsor_messages", true);

      if (error) throw error;

      const transformedData = (links || []).map(link => {
        const bestie = Array.isArray(link.bestie) ? link.bestie[0] : link.bestie;
        return {
          id: bestie.id,
          display_name: bestie.display_name,
          allow_sponsor_messages: link.allow_sponsor_messages
        };
      });

      setLinkedBesties(transformedData as LinkedBestie[]);
    } catch (error: any) {
      console.error("Error loading besties:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    setModerating(true);
    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Upload to storage
      const fileName = `sponsor-messages/${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, compressedBlob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      // Moderate image using AI
      toast({
        title: "Checking image...",
        description: "AI is reviewing the image for appropriate content",
      });

      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-image',
        {
          body: { imageUrl: publicUrl }
        }
      );

      if (moderationError) throw moderationError;

      if (!moderationResult.approved) {
        toast({
          title: "Image flagged for review",
          description: `This image has been flagged and will be reviewed by an admin before sending. Reason: ${moderationResult.reason}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Image approved",
          description: "Your image passed content review",
        });
      }

      setUploadedImageUrl(publicUrl);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      // Clean up on error
      setUploadedImageUrl(null);
    } finally {
      setUploading(false);
      setModerating(false);
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
    setModerating(true);
    try {
      // Upload to storage
      const fileName = `sponsor-messages/${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      // Moderate video using AI
      toast({
        title: "Checking video...",
        description: "AI is reviewing the video for appropriate content",
      });

      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-video',
        {
          body: { videoUrl: publicUrl }
        }
      );

      if (moderationError) throw moderationError;

      if (!moderationResult.approved) {
        toast({
          title: "Video flagged for review",
          description: `This video has been flagged and will be reviewed by an admin before sending. Reason: ${moderationResult.reason}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Video approved",
          description: "Your video passed content review",
        });
      }

      setUploadedVideoUrl(publicUrl);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      // Clean up on error
      setUploadedVideoUrl(null);
    } finally {
      setUploading(false);
      setModerating(false);
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
    if (!selectedBestieId) {
      toast({
        title: "Missing information",
        description: "Please select a bestie",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    // Require at least text message OR one media attachment
    if (!message.trim() && !uploadedAudioUrl && !uploadedImageUrl && !uploadedVideoUrl) {
      toast({
        title: "Missing information",
        description: "Please enter a message or add audio, image, or video",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Fetch moderation policies
      const { data: moderationSettings } = await supabase
        .from("moderation_settings")
        .select("sponsor_message_image_policy, sponsor_message_video_policy")
        .maybeSingle();

      const imagePolicy = moderationSettings?.sponsor_message_image_policy || 'flagged';
      const videoPolicy = moderationSettings?.sponsor_message_video_policy || 'flagged';

      let messageStatus = 'approved';
      let moderationResult = null;
      let moderationSeverity = null;

      if (uploadedImageUrl) {
        if (imagePolicy === 'all') {
          // All images require moderation
          messageStatus = 'pending_moderation';
          moderationSeverity = 'manual_review';
        } else if (imagePolicy === 'flagged') {
          // Check with AI
          const { data: modResult, error: modError } = await supabase.functions.invoke(
            'moderate-image',
            {
              body: { imageUrl: uploadedImageUrl }
            }
          );

          if (modError) throw modError;

          if (!modResult.approved) {
            messageStatus = 'pending_moderation';
            moderationResult = modResult;
            moderationSeverity = modResult.severity;
          }
        }
        // If policy is 'none', messageStatus stays 'approved'
      }

      if (uploadedVideoUrl) {
        if (videoPolicy === 'all') {
          // All videos require moderation
          messageStatus = 'pending_moderation';
          moderationSeverity = 'manual_review';
        } else if (videoPolicy === 'flagged') {
          // Check with AI
          const { data: modResult, error: modError } = await supabase.functions.invoke(
            'moderate-video',
            {
              body: { videoUrl: uploadedVideoUrl }
            }
          );

          if (modError) throw modError;

          if (!modResult.approved) {
            messageStatus = 'pending_moderation';
            moderationResult = modResult;
            moderationSeverity = modResult.severity;
          }
        }
        // If policy is 'none', messageStatus stays 'approved'
      }

      const { error } = await supabase
        .from("sponsor_messages")
        .insert({
          bestie_id: selectedBestieId,
          sent_by: userId,
          from_guardian: messageFrom === 'guardian',
          subject: subject.trim(),
          message: message.trim() || '',
          audio_url: uploadedAudioUrl,
          image_url: uploadedImageUrl,
          video_url: uploadedVideoUrl,
          moderation_result: moderationResult as any,
          moderation_severity: moderationSeverity,
          status: messageStatus as any,
        } as any);

      if (error) throw error;

      if (messageStatus === 'pending_moderation') {
        toast({
          title: "Message sent for review",
          description: "Your message with media will be reviewed by an admin before being sent to sponsors",
          variant: "default",
        });
      } else {
        toast({
          title: "Message sent!",
          description: `Your message will be sent to ${linkedBesties.find(b => b.id === selectedBestieId)?.display_name}'s sponsors`,
        });
      }

      setSelectedBestieId("");
      setMessageFrom('bestie');
      setSubject("");
      setMessage("");
      setUploadedAudioUrl(null);
      setUploadedImageUrl(null);
      setUploadedVideoUrl(null);
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

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (linkedBesties.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No besties with sponsor messaging enabled. Enable this in your bestie settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Message to Sponsors
        </CardTitle>
        <CardDescription>
          Send a message on behalf of your linked besties to their sponsors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bestie">Select Bestie</Label>
          <Select value={selectedBestieId} onValueChange={setSelectedBestieId}>
            <SelectTrigger id="bestie">
              <SelectValue placeholder="Choose a bestie" />
            </SelectTrigger>
            <SelectContent>
              {linkedBesties.map((bestie) => (
                <SelectItem key={bestie.id} value={bestie.id}>
                  {bestie.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBestieId && (
          <>
            <div className="space-y-2">
              <Label>Message From</Label>
              <RadioGroup value={messageFrom} onValueChange={(value) => setMessageFrom(value as 'bestie' | 'guardian')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bestie" id="from-bestie" />
                  <Label htmlFor="from-bestie" className="font-normal cursor-pointer">
                    {linkedBesties.find(b => b.id === selectedBestieId)?.display_name} (Bestie)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="guardian" id="from-guardian" />
                  <Label htmlFor="from-guardian" className="font-normal cursor-pointer">
                    You (Guardian)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Choose whether this message appears to come from the bestie or from you as their guardian
              </p>
            </div>

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

            {/* Message Input - Always visible */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message to the sponsors..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/1000 characters
              </p>
            </div>

            {/* Media Attachment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Dialog open={audioDialogOpen} onOpenChange={setAudioDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
                    Audio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Audio</DialogTitle>
                    <DialogDescription>
                      Record or upload an audio message
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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

                    <div className="flex justify-end">
                      <Button onClick={() => setAudioDialogOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Image</DialogTitle>
                    <DialogDescription>
                      Upload an image to include with your message
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Upload Image</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Images will be automatically checked by AI for appropriate content
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading || moderating}
                      />
                      {moderating && (
                        <p className="text-xs text-muted-foreground mt-2">
                          AI is reviewing your image...
                        </p>
                      )}
                    </div>

                    {uploadedImageUrl && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="mb-2 block">Preview</Label>
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

                    <div className="flex justify-end">
                      <Button onClick={() => setImageDialogOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Video</DialogTitle>
                    <DialogDescription>
                      Upload a video to include with your message
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Upload Video</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Videos will be automatically checked by AI for appropriate content
                      </p>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        disabled={uploading || moderating}
                      />
                      {moderating && (
                        <p className="text-xs text-muted-foreground mt-2">
                          AI is reviewing your video...
                        </p>
                      )}
                    </div>

                    {uploadedVideoUrl && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="mb-2 block">Preview</Label>
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

                    <div className="flex justify-end">
                      <Button onClick={() => setVideoDialogOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Show attached media preview */}
            {(uploadedAudioUrl || uploadedImageUrl || uploadedVideoUrl) && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Attachments:</Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedAudioUrl && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border">
                      <Mic className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Audio</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => setUploadedAudioUrl(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {uploadedImageUrl && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border">
                      <Image className="w-4 h-4" />
                      <span className="text-sm">Image</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => setUploadedImageUrl(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {uploadedVideoUrl && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border">
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Video</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => setUploadedVideoUrl(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleSendMessage}
              disabled={
                sending || 
                moderating ||
                !subject.trim() || 
                (!message.trim() && !uploadedAudioUrl && !uploadedImageUrl && !uploadedVideoUrl)
              }
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : moderating ? "Reviewing media..." : "Send Message"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
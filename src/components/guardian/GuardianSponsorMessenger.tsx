import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Mic, Upload } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";

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
  const [messageType, setMessageType] = useState<'text' | 'audio'>('text');
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
      const { error } = await supabase
        .from("sponsor_messages")
        .insert({
          bestie_id: selectedBestieId,
          sent_by: userId,
          from_guardian: messageFrom === 'guardian',
          subject: subject.trim(),
          message: messageType === 'text' ? message.trim() : '',
          audio_url: messageType === 'audio' ? uploadedAudioUrl : null,
          status: 'approved', // Guardians don't need approval
        });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: `Your message will be sent to ${linkedBesties.find(b => b.id === selectedBestieId)?.display_name}'s sponsors`,
      });

      setSelectedBestieId("");
      setMessageFrom('bestie');
      setSubject("");
      setMessage("");
      setMessageType('text');
      setUploadedAudioUrl(null);
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
                !subject.trim() || 
                (messageType === 'text' && !message.trim()) ||
                (messageType === 'audio' && !uploadedAudioUrl)
              }
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
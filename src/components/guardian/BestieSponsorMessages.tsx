import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, CheckCircle, XCircle, Send, Clock, Edit, Image as ImageIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AudioPlayer from "@/components/AudioPlayer";
import { compressImage } from "@/lib/imageUtils";

interface SponsorMessage {
  id: string;
  bestie_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  audio_url: string | null;
  image_url: string | null;
  from_guardian: boolean;
  bestie: {
    display_name: string;
  };
}

interface BestieSponsorMessagesProps {
  onMessagesChange?: () => void;
}

export const BestieSponsorMessages = ({ onMessagesChange }: BestieSponsorMessagesProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SponsorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedMessage, setEditedMessage] = useState("");
  const [editedImage, setEditedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        .select("*")
        .in("bestie_id", bestieIds)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch bestie names separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", bestieIds);

      // Map bestie names to messages
      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p.display_name])
      );

      const transformedData = (data || []).map(msg => ({
        ...msg,
        bestie: {
          display_name: profileMap.get(msg.bestie_id) || 'Unknown'
        }
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
      onMessagesChange?.();
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
      onMessagesChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (msg: SponsorMessage) => {
    setEditingId(msg.id);
    setEditedSubject(msg.subject);
    setEditedMessage(msg.message || "");
    setEditedImage(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setEditedImage(file);
  };

  const handleEditAndApprove = async (messageId: string) => {
    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = null;

      // Upload image if one was selected
      if (editedImage) {
        const compressedImage = await compressImage(editedImage);
        const fileExt = editedImage.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(filePath, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("app-assets")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Update message with edits
      const updateData: any = {
        subject: editedSubject.trim(),
        message: editedMessage.trim(),
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        from_guardian: true,
      };

      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from("sponsor_messages")
        .update(updateData)
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message updated and approved",
        description: "The message will be sent to sponsors shortly",
      });

      setEditingId(null);
      setEditedSubject("");
      setEditedMessage("");
      setEditedImage(null);
      await loadPendingMessages();
      onMessagesChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
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
            <div className="p-4 bg-muted rounded-lg space-y-2">
              {msg.image_url && (
                <div className="mb-2">
                  <img src={msg.image_url} alt="Message attachment" className="max-w-full rounded-lg" />
                </div>
              )}
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
              <Dialog open={editingId === msg.id} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => startEditing(msg)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit & Approve
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Message Before Approving</DialogTitle>
                    <DialogDescription>
                      You can modify the subject, message, and add an image before sending to sponsors.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        placeholder="Message subject"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        placeholder="Message content"
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="image">Add or Replace Image (optional)</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="cursor-pointer"
                      />
                      {editedImage && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected: {editedImage.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleEditAndApprove(msg.id)}
                      disabled={!editedSubject.trim() || uploadingImage}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {uploadingImage ? "Uploading..." : "Approve & Send"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => handleApprove(msg.id)}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve As-Is
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
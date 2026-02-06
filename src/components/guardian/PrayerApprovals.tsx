import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import AudioPlayer from "@/components/AudioPlayer";
import { format } from "date-fns";

interface PendingPrayer {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  audio_url: string | null;
  is_anonymous: boolean;
  author: {
    display_name: string;
    avatar_number: number;
  };
}

interface PrayerApprovalsProps {
  currentUserId: string;
  onUpdate: () => void;
}

export const PrayerApprovals = ({ currentUserId, onUpdate }: PrayerApprovalsProps) => {
  const [prayers, setPrayers] = useState<PendingPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPrayers();
  }, [currentUserId]);

  const loadPendingPrayers = async () => {
    try {
      // Get linked besties
      const { data: links } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id, require_prayer_approval")
        .eq("caregiver_id", currentUserId)
        .eq("require_prayer_approval", true);

      if (!links || links.length === 0) {
        setPrayers([]);
        setLoading(false);
        return;
      }

      const bestieIds = links.map(l => l.bestie_id);

      const { data, error } = await supabase
        .from("prayer_requests")
        .select(`
          id, title, content, created_at, user_id, audio_url, is_anonymous,
          author:profiles!prayer_requests_user_id_fkey(display_name, avatar_number)
        `)
        .in("user_id", bestieIds)
        .eq("approval_status", "pending_approval")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedPrayers = (data || []).map(p => ({
        ...p,
        author: Array.isArray(p.author) ? p.author[0] : p.author
      })) as PendingPrayer[];

      setPrayers(formattedPrayers);
    } catch (error) {
      console.error("Error loading prayers:", error);
      toast.error("Failed to load pending prayers");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (prayerId: string) => {
    setProcessingId(prayerId);
    const prayer = prayers.find(p => p.id === prayerId);
    
    try {
      const { error } = await supabase
        .from("prayer_requests")
        .update({
          approval_status: "approved",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", prayerId);

      if (error) throw error;

      // Send notification to the bestie
      if (prayer) {
        try {
          await supabase.functions.invoke('send-prayer-notification', {
            body: {
              type: 'approved',
              prayerId: prayerId,
              recipientId: prayer.user_id,
              prayerTitle: prayer.title
            }
          });
        } catch (notifError) {
          console.error("Error sending approval notification:", notifError);
        }
      }

      toast.success("Prayer request approved");
      await loadPendingPrayers();
      onUpdate();
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (prayerId: string) => {
    setProcessingId(prayerId);
    const prayer = prayers.find(p => p.id === prayerId);
    
    try {
      const { error } = await supabase
        .from("prayer_requests")
        .update({
          approval_status: "rejected",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", prayerId);

      if (error) throw error;

      // Send notification to the bestie
      if (prayer) {
        try {
          await supabase.functions.invoke('send-prayer-notification', {
            body: {
              type: 'rejected',
              prayerId: prayerId,
              recipientId: prayer.user_id,
              prayerTitle: prayer.title
            }
          });
        } catch (notifError) {
          console.error("Error sending rejection notification:", notifError);
        }
      }

      toast.success("Prayer request rejected");
      await loadPendingPrayers();
      onUpdate();
    } catch (error) {
      toast.error("Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (prayers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pending prayers</h3>
          <p className="text-muted-foreground text-center">
            All prayer requests from your besties have been reviewed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prayers.map((prayer) => (
        <Card key={prayer.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AvatarDisplay
                  displayName={prayer.author?.display_name || "User"}
                  size="md"
                />
                <div>
                  <CardTitle className="text-lg">{prayer.title}</CardTitle>
                  <CardDescription>
                    by {prayer.author?.display_name} · {format(new Date(prayer.created_at), "MMM d, yyyy")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>Pending</Badge>
                {prayer.audio_url && (
                  <Badge variant="outline" className="gap-1">
                    <Mic className="w-3 h-3 text-red-500" />
                    Audio
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap">{prayer.content}</p>

            {prayer.audio_url && (
              <div className="p-2 bg-muted/30 rounded-lg">
                <AudioPlayer src={prayer.audio_url} />
              </div>
            )}

            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="gap-2 flex-1" disabled={processingId === prayer.id}>
                    {processingId === prayer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Prayer Request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This prayer will be visible on the community board.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleApprove(prayer.id)}>
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 flex-1" disabled={processingId === prayer.id}>
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Prayer Request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This prayer will not be shared publicly.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleReject(prayer.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reject
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
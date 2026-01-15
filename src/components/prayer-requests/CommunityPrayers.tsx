import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Users, HandHeart, Sparkles, Mic, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import { TextToSpeech } from "@/components/TextToSpeech";
import AudioPlayer from "@/components/AudioPlayer";

interface CommunityPrayer {
  id: string;
  title: string;
  content: string;
  is_answered: boolean;
  answered_at: string | null;
  likes_count: number;
  created_at: string;
  user_id: string;
  creator_name: string | null;
  is_anonymous: boolean;
  gratitude_message: string | null;
  audio_url: string | null;
  image_url: string | null;
  expires_at: string | null;
}

const formatTimeRemaining = (expiresAt: string | null): string | null => {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const hoursRemaining = differenceInHours(expiryDate, now);
  
  // Use ceiling for days so "30 days from now" shows as "30 days left" not "29 days left"
  const daysRemaining = Math.ceil(hoursRemaining / 24);
  
  if (daysRemaining > 1) {
    return `${daysRemaining} days left`;
  } else if (daysRemaining === 1) {
    return "1 day left";
  } else if (hoursRemaining > 0) {
    return `${hoursRemaining}h left`;
  }
  return null;
};

interface CommunityPrayersProps {
  userId?: string;
}

type SortOption = "newest" | "most-prayed" | "answered";

export const CommunityPrayers = ({ userId }: CommunityPrayersProps) => {
  const [prayers, setPrayers] = useState<CommunityPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingPrayer, setLikingPrayer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    loadPrayers();
    if (userId) {
      loadUserLikes();
    }
  }, [userId, sortBy]);

  const loadPrayers = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    
    let query = supabase
      .from("prayer_requests")
      .select("id, title, content, is_answered, answered_at, likes_count, created_at, user_id, is_anonymous, gratitude_message, audio_url, image_url, approval_status, expires_at, image_moderation_status")
      .eq("is_public", true)
      .eq("approval_status", "approved")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(50);

    if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "most-prayed") {
      query = query.order("likes_count", { ascending: false });
    } else if (sortBy === "answered") {
      query = query.eq("is_answered", true).order("answered_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error loading prayers");
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setPrayers([]);
      setLoading(false);
      return;
    }

    // Fetch creator names only for non-anonymous prayers
    const nonAnonymousIds = data.filter(p => !p.is_anonymous).map(p => p.user_id);
    let profileMap = new Map<string, string>();
    
    if (nonAnonymousIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...new Set(nonAnonymousIds)]);

      profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);
    }

    const prayersWithNames = data.map((prayer) => ({
      ...prayer,
      creator_name: prayer.is_anonymous ? "Anonymous" : (profileMap.get(prayer.user_id) || "Anonymous"),
    }));

    setPrayers(prayersWithNames);
    setLoading(false);
  };

  const loadUserLikes = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("prayer_request_likes")
      .select("prayer_request_id")
      .eq("user_id", userId);

    if (data) {
      setUserLikes(new Set(data.map((l) => l.prayer_request_id)));
    }
  };

  const handleLike = async (prayerId: string) => {
    if (!userId) {
      toast.error("Please sign in to pray for others");
      return;
    }

    setLikingPrayer(prayerId);
    const isLiked = userLikes.has(prayerId);
    const prayer = prayers.find((p) => p.id === prayerId);
    if (!prayer) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("prayer_request_likes")
          .delete()
          .eq("prayer_request_id", prayerId)
          .eq("user_id", userId);

        await supabase
          .from("prayer_requests")
          .update({ likes_count: Math.max(0, prayer.likes_count - 1) })
          .eq("id", prayerId);

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(prayerId);
          return next;
        });
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p
          )
        );
      } else {
        // Like
        await supabase
          .from("prayer_request_likes")
          .insert({ prayer_request_id: prayerId, user_id: userId });

        await supabase
          .from("prayer_requests")
          .update({ likes_count: prayer.likes_count + 1 })
          .eq("id", prayerId);

        setUserLikes((prev) => new Set([...prev, prayerId]));
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId ? { ...p, likes_count: p.likes_count + 1 } : p
          )
        );
        toast.success("Praying with you 🙏");

        // Send notification to prayer author (if not praying for own prayer)
        if (prayer.user_id !== userId) {
          try {
            // Get current user's display name
            const { data: currentUserProfile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", userId)
              .single();

            await supabase.functions.invoke('send-prayer-notification', {
              body: {
                type: 'prayed_for_you',
                prayerId: prayerId,
                recipientId: prayer.user_id,
                senderName: currentUserProfile?.display_name || "Someone",
                prayerTitle: prayer.title
              }
            });
          } catch (notifError) {
            console.error("Error sending prayer notification:", notifError);
          }
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLikingPrayer(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Loading community prayers...</p>
      </div>
    );
  }

  if (!prayers.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No shared prayer requests yet.</p>
        <p className="text-sm mt-1">Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Options */}
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="most-prayed">Most Prayed For</SelectItem>
            <SelectItem value="answered">Answered Prayers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prayer Cards */}
      <div className="space-y-4">
        {prayers.map((prayer) => {
          const isLiked = userLikes.has(prayer.id);
          const isLiking = likingPrayer === prayer.id;
          const ttsText = `${prayer.title}. ${prayer.content}${prayer.gratitude_message ? `. Gratitude: ${prayer.gratitude_message}` : ""}`;

          const timeRemaining = formatTimeRemaining(prayer.expires_at);

          return (
            <Card key={prayer.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Header: Title + TTS left, Date/Time right */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <h3 className="font-semibold">{prayer.title}</h3>
                    <TextToSpeech text={ttsText} size="sm" />
                    {prayer.audio_url && (
                      <Badge variant="outline" className="gap-1">
                        <Mic className="w-3 h-3 text-red-500" />
                        Audio
                      </Badge>
                    )}
                    {prayer.is_answered && (
                      <Badge className="bg-green-500/90 text-white gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Answered
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {timeRemaining && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {timeRemaining}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(prayer.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm">{prayer.content}</p>

                {/* Prayer Image */}
                {prayer.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={prayer.image_url} 
                      alt="Prayer request image" 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {/* Audio Player */}
                {prayer.audio_url && (
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <AudioPlayer src={prayer.audio_url} />
                  </div>
                )}

                {/* Gratitude Message */}
                {prayer.gratitude_message && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg cursor-pointer hover:bg-green-500/15 transition-colors">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-medium">Prayer of Gratitude</span>
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-300">
                          "{prayer.gratitude_message}"
                        </p>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Sparkles className="w-5 h-5" />
                          Prayer of Gratitude
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <p className="text-green-800 dark:text-green-300 italic">
                            "{prayer.gratitude_message}"
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                          — {prayer.creator_name}
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Footer: Creator left, Actions right */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">
                    by {prayer.creator_name}
                    {prayer.is_answered && prayer.answered_at && (
                      <span className="ml-2">· Answered {format(new Date(prayer.answered_at), "MMM d, yyyy")}</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(prayer.id)}
                    disabled={isLiking}
                    className={cn(
                      "gap-2",
                      isLiked && "text-primary"
                    )}
                  >
                    {isLiking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HandHeart className={cn("w-4 h-4", isLiked && "fill-current")} />
                    )}
                    {prayer.likes_count > 0 
                      ? `${prayer.likes_count} praying`
                      : "Pray for this"
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
}

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
    let query = supabase
      .from("prayer_requests")
      .select("id, title, content, is_answered, answered_at, likes_count, created_at, user_id")
      .eq("is_public", true)
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

    // Fetch creator names
    const creatorIds = [...new Set(data.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

    const prayersWithNames = data.map((prayer) => ({
      ...prayer,
      creator_name: profileMap.get(prayer.user_id) || "Anonymous",
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

          return (
            <Card key={prayer.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{prayer.title}</h3>
                      {prayer.is_answered && (
                        <Badge className="bg-green-500/90 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Answered
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      by {prayer.creator_name} · {format(new Date(prayer.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <p className="text-sm">{prayer.content}</p>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(prayer.id)}
                    disabled={isLiking}
                    className={cn(
                      "gap-2",
                      isLiked && "text-red-500 hover:text-red-600"
                    )}
                  >
                    {isLiking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                    )}
                    {prayer.likes_count > 0 
                      ? `${prayer.likes_count} praying`
                      : "Pray for this"
                    }
                  </Button>

                  {prayer.is_answered && prayer.answered_at && (
                    <span className="text-xs text-muted-foreground">
                      Answered {format(new Date(prayer.answered_at), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

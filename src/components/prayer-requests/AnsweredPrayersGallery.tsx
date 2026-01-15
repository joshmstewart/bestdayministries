import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Sparkles, 
  Heart, 
  CheckCircle2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { TextToSpeech } from "@/components/TextToSpeech";

interface AnsweredPrayer {
  id: string;
  title: string;
  content: string;
  gratitude_message: string | null;
  answered_at: string;
  is_anonymous: boolean;
  user_id: string;
  image_url: string | null;
  display_name?: string;
}

export const AnsweredPrayersGallery = () => {
  const [prayers, setPrayers] = useState<AnsweredPrayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnsweredPrayers();
  }, []);

  const loadAnsweredPrayers = async () => {
    try {
      // Fetch answered prayers that were public (shared)
      const { data: prayersData, error } = await supabase
        .from("prayer_requests")
        .select("id, title, content, gratitude_message, answered_at, is_anonymous, user_id, image_url")
        .eq("is_answered", true)
        .eq("is_public", true)
        .eq("approval_status", "approved")
        .not("gratitude_message", "is", null)
        .order("answered_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get display names for non-anonymous prayers
      const nonAnonymousUserIds = (prayersData || [])
        .filter(p => !p.is_anonymous)
        .map(p => p.user_id);

      let displayNameMap: Record<string, string> = {};
      
      if (nonAnonymousUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", nonAnonymousUserIds);

        if (profiles) {
          displayNameMap = Object.fromEntries(
            profiles.map(p => [p.id, p.display_name || "Community Member"])
          );
        }
      }

      const enrichedPrayers = (prayersData || []).map(prayer => ({
        ...prayer,
        display_name: prayer.is_anonymous ? "Anonymous" : displayNameMap[prayer.user_id] || "Community Member"
      }));

      setPrayers(enrichedPrayers);
    } catch (error) {
      console.error("Error loading answered prayers:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Loading answered prayers...</p>
      </div>
    );
  }

  if (!prayers.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No answered prayers with gratitude messages yet.</p>
        <p className="text-sm mt-1">Check back soon for inspiring testimonials!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          Answered Prayers
        </h2>
        <p className="text-muted-foreground mt-2">
          Celebrating prayers that have been answered with gratitude from our community
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prayers.map((prayer) => {
          const ttsText = `Answered prayer from ${prayer.display_name}. ${prayer.title}. Gratitude message: ${prayer.gratitude_message}`;
          
          return (
            <Card 
              key={prayer.id} 
              className="overflow-hidden bg-gradient-to-br from-green-50/80 to-yellow-50/50 dark:from-green-950/30 dark:to-yellow-950/20 border-green-200/50 dark:border-green-800/30"
            >
              <CardContent className="p-5 space-y-4">
                {/* Header with badge */}
                <div className="flex items-start justify-between gap-2">
                  <Badge className="bg-green-500/90 text-white gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Answered
                  </Badge>
                  <TextToSpeech text={ttsText} size="sm" />
                </div>

                {/* Prayer title */}
                <div>
                  <h3 className="font-semibold text-lg">{prayer.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {prayer.content}
                  </p>
                </div>

                {/* Prayer Image */}
                {prayer.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={prayer.image_url} 
                      alt="Prayer request image" 
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}

                {/* Gratitude message */}
                <div className="p-4 bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">Prayer of Gratitude</span>
                  </div>
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 italic">
                    "{prayer.gratitude_message}"
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>— {prayer.display_name}</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {prayer.answered_at && format(new Date(prayer.answered_at), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

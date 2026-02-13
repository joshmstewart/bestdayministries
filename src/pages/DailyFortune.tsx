import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { DailyFortune as DailyFortuneComponent } from "@/components/daily-features/DailyFortune";
import { FortuneComments } from "@/components/daily-features/FortuneComments";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookMarked, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dedicated Daily Fortune page with fortune display and comments.
 */
export default function DailyFortunePage() {
  const navigate = useNavigate();
  const [fortunePostId, setFortunePostId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Get MST date
  const getMSTDate = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  };

  useEffect(() => {
    const loadFortunePost = async () => {
      const today = getMSTDate();
      const { data } = await supabase
        .from("daily_fortune_posts")
        .select("id")
        .eq("post_date", today)
        .maybeSingle();
      
      if (data) {
        setFortunePostId(data.id);
        
        // Check comment count
        if (data.id) {
          const { data: fortuneData } = await supabase
            .from("daily_fortune_posts")
            .select("discussion_post_id")
            .eq("id", data.id)
            .maybeSingle();
          
          if (fortuneData?.discussion_post_id) {
            const { count } = await supabase
              .from("discussion_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", fortuneData.discussion_post_id)
              .eq("approval_status", "approved");
            setCommentCount(count || 0);
          }
        }
      }
    };
    loadFortunePost();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UnifiedHeader />
      <main className="flex-1 container max-w-2xl mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/my-fortunes")}
          >
            <BookMarked className="h-4 w-4 mr-2" />
            My Fortunes
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-6">
          Daily Fortune
        </h1>

        <div className="space-y-6">
          <DailyFortuneComponent />
          
          {fortunePostId && (
            <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 p-4">
              <p className="font-semibold flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-primary" />
                {commentCount > 0 ? "Continue the discussion!" : "Start the discussion!"}
              </p>
              <FortuneComments fortunePostId={fortunePostId} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

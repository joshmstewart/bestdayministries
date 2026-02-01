import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { DailyFortune as DailyFortuneComponent } from "@/components/daily-features/DailyFortune";
import { FortuneComments } from "@/components/daily-features/FortuneComments";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookMarked } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dedicated Daily Fortune page with fortune display and comments.
 */
export default function DailyFortunePage() {
  const navigate = useNavigate();
  const [fortunePostId, setFortunePostId] = useState<string | null>(null);

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
          Daily Inspiration
        </h1>

        <div className="space-y-6">
          <DailyFortuneComponent />
          
          {fortunePostId && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Discussion</h2>
              <FortuneComments fortunePostId={fortunePostId} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

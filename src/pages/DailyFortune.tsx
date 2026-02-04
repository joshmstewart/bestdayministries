import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { DailyFortune as DailyFortuneComponent } from "@/components/daily-features/DailyFortune";
import { FortuneComments } from "@/components/daily-features/FortuneComments";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, BookMarked, ChevronDown, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dedicated Daily Fortune page with fortune display and comments.
 */
export default function DailyFortunePage() {
  const navigate = useNavigate();
  const [fortunePostId, setFortunePostId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

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

  const handleFortuneReveal = () => {
    setCommentsExpanded(true);
  };

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
          <DailyFortuneComponent onReveal={handleFortuneReveal} />
          
          {fortunePostId && (
            <Collapsible open={commentsExpanded} onOpenChange={setCommentsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between gap-2 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Discussion</span>
                    <span className="text-xs text-muted-foreground">
                      — share your thoughts!
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${commentsExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <FortuneComments fortunePostId={fortunePostId} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

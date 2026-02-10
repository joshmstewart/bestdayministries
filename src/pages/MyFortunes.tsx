import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedFortunes } from "@/hooks/useSavedFortunes";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextToSpeech } from "@/components/TextToSpeech";
import { ArrowLeft, Bookmark, BookOpen, Quote, Star, Lightbulb, ThumbsUp, MessageCircle, Sparkles, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function MyFortunes() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { savedFortunes, loading, toggleSave } = useSavedFortunes();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "bible_verse":
        return <BookOpen className="w-4 h-4" />;
      case "affirmation":
        return <Star className="w-4 h-4" />;
      case "life_lesson":
        return <Lightbulb className="w-4 h-4" />;
      case "gratitude_prompt":
        return <ThumbsUp className="w-4 h-4" />;
      case "discussion_starter":
        return <MessageCircle className="w-4 h-4" />;
      case "proverbs":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Quote className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case "bible_verse":
        return "Scripture";
      case "affirmation":
        return "Affirmation";
      case "life_lesson":
        return "Life Lesson";
      case "gratitude_prompt":
        return "Gratitude Prompt";
      case "discussion_starter":
        return "Discussion Starter";
      case "proverbs":
        return "Biblical Wisdom";
      default:
        return "Quote";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <UnifiedHeader />
        <main className="flex-1 pt-24 pb-8">
          <div className="container max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-8">
        <div className="container max-w-2xl mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Bookmark className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  My Fortunes
                </h1>
                <p className="text-sm text-muted-foreground">
                  {savedFortunes.length} saved inspiration{savedFortunes.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {savedFortunes.length === 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-12 text-center space-y-4">
                <Sparkles className="w-12 h-12 text-primary mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">No saved fortunes yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Tap the bookmark icon on any Daily Fortune to save it here for later!
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/community")}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  View Today's Fortune
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Saved fortunes list */}
          <div className="space-y-4">
            {savedFortunes.map((saved) => {
              const fortune = saved.fortune_post?.fortune;
              if (!fortune) return null;

              return (
                <Card 
                  key={saved.id}
                  className="bg-primary/5 border-primary/20"
                >
                  <CardContent className="py-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                        {getSourceIcon(fortune.source_type)}
                        <span>{getSourceLabel(fortune.source_type)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TextToSpeech
                          text={`${fortune.content}. ${fortune.author ? `By ${fortune.author}` : ""} ${fortune.reference || ""}`}
                          size="icon"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSave(saved.fortune_post_id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          title="Remove from saved"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 rounded-lg bg-card space-y-2">
                      <p className="text-base leading-relaxed italic">
                        "{fortune.content}"
                      </p>
                      {(fortune.author || fortune.reference) && (
                        <p className="text-sm text-right text-muted-foreground">
                          {fortune.author && <span>— {fortune.author}</span>}
                          {fortune.reference && <span className="ml-1">({fortune.reference})</span>}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Saved {format(new Date(saved.created_at), "MMM d, yyyy")}
                      </span>
                      {saved.fortune_post?.post_date && (
                        <span>
                          From {format(new Date(saved.fortune_post.post_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

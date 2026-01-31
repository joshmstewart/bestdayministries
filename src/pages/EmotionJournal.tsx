import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Heart, Calendar, TrendingUp, ChevronDown, ChevronUp, Save, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { EmotionHistory } from '@/components/emotion-journal/EmotionHistory';
import { EmotionStats } from '@/components/emotion-journal/EmotionStats';
import { TextToSpeech } from '@/components/TextToSpeech';
import { cn } from '@/lib/utils';

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  coping_suggestions: string[] | null;
}

// Theme styles based on category
const CATEGORY_THEMES = {
  positive: {
    bgGradient: "from-green-50 via-emerald-50 to-teal-50",
    buttonGradient: "from-green-500 to-emerald-500",
    border: "border-green-300",
    text: "text-green-700",
    headerGradient: "from-green-500 to-emerald-500",
    cardBg: "bg-green-50/50",
  },
  neutral: {
    bgGradient: "from-slate-50 via-gray-50 to-zinc-50",
    buttonGradient: "from-slate-500 to-gray-500",
    border: "border-slate-300",
    text: "text-slate-700",
    headerGradient: "from-slate-500 to-gray-500",
    cardBg: "bg-slate-50/50",
  },
  negative: {
    bgGradient: "from-rose-50 via-red-50 to-orange-50",
    buttonGradient: "from-rose-500 to-red-500",
    border: "border-rose-300",
    text: "text-rose-700",
    headerGradient: "from-rose-500 to-red-500",
    cardBg: "bg-rose-50/50",
  },
};

const DEFAULT_THEME = {
  bgGradient: "from-purple-50 via-pink-50 to-blue-50",
  buttonGradient: "from-purple-500 to-pink-500",
  border: "border-purple-200",
  text: "text-purple-700",
  headerGradient: "from-purple-500 to-pink-500",
  cardBg: "bg-white/80",
};

export default function EmotionJournal() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [emotionTypes, setEmotionTypes] = useState<EmotionType[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [journalText, setJournalText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('log');
  
  // AI response state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load emotion types
  useEffect(() => {
    const loadEmotionTypes = async () => {
      const { data, error } = await supabase
        .from('emotion_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error loading emotion types:', error);
        toast.error('Failed to load emotions');
        return;
      }

      setEmotionTypes(data || []);
    };

    loadEmotionTypes();
  }, []);

  // Get current theme based on selected emotion
  const currentTheme = selectedEmotion 
    ? CATEGORY_THEMES[selectedEmotion.category as keyof typeof CATEGORY_THEMES] || CATEGORY_THEMES.neutral
    : DEFAULT_THEME;

  const handleEmotionSelect = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setAiResponse(null);
  };

  const handleSave = async (withAiResponse: boolean) => {
    if (!user || !selectedEmotion) return;

    setIsSaving(true);
    try {
      // Save to database
      const { error } = await supabase
        .from('emotion_journal_entries')
        .insert({
          user_id: user.id,
          emotion: selectedEmotion.name,
          emotion_emoji: selectedEmotion.emoji,
          intensity: 3, // Default intensity
          journal_text: journalText.trim() || null,
        });

      if (error) throw error;

      // If user wants AI response, fetch it
      if (withAiResponse) {
        setIsGeneratingResponse(true);
        try {
          const { data, error: aiError } = await supabase.functions.invoke('emotion-journal-response', {
            body: {
              emotion: selectedEmotion.name,
              emoji: selectedEmotion.emoji,
              intensity: null,
              journalText: journalText.trim() || null,
            },
          });

          if (aiError) throw aiError;
          setAiResponse(data.response);
        } catch (aiErr) {
          console.error('Error generating AI response:', aiErr);
          setAiResponse(`${selectedEmotion.emoji} Thank you for sharing that you feel ${selectedEmotion.name.toLowerCase()}. It's good to check in with your feelings!`);
        } finally {
          setIsGeneratingResponse(false);
        }
      }

      toast.success(`${selectedEmotion.emoji} Feeling logged!`, {
        description: 'Great job checking in with yourself!',
      });

      // Reset form only if not showing AI response
      if (!withAiResponse) {
        resetForm();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedEmotion(null);
    setJournalText('');
    setShowNotes(false);
    setAiResponse(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main 
      className={cn(
        "min-h-screen bg-gradient-to-br pt-24 pb-12 transition-all duration-500",
        currentTheme.bgGradient
      )}
    >
      <div className="container max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 bg-white/80 backdrop-blur-sm hover:bg-white/90"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            {selectedEmotion ? (
              <span className="text-5xl animate-bounce">{selectedEmotion.emoji}</span>
            ) : (
              <Heart className={cn(
                "h-10 w-10 text-white p-2 rounded-full",
                `bg-gradient-to-br ${currentTheme.headerGradient}`
              )} />
            )}
            <h1 className={cn(
              "text-3xl font-bold bg-clip-text text-transparent",
              `bg-gradient-to-r ${currentTheme.headerGradient}`
            )}>
              {selectedEmotion ? `Feeling ${selectedEmotion.name}` : 'Emotion Journal'}
            </h1>
            <TextToSpeech 
              text={selectedEmotion 
                ? `You're feeling ${selectedEmotion.name}. That's okay!` 
                : "Emotion Journal. How are you feeling today? It's okay to feel any way!"
              } 
              size="default" 
            />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            {selectedEmotion 
              ? `It's okay to feel ${selectedEmotion.name.toLowerCase()}. Let's explore this feeling together.`
              : "How are you feeling today? It's okay to feel any way!"
            }
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="log" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Log Feeling
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Patterns
            </TabsTrigger>
          </TabsList>

          {/* Log Feeling Tab */}
          <TabsContent value="log" className="space-y-4">
            {/* Simple Emotion Grid */}
            <div className={cn(
              "rounded-xl p-6 backdrop-blur-sm shadow-lg transition-all duration-500",
              currentTheme.cardBg,
              currentTheme.border,
              "border"
            )}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xl font-bold">🎭 How are you feeling?</span>
                <TextToSpeech 
                  text="How are you feeling? Choose an emotion from the options below." 
                  size="icon" 
                />
              </div>
              
              {/* Emoji Grid */}
              <div className="flex flex-wrap justify-center gap-2">
                {emotionTypes.map((emotion) => (
                  <button
                    key={emotion.id}
                    onClick={() => handleEmotionSelect(emotion)}
                    disabled={isSaving}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl transition-all duration-300",
                      "hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2",
                      "bg-white/80 border-2",
                      selectedEmotion?.id === emotion.id
                        ? "shadow-lg scale-105"
                        : "border-transparent hover:border-gray-200"
                    )}
                    style={{
                      borderColor: selectedEmotion?.id === emotion.id ? emotion.color : undefined,
                      backgroundColor: selectedEmotion?.id === emotion.id ? `${emotion.color}20` : undefined,
                    }}
                  >
                    <span className="text-3xl">{emotion.emoji}</span>
                    <span 
                      className="text-xs font-medium mt-1"
                      style={{ color: selectedEmotion?.id === emotion.id ? emotion.color : undefined }}
                    >
                      {emotion.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Show options after selecting emotion */}
            {selectedEmotion && !aiResponse && (
              <div className={cn(
                "rounded-xl p-6 backdrop-blur-sm shadow-lg transition-all duration-500 space-y-4",
                currentTheme.cardBg,
                currentTheme.border,
                "border"
              )}>
                {/* Expand for notes toggle */}
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {showNotes ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide notes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Add a note (optional)
                    </>
                  )}
                </button>

                {/* Notes section */}
                {showNotes && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Textarea
                      value={journalText}
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="What's on your mind? How are you feeling?"
                      className="min-h-[100px] resize-none bg-white/50"
                    />
                  </div>
                )}

                {/* Two action buttons side by side */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Just Save button */}
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-6 rounded-xl",
                      "border-2 transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      "bg-white/80",
                      currentTheme.border
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                    ) : (
                      <Save className={cn("w-10 h-10", currentTheme.text)} />
                    )}
                    <span className="text-sm font-medium">Just Save</span>
                  </button>

                  {/* Chat / Get Response button */}
                  <button
                    onClick={() => handleSave(true)}
                    disabled={isSaving || isGeneratingResponse}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-6 rounded-xl",
                      "border-2 transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      `bg-gradient-to-br ${currentTheme.buttonGradient}`,
                      "text-white border-transparent"
                    )}
                  >
                    {isSaving || isGeneratingResponse ? (
                      <Loader2 className="w-10 h-10 animate-spin" />
                    ) : (
                      <MessageCircle className="w-10 h-10" />
                    )}
                    <span className="text-sm font-medium">Chat More</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI Response Card */}
            {aiResponse && (
              <div className={cn(
                "rounded-xl p-6 backdrop-blur-sm shadow-lg transition-all duration-500",
                "border border-primary/30 bg-primary/5"
              )}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-medium text-primary">A message for you:</span>
                      <TextToSpeech text={aiResponse} size="icon" />
                    </div>
                    <p className="text-base leading-relaxed mb-4">{aiResponse}</p>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="w-full"
                    >
                      Log Another Feeling
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <EmotionHistory userId={user.id} />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <EmotionStats userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

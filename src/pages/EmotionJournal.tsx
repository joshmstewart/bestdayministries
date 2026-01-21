import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Heart, Calendar, TrendingUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmotionSelector } from '@/components/emotion-journal/EmotionSelector';
import { JournalEntry } from '@/components/emotion-journal/JournalEntry';
import { EmotionHistory } from '@/components/emotion-journal/EmotionHistory';
import { EmotionStats } from '@/components/emotion-journal/EmotionStats';
import { TextToSpeech } from '@/components/TextToSpeech';

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  coping_suggestions: string[] | null;
}

export default function EmotionJournal() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [emotionTypes, setEmotionTypes] = useState<EmotionType[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [journalText, setJournalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('log');
  
  // AI response state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  // Collapsible states
  const [intensityOpen, setIntensityOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

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

  const handleEmotionSelect = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setAiResponse(null); // Reset AI response when emotion changes
  };

  const generateAiResponse = async () => {
    if (!selectedEmotion) return;
    
    setIsGeneratingResponse(true);
    setAiResponse(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('emotion-journal-response', {
        body: {
          emotion: selectedEmotion.name,
          emoji: selectedEmotion.emoji,
          intensity,
          journalText: journalText.trim() || null,
        },
      });

      if (error) throw error;
      
      setAiResponse(data.response);
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback response
      setAiResponse(`${selectedEmotion.emoji} Thank you for sharing that you feel ${selectedEmotion.name.toLowerCase()}. It's good to check in with your feelings!`);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!user || !selectedEmotion) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('emotion_journal_entries')
        .insert({
          user_id: user.id,
          emotion: selectedEmotion.name,
          emotion_emoji: selectedEmotion.emoji,
          intensity: intensity || 3, // Default to 3 if not set
          journal_text: journalText || null,
        });

      if (error) throw error;

      toast.success(`${selectedEmotion.emoji} Feeling logged!`, {
        description: 'Great job checking in with yourself!',
      });

      // Reset form
      setSelectedEmotion(null);
      setIntensity(null);
      setJournalText('');
      setAiResponse(null);
      setIntensityOpen(false);
      setJournalOpen(false);
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Get theme colors based on selected emotion
  const getThemeStyles = () => {
    if (!selectedEmotion) {
      return {
        background: 'from-purple-50 via-pink-50 to-blue-50',
        headerGradient: 'from-purple-500 to-pink-500',
        cardBorder: 'border-purple-200',
        cardBg: 'bg-white/80',
      };
    }
    
    // Map emotion categories to vibrant color themes
    const categoryThemes: Record<string, { background: string; headerGradient: string; cardBorder: string; cardBg: string }> = {
      positive: {
        background: 'from-green-50 via-emerald-50 to-teal-50',
        headerGradient: 'from-green-500 to-emerald-500',
        cardBorder: 'border-green-300',
        cardBg: 'bg-green-50/50',
      },
      neutral: {
        background: 'from-slate-50 via-gray-50 to-zinc-50',
        headerGradient: 'from-slate-500 to-gray-500',
        cardBorder: 'border-slate-300',
        cardBg: 'bg-slate-50/50',
      },
      negative: {
        background: 'from-rose-50 via-red-50 to-orange-50',
        headerGradient: 'from-rose-500 to-red-500',
        cardBorder: 'border-rose-300',
        cardBg: 'bg-rose-50/50',
      },
    };
    
    return categoryThemes[selectedEmotion.category] || categoryThemes.neutral;
  };

  const theme = getThemeStyles();

  return (
    <main 
      className={`min-h-screen bg-gradient-to-br ${theme.background} pt-24 pb-12 transition-all duration-500`}
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
              <Heart className={`h-10 w-10 bg-gradient-to-br ${theme.headerGradient} text-white p-2 rounded-full`} />
            )}
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${theme.headerGradient} bg-clip-text text-transparent`}>
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
            {/* Emotion Selector */}
            <Card className={`${theme.cardBg} ${theme.cardBorder} backdrop-blur-sm shadow-lg transition-all duration-500`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="text-2xl">🎭</span>
                  How are you feeling?
                  <TextToSpeech 
                    text="How are you feeling? Choose an emotion from the options below." 
                    size="icon" 
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmotionSelector
                  emotions={emotionTypes}
                  selectedEmotion={selectedEmotion}
                  onSelect={handleEmotionSelect}
                />
              </CardContent>
            </Card>

            {/* Show options after selecting emotion */}
            {selectedEmotion && (
              <>
                {/* Optional Intensity - Collapsible */}
                <Collapsible open={intensityOpen} onOpenChange={setIntensityOpen}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-muted-foreground">(Optional)</span>
                            How strong is this feeling?
                            <TextToSpeech 
                              text="Optional. How strong is this feeling? Choose from 1 to 5." 
                              size="icon" 
                            />
                            {intensity !== null && (
                              <span className="text-sm font-normal bg-primary/10 px-2 py-0.5 rounded">
                                {intensity}/5
                              </span>
                            )}
                          </CardTitle>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${intensityOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <button
                              key={level}
                              onClick={() => setIntensity(level)}
                              className={`w-12 h-12 rounded-full text-xl transition-all ${
                                intensity !== null && intensity >= level
                                  ? 'scale-110'
                                  : 'opacity-40 grayscale'
                              }`}
                              style={{
                                backgroundColor: intensity !== null && intensity >= level ? selectedEmotion.color : 'transparent',
                                border: `2px solid ${selectedEmotion.color}`,
                              }}
                            >
                              {level <= 2 ? '😊' : level === 3 ? '😐' : level === 4 ? '😣' : '🔥'}
                            </button>
                          ))}
                        </div>
                        {intensity !== null && (
                          <p className="text-center text-sm text-muted-foreground mt-2">
                            {intensity === 1 && "Just a little bit"}
                            {intensity === 2 && "A small amount"}
                            {intensity === 3 && "Medium feeling"}
                            {intensity === 4 && "Pretty strong"}
                            {intensity === 5 && "Very strong!"}
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Optional Journal Entry - Collapsible */}
                <Collapsible open={journalOpen} onOpenChange={setJournalOpen}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-muted-foreground">(Optional)</span>
                            Want to say more?
                            <TextToSpeech 
                              text="Optional. Want to say more? You can speak or type about your feelings." 
                              size="icon" 
                            />
                            {journalText.trim() && (
                              <span className="text-sm font-normal bg-primary/10 px-2 py-0.5 rounded">
                                ✓ Added
                              </span>
                            )}
                          </CardTitle>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${journalOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <JournalEntry
                          value={journalText}
                          onChange={setJournalText}
                          emotion={selectedEmotion}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Generate AI Response Button */}
                <Button
                  onClick={generateAiResponse}
                  disabled={isGeneratingResponse}
                  variant="secondary"
                  className="w-full h-12"
                >
                  {isGeneratingResponse ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Get a Friendly Response ✨
                    </>
                  )}
                </Button>

                {/* AI Response */}
                {aiResponse && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">A message for you:</span>
                            <TextToSpeech text={aiResponse} size="icon" />
                          </div>
                          <p className="text-base leading-relaxed">{aiResponse}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Save Button */}
                <Button
                  onClick={handleSaveEntry}
                  disabled={isSaving}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      Save My Feeling {selectedEmotion.emoji}
                    </>
                  )}
                </Button>
              </>
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

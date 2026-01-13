import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { EmotionSelector } from '@/components/emotion-journal/EmotionSelector';
import { JournalEntry } from '@/components/emotion-journal/JournalEntry';
import { EmotionHistory } from '@/components/emotion-journal/EmotionHistory';
import { EmotionStats } from '@/components/emotion-journal/EmotionStats';
import { CopingSuggestions } from '@/components/emotion-journal/CopingSuggestions';
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
  const [intensity, setIntensity] = useState(3);
  const [journalText, setJournalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCopingSuggestions, setShowCopingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

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
    setShowCopingSuggestions(emotion.category === 'negative');
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
          intensity,
          journal_text: journalText || null,
        });

      if (error) throw error;

      toast.success(`${selectedEmotion.emoji} Feeling logged!`, {
        description: 'Great job checking in with yourself!',
      });

      // Reset form
      setSelectedEmotion(null);
      setIntensity(3);
      setJournalText('');
      setShowCopingSuggestions(false);
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-24 pb-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/community')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Emotion Journal</h1>
            <TextToSpeech 
              text="Emotion Journal. How are you feeling today? It's okay to feel any way!" 
              size="default" 
            />
          </div>
          <p className="text-muted-foreground mt-2">
            How are you feeling today? It's okay to feel any way!
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
          <TabsContent value="log" className="space-y-6">
            {/* Emotion Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
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

            {/* Show more options after selecting emotion */}
            {selectedEmotion && (
              <>
                {/* Coping Suggestions for negative emotions */}
                {showCopingSuggestions && selectedEmotion.coping_suggestions && (
                  <CopingSuggestions 
                    emotion={selectedEmotion.name}
                    emoji={selectedEmotion.emoji}
                    suggestions={selectedEmotion.coping_suggestions}
                  />
                )}

                {/* Intensity Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      How strong is this feeling?
                      <TextToSpeech 
                        text="How strong is this feeling? Choose from 1 to 5. 1 is just a little bit, 5 is very strong." 
                        size="icon" 
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          onClick={() => setIntensity(level)}
                          className={`w-14 h-14 rounded-full text-2xl transition-all ${
                            intensity >= level
                              ? 'scale-110'
                              : 'opacity-40 grayscale'
                          }`}
                          style={{
                            backgroundColor: intensity >= level ? selectedEmotion.color : 'transparent',
                            border: `2px solid ${selectedEmotion.color}`,
                          }}
                        >
                          {level <= 2 ? '😊' : level === 3 ? '😐' : level === 4 ? '😣' : '🔥'}
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      {intensity === 1 && "Just a little bit"}
                      {intensity === 2 && "A small amount"}
                      {intensity === 3 && "Medium feeling"}
                      {intensity === 4 && "Pretty strong"}
                      {intensity === 5 && "Very strong!"}
                    </p>
                  </CardContent>
                </Card>

                {/* Journal Entry with Voice Input */}
                <JournalEntry
                  value={journalText}
                  onChange={setJournalText}
                  emotion={selectedEmotion}
                />

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

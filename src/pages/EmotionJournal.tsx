import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import Footer from '@/components/Footer';
import { BackButton } from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Heart, Calendar, TrendingUp, ChevronDown, ChevronUp, Save, MessageCircle, Loader2, Sparkles, Check, Pencil, X, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { EmotionHistory } from '@/components/emotion-journal/EmotionHistory';
import { EmotionStats } from '@/components/emotion-journal/EmotionStats';
import { TextToSpeech } from '@/components/TextToSpeech';
import { VoiceInput } from '@/components/VoiceInput';
import { cn } from '@/lib/utils';
import { useAvatarEmotionImage } from '@/hooks/useAvatarEmotionImage';

// Cache TTS voice per user to avoid repeated fetches (mirrors DailyBar mood module)
const moodTtsVoiceCache = new Map<string, string>();

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  coping_suggestions: string[] | null;
}

interface MoodEntry {
  id: string;
  mood_emoji: string;
  mood_label: string;
  note: string | null;
  audio_url: string | null;
  entry_date: string;
  ai_response?: string | null;
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

// Map mood labels to categories for theming
const MOOD_CATEGORY_MAP: Record<string, string> = {
  "Happy": "positive",
  "Loved": "positive",
  "Excited": "positive",
  "Calm": "positive",
  "Proud": "positive",
  "Grateful": "positive",
  "Neutral": "neutral",
  "Confused": "neutral",
  "Tired": "neutral",
  "Sad": "negative",
  "Angry": "negative",
  "Anxious": "negative",
  "Worried": "negative",
  "Frustrated": "negative",
  "Scared": "negative",
  "Lonely": "negative",
};

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

export default function EmotionJournal() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [emotionTypes, setEmotionTypes] = useState<EmotionType[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [journalText, setJournalText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

  // Mood TTS toggle (shared with DailyBar mood module)
  const MOOD_TTS_STORAGE_KEY = 'dailybar-mood-tts-enabled';
  const [moodTtsEnabled, setMoodTtsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(MOOD_TTS_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(MOOD_TTS_STORAGE_KEY, String(moodTtsEnabled));
    } catch (e) {
      console.warn('Failed to persist mood TTS preference:', e);
    }
  }, [moodTtsEnabled]);

  // Mood TTS playback (matches DailyBar mood behavior: no per-emotion play buttons)
  const [moodSpeaking, setMoodSpeaking] = useState(false);
  const [moodTtsVoice, setMoodTtsVoice] = useState<string>('Sarah');
  const moodAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load user's preferred TTS voice (same approach as DailyBar mood module)
  useEffect(() => {
    const loadVoice = async () => {
      if (!user) return;

      const cached = moodTtsVoiceCache.get(user.id);
      if (cached) {
        setMoodTtsVoice(cached);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tts_voice')
        .eq('id', user.id)
        .single();

      const voice = profile?.tts_voice || 'Sarah';
      moodTtsVoiceCache.set(user.id, voice);
      setMoodTtsVoice(voice);
    };

    if (!authLoading && user) {
      loadVoice();
    }
  }, [authLoading, user?.id]);

  // Cleanup/stop audio
  useEffect(() => {
    return () => {
      if (moodAudioRef.current) {
        moodAudioRef.current.pause();
        moodAudioRef.current = null;
      }
    };
  }, []);

  // If user turns off the toggle, stop speaking immediately
  useEffect(() => {
    if (!moodTtsEnabled && moodAudioRef.current) {
      moodAudioRef.current.pause();
      moodAudioRef.current = null;
      setMoodSpeaking(false);
    }
  }, [moodTtsEnabled]);

  const speakEmotionName = useCallback(async (emotionName: string) => {
    if (!moodTtsEnabled) return;

    try {
      setMoodSpeaking(true);

      // Stop any current audio
      if (moodAudioRef.current) {
        moodAudioRef.current.pause();
        moodAudioRef.current = null;
      }

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: emotionName, voice: moodTtsVoice },
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        moodAudioRef.current = audio;

        audio.onended = () => setMoodSpeaking(false);
        audio.onerror = () => setMoodSpeaking(false);

        await audio.play();
      } else {
        setMoodSpeaking(false);
      }
    } catch (err) {
      console.error('Mood TTS error:', err);
      setMoodSpeaking(false);
    }
  }, [moodTtsEnabled, moodTtsVoice]);

  // Voice transcript handlers for notes dictation (matches DailyBar pattern)
  const handleVoiceTranscriptJournal = useCallback((transcript: string) => {
    setJournalText(prev => prev ? `${prev} ${transcript}` : transcript);
  }, []);

  const handleVoiceTranscriptEdit = useCallback((transcript: string) => {
    setEditNoteText(prev => prev ? `${prev} ${transcript}` : transcript);
  }, []);
  
  // Today's mood entry state (from daily bar)
  const [todaysMoodEntry, setTodaysMoodEntry] = useState<MoodEntry | null>(null);
  const [loadingTodaysEntry, setLoadingTodaysEntry] = useState(true);
  
  // AI response state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  
  // Edit state (notes and emotion)
  const [isEditing, setIsEditing] = useState(false);
  const [editNoteText, setEditNoteText] = useState('');
  const [editingEmotion, setEditingEmotion] = useState<EmotionType | null>(null);

  // Get the current emotion name for avatar image lookup
  const currentEmotionName = todaysMoodEntry?.mood_label || selectedEmotion?.name;
  
  // Fetch avatar emotion image for the selected/today's emotion
  const { imageUrl: avatarEmotionImageUrl, emotionEmoji } = useAvatarEmotionImage(
    user?.id,
    currentEmotionName
  );

  // Load ALL approved avatar emotion images for the user's selected avatar
  const [avatarEmotionImagesByEmotionTypeId, setAvatarEmotionImagesByEmotionTypeId] = useState<
    Record<string, { url: string; cropScale: number }>
  >({});
  const [avatarEmotionImagesLoading, setAvatarEmotionImagesLoading] = useState(false);

  useEffect(() => {
    const loadAvatarEmotionImages = async () => {
      if (!user) {
        setAvatarEmotionImagesByEmotionTypeId({});
        return;
      }

      setAvatarEmotionImagesLoading(true);
      try {
        const { data: userAvatar, error: avatarError } = await supabase
          .from("user_fitness_avatars")
          .select("avatar_id")
          .eq("user_id", user.id)
          .eq("is_selected", true)
          .maybeSingle();

        if (avatarError) {
          console.error("Error fetching selected avatar for EmotionJournal:", avatarError);
          setAvatarEmotionImagesByEmotionTypeId({});
          return;
        }

        if (!userAvatar?.avatar_id) {
          setAvatarEmotionImagesByEmotionTypeId({});
          return;
        }

        const { data: emotionImages, error: emotionImagesError } = await supabase
          .from("avatar_emotion_images")
          .select("emotion_type_id, image_url, crop_scale")
          .eq("avatar_id", userAvatar.avatar_id)
          .eq("is_approved", true);

        if (emotionImagesError) {
          console.error("Error fetching avatar emotion images for EmotionJournal:", emotionImagesError);
          setAvatarEmotionImagesByEmotionTypeId({});
          return;
        }

        const map: Record<string, { url: string; cropScale: number }> = {};
        (emotionImages || []).forEach((img) => {
          if (!img.image_url) return;
          map[img.emotion_type_id] = {
            url: img.image_url,
            cropScale: (img.crop_scale as number) || 1.0,
          };
        });
        setAvatarEmotionImagesByEmotionTypeId(map);
      } catch (e) {
        console.error("Error loading avatar emotion images for EmotionJournal:", e);
        setAvatarEmotionImagesByEmotionTypeId({});
      } finally {
        setAvatarEmotionImagesLoading(false);
      }
    };

    if (!authLoading && user) {
      loadAvatarEmotionImages();
    }
  }, [authLoading, user?.id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check for today's mood entry from daily bar
  useEffect(() => {
    const checkTodaysMoodEntry = async () => {
      if (!user) {
        setLoadingTodaysEntry(false);
        return;
      }

      try {
        const today = getMSTDate();
        const { data, error } = await supabase
          .from("mood_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setTodaysMoodEntry(data);
          // Generate an encouraging message for the existing entry
          await fetchEncouragingMessage(data.mood_emoji, data.mood_label);
        }
      } catch (error) {
        console.error("Error checking today's mood entry:", error);
      } finally {
        setLoadingTodaysEntry(false);
      }
    };

    if (!authLoading && user) {
      checkTodaysMoodEntry();
    }
  }, [user, authLoading]);

  // Fetch encouraging message for existing mood entry
  // Uses mood_responses table which matches by emotion name (label) for broader coverage
  const fetchEncouragingMessage = async (emoji: string, label: string) => {
    try {
      // Query mood_responses by emotion name (lowercase) for better coverage across all 16 emotions
      const { data, error } = await supabase
        .from("mood_responses")
        .select("response")
        .eq("emotion", label.toLowerCase())
        .eq("is_active", true);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const randomMessage = data[Math.floor(Math.random() * data.length)];
        setAiResponse(randomMessage.response);
      } else {
        // Fallback to mood_messages table by emoji
        const { data: msgData, error: msgError } = await supabase
          .from("mood_messages")
          .select("message")
          .eq("mood_emoji", emoji)
          .eq("is_active", true);

        if (!msgError && msgData && msgData.length > 0) {
          const randomMessage = msgData[Math.floor(Math.random() * msgData.length)];
          setAiResponse(randomMessage.message);
        } else {
          setAiResponse(`Thanks for checking in! We see you're feeling ${label.toLowerCase()}. That's okay!`);
        }
      }
    } catch (error) {
      console.error("Error fetching message:", error);
      setAiResponse(`Thanks for sharing how you feel! Have a great day!`);
    }
  };

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

  // Get current theme based on selected emotion or today's entry
  const getTheme = () => {
    if (todaysMoodEntry) {
      const category = MOOD_CATEGORY_MAP[todaysMoodEntry.mood_label] || 'neutral';
      return CATEGORY_THEMES[category as keyof typeof CATEGORY_THEMES] || CATEGORY_THEMES.neutral;
    }
    if (selectedEmotion) {
      return CATEGORY_THEMES[selectedEmotion.category as keyof typeof CATEGORY_THEMES] || CATEGORY_THEMES.neutral;
    }
    return DEFAULT_THEME;
  };
  
  const currentTheme = getTheme();

  const handleEmotionSelect = (emotion: EmotionType) => {
    if (todaysMoodEntry) return; // Already checked in today
    setSelectedEmotion(emotion);
    setAiResponse(null);

    // DailyBar parity: if the volume toggle is ON, tapping an emotion speaks the emotion name
    if (moodTtsEnabled) {
      speakEmotionName(emotion.name);
    }
  };

  const handleSave = async (withAiResponse: boolean) => {
    if (!user || !selectedEmotion || todaysMoodEntry) return;

    setIsSaving(true);
    try {
      // Save to emotion_journal_entries
      const { error } = await supabase
        .from('emotion_journal_entries')
        .insert({
          user_id: user.id,
          emotion: selectedEmotion.name,
          emotion_emoji: selectedEmotion.emoji,
          intensity: 3,
          journal_text: journalText.trim() || null,
        });

      if (error) throw error;

      // Also save to mood_entries so daily bar knows about it
      const today = getMSTDate();
      const { data: moodData, error: moodError } = await supabase
        .from("mood_entries")
        .insert({
          user_id: user.id,
          mood_emoji: selectedEmotion.emoji,
          mood_label: selectedEmotion.name,
          note: journalText.trim() || null,
          entry_date: today,
          coins_awarded: 5, // Default coins
        })
        .select()
        .single();

      if (moodError) {
        console.error("Error saving to mood_entries:", moodError);
      } else {
        setTodaysMoodEntry(moodData);
      }

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
      } else {
        // Get a pre-generated message
        await fetchEncouragingMessage(selectedEmotion.emoji, selectedEmotion.name);
      }

      toast.success(`${selectedEmotion.emoji} Feeling logged!`, {
        description: 'Great job checking in with yourself!',
      });

      // Scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'instant' });
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
    // Don't reset aiResponse if there's a today's entry
    if (!todaysMoodEntry) {
      setAiResponse(null);
    }
  };

  // Save edits (emotion and/or notes) to existing mood entry
  const handleSaveEdits = async () => {
    if (!user || !todaysMoodEntry) return;
    
    setIsSaving(true);
    try {
      const updates: { note?: string | null; mood_emoji?: string; mood_label?: string } = {};
      
      // Update note
      updates.note = editNoteText.trim() || null;
      
      // Update emotion if changed
      if (editingEmotion) {
        updates.mood_emoji = editingEmotion.emoji;
        updates.mood_label = editingEmotion.name;
      }

      const { error } = await supabase
        .from('mood_entries')
        .update(updates)
        .eq('id', todaysMoodEntry.id);

      if (error) throw error;

      // Update local state
      setTodaysMoodEntry({ 
        ...todaysMoodEntry, 
        note: updates.note ?? todaysMoodEntry.note,
        mood_emoji: updates.mood_emoji ?? todaysMoodEntry.mood_emoji,
        mood_label: updates.mood_label ?? todaysMoodEntry.mood_label,
      });
      setIsEditing(false);
      setEditingEmotion(null);
      toast.success('Changes saved!');
      
      // Refresh AI message if emotion changed
      if (editingEmotion) {
        await fetchEncouragingMessage(editingEmotion.emoji, editingEmotion.name);
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setEditNoteText(todaysMoodEntry?.note || '');
    // Find and set the current emotion
    const currentEmotion = emotionTypes.find(e => e.name === todaysMoodEntry?.mood_label);
    setEditingEmotion(currentEmotion || null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingEmotion(null);
    setEditNoteText('');
  };

  if (authLoading || loadingTodaysEntry) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <UnifiedHeader />
        <div className="flex-1 flex items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  // Determine display state
  const hasCheckedInToday = !!todaysMoodEntry;
  const displayEmoji = todaysMoodEntry?.mood_emoji || selectedEmotion?.emoji;
  const displayLabel = todaysMoodEntry?.mood_label || selectedEmotion?.name;

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main 
        className={cn(
          "flex-1 bg-gradient-to-br pt-24 pb-12 transition-all duration-500",
          currentTheme.bgGradient
        )}
      >
        <div className="container max-w-4xl mx-auto px-4">
          <BackButton to="/" label="Back to Home" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            {avatarEmotionImageUrl ? (
              <img 
                src={avatarEmotionImageUrl} 
                alt={displayLabel || "Emotion"} 
                className="w-14 h-14 rounded-full object-cover animate-bounce shadow-lg"
              />
            ) : displayEmoji ? (
              <span className="text-5xl animate-bounce">{displayEmoji}</span>
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
              {displayLabel ? `Feeling ${displayLabel}` : 'Emotion Journal'}
            </h1>
            <TextToSpeech 
              text={displayLabel 
                ? `You're feeling ${displayLabel}. That's okay!` 
                : "Emotion Journal. How are you feeling today? It's okay to feel any way!"
              } 
              size="default" 
            />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            {aiResponse && displayLabel
              ? aiResponse
              : displayLabel 
                ? `It's okay to feel ${displayLabel.toLowerCase()}. Let's explore this feeling together.`
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
            {/* Today's Check-in Complete State */}
            {hasCheckedInToday && (
              <div className={cn(
                "rounded-xl p-6 backdrop-blur-sm shadow-lg transition-all duration-500 text-center",
                currentTheme.cardBg,
                currentTheme.border,
                "border"
              )}>
                {avatarEmotionImageUrl && !isEditing ? (
                  <img 
                    src={avatarEmotionImageUrl} 
                    alt={todaysMoodEntry.mood_label} 
                    className="w-20 h-20 rounded-full object-cover mb-4 mx-auto shadow-lg"
                  />
                ) : (
                  <div className="text-6xl mb-4">{isEditing ? (editingEmotion?.emoji || todaysMoodEntry.mood_emoji) : todaysMoodEntry.mood_emoji}</div>
                )}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold">
                    You're feeling {isEditing ? (editingEmotion?.name || todaysMoodEntry.mood_label) : todaysMoodEntry.mood_label} today
                  </h2>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startEditing}
                      className="h-8 w-8"
                      title="Edit entry"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Edit mode: emotion picker + notes */}
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Emotion picker in edit mode - 4 per row, DailyBar order */}
                    <div className="bg-white/60 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-muted-foreground text-center flex-1">Change your feeling:</p>
                        <button
                          type="button"
                          onClick={() => setMoodTtsEnabled(!moodTtsEnabled)}
                          className={cn(
                            "p-2 rounded-full transition-all duration-200",
                            "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            moodTtsEnabled
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/50 text-muted-foreground"
                          )}
                          title={moodTtsEnabled ? "Turn off voice reading" : "Turn on voice reading"}
                        >
                          {moodTtsEnabled ? (
                            <Volume2 className={cn("w-5 h-5", moodSpeaking && "animate-pulse")} />
                          ) : (
                            <VolumeX className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[...emotionTypes]
                          .sort((a, b) => {
                            const order = { positive: 0, neutral: 1, negative: 2 };
                            return (order[a.category as keyof typeof order] ?? 1) - (order[b.category as keyof typeof order] ?? 1);
                          })
                          .map((emotion) => {
                            const isSelected = editingEmotion?.id === emotion.id;
                            return (
                              <button
                                key={emotion.id}
                                onClick={() => {
                                  setEditingEmotion(emotion);
                                  if (moodTtsEnabled) speakEmotionName(emotion.name);
                                }}
                                className={cn(
                                  "flex flex-col items-center p-1 rounded-lg transition-all duration-300",
                                  "hover:scale-105 focus:outline-none focus-visible:outline-none",
                                  isSelected && "scale-105"
                                )}
                              >
                                <div 
                                  className={cn(
                                    "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full transition-all overflow-hidden",
                                    isSelected ? "shadow-lg" : "hover:shadow-md"
                                  )}
                                  style={{
                                    backgroundColor: isSelected ? `${emotion.color}30` : undefined,
                                    boxShadow: isSelected 
                                      ? `0 0 0 3px ${emotion.color}, 0 0 0 5px white, 0 0 0 7px ${emotion.color}40` 
                                      : undefined,
                                  }}
                                >
                                  {!avatarEmotionImagesLoading && avatarEmotionImagesByEmotionTypeId[emotion.id]?.url ? (
                                    <img
                                      src={avatarEmotionImagesByEmotionTypeId[emotion.id].url}
                                      alt={emotion.name}
                                      className="w-full h-full object-cover"
                                      style={{
                                        transform: `scale(${avatarEmotionImagesByEmotionTypeId[emotion.id].cropScale || 1})`,
                                        transformOrigin: "center",
                                      }}
                                    />
                                  ) : (
                                    <span className={cn("text-4xl sm:text-5xl transition-transform duration-300", isSelected && "animate-bounce")}>
                                      {emotion.emoji}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 mt-1">
                                  <span 
                                    className={cn(
                                      "text-xs font-medium transition-colors text-center",
                                      isSelected ? "font-bold" : "text-gray-700"
                                    )}
                                    style={{ color: isSelected ? emotion.color : undefined }}
                                  >
                                    {emotion.name}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Notes input */}
                    <div className="bg-white/60 rounded-lg p-4 text-left space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">✍️ Add a note about how you feel:</span>
                        <TextToSpeech text="Add a note about how you feel" size="icon" />
                      </div>
                      <Textarea
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Write about your feelings..."
                        className="min-h-[80px] text-base resize-none"
                      />
                      <VoiceInput
                        onTranscript={handleVoiceTranscriptEdit}
                        placeholder="Tap microphone to add notes by voice..."
                        buttonSize="sm"
                        showTranscript={false}
                        autoStop={true}
                        silenceStopSeconds={15}
                        maxDuration={60}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdits}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : todaysMoodEntry.note ? (
                  <div className="bg-white/60 rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm text-muted-foreground mb-1">Your note:</p>
                    <p className="italic">"{todaysMoodEntry.note}"</p>
                  </div>
                ) : null}
                
                {/* AI Response / Encouraging Message */}
                {aiResponse && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-medium text-primary">A message for you:</span>
                      <TextToSpeech text={aiResponse} size="icon" />
                    </div>
                    <p className="text-base leading-relaxed italic">"{aiResponse}"</p>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Check-in complete for today!</span>
                </div>
              </div>
            )}

            {/* Emotion Picker (only if not checked in) */}
            {!hasCheckedInToday && (
              <div className={cn(
                "rounded-xl p-6 backdrop-blur-sm shadow-lg transition-all duration-500",
                currentTheme.cardBg,
                currentTheme.border,
                "border"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">🎭 How are you feeling?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoodTtsEnabled(!moodTtsEnabled)}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200",
                      "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      moodTtsEnabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                    title={moodTtsEnabled ? "Turn off voice reading" : "Turn on voice reading"}
                  >
                    {moodTtsEnabled ? (
                      <Volume2 className={cn("w-5 h-5", moodSpeaking && "animate-pulse")} />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* Emoji Grid - 4 per row, DailyBar order */}
                <div className="grid grid-cols-4 gap-1">
                  {[...emotionTypes]
                    .sort((a, b) => {
                      const order = { positive: 0, neutral: 1, negative: 2 };
                      return (order[a.category as keyof typeof order] ?? 1) - (order[b.category as keyof typeof order] ?? 1);
                    })
                    .map((emotion) => {
                      const isSelected = selectedEmotion?.id === emotion.id;
                      return (
                        <button
                          key={emotion.id}
                          onClick={() => handleEmotionSelect(emotion)}
                          disabled={isSaving}
                          className={cn(
                            "flex flex-col items-center p-1 rounded-lg transition-all duration-300",
                            "hover:scale-105 focus:outline-none focus-visible:outline-none",
                            isSelected && "scale-105"
                          )}
                        >
                          <div 
                            className={cn(
                              "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full transition-all overflow-hidden",
                              isSelected ? "shadow-lg" : "hover:shadow-md"
                            )}
                            style={{
                              backgroundColor: isSelected ? `${emotion.color}30` : undefined,
                              boxShadow: isSelected 
                                ? `0 0 0 3px ${emotion.color}, 0 0 0 5px white, 0 0 0 7px ${emotion.color}40` 
                                : undefined,
                            }}
                          >
                            {!avatarEmotionImagesLoading && avatarEmotionImagesByEmotionTypeId[emotion.id]?.url ? (
                              <img
                                src={avatarEmotionImagesByEmotionTypeId[emotion.id].url}
                                alt={emotion.name}
                                className="w-full h-full object-cover"
                                style={{
                                  transform: `scale(${avatarEmotionImagesByEmotionTypeId[emotion.id].cropScale || 1})`,
                                  transformOrigin: "center",
                                }}
                              />
                            ) : (
                              <span className={cn("text-4xl sm:text-5xl transition-transform duration-300", isSelected && "animate-bounce")}>
                                {emotion.emoji}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span 
                              className={cn(
                                "text-xs font-medium transition-colors text-center",
                                isSelected ? "font-bold" : "text-gray-700"
                              )}
                              style={{ color: isSelected ? emotion.color : undefined }}
                            >
                              {emotion.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Show options after selecting emotion (only if not checked in) */}
            {selectedEmotion && !hasCheckedInToday && !aiResponse && (
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
                    <VoiceInput
                      onTranscript={handleVoiceTranscriptJournal}
                      placeholder="Tap microphone to add notes by voice..."
                      buttonSize="sm"
                      showTranscript={false}
                      autoStop={true}
                      silenceStopSeconds={15}
                      maxDuration={60}
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

            {/* AI Response Card (after saving from this page) */}
            {aiResponse && !hasCheckedInToday && (
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
      <Footer />
    </div>
  );
}

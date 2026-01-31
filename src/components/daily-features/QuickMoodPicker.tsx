import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Check, Loader2, ChevronDown, ChevronUp, Save, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { showCoinNotification } from "@/utils/coinNotification";
import { cn } from "@/lib/utils";

interface MoodOption {
  emoji: string;
  label: string;
  color: string;
  category: "positive" | "neutral" | "negative";
  emotionTypeId?: string;
  avatarImageUrl?: string | null;
}

// Theme styles based on category
const CATEGORY_THEMES = {
  positive: {
    bgGradient: "from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30",
    buttonGradient: "from-green-500 to-emerald-500",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
  },
  neutral: {
    bgGradient: "from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30",
    buttonGradient: "from-slate-500 to-gray-500",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
  },
  negative: {
    bgGradient: "from-rose-50 to-orange-50 dark:from-rose-900/30 dark:to-orange-900/30",
    buttonGradient: "from-rose-500 to-red-500",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-700 dark:text-rose-300",
  },
};

interface QuickMoodPickerProps {
  onComplete?: () => void;
}

export function QuickMoodPicker({ onComplete }: QuickMoodPickerProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>([]);
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todaysEntry, setTodaysEntry] = useState<any>(null);
  const [encouragingMessage, setEncouragingMessage] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  // Get current theme based on selected mood
  const currentTheme = selectedMood 
    ? CATEGORY_THEMES[selectedMood.category] 
    : CATEGORY_THEMES.neutral;

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

  // Fetch emotion types from database and avatar emotion images
  useEffect(() => {
    const fetchEmotionTypesAndAvatarImages = async () => {
      try {
        // Fetch all emotion types
        const { data: emotionData, error: emotionError } = await supabase
          .from("emotion_types")
          .select("id, name, emoji, color, category")
          .order("category")
          .order("name");

        if (emotionError) throw emotionError;

        // If user is logged in, fetch their selected avatar's emotion images
        let avatarEmotionImages: Record<string, string> = {};
        
        if (user) {
          // Get user's selected fitness avatar
          const { data: userAvatar } = await supabase
            .from("user_fitness_avatars")
            .select("avatar_id")
            .eq("user_id", user.id)
            .eq("is_selected", true)
            .maybeSingle();

          if (userAvatar?.avatar_id) {
            // Fetch all approved emotion images for this avatar
            const { data: emotionImages } = await supabase
              .from("avatar_emotion_images")
              .select("emotion_type_id, image_url")
              .eq("avatar_id", userAvatar.avatar_id)
              .eq("is_approved", true);

            if (emotionImages) {
              emotionImages.forEach(img => {
                if (img.image_url) {
                  avatarEmotionImages[img.emotion_type_id] = img.image_url;
                }
              });
            }
          }
        }

        if (emotionData) {
          // Sort: positive first, then neutral, then negative
          const categoryOrder = { positive: 0, neutral: 1, negative: 2 };
          const sorted = emotionData.sort((a, b) => {
            const aOrder = categoryOrder[a.category as keyof typeof categoryOrder] ?? 1;
            const bOrder = categoryOrder[b.category as keyof typeof categoryOrder] ?? 1;
            return aOrder - bOrder;
          });

          const options: MoodOption[] = sorted.map(e => ({
            emoji: e.emoji,
            label: e.name,
            color: e.color,
            category: e.category as "positive" | "neutral" | "negative",
            emotionTypeId: e.id,
            avatarImageUrl: avatarEmotionImages[e.id] || null,
          }));
          setMoodOptions(options);
        }
      } catch (error) {
        console.error("Error fetching emotion types:", error);
      }
    };

    fetchEmotionTypesAndAvatarImages();
  }, [user]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    checkTodaysEntry();
  }, [user, isAuthenticated, authLoading, moodOptions]);

  const checkTodaysEntry = async () => {
    if (!user || moodOptions.length === 0) return;
    
    setLoading(true);
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
        setTodaysEntry(data);
        const foundMood = moodOptions.find(m => m.emoji === data.mood_emoji);
        setSelectedMood(foundMood || null);
        // Fetch encouraging message for completed entry
        fetchEncouragingMessage(data.mood_emoji, foundMood?.label || data.mood_label || "", null);
      }
    } catch (error) {
      console.error("Error checking mood entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEncouragingMessage = async (emoji: string, label: string, journalText: string | null) => {
    try {
      // If there's journal text, use AI for personalized response
      if (journalText && journalText.trim().length > 0) {
        setIsGeneratingResponse(true);
        const { data, error } = await supabase.functions.invoke('emotion-journal-response', {
          body: {
            emotion: label,
            emoji: emoji,
            intensity: null,
            journalText: journalText.trim(),
          },
        });

        if (error) throw error;
        setEncouragingMessage(data.response);
        setIsGeneratingResponse(false);
        return;
      }

      // For quick logs, use pre-generated responses from mood_responses table
      const { data, error } = await supabase.functions.invoke('emotion-journal-response', {
        body: {
          emotion: label,
          emoji: emoji,
          intensity: null,
          journalText: null,
        },
      });

      if (error) throw error;
      setEncouragingMessage(data.response);
    } catch (error) {
      console.error("Error fetching message:", error);
      setEncouragingMessage(`Thanks for sharing how you feel! Have a great day!`);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleMoodSelect = (mood: MoodOption) => {
    if (todaysEntry) return;
    setSelectedMood(mood);
  };

  const handleSave = async (withAiResponse: boolean) => {
    if (!selectedMood || !user || todaysEntry) return;
    
    setSaving(true);
    try {
      const today = getMSTDate();
      
      // Determine which coin reward to use
      const rewardKey = note.trim() ? "mood_checkin_detailed" : "mood_checkin";
      const { data: rewardSetting } = await supabase
        .from("coin_rewards_settings")
        .select("coins_amount, is_active")
        .eq("reward_key", rewardKey)
        .maybeSingle();

      const coinsToAward = rewardSetting?.is_active ? (rewardSetting.coins_amount || 5) : 0;

      const { data, error } = await supabase
        .from("mood_entries")
        .insert({
          user_id: user.id,
          mood_emoji: selectedMood.emoji,
          mood_label: selectedMood.label,
          note: note.trim() || null,
          entry_date: today,
          coins_awarded: coinsToAward,
        })
        .select()
        .single();

      if (error) throw error;

      if (coinsToAward > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({ coins: (profile?.coins || 0) + coinsToAward })
          .eq("id", user.id);

        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: coinsToAward,
          transaction_type: "earned",
          description: note.trim() ? "Detailed mood check-in" : "Daily mood check-in",
        });

        showCoinNotification(coinsToAward, note.trim() ? "Detailed check-in bonus!" : "Mood check-in complete!");
      }

      setTodaysEntry(data);
      
      // If user wants AI response, fetch it
      if (withAiResponse) {
        await fetchEncouragingMessage(selectedMood.emoji, selectedMood.label, note.trim() || null);
      }
      
      toast.success("Mood logged! 🎉");
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error("Failed to save mood");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Already checked in - show encouraging message
  if (todaysEntry) {
    const entryMood = moodOptions.find(m => m.emoji === todaysEntry.mood_emoji);
    const completedTheme = entryMood ? CATEGORY_THEMES[entryMood.category] : CATEGORY_THEMES.neutral;
    
    return (
      <div className="space-y-4 py-2">
        <div className={cn(
          "rounded-xl p-4 text-center space-y-3 transition-all duration-500",
          `bg-gradient-to-br ${completedTheme.bgGradient}`
        )}>
          {entryMood?.avatarImageUrl ? (
            <img 
              src={entryMood.avatarImageUrl} 
              alt={entryMood.label} 
              className="w-20 h-20 mx-auto rounded-full object-cover"
            />
          ) : (
            <div className="text-5xl mb-2">{todaysEntry.mood_emoji}</div>
          )}
          {isGeneratingResponse ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          ) : encouragingMessage && (
            <>
              <p className="text-sm text-muted-foreground italic">"{encouragingMessage}"</p>
              <TextToSpeech text={encouragingMessage} size="default" />
            </>
          )}
          <div className="flex items-center justify-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            <span>Check-in complete for today!</span>
          </div>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-2 px-4 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm font-medium"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-4 p-4 rounded-xl transition-all duration-500",
      selectedMood && `bg-gradient-to-br ${currentTheme.bgGradient}`
    )}>
      {/* Mood Selector */}
      <div className="grid grid-cols-4 gap-2">
        {moodOptions.map((mood) => (
          <button
            key={mood.label}
            onClick={() => handleMoodSelect(mood)}
            disabled={saving}
            className={cn(
              "flex flex-col items-center transition-all duration-300",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full",
              selectedMood?.label === mood.label && "scale-105"
            )}
          >
            {mood.avatarImageUrl ? (
              <img 
                src={mood.avatarImageUrl} 
                alt={mood.label} 
                className={cn(
                  "w-16 h-16 rounded-full object-cover transition-all",
                  selectedMood?.label === mood.label 
                    ? "ring-[3px] ring-offset-2 shadow-lg" 
                    : "hover:shadow-md"
                )}
                style={{
                  outlineColor: selectedMood?.label === mood.label ? mood.color : undefined,
                  boxShadow: selectedMood?.label === mood.label ? `0 0 0 3px ${mood.color}` : undefined,
                }}
              />
            ) : (
              <span 
                className={cn(
                  "text-4xl w-16 h-16 flex items-center justify-center rounded-full transition-all",
                  selectedMood?.label === mood.label 
                    ? "shadow-lg" 
                    : "hover:shadow-md"
                )}
                style={{
                  boxShadow: selectedMood?.label === mood.label ? `0 0 0 3px ${mood.color}` : undefined,
                }}
              >
                {mood.emoji}
              </span>
            )}
            <span 
              className="text-xs font-medium mt-1"
              style={{ color: selectedMood?.label === mood.label ? mood.color : undefined }}
            >
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      {/* Show options after selecting mood */}
      {selectedMood && (
        <div className="space-y-3">
          {/* Expand for notes toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide notes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Add a note (bonus coins!)
              </>
            )}
          </button>

          {/* Notes section */}
          {showDetails && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's on your mind?"
                className="min-h-[80px] resize-none bg-white/50 dark:bg-gray-900/50"
              />
            </div>
          )}

          {/* Two action buttons side by side */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Just Save button */}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                "border-2 transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                "bg-white/80 dark:bg-gray-800/80",
                currentTheme.border
              )}
            >
              {saving ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : (
                <Save className={cn("w-8 h-8", currentTheme.text)} />
              )}
              <span className="text-sm font-medium">Just Save</span>
            </button>

            {/* Chat / Get Response button */}
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                "border-2 transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                `bg-gradient-to-br ${currentTheme.buttonGradient}`,
                "text-white border-transparent"
              )}
            >
              {saving ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <MessageCircle className="w-8 h-8" />
              )}
              <span className="text-sm font-medium">Chat More</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

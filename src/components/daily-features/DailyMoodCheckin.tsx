import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioUploadOrRecord } from "@/components/common/AudioUploadOrRecord";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Check, Loader2, ChevronDown, ChevronUp, Mic, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { showCoinNotification } from "@/utils/coinNotification";
import { cn } from "@/lib/utils";

interface MoodOption {
  emoji: string;
  label: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "😊", label: "Happy" },
  { emoji: "🥰", label: "Loved" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😠", label: "Angry" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "😴", label: "Tired" },
];

export function DailyMoodCheckin() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [note, setNote] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todaysEntry, setTodaysEntry] = useState<any>(null);
  const [encouragingMessage, setEncouragingMessage] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);

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
    if (authLoading || !isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    checkTodaysEntry();
  }, [user, isAuthenticated, authLoading]);

  const checkTodaysEntry = async () => {
    if (!user) return;
    
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
        setSelectedMood(MOOD_OPTIONS.find(m => m.emoji === data.mood_emoji) || null);
      }
    } catch (error) {
      console.error("Error checking mood entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEncouragingMessage = async (emoji: string, label: string) => {
    try {
      const { data, error } = await supabase
        .from("mood_messages")
        .select("message")
        .eq("mood_emoji", emoji)
        .eq("is_active", true);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Pick random message
        const randomMessage = data[Math.floor(Math.random() * data.length)];
        setEncouragingMessage(randomMessage.message);
      } else {
        // Fallback message
        setEncouragingMessage(`Thanks for checking in! We see you're feeling ${label.toLowerCase()}. That's okay!`);
      }
    } catch (error) {
      console.error("Error fetching message:", error);
      setEncouragingMessage(`Thanks for sharing how you feel! Have a great day!`);
    }
  };

  const handleMoodSelect = (mood: MoodOption) => {
    if (todaysEntry) return; // Already logged today
    setSelectedMood(mood);
    setShowMessage(false);
  };

  const handleAudioChange = (blob: Blob | null, url: string | null) => {
    setAudioBlob(blob);
    setAudioUrl(url);
  };

  const handleQuickSubmit = async () => {
    if (!selectedMood || !user || todaysEntry) return;
    
    setSaving(true);
    try {
      const today = getMSTDate();
      
      // Get coin reward setting
      const { data: rewardSetting } = await supabase
        .from("coin_rewards_settings")
        .select("coins_amount, is_active")
        .eq("reward_key", "mood_checkin")
        .maybeSingle();

      const coinsToAward = rewardSetting?.is_active ? (rewardSetting.coins_amount || 5) : 0;

      const { data, error } = await supabase
        .from("mood_entries")
        .insert({
          user_id: user.id,
          mood_emoji: selectedMood.emoji,
          mood_label: selectedMood.label,
          entry_date: today,
          coins_awarded: coinsToAward,
        })
        .select()
        .single();

      if (error) throw error;

      // Award coins
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
          description: "Daily mood check-in",
        });

        showCoinNotification(coinsToAward, "Mood check-in complete!");
      }

      setTodaysEntry(data);
      await fetchEncouragingMessage(selectedMood.emoji, selectedMood.label);
      setShowMessage(true);
      toast.success("Mood logged! 🎉");
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error("Failed to save mood");
    } finally {
      setSaving(false);
    }
  };

  const handleDetailedSubmit = async () => {
    if (!selectedMood || !user || todaysEntry) return;
    
    setSaving(true);
    try {
      const today = getMSTDate();
      let uploadedAudioUrl: string | null = null;

      // Upload audio if exists
      if (audioBlob) {
        const fileName = `${user.id}/${today}-${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("mood-audio")
          .upload(fileName, audioBlob, { contentType: "audio/webm" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("mood-audio")
          .getPublicUrl(fileName);
        
        uploadedAudioUrl = urlData.publicUrl;
      }

      // Get coin reward setting - extra coins for detailed entry
      const { data: rewardSetting } = await supabase
        .from("coin_rewards_settings")
        .select("coins_amount, is_active")
        .eq("reward_key", "mood_checkin_detailed")
        .maybeSingle();

      const coinsToAward = rewardSetting?.is_active ? (rewardSetting.coins_amount || 10) : 5;

      const { data, error } = await supabase
        .from("mood_entries")
        .insert({
          user_id: user.id,
          mood_emoji: selectedMood.emoji,
          mood_label: selectedMood.label,
          note: note || null,
          audio_url: uploadedAudioUrl,
          entry_date: today,
          coins_awarded: coinsToAward,
        })
        .select()
        .single();

      if (error) throw error;

      // Award coins
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
          description: "Detailed mood check-in",
        });

        showCoinNotification(coinsToAward, "Detailed check-in bonus!");
      }

      setTodaysEntry(data);
      await fetchEncouragingMessage(selectedMood.emoji, selectedMood.label);
      setShowMessage(true);
      toast.success("Mood logged with details! 🎉");
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error("Failed to save mood");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">🌈</span>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            How are you feeling?
          </span>
          <TextToSpeech 
            text="How are you feeling today? Tap an emoji to check in!" 
            size="icon" 
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mood Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => handleMoodSelect(mood)}
              disabled={!!todaysEntry || saving}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all duration-200",
                "hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400",
                "bg-white/80 dark:bg-gray-800/80 border-2",
                selectedMood?.label === mood.label
                  ? "border-purple-500 shadow-lg scale-105 bg-purple-100 dark:bg-purple-900/40"
                  : "border-transparent hover:border-purple-200",
                todaysEntry && "opacity-60 cursor-default"
              )}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs font-medium mt-1">{mood.label}</span>
            </button>
          ))}
        </div>

        {/* Already checked in message */}
        {todaysEntry && showMessage && encouragingMessage && (
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 text-center space-y-2">
            <div className="text-4xl mb-2">{todaysEntry.mood_emoji}</div>
            <p className="text-sm text-muted-foreground italic">"{encouragingMessage}"</p>
            <TextToSpeech text={encouragingMessage} size="default" />
            <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
              <Check className="w-4 h-4" />
              <span>Check-in complete!</span>
            </div>
          </div>
        )}

        {todaysEntry && !showMessage && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span>You checked in as {todaysEntry.mood_emoji} {todaysEntry.mood_label} today</span>
          </div>
        )}

        {/* Quick Submit or Expand for details */}
        {selectedMood && !todaysEntry && (
          <div className="space-y-3">
            {/* Quick submit button */}
            <Button
              onClick={handleQuickSubmit}
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Log {selectedMood.emoji} {selectedMood.label}
            </Button>

            {/* Toggle details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Add a note or voice message (bonus coins!)
                </>
              )}
            </button>

            {/* Expanded details section */}
            {showDetails && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="w-4 h-4" />
                    Write a note (optional)
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <AudioUploadOrRecord
                  label="🎤 Record a voice note (optional)"
                  audioUrl={audioUrl}
                  onAudioChange={handleAudioChange}
                  showRecorder={true}
                />

                <Button
                  onClick={handleDetailedSubmit}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Submit with Details (+bonus coins)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

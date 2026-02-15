import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";

export interface ChallengeTheme {
  id: string;
  month: number;
  year: number;
  name: string;
  description: string | null;
  background_options: BackgroundOption[];
  sticker_elements: StickerElement[];
  badge_name: string;
  badge_icon: string;
  badge_description: string | null;
  coin_reward: number;
  days_required: number;
  is_active: boolean;
}

export interface BackgroundOption {
  id: string;
  name: string;
  image_url: string;
}

export interface StickerElement {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

export interface PlacedSticker {
  sticker_id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  placed_on_date: string;
}

export interface ChallengeProgress {
  id: string;
  user_id: string;
  theme_id: string;
  selected_background: string | null;
  placed_stickers: PlacedSticker[];
  completion_days: number;
  is_completed: boolean;
  completed_at: string | null;
  shared_at: string | null;
  shared_image_url: string | null;
}

export interface DailyCompletion {
  id: string;
  user_id: string;
  theme_id: string;
  completion_date: string;
  sticker_earned: boolean;
  sticker_placed: boolean;
}

export function useMonthlyChallenge(userId: string | null) {
  const [theme, setTheme] = useState<ChallengeTheme | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [unplacedStickerCount, setUnplacedStickerCount] = useState(0);

  const loadChallengeData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Load current month's theme
      const { data: themeData, error: themeError } = await supabase
        .from('chore_challenge_themes')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('is_active', true)
        .single();

      if (themeError && themeError.code !== 'PGRST116') {
        console.error('Error loading theme:', themeError);
      }

      if (!themeData) {
        setLoading(false);
        return;
      }

      // Parse JSONB fields
      const parsedTheme: ChallengeTheme = {
        ...themeData,
        background_options: (themeData.background_options as unknown as BackgroundOption[]) || [],
        sticker_elements: (themeData.sticker_elements as unknown as StickerElement[]) || [],
      };
      setTheme(parsedTheme);

      // Load or create user's progress
      let { data: progressData, error: progressError } = await supabase
        .from('chore_challenge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('theme_id', themeData.id)
        .single();

      if (progressError && progressError.code === 'PGRST116') {
        // No progress exists, create it
        const { data: newProgress, error: createError } = await supabase
          .from('chore_challenge_progress')
          .insert({
            user_id: userId,
            theme_id: themeData.id,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating progress:', createError);
        } else {
          progressData = newProgress;
        }
      }

      if (progressData) {
        const parsedProgress: ChallengeProgress = {
          ...progressData,
          placed_stickers: (progressData.placed_stickers as unknown as PlacedSticker[]) || [],
        };
        setProgress(parsedProgress);
      }

      // Load daily completions
      const { data: completionsData, error: completionsError } = await supabase
        .from('chore_challenge_daily_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('theme_id', themeData.id)
        .order('completion_date', { ascending: true });

      if (completionsError) {
        console.error('Error loading completions:', completionsError);
      }

      setDailyCompletions((completionsData as DailyCompletion[]) || []);

      // Calculate unplaced stickers
      const earnedCount = completionsData?.filter(c => c.sticker_earned).length || 0;
      const placedCount = progressData?.placed_stickers ? 
        (progressData.placed_stickers as unknown as PlacedSticker[]).length : 0;
      setUnplacedStickerCount(Math.max(0, earnedCount - placedCount));

    } catch (error) {
      console.error('Error loading challenge data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChallengeData();
  }, [loadChallengeData]);

  const selectBackground = async (backgroundId: string) => {
    if (!progress) return;

    const { error } = await supabase
      .from('chore_challenge_progress')
      .update({ 
        selected_background: backgroundId,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      console.error('Error selecting background:', error);
      showErrorToastWithCopy('Failed to select background', error);
      return;
    }

    setProgress(prev => prev ? { ...prev, selected_background: backgroundId } : null);
    toast.success('Background selected!');
  };

  const placeSticker = async (sticker: StickerElement, x: number, y: number) => {
    if (!progress || unplacedStickerCount <= 0) return false;

    const newPlacedSticker: PlacedSticker = {
      sticker_id: sticker.id,
      x,
      y,
      scale: 1,
      rotation: 0,
      placed_on_date: new Date().toISOString(),
    };

    const updatedStickers = [...progress.placed_stickers, newPlacedSticker];

    const { error } = await supabase
      .from('chore_challenge_progress')
      .update({ 
        placed_stickers: JSON.parse(JSON.stringify(updatedStickers)),
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      console.error('Error placing sticker:', error);
      showErrorToastWithCopy('Failed to place sticker', error);
      return false;
    }

    setProgress(prev => prev ? { ...prev, placed_stickers: updatedStickers } : null);
    setUnplacedStickerCount(prev => prev - 1);
    return true;
  };

  const updateStickerPosition = async (index: number, x: number, y: number, scale?: number, rotation?: number) => {
    if (!progress) return;

    const updatedStickers = [...progress.placed_stickers];
    updatedStickers[index] = {
      ...updatedStickers[index],
      x,
      y,
      scale: scale ?? updatedStickers[index].scale,
      rotation: rotation ?? updatedStickers[index].rotation,
    };

    const { error } = await supabase
      .from('chore_challenge_progress')
      .update({ 
        placed_stickers: JSON.parse(JSON.stringify(updatedStickers)),
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      console.error('Error updating sticker:', error);
      return;
    }

    setProgress(prev => prev ? { ...prev, placed_stickers: updatedStickers } : null);
  };

  const removeSticker = async (index: number) => {
    if (!progress) return;

    const updatedStickers = progress.placed_stickers.filter((_, i) => i !== index);

    const { error } = await supabase
      .from('chore_challenge_progress')
      .update({ 
        placed_stickers: JSON.parse(JSON.stringify(updatedStickers)),
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      console.error('Error removing sticker:', error);
      showErrorToastWithCopy('Failed to remove sticker', error);
      return;
    }

    setProgress(prev => prev ? { ...prev, placed_stickers: updatedStickers } : null);
    setUnplacedStickerCount(prev => prev + 1);
    toast.success('Sticker removed');
  };

  const completeChallenge = async () => {
    if (!progress || !theme) return;

    const { error } = await supabase
      .from('chore_challenge_progress')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id);

    if (error) {
      console.error('Error completing challenge:', error);
      showErrorToastWithCopy('Failed to complete challenge', error);
      return;
    }

    // Award coins
    await supabase.from('coin_transactions').insert({
      user_id: progress.user_id,
      amount: theme.coin_reward,
      transaction_type: 'challenge_reward',
      description: `Monthly challenge: ${theme.name}`,
    });

    // Award badge
    await supabase.from('chore_badges').insert({
      user_id: progress.user_id,
      badge_type: `monthly_${theme.month}_${theme.year}`,
      badge_name: theme.badge_name,
      badge_description: theme.badge_description,
      badge_icon: theme.badge_icon,
    });

    setProgress(prev => prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : null);
    toast.success(`Challenge complete! You earned ${theme.coin_reward} coins and the ${theme.badge_name} badge!`);
  };

  return {
    theme,
    progress,
    dailyCompletions,
    loading,
    unplacedStickerCount,
    selectBackground,
    placeSticker,
    updateStickerPosition,
    removeSticker,
    completeChallenge,
    refresh: loadChallengeData,
  };
}

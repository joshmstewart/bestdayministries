import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChoreStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_completion_days: number;
  last_completion_date: string | null;
}

interface ChoreBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

// Badge definitions
const BADGE_DEFINITIONS = [
  { type: 'streak_3', name: '3 Day Streak', description: 'Complete all chores 3 days in a row!', icon: '🔥', threshold: 3, category: 'streak' },
  { type: 'streak_7', name: 'Week Warrior', description: 'Complete all chores 7 days in a row!', icon: '⭐', threshold: 7, category: 'streak' },
  { type: 'streak_14', name: 'Two Week Champion', description: 'Complete all chores 14 days in a row!', icon: '🌟', threshold: 14, category: 'streak' },
  { type: 'streak_30', name: 'Monthly Master', description: 'Complete all chores 30 days in a row!', icon: '👑', threshold: 30, category: 'streak' },
  { type: 'total_7', name: 'Getting Started', description: 'Complete all chores on 7 different days!', icon: '🎯', threshold: 7, category: 'total' },
  { type: 'total_30', name: 'Dedicated Helper', description: 'Complete all chores on 30 different days!', icon: '💪', threshold: 30, category: 'total' },
  { type: 'total_100', name: 'Chore Champion', description: 'Complete all chores on 100 different days!', icon: '🏆', threshold: 100, category: 'total' },
  { type: 'total_365', name: 'Year of Excellence', description: 'Complete all chores on 365 different days!', icon: '🎖️', threshold: 365, category: 'total' },
];

export function useChoreStreaks(userId: string | null) {
  const [streak, setStreak] = useState<ChoreStreak | null>(null);
  const [badges, setBadges] = useState<ChoreBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStreakData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Load streak data
      const { data: streakData, error: streakError } = await supabase
        .from('chore_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        console.error('Error loading streak:', streakError);
      }
      
      setStreak(streakData);

      // Load badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('chore_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (badgesError) {
        console.error('Error loading badges:', badgesError);
      }
      
      setBadges(badgesData || []);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  const updateStreakOnCompletion = async (completedDate: string) => {
    if (!userId) return;

    try {
      // Get current streak data
      const { data: currentStreak } = await supabase
        .from('chore_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      let newCurrentStreak = 1;
      let newLongestStreak = currentStreak?.longest_streak || 0;
      let newTotalDays = (currentStreak?.total_completion_days || 0) + 1;

      if (currentStreak?.last_completion_date) {
        const lastDate = new Date(currentStreak.last_completion_date);
        const currentDate = new Date(completedDate);
        const diffTime = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day - increment streak
          newCurrentStreak = currentStreak.current_streak + 1;
        } else if (diffDays === 0) {
          // Same day - no change to streak
          newCurrentStreak = currentStreak.current_streak;
          newTotalDays = currentStreak.total_completion_days; // Don't increment again
        } else {
          // Streak broken - reset to 1
          newCurrentStreak = 1;
        }
      }

      // Update longest streak if current is higher
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      // Upsert streak data
      const { data: updatedStreak, error: upsertError } = await supabase
        .from('chore_streaks')
        .upsert({
          user_id: userId,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          total_completion_days: newTotalDays,
          last_completion_date: completedDate,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setStreak(updatedStreak);

      // Check for new badges
      const newBadges = await checkAndAwardBadges(userId, newCurrentStreak, newTotalDays);
      if (newBadges.length > 0) {
        setBadges(prev => [...newBadges, ...prev]);
      }

      return { newBadges, streak: updatedStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    }
  };

  const checkAndAwardBadges = async (
    userId: string, 
    currentStreak: number, 
    totalDays: number
  ): Promise<ChoreBadge[]> => {
    const newBadges: ChoreBadge[] = [];

    // Get existing badges
    const { data: existingBadges } = await supabase
      .from('chore_badges')
      .select('badge_type')
      .eq('user_id', userId);

    const existingTypes = new Set(existingBadges?.map(b => b.badge_type) || []);

    // Check each badge definition
    for (const def of BADGE_DEFINITIONS) {
      if (existingTypes.has(def.type)) continue;

      const value = def.category === 'streak' ? currentStreak : totalDays;
      
      if (value >= def.threshold) {
        const { data: newBadge, error } = await supabase
          .from('chore_badges')
          .insert({
            user_id: userId,
            badge_type: def.type,
            badge_name: def.name,
            badge_description: def.description,
            badge_icon: def.icon,
          })
          .select()
          .single();

        if (!error && newBadge) {
          newBadges.push(newBadge);
        }
      }
    }

    return newBadges;
  };

  return {
    streak,
    badges,
    loading,
    updateStreakOnCompletion,
    refreshStreaks: loadStreakData,
    badgeDefinitions: BADGE_DEFINITIONS,
  };
}

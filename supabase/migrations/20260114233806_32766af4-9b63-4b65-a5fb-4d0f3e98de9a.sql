-- Add coin reward for workout goal completion
INSERT INTO public.coin_rewards_settings (reward_key, reward_name, coins_amount, description, category, is_active)
VALUES ('weekly_workout_goal', 'Weekly Workout Goal Completed', 50, 'Awarded when user completes their weekly workout goal', 'fitness', true)
ON CONFLICT (reward_key) DO NOTHING;

-- Create function to check and award workout goal coins
CREATE OR REPLACE FUNCTION public.check_workout_goal_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_weekly_goal INTEGER;
  v_current_count INTEGER;
  v_week_start DATE;
  v_coin_reward INTEGER;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Get the start of the current week (Monday)
  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  
  -- Get user's weekly goal
  SELECT weekly_goal INTO v_weekly_goal
  FROM public.user_workout_goals
  WHERE user_id = NEW.user_id;
  
  -- If no goal set, use default of 5
  IF v_weekly_goal IS NULL THEN
    v_weekly_goal := 5;
  END IF;
  
  -- Count activities logged this week
  SELECT COUNT(*) INTO v_current_count
  FROM public.user_workout_logs
  WHERE user_id = NEW.user_id
    AND logged_at >= v_week_start
    AND logged_at < v_week_start + INTERVAL '7 days';
  
  -- Check if goal is now met (exactly equal, to only reward once)
  IF v_current_count = v_weekly_goal THEN
    -- Check if already rewarded this week
    SELECT EXISTS(
      SELECT 1 FROM public.coin_transactions
      WHERE user_id = NEW.user_id
        AND transaction_type = 'workout_goal_reward'
        AND created_at >= v_week_start
        AND created_at < v_week_start + INTERVAL '7 days'
    ) INTO v_already_rewarded;
    
    IF NOT v_already_rewarded THEN
      -- Get coin reward amount
      SELECT coins_amount INTO v_coin_reward
      FROM public.coin_rewards_settings
      WHERE reward_key = 'weekly_workout_goal'
        AND is_active = true;
      
      IF v_coin_reward IS NOT NULL AND v_coin_reward > 0 THEN
        -- Award coins
        INSERT INTO public.coin_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          related_item_id
        ) VALUES (
          NEW.user_id,
          v_coin_reward,
          'workout_goal_reward',
          'Weekly workout goal completed! 🎉',
          NEW.id
        );
        
        -- Update user coin balance
        UPDATE public.profiles
        SET coin_balance = COALESCE(coin_balance, 0) + v_coin_reward
        WHERE id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for workout goal check
DROP TRIGGER IF EXISTS check_workout_goal_on_log ON public.user_workout_logs;
CREATE TRIGGER check_workout_goal_on_log
  AFTER INSERT ON public.user_workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_workout_goal_completion();
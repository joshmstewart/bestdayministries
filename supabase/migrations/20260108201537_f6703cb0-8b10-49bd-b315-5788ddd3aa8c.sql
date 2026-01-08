-- Add column to track last daily login reward
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_daily_login_reward_at TIMESTAMP WITH TIME ZONE;

-- Add daily login reward setting
INSERT INTO public.coin_rewards_settings (reward_key, reward_name, description, coins_amount, category, is_active)
VALUES ('daily_login', 'Daily Login', 'First login each day reward', 25, 'daily', true)
ON CONFLICT (reward_key) DO NOTHING;
-- Chore Reward Wheel System
-- Preset wheel configurations stored in app_settings

-- Table to track wheel spin results
CREATE TABLE public.chore_wheel_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spin_date DATE NOT NULL,
    prize_type TEXT NOT NULL, -- 'coins' or 'sticker_pack'
    prize_amount INTEGER NOT NULL, -- coin amount or pack count
    wheel_config TEXT NOT NULL, -- which preset was used
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_chore_wheel_spins_user_date ON public.chore_wheel_spins(user_id, spin_date);

-- Enable RLS
ALTER TABLE public.chore_wheel_spins ENABLE ROW LEVEL SECURITY;

-- Users can view their own spins
CREATE POLICY "Users can view own wheel spins"
ON public.chore_wheel_spins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only backend can insert (via service role)
CREATE POLICY "Service role can insert wheel spins"
ON public.chore_wheel_spins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Insert default wheel configuration into app_settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES (
    'chore_wheel_config',
    '{
        "active_preset": "balanced",
        "presets": {
            "balanced": {
                "name": "Balanced Mix",
                "description": "Equal mix of coins and sticker packs",
                "segments": [
                    {"label": "10 Coins", "type": "coins", "amount": 10, "color": "#FFD700", "probability": 0.20},
                    {"label": "25 Coins", "type": "coins", "amount": 25, "color": "#FFA500", "probability": 0.15},
                    {"label": "50 Coins", "type": "coins", "amount": 50, "color": "#FF8C00", "probability": 0.10},
                    {"label": "100 Coins", "type": "coins", "amount": 100, "color": "#FF6347", "probability": 0.05},
                    {"label": "1 Pack", "type": "sticker_pack", "amount": 1, "color": "#9370DB", "probability": 0.25},
                    {"label": "2 Packs", "type": "sticker_pack", "amount": 2, "color": "#8A2BE2", "probability": 0.15},
                    {"label": "3 Packs", "type": "sticker_pack", "amount": 3, "color": "#4B0082", "probability": 0.10}
                ]
            },
            "coin_heavy": {
                "name": "Coin Bonanza",
                "description": "More coins, fewer packs",
                "segments": [
                    {"label": "15 Coins", "type": "coins", "amount": 15, "color": "#FFD700", "probability": 0.25},
                    {"label": "30 Coins", "type": "coins", "amount": 30, "color": "#FFA500", "probability": 0.20},
                    {"label": "75 Coins", "type": "coins", "amount": 75, "color": "#FF8C00", "probability": 0.15},
                    {"label": "150 Coins", "type": "coins", "amount": 150, "color": "#FF6347", "probability": 0.10},
                    {"label": "1 Pack", "type": "sticker_pack", "amount": 1, "color": "#9370DB", "probability": 0.20},
                    {"label": "2 Packs", "type": "sticker_pack", "amount": 2, "color": "#8A2BE2", "probability": 0.10}
                ]
            },
            "pack_heavy": {
                "name": "Sticker Fever",
                "description": "More sticker packs, fewer coins",
                "segments": [
                    {"label": "20 Coins", "type": "coins", "amount": 20, "color": "#FFD700", "probability": 0.15},
                    {"label": "50 Coins", "type": "coins", "amount": 50, "color": "#FFA500", "probability": 0.10},
                    {"label": "1 Pack", "type": "sticker_pack", "amount": 1, "color": "#9370DB", "probability": 0.30},
                    {"label": "2 Packs", "type": "sticker_pack", "amount": 2, "color": "#8A2BE2", "probability": 0.25},
                    {"label": "3 Packs", "type": "sticker_pack", "amount": 3, "color": "#4B0082", "probability": 0.15},
                    {"label": "5 Packs!", "type": "sticker_pack", "amount": 5, "color": "#2E0854", "probability": 0.05}
                ]
            }
        }
    }'::jsonb
)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
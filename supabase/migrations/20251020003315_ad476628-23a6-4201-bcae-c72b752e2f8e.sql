-- Fix existing user_stickers that were added from bonus cards
-- Match user_stickers to bonus scratch cards that revealed them

UPDATE user_stickers us
SET obtained_from = 'bonus_card'
FROM daily_scratch_cards dsc
WHERE us.sticker_id = dsc.revealed_sticker_id
  AND us.user_id = dsc.user_id
  AND dsc.is_bonus_card = true
  AND dsc.is_scratched = true
  AND (us.obtained_from IS NULL OR us.obtained_from = 'daily_scratch');
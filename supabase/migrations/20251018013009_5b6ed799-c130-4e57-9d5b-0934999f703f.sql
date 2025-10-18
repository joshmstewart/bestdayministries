-- Sync coin_balance in profiles with actual transaction totals
UPDATE profiles
SET coin_balance = COALESCE(
  (SELECT SUM(amount) FROM coin_transactions WHERE coin_transactions.user_id = profiles.id),
  0
)
WHERE coin_balance = 0;
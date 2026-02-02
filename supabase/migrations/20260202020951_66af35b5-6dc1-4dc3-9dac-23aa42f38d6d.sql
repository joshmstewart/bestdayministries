-- Fix the get_coin_transaction_stats function to match return types
CREATE OR REPLACE FUNCTION public.get_coin_transaction_stats()
RETURNS TABLE(
  total_count bigint,
  total_earned numeric,
  total_spent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::numeric as total_earned,
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::numeric as total_spent
  FROM coin_transactions;
END;
$$;
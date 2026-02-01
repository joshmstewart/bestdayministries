-- Create RPC function to get accurate coin transaction statistics
CREATE OR REPLACE FUNCTION get_coin_transaction_stats()
RETURNS TABLE (
  total_count bigint,
  total_earned numeric,
  total_spent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent
  FROM coin_transactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
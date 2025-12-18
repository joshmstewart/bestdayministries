-- Fix all views to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures views respect RLS policies of the querying user

-- 1. profiles_public - Public profile information with role
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public WITH (security_invoker=true) AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.avatar_number,
  p.friend_code,
  p.email,
  p.created_at,
  p.updated_at,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id = (
  SELECT user_roles.id
  FROM user_roles
  WHERE user_roles.user_id = p.id
  ORDER BY user_roles.created_at
  LIMIT 1
) OR ur.id IS NULL;

-- 2. sponsor_bestie_funding_progress - Aggregate funding progress
DROP VIEW IF EXISTS sponsor_bestie_funding_progress;
CREATE VIEW sponsor_bestie_funding_progress WITH (security_invoker=true) AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  COALESCE(sum(
    CASE
      WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
      ELSE 0::numeric
    END), 0::numeric) AS current_monthly_pledges,
  sb.monthly_goal,
  CASE
    WHEN sb.monthly_goal > 0::numeric THEN round((COALESCE(sum(
      CASE
        WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
        ELSE 0::numeric
      END), 0::numeric) / sb.monthly_goal) * 100::numeric, 2)
    ELSE 0::numeric
  END AS funding_percentage,
  CASE
    WHEN sb.monthly_goal > 0::numeric THEN GREATEST(0::numeric, sb.monthly_goal - COALESCE(sum(
      CASE
        WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
        ELSE 0::numeric
      END), 0::numeric))
    ELSE 0::numeric
  END AS remaining_needed
FROM sponsor_besties sb
LEFT JOIN sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal;

-- 3. sponsor_bestie_funding_progress_by_mode - Uses function, make invoker
DROP VIEW IF EXISTS sponsor_bestie_funding_progress_by_mode;
CREATE VIEW sponsor_bestie_funding_progress_by_mode WITH (security_invoker=true) AS
SELECT 
  sponsor_bestie_id,
  bestie_id,
  bestie_name,
  current_monthly_pledges,
  monthly_goal,
  funding_percentage,
  remaining_needed,
  stripe_mode
FROM get_sponsor_bestie_funding_progress();

-- 4. bestie_funding_progress - Featured besties funding progress
DROP VIEW IF EXISTS bestie_funding_progress;
CREATE VIEW bestie_funding_progress WITH (security_invoker=true) AS
SELECT 
  fb.id AS featured_bestie_id,
  fb.bestie_id,
  fb.bestie_name,
  fb.monthly_goal,
  COALESCE(sum(s.amount), 0::numeric) AS current_monthly_pledges,
  GREATEST(fb.monthly_goal - COALESCE(sum(s.amount), 0::numeric), 0::numeric) AS remaining_needed,
  CASE
    WHEN fb.monthly_goal > 0::numeric THEN LEAST(round((COALESCE(sum(s.amount), 0::numeric) / fb.monthly_goal) * 100::numeric, 2), 100::numeric)
    ELSE 0::numeric
  END AS funding_percentage
FROM featured_besties fb
LEFT JOIN sponsorships s ON s.bestie_id = fb.bestie_id 
  AND s.status = 'active' 
  AND s.frequency = 'monthly'
GROUP BY fb.id, fb.bestie_id, fb.bestie_name, fb.monthly_goal;

-- 5. vendor_earnings - Vendor earnings (sensitive - requires user context)
DROP VIEW IF EXISTS vendor_earnings;
CREATE VIEW vendor_earnings WITH (security_invoker=true) AS
SELECT 
  v.id AS vendor_id,
  v.business_name,
  v.user_id,
  count(DISTINCT oi.order_id) AS total_orders,
  COALESCE(sum(oi.vendor_payout), 0::numeric) AS total_earnings,
  COALESCE(sum(oi.platform_fee), 0::numeric) AS total_fees,
  COALESCE(sum(oi.price_at_purchase * oi.quantity::numeric), 0::numeric) AS total_sales
FROM vendors v
LEFT JOIN order_items oi ON oi.vendor_id = v.id
WHERE oi.fulfillment_status = ANY (ARRAY['shipped'::fulfillment_status, 'delivered'::fulfillment_status])
  OR oi.fulfillment_status IS NULL
GROUP BY v.id, v.business_name, v.user_id;

-- 6. sponsorship_year_end_summary - Tax info (sensitive - must respect RLS)
DROP VIEW IF EXISTS sponsorship_year_end_summary;
CREATE VIEW sponsorship_year_end_summary WITH (security_invoker=true) AS
SELECT 
  sponsor_email,
  sponsor_name,
  tax_year,
  count(*) AS total_donations,
  sum(amount) AS total_amount,
  min(transaction_date) AS first_donation_date,
  max(transaction_date) AS last_donation_date,
  array_agg(
    jsonb_build_object(
      'date', transaction_date, 
      'amount', amount, 
      'bestie_name', bestie_name, 
      'receipt_number', receipt_number
    ) ORDER BY transaction_date
  ) AS donations
FROM sponsorship_receipts
GROUP BY sponsor_email, sponsor_name, tax_year;

-- 7. donations_missing_receipts - Admin analytics view
DROP VIEW IF EXISTS donations_missing_receipts;
CREATE VIEW donations_missing_receipts WITH (security_invoker=true) AS
SELECT 
  id AS donation_id,
  donor_email,
  amount,
  amount_charged,
  frequency,
  status,
  created_at AS donation_date,
  stripe_mode,
  stripe_payment_intent_id,
  stripe_subscription_id
FROM donations d
WHERE NOT EXISTS (
  SELECT 1
  FROM sponsorship_receipts sr
  WHERE sr.transaction_id = 'donation_' || d.id::text
    OR (sr.sponsor_email = d.donor_email 
        AND sr.amount = d.amount 
        AND sr.stripe_mode = d.stripe_mode 
        AND abs(EXTRACT(epoch FROM (sr.created_at - d.created_at))) < 86400::numeric)
)
AND status = ANY (ARRAY['completed', 'active'])
AND donor_email IS NOT NULL
ORDER BY created_at DESC;

-- 8. orphaned_receipts_analysis - Admin analytics view
DROP VIEW IF EXISTS orphaned_receipts_analysis;
CREATE VIEW orphaned_receipts_analysis WITH (security_invoker=true) AS
SELECT 
  sr.id AS receipt_id,
  sr.sponsor_email,
  sr.amount,
  sr.transaction_id,
  sr.transaction_date,
  sr.created_at AS receipt_created_at,
  sr.stripe_mode,
  sr.sponsorship_id,
  d.id AS potential_donation_id,
  d.amount AS donation_amount,
  d.created_at AS donation_created_at,
  d.status AS donation_status,
  abs(EXTRACT(epoch FROM (d.created_at - sr.created_at))) AS time_diff_seconds
FROM sponsorship_receipts sr
LEFT JOIN donations d ON (
  (d.donor_email = sr.sponsor_email OR d.donor_id = sr.user_id) 
  AND d.stripe_mode = sr.stripe_mode 
  AND d.amount = sr.amount 
  AND abs(EXTRACT(epoch FROM (d.created_at - sr.created_at))) < 3600::numeric
)
WHERE sr.sponsorship_id IS NULL 
  AND sr.transaction_id NOT LIKE 'donation_%'
ORDER BY sr.created_at DESC;

-- 9. game_leaderboard - Public leaderboard
DROP VIEW IF EXISTS game_leaderboard;
CREATE VIEW game_leaderboard WITH (security_invoker=true) AS
SELECT 
  user_id,
  game_type,
  difficulty,
  min(moves_count) AS best_moves,
  min(time_seconds) AS best_time,
  max(score) AS high_score,
  sum(coins_earned) AS total_coins,
  count(*) AS games_played
FROM game_sessions
GROUP BY user_id, game_type, difficulty;
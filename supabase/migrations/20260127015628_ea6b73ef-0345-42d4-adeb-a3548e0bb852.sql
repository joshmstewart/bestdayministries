-- Fix Security Definer Views: Convert all views to use security_invoker = true
-- This ensures views respect Row Level Security policies of the querying user

-- 1. profiles_public - Public profile information with role
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_number,
  p.friend_code,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id;

-- 2. sponsor_bestie_funding_progress - Aggregate funding progress
DROP VIEW IF EXISTS sponsor_bestie_funding_progress;
CREATE VIEW sponsor_bestie_funding_progress WITH (security_invoker = true) AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  sb.monthly_goal,
  COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
      WHEN s.frequency = 'one-time' AND s.status = 'active' 
           AND (s.ended_at IS NULL OR s.ended_at > now()) THEN s.amount
      ELSE 0 
    END
  ), 0) AS current_monthly_pledges,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN LEAST(ROUND((COALESCE(SUM(
      CASE 
        WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
        WHEN s.frequency = 'one-time' AND s.status = 'active' 
             AND (s.ended_at IS NULL OR s.ended_at > now()) THEN s.amount
        ELSE 0 
      END
    ), 0) / sb.monthly_goal) * 100, 2), 100)
    ELSE 0 
  END AS funding_percentage,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN GREATEST(0, sb.monthly_goal - COALESCE(SUM(
      CASE 
        WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
        WHEN s.frequency = 'one-time' AND s.status = 'active' 
             AND (s.ended_at IS NULL OR s.ended_at > now()) THEN s.amount
        ELSE 0 
      END
    ), 0))
    ELSE 0 
  END AS remaining_needed
FROM sponsor_besties sb
LEFT JOIN sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal;

-- 3. sponsor_bestie_funding_progress_by_mode - Funding by Stripe mode
DROP VIEW IF EXISTS sponsor_bestie_funding_progress_by_mode;
CREATE VIEW sponsor_bestie_funding_progress_by_mode WITH (security_invoker = true) AS
SELECT 
  sponsor_bestie_id,
  bestie_id,
  bestie_name,
  monthly_goal,
  current_monthly_pledges,
  funding_percentage,
  remaining_needed,
  stripe_mode
FROM get_sponsor_bestie_funding_progress();

-- 4. bestie_funding_progress - Featured besties funding progress
DROP VIEW IF EXISTS bestie_funding_progress;
CREATE VIEW bestie_funding_progress WITH (security_invoker = true) AS
SELECT 
  fb.id AS featured_bestie_id,
  fb.bestie_id,
  fb.bestie_name,
  fb.monthly_goal,
  COALESCE(SUM(s.amount), 0) AS current_monthly_pledges,
  GREATEST(fb.monthly_goal - COALESCE(SUM(s.amount), 0), 0) AS remaining_needed,
  CASE 
    WHEN fb.monthly_goal > 0 
    THEN LEAST(ROUND((COALESCE(SUM(s.amount), 0) / fb.monthly_goal) * 100, 2), 100)
    ELSE 0 
  END AS funding_percentage
FROM featured_besties fb
LEFT JOIN sponsorships s ON s.bestie_id = fb.bestie_id 
  AND s.status = 'active' 
  AND s.frequency = 'monthly'
GROUP BY fb.id, fb.bestie_id, fb.bestie_name, fb.monthly_goal;

-- 5. vendor_earnings - Vendor earnings (sensitive - requires user context)
DROP VIEW IF EXISTS vendor_earnings;
CREATE VIEW vendor_earnings WITH (security_invoker = true) AS
SELECT 
  v.id AS vendor_id,
  v.business_name,
  v.user_id,
  COUNT(DISTINCT oi.order_id) AS total_orders,
  COALESCE(SUM(oi.vendor_payout), 0) AS total_earnings,
  COALESCE(SUM(oi.platform_fee), 0) AS total_fees,
  COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) AS total_sales
FROM vendors v
LEFT JOIN order_items oi ON oi.vendor_id = v.id
WHERE oi.fulfillment_status IN ('shipped', 'delivered') OR oi.fulfillment_status IS NULL
GROUP BY v.id, v.business_name, v.user_id;

-- 6. sponsorship_year_end_summary - Tax info (sensitive - must respect RLS)
DROP VIEW IF EXISTS sponsorship_year_end_summary;
CREATE VIEW sponsorship_year_end_summary WITH (security_invoker = true) AS
SELECT 
  sponsor_email,
  user_id,
  tax_year,
  SUM(amount) AS total_amount,
  COUNT(*) AS total_receipts,
  MIN(transaction_date) AS first_transaction,
  MAX(transaction_date) AS last_transaction,
  MAX(organization_name) AS organization_name,
  MAX(organization_ein) AS organization_ein,
  stripe_mode
FROM sponsorship_receipts
GROUP BY sponsor_email, user_id, tax_year, stripe_mode;

-- 7. donations_missing_receipts - Admin analytics view
DROP VIEW IF EXISTS donations_missing_receipts;
CREATE VIEW donations_missing_receipts WITH (security_invoker = true) AS
SELECT 
  d.id AS donation_id,
  d.donor_email,
  d.donor_id,
  d.amount,
  d.frequency,
  d.status,
  d.stripe_mode,
  d.created_at
FROM donations d
WHERE NOT EXISTS (
  SELECT 1 FROM sponsorship_receipts sr
  WHERE sr.transaction_id = 'donation_' || d.id::text
)
AND d.status IN ('completed', 'active')
AND d.donor_email IS NOT NULL;

-- 8. orphaned_receipts_analysis - Admin analytics view
DROP VIEW IF EXISTS orphaned_receipts_analysis;
CREATE VIEW orphaned_receipts_analysis WITH (security_invoker = true) AS
SELECT 
  sr.id AS receipt_id,
  sr.sponsor_email,
  sr.user_id,
  sr.amount,
  sr.frequency,
  sr.transaction_id,
  sr.transaction_date,
  sr.stripe_mode,
  sr.created_at,
  sr.sponsorship_id IS NOT NULL AS has_sponsorship,
  EXISTS (
    SELECT 1 FROM donations d
    WHERE (d.donor_email = sr.sponsor_email OR d.donor_id = sr.user_id)
      AND d.stripe_mode = sr.stripe_mode
      AND ABS(EXTRACT(EPOCH FROM (d.created_at - sr.created_at))) < 86400
  ) AS has_matching_donation
FROM sponsorship_receipts sr
WHERE sr.sponsorship_id IS NULL;

-- 9. game_leaderboard - Public leaderboard
DROP VIEW IF EXISTS game_leaderboard;
CREATE VIEW game_leaderboard WITH (security_invoker = true) AS
SELECT 
  user_id,
  high_score,
  best_level,
  total_games_played,
  updated_at
FROM cash_register_user_stats
ORDER BY high_score DESC;

-- 10. page_visit_stats - Analytics view
DROP VIEW IF EXISTS page_visit_stats;
CREATE VIEW page_visit_stats WITH (security_invoker = true) AS
SELECT 
  page_url,
  DATE(visited_at) AS visit_date,
  COUNT(*) AS visit_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM page_visits
GROUP BY page_url, DATE(visited_at)
ORDER BY DATE(visited_at) DESC;

-- 11. community_feed_items - Community feed aggregation
DROP VIEW IF EXISTS community_feed_items;
CREATE VIEW community_feed_items WITH (security_invoker = true) AS
SELECT id, 'beat'::text AS item_type, name AS title, NULL::text AS description,
       creator_id AS author_id, created_at, image_url, likes_count,
       NULL::bigint AS comments_count,
       jsonb_build_object('pattern', pattern, 'tempo', tempo) AS extra_data,
       NULL::uuid AS repost_id
FROM beat_pad_creations WHERE is_public = true
UNION ALL
SELECT uc.id, 'coloring'::text AS item_type, COALESCE(cp.title, 'Coloring') AS title,
       NULL::text AS description, uc.user_id AS author_id, uc.created_at,
       uc.thumbnail_url AS image_url, uc.likes_count, NULL::bigint AS comments_count,
       NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM user_colorings uc LEFT JOIN coloring_pages cp ON uc.coloring_page_id = cp.id
WHERE uc.is_public = true
UNION ALL
SELECT id, 'card'::text AS item_type, COALESCE(title, 'Card') AS title,
       NULL::text AS description, user_id AS author_id, created_at,
       thumbnail_url AS image_url, likes_count, NULL::bigint AS comments_count,
       NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM user_cards WHERE is_public = true
UNION ALL
SELECT dp.id, 'post'::text AS item_type, dp.title, dp.content AS description,
       dp.author_id, dp.created_at, dp.image_url, 0 AS likes_count,
       (SELECT COUNT(*) FROM discussion_comments WHERE post_id = dp.id) AS comments_count,
       NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM discussion_posts dp WHERE dp.is_moderated = true
UNION ALL
SELECT a.id, 'album'::text AS item_type, a.title, a.description,
       a.created_by AS author_id, a.created_at, a.cover_image_url AS image_url,
       0 AS likes_count,
       (SELECT COUNT(*) FROM album_images WHERE album_id = a.id) AS comments_count,
       NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM albums a WHERE a.is_active = true AND a.is_public = true
UNION ALL
SELECT id, 'chore_art'::text AS item_type, COALESCE(title, 'Chore Challenge Art') AS title,
       NULL::text AS description, user_id AS author_id, created_at, image_url,
       likes_count, NULL::bigint AS comments_count, NULL::jsonb AS extra_data,
       NULL::uuid AS repost_id
FROM chore_challenge_gallery
UNION ALL
SELECT id, 'event'::text AS item_type, title, description, created_by AS author_id,
       created_at, image_url, COALESCE(likes_count, 0) AS likes_count,
       NULL::bigint AS comments_count, NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM events WHERE is_active = true AND is_public = true
UNION ALL
SELECT e.id, 'event'::text AS item_type, e.title, e.description, e.created_by AS author_id,
       fr.reposted_at AS created_at, e.image_url, COALESCE(e.likes_count, 0) AS likes_count,
       NULL::bigint AS comments_count,
       jsonb_build_object('is_repost', true, 'reposted_at', fr.reposted_at) AS extra_data,
       fr.id AS repost_id
FROM feed_reposts fr JOIN events e ON fr.original_item_id = e.id AND fr.original_item_type = 'event'
WHERE e.is_active = true AND e.is_public = true
UNION ALL
SELECT id, 'prayer'::text AS item_type, title, content AS description,
       user_id AS author_id, created_at, image_url, likes_count,
       NULL::bigint AS comments_count, NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM prayer_requests WHERE is_public = true
UNION ALL
SELECT wi.id, 'workout'::text AS item_type, COALESCE(wi.activity_name, 'Workout Photo') AS title,
       NULL::text AS description, wi.user_id AS author_id, wi.created_at, wi.image_url,
       wi.likes_count, NULL::bigint AS comments_count,
       jsonb_build_object('activity_name', wi.activity_name, 'location_name', wi.location_name,
                         'location_pack_name', wi.location_pack_name, 'avatar_name', fa.name) AS extra_data,
       NULL::uuid AS repost_id
FROM workout_generated_images wi LEFT JOIN fitness_avatars fa ON wi.avatar_id = fa.id
WHERE wi.is_shared_to_community = true
UNION ALL
SELECT id, 'recipe'::text AS item_type, title, description, creator_id AS author_id,
       created_at, image_url, likes_count, NULL::bigint AS comments_count,
       jsonb_build_object('ingredients', ingredients, 'steps', steps) AS extra_data,
       NULL::uuid AS repost_id
FROM public_recipes WHERE is_active = true
UNION ALL
SELECT id, 'drink'::text AS item_type, COALESCE(name, 'Custom Drink') AS title,
       NULL::text AS description, creator_id AS author_id, created_at,
       generated_image_url AS image_url, likes_count, NULL::bigint AS comments_count,
       NULL::jsonb AS extra_data, NULL::uuid AS repost_id
FROM custom_drinks WHERE is_public = true
UNION ALL
SELECT id, 'joke'::text AS item_type, category AS title, answer AS description,
       user_id AS author_id, COALESCE(shared_at, created_at) AS created_at,
       NULL::text AS image_url, likes_count, NULL::bigint AS comments_count,
       jsonb_build_object('question', question, 'answer', answer) AS extra_data,
       NULL::uuid AS repost_id
FROM saved_jokes WHERE is_public = true
UNION ALL
SELECT id, 'announcement'::text AS item_type, title, description,
       created_by AS author_id, COALESCE(published_at, created_at) AS created_at,
       image_url, COALESCE(likes_count, 0) AS likes_count, NULL::bigint AS comments_count,
       jsonb_build_object('announcement_type', announcement_type, 'link_url', link_url,
                         'link_label', link_label, 'price_coins', price_coins, 'is_free', is_free) AS extra_data,
       NULL::uuid AS repost_id
FROM content_announcements WHERE status = 'published'
ORDER BY created_at DESC;
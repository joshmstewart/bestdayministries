-- Fix SECURITY DEFINER warning on community_feed_items view
-- Recreate with security_invoker = true

DROP VIEW IF EXISTS community_feed_items;

CREATE VIEW community_feed_items 
WITH (security_invoker = true)
AS
SELECT beat_pad_creations.id,
    'beat'::text AS item_type,
    beat_pad_creations.name AS title,
    NULL::text AS description,
    beat_pad_creations.creator_id AS author_id,
    beat_pad_creations.created_at,
    beat_pad_creations.image_url,
    beat_pad_creations.likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('pattern', beat_pad_creations.pattern, 'tempo', beat_pad_creations.tempo) AS extra_data,
    NULL::uuid AS repost_id
   FROM beat_pad_creations
  WHERE beat_pad_creations.is_public = true
UNION ALL
 SELECT uc.id,
    'coloring'::text AS item_type,
    COALESCE(cp.title, 'Coloring'::text) AS title,
    NULL::text AS description,
    uc.user_id AS author_id,
    uc.created_at,
    uc.thumbnail_url AS image_url,
    uc.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM user_colorings uc
     LEFT JOIN coloring_pages cp ON uc.coloring_page_id = cp.id
  WHERE uc.is_public = true
UNION ALL
 SELECT user_cards.id,
    'card'::text AS item_type,
    COALESCE(user_cards.title, 'Card'::text) AS title,
    NULL::text AS description,
    user_cards.user_id AS author_id,
    user_cards.created_at,
    user_cards.thumbnail_url AS image_url,
    user_cards.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM user_cards
  WHERE user_cards.is_public = true
UNION ALL
 SELECT dp.id,
    'post'::text AS item_type,
    dp.title,
    dp.content AS description,
    dp.author_id,
    dp.created_at,
    dp.image_url,
    0 AS likes_count,
    ( SELECT count(*) AS count
           FROM discussion_comments
          WHERE discussion_comments.post_id = dp.id) AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM discussion_posts dp
  WHERE dp.is_moderated = true
UNION ALL
 SELECT a.id,
    'album'::text AS item_type,
    a.title,
    a.description,
    a.created_by AS author_id,
    a.created_at,
    a.cover_image_url AS image_url,
    0 AS likes_count,
    ( SELECT count(*) AS count
           FROM album_images
          WHERE album_images.album_id = a.id) AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM albums a
  WHERE a.is_active = true AND a.is_public = true
UNION ALL
 SELECT chore_challenge_gallery.id,
    'chore_art'::text AS item_type,
    COALESCE(chore_challenge_gallery.title, 'Chore Challenge Art'::text) AS title,
    NULL::text AS description,
    chore_challenge_gallery.user_id AS author_id,
    chore_challenge_gallery.created_at,
    chore_challenge_gallery.image_url,
    chore_challenge_gallery.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM chore_challenge_gallery
UNION ALL
 SELECT events.id,
    'event'::text AS item_type,
    events.title,
    events.description,
    events.created_by AS author_id,
    events.created_at,
    events.image_url,
    0 AS likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM events
  WHERE events.is_active = true AND events.is_public = true
UNION ALL
 SELECT e.id,
    'event'::text AS item_type,
    e.title,
    e.description,
    e.created_by AS author_id,
    fr.reposted_at AS created_at,
    e.image_url,
    0 AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('is_repost', true, 'reposted_at', fr.reposted_at) AS extra_data,
    fr.id AS repost_id
   FROM feed_reposts fr
     JOIN events e ON fr.original_item_id = e.id AND fr.original_item_type = 'event'::text
  WHERE e.is_active = true AND e.is_public = true
UNION ALL
 SELECT prayer_requests.id,
    'prayer'::text AS item_type,
    prayer_requests.title,
    prayer_requests.content AS description,
    prayer_requests.user_id AS author_id,
    prayer_requests.created_at,
    prayer_requests.image_url,
    prayer_requests.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM prayer_requests
  WHERE prayer_requests.is_public = true
UNION ALL
 SELECT workout_generated_images.id,
    'workout'::text AS item_type,
    COALESCE(workout_generated_images.activity_name, 'Workout Photo'::text) AS title,
    NULL::text AS description,
    workout_generated_images.user_id AS author_id,
    workout_generated_images.created_at,
    workout_generated_images.image_url,
    workout_generated_images.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM workout_generated_images
  WHERE workout_generated_images.is_shared_to_community = true
UNION ALL
 SELECT public_recipes.id,
    'recipe'::text AS item_type,
    public_recipes.title,
    public_recipes.description,
    public_recipes.creator_id AS author_id,
    public_recipes.created_at,
    public_recipes.image_url,
    public_recipes.likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('ingredients', public_recipes.ingredients, 'steps', public_recipes.steps) AS extra_data,
    NULL::uuid AS repost_id
   FROM public_recipes
  WHERE public_recipes.is_active = true
UNION ALL
 SELECT custom_drinks.id,
    'drink'::text AS item_type,
    custom_drinks.name AS title,
    custom_drinks.description,
    custom_drinks.creator_id AS author_id,
    custom_drinks.created_at,
    custom_drinks.generated_image_url AS image_url,
    custom_drinks.likes_count,
    NULL::bigint AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
   FROM custom_drinks
  WHERE custom_drinks.is_public = true
UNION ALL
 SELECT saved_jokes.id,
    'joke'::text AS item_type,
    saved_jokes.category AS title,
    saved_jokes.answer AS description,
    saved_jokes.user_id AS author_id,
    COALESCE(saved_jokes.shared_at, saved_jokes.created_at) AS created_at,
    NULL::text AS image_url,
    saved_jokes.likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('question', saved_jokes.question, 'answer', saved_jokes.answer) AS extra_data,
    NULL::uuid AS repost_id
   FROM saved_jokes
  WHERE saved_jokes.is_public = true
  ORDER BY 6 DESC;

-- Grant permissions
GRANT SELECT ON public.community_feed_items TO authenticated;
GRANT SELECT ON public.community_feed_items TO anon;

-- Update community_feed_items view: add fortune post_date, content, and author to extra_data
CREATE OR REPLACE VIEW public.community_feed_items AS
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
        CASE
            WHEN dp.is_fortune_post = true THEN 'fortune'::text
            ELSE 'post'::text
        END AS item_type,
    dp.title,
    dp.content AS description,
    dp.author_id,
    dp.created_at,
    dp.image_url,
    0 AS likes_count,
    ( SELECT count(*) AS count
           FROM discussion_comments
          WHERE discussion_comments.post_id = dp.id) AS comments_count,
        CASE
            WHEN dp.is_fortune_post = true THEN jsonb_build_object(
              'is_fortune_post', true, 
              'fortune_post_id', dp.id,
              'post_date', dfp.post_date,
              'fortune_content', df.content,
              'fortune_author', df.author
            )
            ELSE NULL::jsonb
        END AS extra_data,
    NULL::uuid AS repost_id
   FROM discussion_posts dp
     LEFT JOIN daily_fortune_posts dfp ON dfp.discussion_post_id = dp.id
     LEFT JOIN daily_fortunes df ON dfp.fortune_id = df.id
  WHERE dp.is_moderated = true AND dp.share_to_feed = true
UNION ALL
 SELECT a.id,
    'album'::text AS item_type,
    a.title,
    a.description,
    a.created_by AS author_id,
    a.created_at,
    a.cover_image_url AS image_url,
    a.likes_count,
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
    COALESCE(events.likes_count, 0) AS likes_count,
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
    COALESCE(e.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('is_repost', true, 'reposted_at', fr.reposted_at, 'repost_caption', fr.caption) AS extra_data,
    fr.id AS repost_id
   FROM feed_reposts fr
     JOIN events e ON fr.original_item_id = e.id AND fr.original_item_type = 'event'::text
  WHERE e.is_active = true AND e.is_public = true
UNION ALL
 SELECT a.id,
    'album'::text AS item_type,
    a.title,
    a.description,
    a.created_by AS author_id,
    fr.reposted_at AS created_at,
    a.cover_image_url AS image_url,
    a.likes_count,
    ( SELECT count(*) AS count
           FROM album_images
          WHERE album_images.album_id = a.id) AS comments_count,
    jsonb_build_object('is_repost', true, 'reposted_at', fr.reposted_at, 'repost_caption', fr.caption) AS extra_data,
    fr.id AS repost_id
   FROM feed_reposts fr
     JOIN albums a ON fr.original_item_id = a.id AND fr.original_item_type = 'album'::text
  WHERE a.is_active = true AND a.is_public = true
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
 SELECT wi.id,
    'workout'::text AS item_type,
    COALESCE(wi.activity_name, 'Workout'::text) AS title,
    NULL::text AS description,
    wi.user_id AS author_id,
    wi.created_at,
    wi.image_url,
    COALESCE(wi.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('activity_name', wi.activity_name, 'location_name', wi.location_name, 'location_pack_name', wi.location_pack_name, 'avatar_id', wi.avatar_id, 'avatar_name', fa.name) AS extra_data,
    NULL::uuid AS repost_id
   FROM workout_generated_images wi
     LEFT JOIN fitness_avatars fa ON wi.avatar_id = fa.id
  WHERE wi.is_shared_to_community = true
UNION ALL
 SELECT pr.id,
    'recipe'::text AS item_type,
    pr.title,
    pr.description,
    pr.creator_id AS author_id,
    pr.created_at,
    pr.image_url,
    COALESCE(pr.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('ingredients', pr.ingredients, 'steps', pr.steps) AS extra_data,
    NULL::uuid AS repost_id
   FROM public_recipes pr
  WHERE pr.is_active = true
UNION ALL
 SELECT cd.id,
    'drink'::text AS item_type,
    cd.name AS title,
    cd.description,
    cd.creator_id AS author_id,
    cd.created_at,
    cd.generated_image_url AS image_url,
    COALESCE(cd.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('ingredients', cd.ingredients) AS extra_data,
    NULL::uuid AS repost_id
   FROM custom_drinks cd
  WHERE cd.is_public = true
UNION ALL
 SELECT sj.id,
    'joke'::text AS item_type,
    sj.question AS title,
    sj.answer AS description,
    sj.user_id AS author_id,
    sj.created_at,
    NULL::text AS image_url,
    COALESCE(sj.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('question', sj.question, 'answer', sj.answer, 'category', sj.category) AS extra_data,
    NULL::uuid AS repost_id
   FROM saved_jokes sj
  WHERE sj.is_public = true
UNION ALL
 SELECT ca.id,
    'announcement'::text AS item_type,
    ca.title,
    ca.description,
    ca.created_by AS author_id,
    COALESCE(ca.published_at, ca.created_at) AS created_at,
    ca.image_url,
    COALESCE(ca.likes_count, 0) AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object('link_url', ca.link_url, 'announcement_type', ca.announcement_type, 'price_coins', ca.price_coins, 'is_free', ca.is_free) AS extra_data,
    NULL::uuid AS repost_id
   FROM content_announcements ca
  WHERE ca.status = 'published'::text;

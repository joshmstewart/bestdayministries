-- Create content_announcements table for admin-managed announcements
CREATE TABLE public.content_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  announcement_type TEXT NOT NULL DEFAULT 'general',
  link_url TEXT,
  link_label TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for clarity
COMMENT ON COLUMN public.content_announcements.announcement_type IS 'Types: avatar, coloring_book, memory_match_pack, sticker_pack, beat_pad_pack, joke_pack, location_pack, cash_register_pack, general';
COMMENT ON COLUMN public.content_announcements.status IS 'Values: draft, published';

-- Enable RLS
ALTER TABLE public.content_announcements ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can view published announcements
CREATE POLICY "Anyone can view published announcements"
ON public.content_announcements
FOR SELECT
USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage announcements"
ON public.content_announcements
FOR ALL
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- Add updated_at trigger
CREATE TRIGGER update_content_announcements_updated_at
BEFORE UPDATE ON public.content_announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add notification preference columns for content announcements
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_on_new_content_announcement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inapp_on_new_content_announcement BOOLEAN DEFAULT true;

-- Enable realtime for content_announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_announcements;

-- Update the community_feed_items view to include announcements
CREATE OR REPLACE VIEW public.community_feed_items 
WITH (security_invoker = true)
AS
-- Beats
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

-- Colorings
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

-- Cards
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

-- Discussion Posts
SELECT dp.id,
    'post'::text AS item_type,
    dp.title,
    dp.content AS description,
    dp.author_id,
    dp.created_at,
    dp.image_url,
    0 AS likes_count,
    (SELECT count(*) FROM discussion_comments WHERE discussion_comments.post_id = dp.id) AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
FROM discussion_posts dp
WHERE dp.is_moderated = true

UNION ALL

-- Albums
SELECT a.id,
    'album'::text AS item_type,
    a.title,
    a.description,
    a.created_by AS author_id,
    a.created_at,
    a.cover_image_url AS image_url,
    0 AS likes_count,
    (SELECT count(*) FROM album_images WHERE album_images.album_id = a.id) AS comments_count,
    NULL::jsonb AS extra_data,
    NULL::uuid AS repost_id
FROM albums a
WHERE a.is_active = true AND a.is_public = true

UNION ALL

-- Chore Challenge Gallery
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

-- Events (original)
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

-- Events (reposts)
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

-- Prayer Requests
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

-- Workout Generated Images
SELECT wi.id,
    'workout'::text AS item_type,
    COALESCE(wi.activity_name, 'Workout Photo'::text) AS title,
    NULL::text AS description,
    wi.user_id AS author_id,
    wi.created_at,
    wi.image_url,
    wi.likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object(
        'activity_name', wi.activity_name,
        'location_name', wi.location_name,
        'location_pack_name', wi.location_pack_name,
        'avatar_name', fa.name
    ) AS extra_data,
    NULL::uuid AS repost_id
FROM workout_generated_images wi
LEFT JOIN fitness_avatars fa ON wi.avatar_id = fa.id
WHERE wi.is_shared_to_community = true

UNION ALL

-- Public Recipes
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

-- Custom Drinks
SELECT custom_drinks.id,
    'drink'::text AS item_type,
    COALESCE(custom_drinks.name, 'Custom Drink'::text) AS title,
    NULL::text AS description,
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

-- Saved Jokes
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

UNION ALL

-- Content Announcements
SELECT content_announcements.id,
    'announcement'::text AS item_type,
    content_announcements.title,
    content_announcements.description,
    content_announcements.created_by AS author_id,
    COALESCE(content_announcements.published_at, content_announcements.created_at) AS created_at,
    content_announcements.image_url,
    0 AS likes_count,
    NULL::bigint AS comments_count,
    jsonb_build_object(
        'announcement_type', content_announcements.announcement_type,
        'link_url', content_announcements.link_url,
        'link_label', content_announcements.link_label
    ) AS extra_data,
    NULL::uuid AS repost_id
FROM content_announcements
WHERE content_announcements.status = 'published'

ORDER BY created_at DESC;

-- Grant permissions on view
GRANT SELECT ON public.community_feed_items TO authenticated;
GRANT SELECT ON public.community_feed_items TO anon;

-- Create trigger to send notifications when announcement is published
CREATE OR REPLACE FUNCTION public.notify_on_content_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  should_notify_inapp BOOLEAN;
BEGIN
  -- Only notify when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Notify all users who have in-app notifications enabled
    FOR user_record IN
      SELECT p.id
      FROM profiles p
      WHERE p.id != NEW.created_by
    LOOP
      -- Check in-app notification preference
      SELECT COALESCE(np.inapp_on_new_content_announcement, true) INTO should_notify_inapp
      FROM notification_preferences np
      WHERE np.user_id = user_record.id;
      
      -- Default to true if no preference record exists
      should_notify_inapp := COALESCE(should_notify_inapp, true);
      
      IF should_notify_inapp THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          user_record.id,
          'content_announcement',
          '🎉 ' || NEW.title,
          COALESCE(NEW.description, 'Check out our latest content!'),
          COALESCE(NEW.link_url, '/community'),
          jsonb_build_object(
            'announcement_id', NEW.id,
            'announcement_type', NEW.announcement_type
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for announcements
CREATE TRIGGER notify_on_content_announcement_published
AFTER INSERT OR UPDATE ON public.content_announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_content_announcement();
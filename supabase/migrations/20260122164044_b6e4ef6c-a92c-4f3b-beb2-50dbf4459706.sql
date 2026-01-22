-- Create email queue table for content like notifications
CREATE TABLE IF NOT EXISTS public.content_like_email_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  liker_name text NOT NULL,
  content_type text NOT NULL,
  content_title text,
  content_link text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text
);

-- Enable RLS
ALTER TABLE public.content_like_email_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access using EXISTS pattern
CREATE POLICY "Admins can manage content like email queue"
  ON public.content_like_email_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Helper function to queue content like emails
CREATE OR REPLACE FUNCTION public.queue_content_like_email(
  p_recipient_user_id uuid,
  p_liker_user_id uuid,
  p_content_type text,
  p_content_title text,
  p_content_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_email text;
  v_recipient_name text;
  v_liker_name text;
  v_email_enabled boolean;
BEGIN
  -- Check if recipient has email notifications enabled for content likes
  SELECT email_on_content_like INTO v_email_enabled
  FROM notification_preferences
  WHERE user_id = p_recipient_user_id;
  
  -- Default to false if no preference set
  IF v_email_enabled IS NULL OR v_email_enabled = false THEN
    RETURN;
  END IF;
  
  -- Get recipient info
  SELECT email INTO v_recipient_email
  FROM auth.users
  WHERE id = p_recipient_user_id;
  
  SELECT COALESCE(display_name, 'Friend') INTO v_recipient_name
  FROM profiles
  WHERE id = p_recipient_user_id;
  
  -- Get liker name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = p_liker_user_id;
  
  -- Skip if no email found
  IF v_recipient_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Insert into queue
  INSERT INTO content_like_email_queue (
    recipient_user_id,
    recipient_email,
    recipient_name,
    liker_name,
    content_type,
    content_title,
    content_link
  ) VALUES (
    p_recipient_user_id,
    v_recipient_email,
    v_recipient_name,
    v_liker_name,
    p_content_type,
    p_content_title,
    p_content_link
  );
END;
$$;

-- Update prayer like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_prayer_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prayer_author_id uuid;
  v_liker_name text;
  v_prayer_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the prayer request author
  SELECT user_id, title INTO v_prayer_author_id, v_prayer_title
  FROM prayer_requests
  WHERE id = NEW.prayer_request_id;
  
  -- Don't notify if liking own content
  IF v_prayer_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_prayer_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_prayer_author_id,
      'content_like',
      'Someone prayed with you! 🙏',
      v_liker_name || ' prayed for your request',
      '/games/prayer-partner'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_prayer_author_id,
    NEW.user_id,
    'prayer request',
    v_prayer_title,
    '/games/prayer-partner'
  );
  
  RETURN NEW;
END;
$$;

-- Update workout image like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_workout_image_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_image_author_id uuid;
  v_liker_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the workout image author
  SELECT user_id INTO v_image_author_id
  FROM workout_images
  WHERE id = NEW.workout_image_id;
  
  -- Don't notify if liking own content
  IF v_image_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_image_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_image_author_id,
      'content_like',
      'Someone liked your workout! 💪',
      v_liker_name || ' liked your fitness image',
      '/games/fitness-tracker'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_image_author_id,
    NEW.user_id,
    'workout image',
    'Fitness Image',
    '/games/fitness-tracker'
  );
  
  RETURN NEW;
END;
$$;

-- Update card like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_card_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_author_id uuid;
  v_liker_name text;
  v_card_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the card author
  SELECT user_id, title INTO v_card_author_id, v_card_title
  FROM user_cards
  WHERE id = NEW.card_id;
  
  -- Don't notify if liking own content
  IF v_card_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_card_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_card_author_id,
      'content_like',
      'Someone liked your card! 🎨',
      v_liker_name || ' liked your card "' || COALESCE(v_card_title, 'Untitled') || '"',
      '/games/card-maker'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_card_author_id,
    NEW.user_id,
    'card',
    v_card_title,
    '/games/card-maker'
  );
  
  RETURN NEW;
END;
$$;

-- Update beat pad like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_beat_pad_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_beat_author_id uuid;
  v_liker_name text;
  v_beat_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the beat author
  SELECT creator_id, name INTO v_beat_author_id, v_beat_name
  FROM beat_pad_creations
  WHERE id = NEW.creation_id;
  
  -- Don't notify if liking own content
  IF v_beat_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_beat_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_beat_author_id,
      'content_like',
      'Someone liked your beat! 🎵',
      v_liker_name || ' liked your beat "' || COALESCE(v_beat_name, 'Untitled') || '"',
      '/games/beat-pad'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_beat_author_id,
    NEW.user_id,
    'beat',
    v_beat_name,
    '/games/beat-pad'
  );
  
  RETURN NEW;
END;
$$;

-- Update coloring like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_coloring_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coloring_author_id uuid;
  v_liker_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the coloring author
  SELECT user_id INTO v_coloring_author_id
  FROM user_colorings
  WHERE id = NEW.coloring_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled (default true, allow self-likes for in-app)
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_coloring_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_coloring_author_id,
      'content_like',
      'Someone liked your coloring! 🖍️',
      v_liker_name || ' liked your coloring page',
      '/games/coloring'
    );
  END IF;
  
  -- Queue email notification (skip self-likes for email)
  IF v_coloring_author_id != NEW.user_id THEN
    PERFORM queue_content_like_email(
      v_coloring_author_id,
      NEW.user_id,
      'coloring',
      'Coloring Page',
      '/games/coloring'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update drink like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_drink_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drink_author_id uuid;
  v_liker_name text;
  v_drink_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the drink author
  SELECT creator_id, name INTO v_drink_author_id, v_drink_name
  FROM custom_drinks
  WHERE id = NEW.drink_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_drink_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_drink_author_id,
      'content_like',
      'Someone liked your drink! 🥤',
      v_liker_name || ' liked your drink "' || COALESCE(v_drink_name, 'Untitled') || '"',
      '/games/drink-mixer'
    );
  END IF;
  
  -- Queue email notification (skip self-likes)
  IF v_drink_author_id != NEW.user_id THEN
    PERFORM queue_content_like_email(
      v_drink_author_id,
      NEW.user_id,
      'drink',
      v_drink_name,
      '/games/drink-mixer'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update recipe like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_recipe_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_author_id uuid;
  v_liker_name text;
  v_recipe_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the recipe author
  SELECT creator_id, title INTO v_recipe_author_id, v_recipe_title
  FROM public_recipes
  WHERE id = NEW.recipe_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_recipe_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_recipe_author_id,
      'content_like',
      'Someone liked your recipe! 🍳',
      v_liker_name || ' liked your recipe "' || COALESCE(v_recipe_title, 'Untitled') || '"',
      '/games/recipe-gallery?tab=community'
    );
  END IF;
  
  -- Queue email notification (skip self-likes)
  IF v_recipe_author_id != NEW.user_id THEN
    PERFORM queue_content_like_email(
      v_recipe_author_id,
      NEW.user_id,
      'recipe',
      v_recipe_title,
      '/games/recipe-gallery?tab=community'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update joke like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_joke_like()
RETURNS TRIGGER AS $$
DECLARE
  v_joke_author_id uuid;
  v_liker_name text;
  v_joke_setup text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the joke author from saved_jokes
  SELECT user_id, setup INTO v_joke_author_id, v_joke_setup
  FROM saved_jokes
  WHERE id = NEW.joke_id;
  
  -- Don't notify if liking own content
  IF v_joke_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_joke_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_joke_author_id,
      'content_like',
      'Someone liked your joke! 😂',
      v_liker_name || ' liked your joke',
      '/games/joke-machine'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_joke_author_id,
    NEW.user_id,
    'joke',
    LEFT(v_joke_setup, 50),
    '/games/joke-machine'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update challenge gallery like trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_challenge_gallery_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gallery_author_id uuid;
  v_liker_name text;
  v_gallery_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the gallery item author
  SELECT user_id, title INTO v_gallery_author_id, v_gallery_title
  FROM chore_challenge_gallery
  WHERE id = NEW.gallery_id;
  
  -- Don't notify if liking own content
  IF v_gallery_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_gallery_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_gallery_author_id,
      'content_like',
      'Someone liked your challenge art! ⭐',
      v_liker_name || ' liked your challenge completion',
      '/games/daily-challenge'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_gallery_author_id,
    NEW.user_id,
    'challenge art',
    v_gallery_title,
    '/games/daily-challenge'
  );
  
  RETURN NEW;
END;
$$;
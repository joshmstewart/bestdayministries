-- Fix coloring like triggers: avoid non-existent user_colorings.title and handle NULL likes_count

CREATE OR REPLACE FUNCTION public.notify_on_coloring_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  coloring_owner_id uuid;
  coloring_title text;
  liker_name text;
  pref_record record;
BEGIN
  -- Get the coloring owner and the *page title* (user_colorings has no title column)
  SELECT uc.user_id, cp.title
    INTO coloring_owner_id, coloring_title
  FROM public.user_colorings uc
  LEFT JOIN public.coloring_pages cp ON cp.id = uc.coloring_page_id
  WHERE uc.id = NEW.coloring_id;

  -- If the coloring doesn't exist, do nothing
  IF coloring_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if liking own coloring
  IF coloring_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT display_name
    INTO liker_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Check user preferences
  SELECT *
    INTO pref_record
  FROM public.notification_preferences
  WHERE user_id = coloring_owner_id;

  -- Only create notification if preference allows
  IF pref_record IS NULL
     OR pref_record.inapp_on_content_like IS NULL
     OR pref_record.inapp_on_content_like = true
  THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      coloring_owner_id,
      'content_like',
      'Someone liked your coloring!',
      COALESCE(liker_name, 'Someone') || ' liked your coloring "' || COALESCE(coloring_title, 'Untitled') || '"',
      '/games/coloring-book?tab=gallery',
      jsonb_build_object(
        'liker_id', NEW.user_id,
        'content_id', NEW.coloring_id,
        'content_type', 'coloring'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_coloring_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_colorings
      SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.coloring_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_colorings
      SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = OLD.coloring_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Normalize existing rows so triggers/UI don't get stuck with NULL
UPDATE public.user_colorings
SET likes_count = 0
WHERE likes_count IS NULL;

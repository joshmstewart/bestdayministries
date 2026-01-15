-- Add new notification preference columns for orders and achievements
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_on_order_shipped BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_order_delivered BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_order_shipped BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_order_delivered BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_badge_earned BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_badge_earned BOOLEAN DEFAULT true;

-- Create trigger for card likes (uses content_like preference)
CREATE OR REPLACE FUNCTION public.notify_on_card_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_owner_id UUID;
  liker_name TEXT;
  card_title TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the card owner and title
  SELECT user_id, COALESCE(c.custom_text, 'your card') INTO card_owner_id, card_title
  FROM user_cards c
  WHERE c.id = NEW.card_id;

  -- Don't notify if user liked their own content
  IF card_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = card_owner_id;

  -- Get liker's name
  SELECT COALESCE(full_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      card_owner_id,
      'content_like',
      'New like on your card!',
      liker_name || ' liked ' || card_title,
      '/games/card-creator',
      jsonb_build_object('card_id', NEW.card_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for card likes
DROP TRIGGER IF EXISTS on_card_like ON card_likes;
CREATE TRIGGER on_card_like
  AFTER INSERT ON card_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_card_like();

-- Create trigger for beat pad likes (uses content_like preference)
CREATE OR REPLACE FUNCTION public.notify_on_beat_pad_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_id UUID;
  liker_name TEXT;
  beat_name TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the beat creator and name
  SELECT creator_id, COALESCE(name, 'your beat') INTO creator_id, beat_name
  FROM beat_pad_creations
  WHERE id = NEW.creation_id;

  -- Don't notify if user liked their own content
  IF creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = creator_id;

  -- Get liker's name
  SELECT COALESCE(full_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      creator_id,
      'content_like',
      'New like on your beat!',
      liker_name || ' liked ' || beat_name,
      '/games/beat-pad',
      jsonb_build_object('creation_id', NEW.creation_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for beat pad likes
DROP TRIGGER IF EXISTS on_beat_pad_like ON beat_pad_likes;
CREATE TRIGGER on_beat_pad_like
  AFTER INSERT ON beat_pad_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_beat_pad_like();

-- Create trigger for joke likes (uses content_like preference)
CREATE OR REPLACE FUNCTION public.notify_on_joke_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  joke_owner_id UUID;
  liker_name TEXT;
  joke_preview TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the joke owner
  SELECT creator_id, LEFT(setup, 30) INTO joke_owner_id, joke_preview
  FROM joke_library
  WHERE id = NEW.joke_id;

  -- Don't notify if user liked their own content
  IF joke_owner_id IS NULL OR joke_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = joke_owner_id;

  -- Get liker's name
  SELECT COALESCE(full_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      joke_owner_id,
      'content_like',
      'New like on your joke!',
      liker_name || ' liked your joke: "' || joke_preview || '..."',
      '/games/joke-generator',
      jsonb_build_object('joke_id', NEW.joke_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for joke likes
DROP TRIGGER IF EXISTS on_joke_like ON joke_likes;
CREATE TRIGGER on_joke_like
  AFTER INSERT ON joke_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_joke_like();

-- Create trigger for challenge gallery likes (uses content_like preference)
CREATE OR REPLACE FUNCTION public.notify_on_challenge_gallery_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gallery_owner_id UUID;
  liker_name TEXT;
  gallery_title TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the gallery entry owner
  SELECT user_id, COALESCE(title, 'your creation') INTO gallery_owner_id, gallery_title
  FROM chore_challenge_gallery
  WHERE id = NEW.gallery_id;

  -- Don't notify if user liked their own content
  IF gallery_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = gallery_owner_id;

  -- Get liker's name
  SELECT COALESCE(full_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      gallery_owner_id,
      'content_like',
      'New like on your challenge creation!',
      liker_name || ' liked ' || gallery_title,
      '/games/monthly-challenge',
      jsonb_build_object('gallery_id', NEW.gallery_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for challenge gallery likes
DROP TRIGGER IF EXISTS on_challenge_gallery_like ON chore_challenge_gallery_likes;
CREATE TRIGGER on_challenge_gallery_like
  AFTER INSERT ON chore_challenge_gallery_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_challenge_gallery_like();

-- Create trigger for order status changes (shipped/delivered)
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_user_id UUID;
  product_name TEXT;
  pref_inapp_shipped BOOLEAN;
  pref_inapp_delivered BOOLEAN;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only proceed if fulfillment_status changed
  IF OLD.fulfillment_status = NEW.fulfillment_status THEN
    RETURN NEW;
  END IF;

  -- Get the order's user_id and product name
  SELECT o.user_id, p.name INTO order_user_id, product_name
  FROM orders o
  JOIN products p ON p.id = NEW.product_id
  WHERE o.id = NEW.order_id;

  IF order_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check preferences based on new status
  IF NEW.fulfillment_status = 'shipped' THEN
    SELECT COALESCE(inapp_on_order_shipped, true) INTO pref_inapp_shipped
    FROM notification_preferences WHERE user_id = order_user_id;
    
    IF pref_inapp_shipped THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        order_user_id,
        'order_shipped',
        'Your order has shipped! 📦',
        product_name || ' is on its way',
        '/orders',
        jsonb_build_object('order_id', NEW.order_id, 'order_item_id', NEW.id, 'tracking_number', NEW.tracking_number)
      );
    END IF;
  ELSIF NEW.fulfillment_status = 'delivered' THEN
    SELECT COALESCE(inapp_on_order_delivered, true) INTO pref_inapp_delivered
    FROM notification_preferences WHERE user_id = order_user_id;
    
    IF pref_inapp_delivered THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        order_user_id,
        'order_delivered',
        'Your order was delivered! 🎉',
        product_name || ' has arrived',
        '/orders',
        jsonb_build_object('order_id', NEW.order_id, 'order_item_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS on_order_status_change ON order_items;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_order_status_change();

-- Create trigger for badge earned notifications
CREATE OR REPLACE FUNCTION public.notify_on_badge_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref_inapp BOOLEAN;
BEGIN
  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_badge_earned, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.user_id,
      'badge_earned',
      'Achievement Unlocked! 🏆',
      'You earned the ' || NEW.badge_name || ' badge!',
      '/profile',
      jsonb_build_object('badge_id', NEW.id, 'badge_type', NEW.badge_type, 'badge_icon', NEW.badge_icon)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for chore badges
DROP TRIGGER IF EXISTS on_chore_badge_earned ON chore_badges;
CREATE TRIGGER on_chore_badge_earned
  AFTER INSERT ON chore_badges
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_badge_earned();
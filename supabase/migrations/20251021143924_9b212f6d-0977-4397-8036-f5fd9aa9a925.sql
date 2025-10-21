-- Create function to link guest newsletter subscriptions to new user accounts
CREATE OR REPLACE FUNCTION public.link_guest_newsletter_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Update any newsletter subscriptions with matching email and no user_id
  UPDATE public.newsletter_subscribers
  SET user_id = NEW.id
  WHERE email = user_email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to link newsletter subscriptions on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_link_newsletter ON auth.users;
CREATE TRIGGER on_auth_user_created_link_newsletter
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_newsletter_subscriptions();
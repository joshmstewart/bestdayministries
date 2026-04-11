ALTER TABLE public.sponsorships
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
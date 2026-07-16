-- Mark newsletter subscribers with malformed emails as unsubscribed so they stop failing every campaign.
UPDATE public.newsletter_subscribers
SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, now())
WHERE email IN ('(303) 994-7413', 'eickma.cassan15@svvvsd')
  AND status = 'active';
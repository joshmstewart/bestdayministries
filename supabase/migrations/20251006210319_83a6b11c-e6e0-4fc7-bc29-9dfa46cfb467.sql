-- Backfill user_id for existing receipts
-- Match receipts to users based on sponsor_email
UPDATE public.sponsorship_receipts r
SET user_id = p.id
FROM public.profiles p
WHERE r.user_id IS NULL
  AND r.sponsor_email = p.email;
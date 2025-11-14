-- Step 1: Delete duplicate donations that match existing sponsorships
-- These are donations that were incorrectly created by the recovery tool
DELETE FROM donations d
WHERE d.created_at > '2025-01-01'
AND d.stripe_payment_intent_id IS NULL
AND EXISTS (
  SELECT 1 FROM sponsorships s
  WHERE (s.sponsor_email = d.donor_email OR (s.sponsor_id = d.donor_id AND d.donor_id IS NOT NULL))
  AND s.amount = d.amount
  AND s.stripe_mode = d.stripe_mode
  AND ABS(EXTRACT(EPOCH FROM (s.started_at - d.created_at))) < 3600
);

-- Step 2: Add a check to prevent future duplicates
-- Create a function to check if a charge is already recorded as a sponsorship
CREATE OR REPLACE FUNCTION prevent_duplicate_donation_sponsorship()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this donation matches an existing sponsorship
  IF EXISTS (
    SELECT 1 FROM sponsorships s
    WHERE (
      (s.sponsor_email = NEW.donor_email AND NEW.donor_email IS NOT NULL) 
      OR (s.sponsor_id = NEW.donor_id AND NEW.donor_id IS NOT NULL)
    )
    AND s.stripe_customer_id = NEW.stripe_customer_id
    AND s.stripe_mode = NEW.stripe_mode
    AND s.amount = NEW.amount
    AND ABS(EXTRACT(EPOCH FROM (s.started_at - NEW.created_at))) < 86400
  ) THEN
    RAISE EXCEPTION 'This charge is already recorded as a sponsorship (customer: %, amount: %, mode: %)', 
      NEW.stripe_customer_id, NEW.amount, NEW.stripe_mode
      USING HINT = 'This appears to be a sponsorship, not a general fund donation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run the validation before inserting donations
DROP TRIGGER IF EXISTS validate_donation_not_sponsorship ON donations;
CREATE TRIGGER validate_donation_not_sponsorship
  BEFORE INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_donation_sponsorship();
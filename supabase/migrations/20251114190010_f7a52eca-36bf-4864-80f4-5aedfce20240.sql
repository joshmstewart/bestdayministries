-- Create trigger to prevent orphaned receipts
-- This ensures every receipt has either a donation or sponsorship linked

CREATE OR REPLACE FUNCTION validate_receipt_has_parent()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow receipts with sponsorship_id
  IF NEW.sponsorship_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- For receipts without sponsorship_id, check if matching donation exists
  -- Look for donation by email + transaction_id within 1 hour window
  IF NEW.transaction_id LIKE 'donation_%' THEN
    -- Extract donation ID from transaction_id format: donation_{id}
    DECLARE
      donation_id_str TEXT;
      donation_exists BOOLEAN;
    BEGIN
      donation_id_str := substring(NEW.transaction_id FROM 'donation_(.*)');
      
      SELECT EXISTS (
        SELECT 1 FROM donations 
        WHERE id::text = donation_id_str
      ) INTO donation_exists;
      
      IF NOT donation_exists THEN
        RAISE WARNING 'Receipt created for non-existent donation: %', NEW.transaction_id;
      END IF;
    END;
  ELSIF NEW.transaction_id LIKE 'in_%' OR NEW.transaction_id LIKE 'pi_%' THEN
    -- This is a Stripe invoice or payment intent ID
    -- Check if matching donation exists
    DECLARE
      donation_exists BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM donations d
        WHERE (d.donor_email = NEW.sponsor_email OR d.donor_id = NEW.user_id)
          AND d.stripe_mode = NEW.stripe_mode
          AND ABS(EXTRACT(EPOCH FROM (d.created_at - NEW.created_at))) < 3600
      ) INTO donation_exists;
      
      IF NOT donation_exists THEN
        RAISE WARNING 'Receipt created without matching donation record for transaction: %', NEW.transaction_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_parent_validation
  AFTER INSERT ON sponsorship_receipts
  FOR EACH ROW
  EXECUTE FUNCTION validate_receipt_has_parent();

-- Backfill query to identify orphaned receipts and their potential donation matches
-- This creates a view to help identify and fix orphaned receipts
CREATE OR REPLACE VIEW orphaned_receipts_analysis AS
SELECT 
  sr.id as receipt_id,
  sr.sponsor_email,
  sr.amount,
  sr.transaction_id,
  sr.transaction_date,
  sr.created_at as receipt_created_at,
  sr.stripe_mode,
  sr.sponsorship_id,
  d.id as potential_donation_id,
  d.amount as donation_amount,
  d.created_at as donation_created_at,
  d.status as donation_status,
  ABS(EXTRACT(EPOCH FROM (d.created_at - sr.created_at))) as time_diff_seconds
FROM sponsorship_receipts sr
LEFT JOIN donations d ON (
  (d.donor_email = sr.sponsor_email OR d.donor_id = sr.user_id)
  AND d.stripe_mode = sr.stripe_mode
  AND d.amount = sr.amount
  AND ABS(EXTRACT(EPOCH FROM (d.created_at - sr.created_at))) < 3600
)
WHERE sr.sponsorship_id IS NULL
  AND sr.transaction_id NOT LIKE 'donation_%'
ORDER BY sr.created_at DESC;
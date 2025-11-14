-- Function to backfill missing donation records from orphaned receipts
-- This creates donation records for receipts that have Stripe transaction IDs but no donation
CREATE OR REPLACE FUNCTION backfill_missing_donations()
RETURNS TABLE(
  receipt_id uuid,
  created_donation_id uuid,
  sponsor_email text,
  amount numeric,
  status text
) AS $$
DECLARE
  orphaned_receipt RECORD;
  new_donation_id uuid;
BEGIN
  -- Find all orphaned receipts with Stripe transaction IDs
  FOR orphaned_receipt IN
    SELECT 
      sr.id,
      sr.sponsor_email,
      sr.user_id,
      sr.amount,
      sr.transaction_id,
      sr.transaction_date,
      sr.stripe_mode,
      sr.frequency
    FROM sponsorship_receipts sr
    WHERE sr.sponsorship_id IS NULL
      AND (sr.transaction_id LIKE 'in_%' OR sr.transaction_id LIKE 'pi_%')
      AND NOT EXISTS (
        SELECT 1 FROM donations d
        WHERE (d.donor_email = sr.sponsor_email OR d.donor_id = sr.user_id)
          AND d.amount = sr.amount
          AND d.stripe_mode = sr.stripe_mode
          AND ABS(EXTRACT(EPOCH FROM (d.created_at - sr.created_at))) < 86400
      )
    ORDER BY sr.created_at
  LOOP
    BEGIN
      -- Create the missing donation record
      INSERT INTO donations (
        donor_email,
        donor_id,
        amount,
        amount_charged,
        frequency,
        status,
        stripe_mode,
        stripe_payment_intent_id,
        created_at,
        started_at
      ) VALUES (
        orphaned_receipt.sponsor_email,
        orphaned_receipt.user_id,
        orphaned_receipt.amount,
        orphaned_receipt.amount,
        COALESCE(orphaned_receipt.frequency, 'one-time'),
        CASE 
          WHEN orphaned_receipt.frequency = 'monthly' THEN 'active'
          ELSE 'completed'
        END,
        orphaned_receipt.stripe_mode,
        CASE 
          WHEN orphaned_receipt.transaction_id LIKE 'pi_%' THEN orphaned_receipt.transaction_id
          ELSE NULL
        END,
        orphaned_receipt.transaction_date,
        orphaned_receipt.transaction_date
      )
      RETURNING id INTO new_donation_id;
      
      -- Return the result
      receipt_id := orphaned_receipt.id;
      created_donation_id := new_donation_id;
      sponsor_email := orphaned_receipt.sponsor_email;
      amount := orphaned_receipt.amount;
      status := 'created';
      
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- If creation fails, return error status
      receipt_id := orphaned_receipt.id;
      created_donation_id := NULL;
      sponsor_email := orphaned_receipt.sponsor_email;
      amount := orphaned_receipt.amount;
      status := 'error: ' || SQLERRM;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
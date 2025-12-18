-- Fix functions missing search_path setting

-- Fix update_campaign_template_updated_at
CREATE OR REPLACE FUNCTION public.update_campaign_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix validate_receipt_has_parent
CREATE OR REPLACE FUNCTION public.validate_receipt_has_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;
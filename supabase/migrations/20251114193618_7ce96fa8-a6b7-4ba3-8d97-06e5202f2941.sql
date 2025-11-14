-- Fix generate_missing_receipts function - remove non-existent status column
CREATE OR REPLACE FUNCTION public.generate_missing_receipts()
 RETURNS TABLE(donation_id uuid, created_receipt_id uuid, donor_email text, amount numeric, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  donation_record RECORD;
  new_receipt_id uuid;
  org_name text;
  org_ein text;
BEGIN
  -- Get organization info for receipts
  SELECT organization_name, organization_ein 
  INTO org_name, org_ein
  FROM receipt_settings
  WHERE id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1;
  
  -- Default values if not set
  org_name := COALESCE(org_name, 'Best Day Ministries');
  org_ein := COALESCE(org_ein, '00-0000000');
  
  -- Find all donations without receipts
  FOR donation_record IN
    SELECT 
      d.id,
      d.donor_email,
      d.donor_id,
      d.amount,
      d.amount_charged,
      d.frequency,
      d.stripe_mode,
      d.stripe_payment_intent_id,
      d.stripe_subscription_id,
      d.created_at,
      d.status
    FROM donations d
    WHERE NOT EXISTS (
      SELECT 1 FROM sponsorship_receipts sr
      WHERE sr.transaction_id = 'donation_' || d.id::text
         OR (sr.sponsor_email = d.donor_email 
             AND sr.amount = d.amount 
             AND sr.stripe_mode = d.stripe_mode
             AND ABS(EXTRACT(EPOCH FROM (sr.created_at - d.created_at))) < 86400)
    )
    AND d.status IN ('completed', 'active')
    AND d.donor_email IS NOT NULL
    ORDER BY d.created_at
  LOOP
    BEGIN
      -- Create the missing receipt record (without status column)
      INSERT INTO sponsorship_receipts (
        sponsor_email,
        sponsor_name,
        user_id,
        bestie_name,
        amount,
        frequency,
        transaction_id,
        transaction_date,
        stripe_mode,
        organization_name,
        organization_ein,
        receipt_number,
        tax_year
      ) VALUES (
        donation_record.donor_email,
        split_part(donation_record.donor_email, '@', 1),
        donation_record.donor_id,
        'General Support',
        COALESCE(donation_record.amount_charged, donation_record.amount),
        donation_record.frequency,
        'donation_' || donation_record.id::text,
        donation_record.created_at,
        donation_record.stripe_mode,
        org_name,
        org_ein,
        'RCP-BACKFILL-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(donation_record.id::text, 1, 8),
        EXTRACT(YEAR FROM donation_record.created_at)::integer
      )
      RETURNING id INTO new_receipt_id;
      
      -- Return the result
      donation_id := donation_record.id;
      created_receipt_id := new_receipt_id;
      donor_email := donation_record.donor_email;
      amount := donation_record.amount;
      status := 'created';
      
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- If creation fails, return error status
      donation_id := donation_record.id;
      created_receipt_id := NULL;
      donor_email := donation_record.donor_email;
      amount := donation_record.amount;
      status := 'error: ' || SQLERRM;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$function$;
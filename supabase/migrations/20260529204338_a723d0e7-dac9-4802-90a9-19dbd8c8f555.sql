CREATE OR REPLACE FUNCTION public.validate_order_shipping_address()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip validation for pending orders: shipping address is collected
  -- by Stripe Checkout and saved later in verify-marketplace-payment.
  IF NEW.status = 'pending' AND NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.shipping_address IS NULL THEN
    RAISE EXCEPTION 'shipping_address is required on orders'
      USING ERRCODE = 'check_violation';
  END IF;

  IF jsonb_typeof(NEW.shipping_address) <> 'object' THEN
    RAISE EXCEPTION 'shipping_address must be a JSON object'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(NULLIF(TRIM(NEW.shipping_address->>'line1'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'shipping_address.line1 is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(NULLIF(TRIM(NEW.shipping_address->>'city'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'shipping_address.city is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(NULLIF(TRIM(NEW.shipping_address->>'postal_code'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'shipping_address.postal_code is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF COALESCE(NULLIF(TRIM(NEW.shipping_address->>'country'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'shipping_address.country is required'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
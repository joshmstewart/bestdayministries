CREATE OR REPLACE FUNCTION public.enforce_vendor_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _privileged boolean := (_uid IS NULL) OR public.has_admin_access(_uid);
BEGIN
  IF _privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending'::vendor_status;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.commission_percentage := 10.00;
    NEW.stripe_account_id := NULL;
    NEW.stripe_connect_id := NULL;
    NEW.stripe_onboarding_complete := false;
    NEW.stripe_charges_enabled := false;
    NEW.stripe_payouts_enabled := false;
    RETURN NEW;
  END IF;

  -- UPDATE: pin every privileged column to its prior value
  NEW.status := OLD.status;
  NEW.approved_by := OLD.approved_by;
  NEW.approved_at := OLD.approved_at;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.commission_percentage := OLD.commission_percentage;
  NEW.stripe_account_id := OLD.stripe_account_id;
  NEW.stripe_connect_id := OLD.stripe_connect_id;
  NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
  NEW.stripe_charges_enabled := OLD.stripe_charges_enabled;
  NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_vendor_privileged_fields_trg ON public.vendors;
CREATE TRIGGER enforce_vendor_privileged_fields_trg
BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_privileged_fields();
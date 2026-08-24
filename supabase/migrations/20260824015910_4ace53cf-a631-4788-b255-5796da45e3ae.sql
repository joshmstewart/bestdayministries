CREATE OR REPLACE FUNCTION public.enforce_vendor_asset_approval_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  privileged boolean;
  needs_approval boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  privileged := has_admin_access(auth.uid()) OR is_guardian_of(auth.uid(), NEW.bestie_id);

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.approval_status := OLD.approval_status;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links l
    WHERE l.bestie_id = NEW.bestie_id
      AND l.require_vendor_asset_approval
  ) INTO needs_approval;

  IF needs_approval THEN
    NEW.approval_status := 'pending_approval';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_vendor_asset_approval_integrity() FROM anon, authenticated;

DROP TRIGGER IF EXISTS enforce_vendor_asset_approval_integrity ON public.vendor_bestie_assets;
CREATE TRIGGER enforce_vendor_asset_approval_integrity
BEFORE INSERT OR UPDATE ON public.vendor_bestie_assets
FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_asset_approval_integrity();
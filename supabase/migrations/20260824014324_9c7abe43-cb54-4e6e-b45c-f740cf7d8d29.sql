CREATE OR REPLACE FUNCTION public.enforce_comment_approval_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  privileged boolean;
  needs_approval boolean;
begin
  privileged := has_admin_access(auth.uid()) or is_guardian_of(auth.uid(), new.author_id);

  if privileged or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.approval_status := old.approval_status;
    return new;
  end if;

  -- INSERT: if the author's guardian requires comment approval, pin to pending
  select exists (
    select 1 from public.caregiver_bestie_links l
    where l.bestie_id = new.author_id
      and l.require_comment_approval
  ) into needs_approval;

  if needs_approval then
    new.approval_status := 'pending_approval';
  end if;

  return new;
end;
$function$;
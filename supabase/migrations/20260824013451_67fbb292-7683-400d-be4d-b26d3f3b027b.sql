-- Prevent authors from self-approving their own posts/comments.
-- RLS UPDATE policies had no WITH CHECK, so an author could PATCH
-- approval_status='approved' and bypass guardian approval + AI moderation.

create or replace function public.enforce_post_approval_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean;
begin
  privileged := has_admin_access(auth.uid()) or is_guardian_of(auth.uid(), new.author_id);

  if privileged or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approval_status := 'pending_approval';
    new.is_moderated := coalesce(new.is_moderated, false);
    return new;
  end if;

  -- authors may edit content, never the approval/moderation verdict
  new.approval_status := old.approval_status;
  new.is_moderated := old.is_moderated;
  new.moderation_status := old.moderation_status;
  new.moderation_notes := old.moderation_notes;
  return new;
end;
$$;

create or replace function public.enforce_comment_approval_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean;
begin
  privileged := has_admin_access(auth.uid()) or is_guardian_of(auth.uid(), new.author_id);

  if privileged or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.approval_status := old.approval_status;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_post_approval_integrity on public.discussion_posts;
create trigger enforce_post_approval_integrity
  before insert or update on public.discussion_posts
  for each row execute function public.enforce_post_approval_integrity();

drop trigger if exists enforce_comment_approval_integrity on public.discussion_comments;
create trigger enforce_comment_approval_integrity
  before insert or update on public.discussion_comments
  for each row execute function public.enforce_comment_approval_integrity();
-- Golf Camp 2026 Live Draft MVP metadata.
-- Run in the Supabase SQL editor after the base draft schema.

alter table public.draft_sessions
add column if not exists captain_rank text,
add column if not exists draft_type text not null default 'snake',
add column if not exists current_pick_number integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'draft_sessions_captain_rank_check'
  ) then
    alter table public.draft_sessions
    add constraint draft_sessions_captain_rank_check
    check (captain_rank is null or captain_rank in ('A', 'B', 'C', 'D'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'draft_sessions_draft_type_check'
  ) then
    alter table public.draft_sessions
    add constraint draft_sessions_draft_type_check
    check (draft_type in ('snake', 'auction'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'draft_sessions_status_check'
  ) then
    alter table public.draft_sessions
    add constraint draft_sessions_status_check
    check (status in ('pending', 'active', 'complete'));
  end if;
end $$;

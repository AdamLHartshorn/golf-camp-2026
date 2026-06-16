-- Golf Camp 2026 App Feedback.
-- Run in Supabase SQL Editor before using the App Feedback form.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_by_player_id uuid null references public.players(id) on delete set null,
  created_by_name text null,
  status text not null default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_feedback_message_length_check'
  ) then
    alter table public.app_feedback
    add constraint app_feedback_message_length_check
    check (char_length(trim(message)) between 1 and 1000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_feedback_status_check'
  ) then
    alter table public.app_feedback
    add constraint app_feedback_status_check
    check (status in ('new', 'reviewed', 'archived'));
  end if;
end $$;

create index if not exists app_feedback_created_at_idx
on public.app_feedback (created_at desc);

create index if not exists app_feedback_status_idx
on public.app_feedback (status, created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "Public app_feedback select" on public.app_feedback;
create policy "Public app_feedback select"
on public.app_feedback for select
using (true);

drop policy if exists "Public app_feedback insert" on public.app_feedback;
create policy "Public app_feedback insert"
on public.app_feedback for insert
with check (true);

drop policy if exists "Public app_feedback update" on public.app_feedback;
create policy "Public app_feedback update"
on public.app_feedback for update
using (true)
with check (true);

drop policy if exists "Public app_feedback delete" on public.app_feedback;
create policy "Public app_feedback delete"
on public.app_feedback for delete
using (true);

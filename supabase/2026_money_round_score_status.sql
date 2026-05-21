-- Golf Camp 2026 Money Rounds team scorecard verification status.
-- Run in the Supabase SQL editor before using unofficial/verified score labels.

alter table public.money_round_teams
add column if not exists score_status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'money_round_teams_score_status_check'
  ) then
    alter table public.money_round_teams
    add constraint money_round_teams_score_status_check
    check (score_status in ('pending', 'submitted', 'verified'));
  end if;
end $$;

create index if not exists money_round_teams_score_status_idx
on public.money_round_teams (money_round_id, score_status);

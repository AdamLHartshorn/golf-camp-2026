-- Golf Camp 2026 Money Rounds MVP metadata.
-- Run in the Supabase SQL editor after the base Money Rounds schema.

alter table public.money_rounds
add column if not exists buy_in_per_player numeric not null default 50,
add column if not exists main_pot_per_player numeric not null default 40,
add column if not exists skins_pot_per_player numeric not null default 10,
add column if not exists first_place_payout numeric not null default 0,
add column if not exists second_place_payout numeric not null default 0,
add column if not exists third_place_payout numeric not null default 0,
add column if not exists skins_pot numeric not null default 0;

alter table public.money_round_teams
add column if not exists player_ids uuid[] not null default '{}',
add column if not exists score_status text not null default 'pending';

alter table public.money_round_scores
add column if not exists hole_number integer;

create unique index if not exists money_round_scores_team_hole_unique
on public.money_round_scores (money_round_team_id, hole_number)
where hole_number is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'money_round_scores_hole_number_check'
  ) then
    alter table public.money_round_scores
    add constraint money_round_scores_hole_number_check
    check (hole_number is null or hole_number between 1 and 18);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'money_rounds_status_check'
  ) then
    alter table public.money_rounds
    add constraint money_rounds_status_check
    check (status in ('pending', 'active', 'scored', 'final'));
  end if;

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

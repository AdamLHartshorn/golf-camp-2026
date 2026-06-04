alter table public.players
add column if not exists scouting_2025_draft_value_grade text,
add column if not exists scouting_2025_draft_value_index text,
add column if not exists scouting_2025_avg_draft_position numeric,
add column if not exists scouting_2025_total_earnings numeric,
add column if not exists scouting_2025_best_finish text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_scouting_2025_draft_value_grade_check'
  ) then
    alter table public.players
    add constraint players_scouting_2025_draft_value_grade_check
    check (
      scouting_2025_draft_value_grade is null
      or scouting_2025_draft_value_grade in (
        'A+',
        'A',
        'A-',
        'B+',
        'B',
        'B-',
        'C+',
        'C',
        'C-',
        'D+',
        'D',
        'D-',
        'F'
      )
    );
  end if;
end $$;

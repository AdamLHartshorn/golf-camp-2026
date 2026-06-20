-- Night Golf scorecard attempts.
-- Allows multiple scorecard submissions by the same player on the same night
-- to appear as separate leaderboard scores instead of one cumulative total.

alter table if exists public.night_golf_scores
  add column if not exists attempt_id uuid;

create index if not exists night_golf_scores_attempt_id_idx
  on public.night_golf_scores(attempt_id);

create index if not exists night_golf_scores_night_attempt_id_idx
  on public.night_golf_scores(night, attempt_id);

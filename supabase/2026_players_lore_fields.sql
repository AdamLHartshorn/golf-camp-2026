-- Golf Camp 2026 player questionnaire/lore fields.
-- Run in the Supabase SQL editor before saving player lore in Admin.

alter table public.players
add column if not exists questionnaire_answers jsonb,
add column if not exists player_notes text;

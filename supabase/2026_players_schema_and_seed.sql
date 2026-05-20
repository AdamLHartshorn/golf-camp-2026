-- Golf Camp 2026 players table updates and workbook import.
-- Run this in the Supabase SQL editor for the project.

alter table public.players
add column if not exists internal_rank_order text,
add column if not exists player_key text,
add column if not exists deposit_paid boolean default false,
add column if not exists gambling_paid boolean default false;

update public.players
set player_key = regexp_replace(lower(display_name), '[^a-z0-9]+', '', 'g')
where player_key is null;

create unique index if not exists players_player_key_unique
on public.players (player_key);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_internal_rank_order_check'
  ) then
    alter table public.players
    add constraint players_internal_rank_order_check
    check (
      internal_rank_order is null
      or internal_rank_order ~ '^[ABCD][0-9]+$'
    );
  end if;
end $$;

insert into public.players
  (
    player_key,
    first_name,
    last_name,
    display_name,
    rank,
    internal_rank_order,
    room,
    arrival,
    deposit_paid,
    gambling_paid,
    active
  )
values
  ('adamhartshorn', 'Adam', 'Hartshorn', 'Adam Hartshorn', 'A', 'A1', 'Room 9', 'Tuesday PM GOLF', true, false, true),
  ('tylerhofmann', 'Tyler', 'Hofmann', 'Tyler Hofmann', 'A', 'A2', 'Room 9', 'Tuesday PM GOLF', true, true, true),
  ('austinhartshorn', 'Austin', 'Hartshorn', 'Austin Hartshorn', 'A', 'A3', 'Room 9', 'Tuesday PM GOLF', true, false, true),
  ('jacobkoch', 'Jacob', 'Koch', 'Jacob Koch', 'A', 'A4', 'Room 3', 'Tuesday PM GOLF', true, false, true),
  ('jessepraeuner', 'Jesse', 'Praeuner', 'Jesse Praeuner', 'A', 'A5', 'Room 7', 'Tuesday PM GOLF', true, false, true),
  ('kevinschofield', 'Kevin', 'Schofield', 'Kevin Schofield', 'A', 'A6', 'Room 5', 'Tuesday PM NO GOLF', true, false, true),
  ('jimsmith', 'Jim', 'Smith', 'Jim Smith', 'A', 'A7', 'Room 10', 'Wednesday AM', true, true, true),
  ('toddanderson', 'Todd', 'Anderson', 'Todd Anderson', 'A', 'A8', 'No Room', 'Wednesday PM', true, false, true),
  ('chriskerns', 'Chris', 'Kerns', 'Chris Kerns', 'A', 'A9', 'Room 8', 'Tuesday PM NO GOLF', true, false, true),
  ('tylerschrohe', 'Tyler', 'Schrohe', 'Tyler Schrohe', 'A', 'A10', 'Room 5', 'Monday PM', true, true, true),
  ('jonnickel', 'Jon', 'Nickel', 'Jon Nickel', 'B', 'B1', 'Room 2', 'Tuesday PM NO GOLF', true, false, true),
  ('jaredknight', 'Jared', 'Knight', 'Jared Knight', 'B', 'B2', 'Room 4', 'Monday PM', true, true, true),
  ('justinmoody', 'Justin', 'Moody', 'Justin Moody', 'B', 'B3', 'Room 7', 'Tuesday PM GOLF', true, true, true),
  ('nickjoyce', 'Nick', 'Joyce', 'Nick Joyce', 'B', 'B4', 'Room 1', 'Tuesday PM NO GOLF', true, true, true),
  ('davepraeuner', 'Dave', 'Praeuner', 'Dave Praeuner', 'B', 'B5', 'Room 7', 'Tuesday PM GOLF', true, true, true),
  ('douganewalt', 'Doug', 'Anewalt', 'Doug Anewalt', 'B', 'B6', 'Room 3', 'Wednesday AM', true, true, true),
  ('andrewdimino', 'Andrew', 'Dimino', 'Andrew Dimino', 'B', 'B7', 'Room 8', 'Tuesday PM GOLF', true, false, true),
  ('cameroncarter', 'Cameron', 'Carter', 'Cameron Carter', 'B', 'B8', 'Room 5', 'Wednesday AM', true, false, true),
  ('joefulk', 'Joe', 'Fulk', 'Joe Fulk', 'B', 'B9', 'Room 2', 'Tuesday PM NO GOLF', true, true, true),
  ('claytonhooks', 'Clayton', 'Hooks', 'Clayton Hooks', 'B', 'B10', 'Room 5', 'Tuesday PM GOLF', true, false, true),
  ('dustinhudson', 'Dustin', 'Hudson', 'Dustin Hudson', 'C', 'C1', 'Room 4', 'Tuesday PM GOLF', true, true, true),
  ('jamespeel', 'James', 'Peel', 'James Peel', 'C', 'C2', 'Room 10', 'Monday PM', true, true, true),
  ('claytonallen', 'Clayton', 'Allen', 'Clayton Allen', 'C', 'C3', 'Room 7', 'Tuesday PM NO GOLF', true, true, true),
  ('mikecase', 'Mike', 'Case', 'Mike Case', 'C', 'C4', 'Room 6', 'Wednesday PM', true, false, true),
  ('jamiemiles', 'Jamie', 'Miles', 'Jamie Miles', 'C', 'C5', 'Room 6', 'Wednesday PM', true, false, true),
  ('krisyoder', 'Kris', 'Yoder', 'Kris Yoder', 'C', 'C6', 'Room 1', 'Wednesday PM', true, false, true),
  ('shawnbennett', 'Shawn', 'Bennett', 'Shawn Bennett', 'C', 'C7', 'Room 6', 'Tuesday PM GOLF', true, true, true),
  ('shawnice', 'Shawn', 'Ice', 'Shawn Ice', 'C', 'C8', 'Room 4', 'Tuesday PM GOLF', true, true, true),
  ('andrewperetin', 'Andrew', 'Peretin', 'Andrew Peretin', 'C', 'C9', 'Room 9', 'Tuesday PM GOLF', true, false, true),
  ('roblaplante', 'Rob', 'LaPlante', 'Rob LaPlante', 'C', 'C10', 'Room 10', 'Tuesday PM GOLF', true, true, true),
  ('scottfelix', 'Scott', 'Felix', 'Scott Felix', 'C', 'C11', 'Room 3', 'Tuesday PM GOLF', true, true, true),
  ('shaneloeffler', 'Shane', 'Loeffler', 'Shane Loeffler', 'D', 'D1', 'Room 6', 'Monday PM', true, true, true),
  ('adamhedrick', 'Adam', 'Hedrick', 'Adam Hedrick', 'D', 'D2', 'Room 2', 'Tuesday PM NO GOLF', true, false, true),
  ('nickblacklock', 'Nick', 'Blacklock', 'Nick Blacklock', 'D', 'D3', 'Room 1', 'Monday PM', true, true, true),
  ('alexaust', 'Alex', 'Aust', 'Alex Aust', 'D', 'D4', 'Room 3', 'Monday PM', true, false, true),
  ('maxutter', 'Max', 'Utter', 'Max Utter', 'D', 'D5', 'Room 10', 'Wednesday AM', true, true, true),
  ('lukemerriman', 'Luke', 'Merriman', 'Luke Merriman', 'D', 'D6', 'Room 2', 'Tuesday PM NO GOLF', true, false, true),
  ('nathanbunch', 'Nathan', 'Bunch', 'Nathan Bunch', 'D', 'D7', 'Room 1', 'Wednesday PM', true, false, true),
  ('samkemp', 'Sam', 'Kemp', 'Sam Kemp', 'D', 'D8', 'Room 8', 'Tuesday PM GOLF', true, true, true),
  ('mattgalley', 'Matt', 'Galley', 'Matt Galley', 'D', 'D9', 'Room 8', null, true, false, true),
  ('chrisromero', 'Chris', 'Romero', 'Chris Romero', 'D', 'D10', 'Room 4', 'Monday PM', true, false, true)
on conflict (player_key)
do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  display_name = excluded.display_name,
  rank = excluded.rank,
  internal_rank_order = excluded.internal_rank_order,
  room = excluded.room,
  arrival = excluded.arrival,
  deposit_paid = excluded.deposit_paid,
  gambling_paid = excluded.gambling_paid,
  active = excluded.active,
  updated_at = now();

-- Existing nickname, phone, email, and photo_url values are intentionally
-- preserved by the upsert above.

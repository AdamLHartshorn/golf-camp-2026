-- 2025 DRAFT PREP PERFORMANCE IMPORT
-- Source file: 2025_Draft_Prep_Stats.docx
-- Updates only temporary 2025 scouting/performance fields.

with stats_import (
  player_id,
  avg_draft_position,
  total_earnings,
  best_finish,
  draft_value_index
) as (
  values
    ('b90ab409-55eb-4e60-9211-94779bca4bdf'::uuid, 2.33::numeric, 580::numeric, '1st'::text, '8.0'::text),
    ('4be25818-baea-4bb3-8c23-c044613210b4'::uuid, 21::numeric, 410::numeric, '1st'::text, '10.0'::text),
    ('3330bb56-7684-417c-a1db-c04e31873190'::uuid, 12.33::numeric, 330::numeric, '1st'::text, '10.0'::text),
    ('7bd985d3-58f8-4c28-a98c-2a2302e3f7f8'::uuid, 16::numeric, 10::numeric, '4th'::text, '4.0'::text),
    ('8beb9ad9-5732-4eec-a510-770516447edf'::uuid, 11.33::numeric, 232.5::numeric, '2nd'::text, '7.5'::text),
    ('7bf3abe5-e8bd-4025-b7ee-f80cc1d9247e'::uuid, 4::numeric, 130::numeric, '3rd'::text, '3.0'::text),
    ('18d08c6e-0814-4e7e-951c-bfced74bc41a'::uuid, 23::numeric, 87.5::numeric, '3rd'::text, '8.9'::text),
    ('db95acc3-9d12-4c46-80af-b37600a97cee'::uuid, 15::numeric, 272.5::numeric, '2nd'::text, '9.8'::text),
    ('57f193fd-ee0e-45ae-9e85-bc3d41dc6b8d'::uuid, 16.33::numeric, 25::numeric, '4th'::text, '5.5'::text),
    ('c3af1374-1e5a-4873-9893-da23b89cf778'::uuid, 9::numeric, 42.5::numeric, '4th'::text, '2.8'::text),
    ('138a3a55-25db-4f2c-aa5d-c85b2473246b'::uuid, 10::numeric, 20::numeric, '5th'::text, '2.2'::text),
    ('c2dc47db-1eea-4879-851d-3381e8071602'::uuid, 2.67::numeric, 15::numeric, '4th'::text, '1.0'::text),
    ('cad9b23b-0789-415c-8108-3dd38d5a2cba'::uuid, 14.67::numeric, 195::numeric, '2nd'::text, '8.0'::text),
    ('20aee9a1-bf1c-45d1-b9c3-abe2527c4c56'::uuid, 7.67::numeric, 395::numeric, '1st'::text, '8.5'::text),
    ('f1c98c4a-1dcd-4894-9a65-2fe5326c2e1d'::uuid, 2::numeric, 140::numeric, '2nd'::text, '3.2'::text),
    ('db73e8de-b277-4fc8-a756-5dd79ef05c3c'::uuid, 11::numeric, 402.5::numeric, '1st'::text, '10.0'::text),
    ('8368858c-fa47-4133-9898-cdcaa3e1c105'::uuid, 6.67::numeric, 30::numeric, '5th'::text, '1.2'::text),
    ('36b61f55-6370-47c7-a63c-58cd83d4ea18'::uuid, 12::numeric, 342.5::numeric, '1st'::text, '10.0'::text),
    ('f8e93c40-d7b4-45a7-8bf6-c9f3d067a645'::uuid, 8.67::numeric, 115::numeric, '2nd'::text, '4.5'::text),
    ('b5b40e69-0854-43a8-bb3b-98e649cbe9e2'::uuid, 21.67::numeric, 140::numeric, '2nd'::text, '10.0'::text),
    ('10264119-d522-415b-b9e8-3d7ad86ecb65'::uuid, 23::numeric, 15::numeric, '8th'::text, '6.8'::text),
    ('339255a2-beb8-4546-b08f-9d925ff51062'::uuid, 25::numeric, 250::numeric, '1st'::text, '10.0'::text),
    ('ee8a07a0-d752-4cf0-b8da-b63a2db335a1'::uuid, 11.67::numeric, 75::numeric, '5th'::text, '4.5'::text),
    ('2b1abe16-4329-422a-aa2e-36eadc987579'::uuid, 12.33::numeric, 260::numeric, '1st'::text, '9.2'::text),
    ('01bc1e15-0a96-4e3d-aca7-945630ed7730'::uuid, 23.67::numeric, 75::numeric, '6th'::text, '9.2'::text),
    ('27fff4f3-3cfa-48d8-b24c-a5cb34459a11'::uuid, 16::numeric, 350::numeric, '1st'::text, '10.0'::text),
    ('471a803c-8804-4395-8efd-2ceb2e25b858'::uuid, 23.67::numeric, 232.5::numeric, '2nd'::text, '10.0'::text),
    ('496e4f98-b518-4082-8a4b-8b37141400d5'::uuid, 19.67::numeric, 220::numeric, '1st'::text, '10.0'::text),
    ('2bf88e3d-41ee-46f7-b470-cc8d84a0a9f5'::uuid, 23.33::numeric, 470::numeric, '1st'::text, '10.0'::text),
    ('a9d92ba4-bdb8-4ff1-813e-485e392ec1d3'::uuid, 7.33::numeric, 10::numeric, '6th'::text, '1.0'::text)
)
update public.players as p
set scouting_2025_avg_draft_position = si.avg_draft_position,
    scouting_2025_total_earnings = si.total_earnings,
    scouting_2025_best_finish = si.best_finish,
    scouting_2025_draft_value_index = si.draft_value_index,
    updated_at = now()
from stats_import as si
where p.id = si.player_id;

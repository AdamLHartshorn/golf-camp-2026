import fs from 'node:fs/promises';
const matched = JSON.parse(await fs.readFile('.codex-tmp/questionnaire_matched.json', 'utf8'));
function dollarQuote(value, tag) {
  const text = String(value);
  let safeTag = tag;
  while (text.includes(`$${safeTag}$`)) safeTag += '_x';
  return `$${safeTag}$${text}$${safeTag}$`;
}
const lines = [];
lines.push('-- 2026 DRAFT PREP QUESTIONNAIRE IMPORT');
lines.push('-- Source workbook: 2026 Golf Trip Attendees (1).xlsx');
lines.push('-- Source sheet: Attendee Scores and Statements');
lines.push('');
lines.push('with questionnaire_import (player_id, answers) as (');
lines.push('  values');
matched.matches.forEach((item, index) => {
  const payload = {
    ...item.answers,
    questionnaire_source: {
      workbook: '2026 Golf Trip Attendees (1).xlsx',
      sheet: 'Attendee Scores and Statements',
      workbook_name: item.workbook_name,
    },
  };
  const json = JSON.stringify(payload);
  const suffix = index === matched.matches.length - 1 ? '' : ',';
  lines.push(`    ('${item.player.id}'::uuid, ${dollarQuote(json, `json_${index + 1}`)}::jsonb)${suffix}`);
});
lines.push(')');
lines.push('update public.players as p');
lines.push("set questionnaire_answers = coalesce(p.questionnaire_answers, '{}'::jsonb) || qi.answers,");
lines.push('    updated_at = now()');
lines.push('from questionnaire_import as qi');
lines.push('where p.id = qi.player_id;');
lines.push('');
await fs.writeFile('supabase/2026_draft_prep_questionnaire_import.sql', lines.join('\n'));
console.log(JSON.stringify({ updates: matched.matches.length, file: 'supabase/2026_draft_prep_questionnaire_import.sql' }, null, 2));

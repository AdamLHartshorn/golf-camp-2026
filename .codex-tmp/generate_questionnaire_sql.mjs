import fs from 'node:fs/promises';
const matched = JSON.parse(await fs.readFile('.codex-tmp/questionnaire_matched.json', 'utf8'));
function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
const lines = [];
lines.push('-- 2026 DRAFT PREP QUESTIONNAIRE IMPORT');
lines.push('-- Source workbook: 2026 Golf Trip Attendees (1).xlsx');
lines.push('-- Source sheet: Attendee Scores and Statements');
lines.push('');
for (const item of matched.matches) {
  const payload = {
    ...item.answers,
    questionnaire_source: {
      workbook: '2026 Golf Trip Attendees (1).xlsx',
      sheet: 'Attendee Scores and Statements',
      workbook_name: item.workbook_name,
    },
  };
  const json = JSON.stringify(payload);
  lines.push(`update public.players`);
  lines.push(`set questionnaire_answers = coalesce(questionnaire_answers, '{}'::jsonb) || ${sqlString(json)}::jsonb,`);
  lines.push(`    updated_at = now()`);
  lines.push(`where id = ${sqlString(item.player.id)};`);
  lines.push('');
}
await fs.writeFile('supabase/2026_draft_prep_questionnaire_import.sql', lines.join('\n'));
console.log(JSON.stringify({ updates: matched.matches.length, file: 'supabase/2026_draft_prep_questionnaire_import.sql' }, null, 2));

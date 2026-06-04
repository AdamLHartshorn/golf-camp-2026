import fs from 'node:fs/promises';
const matched = JSON.parse(await fs.readFile('.codex-tmp/questionnaire_matched.json', 'utf8'));
const lines = [];
lines.push('-- 2026 DRAFT PREP QUESTIONNAIRE IMPORT');
lines.push('-- Source workbook: 2026 Golf Trip Attendees (1).xlsx');
lines.push('-- Source sheet: Attendee Scores and Statements');
lines.push('-- Excludes q6 arrival-plan question from Draft Prep scouting cards.');
lines.push('');
lines.push('with questionnaire_import (player_id, answers_base64) as (');
lines.push('  values');
matched.matches.forEach((item, index) => {
  const answers = Object.fromEntries(
    Object.entries(item.answers).filter(([key]) => key !== 'q6'),
  );
  const payload = {
    ...answers,
    questionnaire_source: {
      workbook: '2026 Golf Trip Attendees (1).xlsx',
      sheet: 'Attendee Scores and Statements',
      workbook_name: item.workbook_name,
      excluded_questions: ['q6'],
    },
  };
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json, 'utf8').toString('base64');
  const suffix = index === matched.matches.length - 1 ? '' : ',';
  lines.push(`    ('${item.player.id}'::uuid, '${base64}')${suffix}`);
});
lines.push('), decoded_import as (');
lines.push('  select');
lines.push('    player_id,');
lines.push("    convert_from(decode(answers_base64, 'base64'), 'UTF8')::jsonb as answers");
lines.push('  from questionnaire_import');
lines.push(')');
lines.push('update public.players as p');
lines.push("set questionnaire_answers = (coalesce(p.questionnaire_answers, '{}'::jsonb) - 'q6') || di.answers,");
lines.push('    updated_at = now()');
lines.push('from decoded_import as di');
lines.push('where p.id = di.player_id;');
lines.push('');
await fs.writeFile('supabase/2026_draft_prep_questionnaire_import.sql', lines.join('\n'));
const questionSlots = matched.matches.length * 5;
console.log(JSON.stringify({ updates: matched.matches.length, importedQuestionSlots: questionSlots, excluded: 'q6', file: 'supabase/2026_draft_prep_questionnaire_import.sql', lines: lines.length }, null, 2));

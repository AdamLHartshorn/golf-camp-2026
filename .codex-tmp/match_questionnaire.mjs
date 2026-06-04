import fs from 'node:fs';
import fsp from 'node:fs/promises';

function loadEnv(path) {
  const out = {};
  const text = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[trimmed.slice(0, idx).trim()] = value;
  }
  return out;
}

const env = { ...loadEnv('.env.local'), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase env');
const raw = JSON.parse(await fsp.readFile('.codex-tmp/questionnaire_raw.json', 'utf8'));
const res = await fetch(`${url}/rest/v1/players?select=id,display_name,first_name,last_name,player_key,active&order=last_name.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }});
if (!res.ok) throw new Error(`Supabase players fetch failed ${res.status}: ${await res.text()}`);
const players = await res.json();
function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
const alias = new Map([
  ['jesse prauener', 'jesse praeuner'],
]);
const byName = new Map();
for (const p of players) {
  byName.set(normalizeName(p.display_name), p);
  byName.set(normalizeName(`${p.first_name || ''} ${p.last_name || ''}`), p);
}
const matches=[];
const unmatched=[];
const duplicateMatches=[];
const used = new Map();
for (const row of raw.rows) {
  const normalized = normalizeName(row.workbook_name);
  const lookup = alias.get(normalized) || normalized;
  const player = byName.get(lookup);
  if (!player) {
    unmatched.push(row.workbook_name);
    continue;
  }
  if (used.has(player.id)) duplicateMatches.push([row.workbook_name, player.display_name, used.get(player.id)]);
  used.set(player.id, row.workbook_name);
  const answers = {};
  for (const q of raw.questions) {
    const answer = row.answers_by_number[String(q.number)] || row.answers_by_number[q.number] || '';
    answers[`q${q.number}`] = { question: q.question, answer: String(answer || '').trim() };
  }
  matches.push({ player, workbook_name: row.workbook_name, answers });
}
const missingWorkbook = players.filter(p => p.active !== false && !used.has(p.id)).map(p => p.display_name);
await fsp.writeFile('.codex-tmp/questionnaire_matched.json', JSON.stringify({ questions: raw.questions, matches, unmatched, duplicateMatches, missingWorkbook }, null, 2));
console.log(JSON.stringify({ players: players.length, workbookRows: raw.rows.length, matches: matches.length, unmatched, duplicateMatches, activePlayersWithoutWorkbookRow: missingWorkbook }, null, 2));

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const py = '/Users/adamlhartshorn/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const docx = '/Users/adamlhartshorn/Downloads/2025_Draft_Prep_Stats.docx';
const pyCode = `
import json, re
from docx import Document
path=${JSON.stringify(docx)}
doc=Document(path)
t=doc.tables[0]
headers=[c.text.strip() for c in t.rows[0].cells]
rows=[]
for row in t.rows[1:]:
    vals=[c.text.strip() for c in row.cells]
    if not any(vals):
        continue
    item=dict(zip(headers, vals))
    rows.append(item)
print(json.dumps(rows))
`;
const rawRows = JSON.parse(execFileSync(py, ['-c', pyCode], { encoding: 'utf8' }));
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
function normalizeName(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function parseNumber(value) {
  const cleaned = String(value || '').replace(/[$,]/g, '').trim();
  return cleaned ? Number(cleaned) : null;
}
const env = { ...loadEnv('.env.local'), ...process.env };
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/players?select=id,display_name,first_name,last_name,active&order=last_name.asc`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }});
if (!res.ok) throw new Error(await res.text());
const players = await res.json();
const alias = new Map([['jesse prauener', 'jesse praeuner']]);
const byName = new Map();
for (const p of players) {
  byName.set(normalizeName(p.display_name), p);
  byName.set(normalizeName(`${p.first_name || ''} ${p.last_name || ''}`), p);
}
const matches = [];
const unmatched = [];
const used = new Set();
for (const row of rawRows) {
  const normalizedSource = normalizeName(row.Player);
  const player = byName.get(alias.get(normalizedSource) || normalizedSource);
  if (!player) {
    unmatched.push(row.Player);
    continue;
  }
  used.add(player.id);
  matches.push({
    player,
    source_name: row.Player,
    scouting_2025_avg_draft_position: parseNumber(row['Avg Draft Position']),
    scouting_2025_total_earnings: parseNumber(row['Total Earnings']),
    scouting_2025_best_finish: row['Best Finish'] || null,
    scouting_2025_draft_value_index: row['Draft Value Index'] || null,
  });
}
const activeWithoutStats = players.filter(p => p.active !== false && !used.has(p.id)).map(p => p.display_name);
await fsp.writeFile('.codex-tmp/2025_stats_matched.json', JSON.stringify({ rawRows, matches, unmatched, activeWithoutStats }, null, 2));
console.log(JSON.stringify({ docxRows: rawRows.length, matches: matches.length, unmatched, activeWithoutStats }, null, 2));

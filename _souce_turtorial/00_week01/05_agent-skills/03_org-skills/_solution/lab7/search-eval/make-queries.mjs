// make-queries.mjs — people.json → queries.json (คำค้นมาจากพนักงาน: phrases ทุกข้อของคนที่มี skill ที่มีอยู่จริงในคลัง)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PEOPLE = 'C:/t/org05/novatech/seed/people.json';
const cards = JSON.parse(readFileSync(join(HERE, 'cards-header.json'), 'utf8'));
const byName = new Map(cards.map(c => [c.name, c]));
const { people } = JSON.parse(readFileSync(PEOPLE, 'utf8'));

const queries = [], skipped = [];
for (const p of people) {
  const card = p.skill && byName.get(p.skill);
  if (!card) { skipped.push(`${p.user} (skill=${p.skill ?? 'null'})`); continue; }
  for (const q of p.phrases || []) queries.push({ q, expect: `${card.plugin}:${card.name}`, who: p.user });
}
writeFileSync(join(HERE, 'queries.json'), JSON.stringify(queries, null, 2));
console.log(`queries: ${queries.length} คำค้น จาก ${people.length - skipped.length} คน · ข้าม: ${skipped.join(', ') || '-'}`);

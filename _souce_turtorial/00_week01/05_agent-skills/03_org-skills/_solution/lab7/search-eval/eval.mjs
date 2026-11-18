// eval.mjs — วัด hit@1 / hit@5 ของ A (header), B (full), C (B + skill คู่จาก uses/follows) → eval-result.json + eval-result.md
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from './search.mjs';
import { companions } from './graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = f => JSON.parse(readFileSync(join(HERE, f), 'utf8'));
const A = load('cards-header.json'), B = load('cards-full.json'), queries = load('queries.json');
const K = 5;
const idOf = new Map(B.map(c => [c.name, `${c.plugin}:${c.name}`]));
const comp = new Map(B.map(c => [c.name, companions(B, c.name).map(n => idOf.get(n) ?? `?:${n}`)]));

const rankIn = (cards, q, expect) => { const all = search(cards, q, null); const i = all.findIndex(r => r.id === expect); return { rank: i < 0 ? null : i + 1, top: all.slice(0, K) }; };
// C: ผล B top-k แต่ละตัวพ่วง skill ที่ต้องใช้คู่กัน (uses/follows) → bundle
const bundle = (top, k) => { const s = new Set(); for (const r of top.slice(0, k)) { s.add(r.id); for (const d of comp.get(r.name) || []) s.add(d); } return s; };

const rows = []; let pairsTotal = 0, pairsB = 0, pairsC = 0, fullC = 0, needPairs = 0;
for (const { q, expect, who } of queries) {
  const a = rankIn(A, q, expect), b = rankIn(B, q, expect);
  const c1 = bundle(b.top, 1), c5 = bundle(b.top, K);
  const need = comp.get(expect.split(':')[1]) || [];
  const topB = new Set(b.top.map(r => r.id));
  const gotB = need.filter(d => topB.has(d)), gotC = need.filter(d => c5.has(d));
  pairsTotal += need.length; pairsB += gotB.length; pairsC += gotC.length;
  if (need.length) { needPairs++; if (gotC.length === need.length && c5.has(expect)) fullC++; }
  rows.push({ q, who, expect, rankA: a.rank, rankB: b.rank,
    hitC1: c1.has(expect), hitC5: c5.has(expect),
    topA: a.top.map(r => `${r.id}(${r.score})`), topB: b.top.map(r => `${r.id}(${r.score})`),
    pairsNeed: need, pairsFoundB: gotB, pairsFoundC: gotC });
}
const n = rows.length, pct = x => +(100 * x / n).toFixed(1);
const hit = (f) => ({ count: rows.filter(f).length, pct: pct(rows.filter(f).length) });
const summary = {
  queries: n, skills: B.length, k: K,
  A: { hit1: hit(r => r.rankA === 1), hit5: hit(r => r.rankA && r.rankA <= K) },
  B: { hit1: hit(r => r.rankB === 1), hit5: hit(r => r.rankB && r.rankB <= K) },
  C: { hit1: hit(r => r.hitC1), hit5: hit(r => r.hitC5),
       pairs: { total: pairsTotal, foundInB: pairsB, foundInC: pairsC,
                queriesNeedingPairs: needPairs, queriesCompleteInC: fullC } },
};
writeFileSync(join(HERE, 'eval-result.json'), JSON.stringify({ summary, rows }, null, 2));

const f = r => r == null ? '–' : (r <= K ? `**${r}**` : String(r));
const md = [
  '# ผลวัด "หา skill เจอไหม"', '',
  `${n} คำค้น · ${B.length} skill · BM25 (Thai char-trigram + English words)`, '',
  '| ชุด | hit@1 | hit@5 |', '|---|---|---|',
  ...['A', 'B', 'C'].map(s => `| ${s} | ${summary[s].hit1.count}/${n} (${summary[s].hit1.pct}%) | ${summary[s].hit5.count}/${n} (${summary[s].hit5.pct}%) |`), '',
  `- A = cards-header.json (name + description) · B = cards-full.json (+ summary) · C = B top-k + skill ที่ต้องใช้คู่กัน (uses/follows ทางตรง+อ้อม)`,
  `- คู่ที่ต้องใช้ร่วมกัน (skill ที่ถูก → uses/follows ของมัน): ${pairsTotal} คู่ · อยู่ใน B top-5 ${pairsB} คู่ · อยู่ใน C ${pairsC} คู่ · คำค้นที่ได้ skill + คู่ครบ ${fullC}/${needPairs}`, '',
  '## รายข้อ', '', '| # | คำค้น | ผู้พิมพ์ | ที่ถูก | A อันดับที่ | B อันดับที่ | C@5 | B อันดับ 1 |', '|---|---|---|---|---|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | ${r.q.replace(/\|/g, '\\|')} | ${r.who} | ${r.expect} | ${f(r.rankA)} | ${f(r.rankB)} | ${r.hitC5 ? '✓' : '✗'} | ${(r.topB[0] || '–').replace(/\(.*/, '')} |`),
  '', `อันดับ **ตัวหนา** = อยู่ใน top-${K} · – = ไม่มีคะแนนเลย`, '',
];
writeFileSync(join(HERE, 'eval-result.md'), md.join('\n'));
console.log(JSON.stringify(summary, null, 1));

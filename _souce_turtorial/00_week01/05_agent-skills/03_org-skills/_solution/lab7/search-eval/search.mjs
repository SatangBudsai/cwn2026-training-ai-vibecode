// search.mjs — BM25 บน character trigram (ภาษาไทย) + คำอังกฤษ (แยกด้วยช่องว่าง/ขีด)
// ใช้: node search.mjs <cards.json> "<คำค้น>" [k]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const THAI = /[฀-๿]+/g;
const K1 = 1.2, B = 0.75;

export function tokenize(text) {
  const t = String(text || '').toLowerCase();
  const toks = [];
  // ภาษาไทย: ไม่มีเว้นวรรค → character trigram ของแต่ละช่วงอักษรไทย
  for (const run of t.match(THAI) || []) {
    const chars = [...run];
    if (chars.length < 3) { toks.push('th:' + run); continue; }
    for (let i = 0; i + 3 <= chars.length; i++) toks.push('th:' + chars.slice(i, i + 3).join(''));
  }
  // อังกฤษ/ตัวเลข: แยกด้วยช่องว่าง ขีด และเครื่องหมายอื่น
  const rest = t.replace(THAI, ' ');
  for (const w of rest.split(/[\s\-_/.,:;()[\]{}"'`|<>!?+*=#&%@~^\\]+/)) if (/[a-z0-9]/.test(w)) toks.push('en:' + w);
  return toks;
}

export function cardText(card) {
  return [card.name, card.name?.replace(/-/g, ' '), card.plugin, card.description, card.summary || ''].join(' \n ');
}

const cache = new WeakMap();
function buildIndex(cards) {
  if (cache.has(cards)) return cache.get(cards);
  const docs = cards.map(c => {
    const tf = new Map();
    const toks = tokenize(cardText(c));
    for (const x of toks) tf.set(x, (tf.get(x) || 0) + 1);
    return { tf, len: toks.length };
  });
  const df = new Map();
  for (const d of docs) for (const x of d.tf.keys()) df.set(x, (df.get(x) || 0) + 1);
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / Math.max(docs.length, 1);
  const idx = { docs, df, avgdl, N: docs.length };
  cache.set(cards, idx);
  return idx;
}

/** คืน top-k [{name, plugin, id, score}] เรียงคะแนนมาก→น้อย (ตัดผลคะแนน 0 ทิ้ง) */
export function search(cards, q, k = 5) {
  const { docs, df, avgdl, N } = buildIndex(cards);
  const qtf = new Map();
  for (const x of tokenize(q)) qtf.set(x, (qtf.get(x) || 0) + 1);
  const scored = docs.map((d, i) => {
    let s = 0;
    for (const [term, qf] of qtf) {
      const f = d.tf.get(term);
      if (!f) continue;
      const n = df.get(term);
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += qf * idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / avgdl));
    }
    const c = cards[i];
    return { id: `${c.plugin}:${c.name}`, name: c.name, plugin: c.plugin, score: +s.toFixed(4) };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return k == null ? scored : scored.slice(0, k);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [file, q, k] = process.argv.slice(2);
  if (!file || !q) { console.error('usage: node search.mjs <cards.json> "<คำค้น>" [k]'); process.exit(1); }
  const cards = JSON.parse(readFileSync(file, 'utf8'));
  const res = search(cards, q, k ? +k : 5);
  if (!res.length) console.log('(ไม่พบ)');
  res.forEach((r, i) => console.log(`${i + 1}. ${r.id.padEnd(30)} ${r.score.toFixed(3)}`));
}

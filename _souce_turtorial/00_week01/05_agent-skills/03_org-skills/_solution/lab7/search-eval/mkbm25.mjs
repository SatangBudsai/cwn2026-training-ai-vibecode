// คำนวณอันดับ BM25 ของทุกคำค้น → bm25.json (ใช้กับ compare.py)
import { readFileSync, writeFileSync } from 'node:fs';
import { search } from './search.mjs';
const load = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const cards = load('./cards-header.json');
const id = c => `${c.plugin}:${c.name}`;
const out = {};
for (const f of ['queries.json', 'queries-heldout.json']) out[f] = load('./' + f).map(q => search(cards, q.q, cards.length).map(x => id(x.card ?? x)));
writeFileSync(new URL('./bm25.json', import.meta.url), JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));

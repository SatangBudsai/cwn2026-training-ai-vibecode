import { readFileSync, writeFileSync } from 'node:fs';
import { search } from './search.mjs';
const load = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const A = load('./cards-header.json'), B = load('./cards-full.json');
const sets = { seen: load('./queries.json'), heldout: load('queries-heldout.json') };
const ok = (r, e, who) => r === e || (who === 'plat-may' && r === 'core:brand-guide');
const id = c => `${c.plugin}:${c.name}`;
const out = {};
for (const [name, qs] of Object.entries(sets)) {
  out[name] = {};
  for (const [arm, cards] of Object.entries({ A, B })) {
    let h1 = 0, h5 = 0; const miss = [];
    for (const q of qs) {
      const top = search(cards, q.q, 5).map(x => id(x.card ?? x));
      if (ok(top[0], q.expect, q.who)) h1++;
      if (top.some(t => ok(t, q.expect, q.who))) h5++; else miss.push({ q: q.q, expect: q.expect, got: top.slice(0, 3) });
    }
    out[name][arm] = { n: qs.length, hit1: +(100 * h1 / qs.length).toFixed(1), hit5: +(100 * h5 / qs.length).toFixed(1), miss };
  }
}
writeFileSync(new URL('score.json', import.meta.url), JSON.stringify(out, null, 1));
for (const s in out) for (const a in out[s]) console.log(s, a, out[s][a].hit1, out[s][a].hit5, 'miss', out[s][a].miss.length);

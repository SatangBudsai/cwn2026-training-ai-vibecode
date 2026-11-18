// node loop/pixel/check.mjs <BASE_URL> <out-dir> — ค่าตอนเริ่ม: พิกเซล (เทียบ kit) · ตัวกันทุกข้อ · บริเวณแดง → element → ตัวแปร
import fs from 'node:fs';
import { session, redMask, bands, clusters, mapRegions } from './lib.mjs';
const [base, out, valuesFile] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const S = await session(base);
try {
  await S.apply(valuesFile ? JSON.parse(fs.readFileSync(valuesFile, "utf8")).values : {});
  const v = await S.visual(`${out}/diff.png`);
  const g = await S.guards();
  const m = redMask(`${out}/diff.png`);
  const regs = await mapRegions(S.page, clusters(m).slice(0, 25));
  const res = { visual: v, guards: g, bands: bands(m).sort((a, b) => b.red - a.red), regions: regs };
  fs.writeFileSync(`${out}/check.json`, JSON.stringify(res, null, 2));
  console.log(JSON.stringify({ visual: v, ok: g.ok, nfails: g.fails.length, fails: g.fails.slice(0, 40), info: g.info }, null, 1));
  console.log('bands', res.bands.slice(0, 6).map(b => `${b.y0}-${b.y1}:${b.red}`).join(' '));
  for (const r of regs.slice(0, 15)) console.log(r.red, `[${r.x0},${r.y0}-${r.x1},${r.y1}]`, r.element, r.vars.slice(0, 10).join(' '));
} finally { await S.close(); }

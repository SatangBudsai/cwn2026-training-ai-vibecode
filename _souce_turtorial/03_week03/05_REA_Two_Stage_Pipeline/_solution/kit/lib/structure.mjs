// โครงสร้างหน้า: ถ่าย ariaSnapshot() ของหน้าผลค้นหาเริ่มต้นแบบเดียวกับ src/structure/structure-capture.mjs
// (1366×900 · รอแท็บ "ดีที่สุด" · fonts.ready · 1000 ms · รอจำนวนแถวนิ่ง · body.ariaSnapshot())
// ต่างตรงที่ไปหน้าผลค้นหาผ่านฟอร์มบนจอ (common.openResults) แทน URL /search?… ของ v4 เพื่อวัดแอปไหนก็ได้
// คำนวณด้วย src/structure/structure-compare.mjs ตัวเดิม: คัดลอกทั้งไฟล์ไม่แก้สักบรรทัด แล้วต่อท้ายบรรทัด export
// เพื่อใช้ parse/excluded/isElement/keyTok/strictTok ตัวเดียวกันหา token ที่ขาด/เกิน
// node --import ./hooks.mjs structure.mjs <BASE_URL> <out>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, newPage, openResults, stable } from './common.mjs';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const [BASE, outArg] = process.argv.slice(2);
const OUT = path.join(path.resolve(outArg), 'structure');
const SNAP = path.join(OUT, 'structure', 'snapshots'); // compare.mjs อ่าน <dir ของตัวเอง>/structure/snapshots
fs.mkdirSync(SNAP, { recursive: true });

const browser = await launch();
const { context, page } = await newPage(browser, BASE);
await openResults(page);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
const rows = await stable(page, page.getByRole('link', { name: /^เที่ยวบิน .*ราคา|^เลือก$/ }));
const url = page.url();
fs.writeFileSync(path.join(SNAP, 'app.yml'), await page.locator('body').ariaSnapshot());
await context.close(); await browser.close();
fs.copyFileSync(path.join(SRC, 'structure', 'original.yml'), path.join(SNAP, 'original.yml'));

const src = fs.readFileSync(path.join(SRC, 'structure', 'structure-compare.mjs'), 'utf8');
const lib = path.join(OUT, 'compare.mjs');
fs.writeFileSync(lib, src + '\nexport { parse, excluded, isElement, strictTok, keyTok, KEY, load, norm };\n');
process.argv[2] = 'app'; // VERSIONS = ['app']
const log = []; const cl = console.log; console.log = (...a) => log.push(a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const M = await import(pathToFileURL(lib).href);
console.log = cl;
fs.writeFileSync(path.join(OUT, 'compare.log'), log.join('\n') + '\n');
const metrics = JSON.parse(fs.readFileSync(path.join(OUT, 'structure', 'metrics.json'), 'utf8'));
const m = metrics.versions.app;

// token ที่ขาด/เกิน (ชุดเดียวกับที่ใช้คิด Jaccard) พร้อมตัวอย่าง role+ชื่อจริงของแต่ละ token
const o = M.load('original'), a = M.load('app');
const group = (elems, tok) => { const g = new Map(); for (const n of elems) { const t = tok(n); if (!g.has(t)) g.set(t, []); g.get(t).push(`${n.role} "${n.name}"`); } return g; };
const diffTokens = (tok) => {
  const go = group(o.elems, tok), ga = group(a.elems, tok);
  const pick = (g, t) => ({ token: t, count: g.get(t).length, examples: [...new Set(g.get(t))].slice(0, 3) });
  return {
    missing: [...go.keys()].filter((t) => !ga.has(t)).map((t) => pick(go, t)),
    extra: [...ga.keys()].filter((t) => !go.has(t)).map((t) => pick(ga, t)),
    shared: [...go.keys()].filter((t) => ga.has(t)).length,
  };
};
const key = diffTokens(M.keyTok), strict = diffTokens(M.strictTok);
const res = {
  url, rows,
  structure: m.structure, structurePct: +(m.structure * 100).toFixed(1),
  keyJaccard: m.keyJaccard.j, keyInter: m.keyJaccard.inter, keyUnion: m.keyJaccard.union,
  strictJaccard: m.strictJaccard.j, roleWeightedJaccard: m.roleWeightedJaccard,
  keyFound: m.keyFound, keyTotal: m.keyTotal, missingKeyElements: m.missing, elements: m.elements, originalElements: metrics.original.elements,
  tokens: { key: { missing: key.missing, extra: key.extra }, strict: { missing: strict.missing, extra: strict.extra } },
};
fs.writeFileSync(path.join(OUT, '..', 'structure.json'), JSON.stringify(res, null, 2));
const pct = (x) => (x * 100).toFixed(1) + '%';
console.log(`  ${url} rows=${rows} key token ขาด ${key.missing.length} เกิน ${key.extra.length}`);
console.log(`STRUCTURE ${pct(res.structure)} (key Jaccard ${pct(res.keyJaccard)} = ${res.keyInter}/${res.keyUnion} · องค์ประกอบสำคัญ ${res.keyFound}/${res.keyTotal})`);

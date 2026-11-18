// node kit/report.mjs <out-dir> <BASE_URL> [rulersSumBefore] [rulersSumAfter]
// รวมผลไม้บรรทัด 5 อันใน <out-dir> → report.json · exit 0 = gate ผ่าน · 1 = ไม่ผ่าน
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [OUT, base, sumBefore = null, sumAfter = null] = process.argv.slice(2);
const ROOT = new URL('..', import.meta.url).pathname;
const R = ROOT + 'rulers/';
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const tail = f => { try { const L = fs.readFileSync(f, 'utf8').split('\n').filter(l => !/^\[measure\]|^Node\.js v|^\s*at /.test(l) && l.trim()); return (L.find(l => /Error|Timeout|ไม่/.test(l)) || L.at(-1) || '').trim().slice(0, 300); } catch { return ''; } };
const pct = (a, b) => b ? +(100 * a / b).toFixed(2) : 0;

const timings = Object.fromEntries(fs.readFileSync(`${OUT}/timings.tsv`, 'utf8').trim().split('\n').filter(Boolean)
  .map(l => l.split('\t')).map(([k, ms, rc]) => [k, { seconds: +(ms / 1000).toFixed(1), exit: +rc }]));
const errors = [];   // ไม้บรรทัดที่ไม่ได้ผลออกมา (แอปพังจนไม้บรรทัดล้ม) → นับเป็นไม่ผ่านในส่วนนั้น

// ---------- visual ----------
const vis = readJSON(`${OUT}/visual/result.json`);
if (!vis) errors.push({ ruler: 'visual', error: tail(`${OUT}/visual/stderr.log`) });
const BAND = 75, redBands = [];
let redTotal = 0;
if (fs.existsSync(`${OUT}/visual/diff.png`)) {
  // pixelmatch วาดพิกเซลต่างเป็นแดง (255,0,0) · AA เป็นเหลือง · ที่เหลือเป็นเทาจาง → นับแดงต่อแถบสูง 75 px
  const d = PNG.sync.read(fs.readFileSync(`${OUT}/visual/diff.png`));
  for (let y0 = 0; y0 < d.height; y0 += BAND) {
    const y1 = Math.min(y0 + BAND, d.height); let red = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < d.width; x++) {
      const i = 4 * (y * d.width + x);
      if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 0) red++;
    }
    redTotal += red;
    redBands.push({ band: `${y0}-${y1 - 1}`, redPx: red, redPct: pct(red, d.width * (y1 - y0)) });
  }
}

// ---------- structure ----------
const st = readJSON(`${OUT}/structure/result.json`);
if (!st) errors.push({ ruler: 'structure', error: tail(`${OUT}/structure/stderr.log`) });
const key = readJSON(R + 'structure/key.json')?.keys || [];
const keyName = id => { const k = key.find(k => k.id === id); return k ? `${k.role} ${k.name ?? '/' + k.pattern + '/'}` : id; };

// ---------- flights ----------
const fl = readJSON(`${OUT}/flights/result.json`);
if (!fl) errors.push({ ruler: 'flights', error: tail(`${OUT}/flights/stderr.log`) });
const target = {
  initial: readJSON(ROOT + 'spec/data/flights-initial.json').flights.length,
  all: readJSON(ROOT + 'spec/data/flights-all.json').flights.length,
};

// ---------- accept ----------
const am = readJSON(R + 'accept/META.json');
const ar = readJSON(`${OUT}/accept/results.json`) || [];
if (!fs.existsSync(`${OUT}/accept/results.json`)) errors.push({ ruler: 'accept', error: tail(`${OUT}/accept/stderr.log`) });
const invalidIds = am.invalid.map(x => x.id);
const accRow = id => ar.find(x => x.id === id);
const validRes = am.valid.map(id => ({ id, ...(accRow(id) || { status: 'ไม่ได้รัน', reason: 'ไม่มีผล (runner ล้มก่อนถึงข้อนี้)' }) }));
const validPassed = validRes.filter(x => x.status === 'ผ่าน').length;
const invalidRes = am.invalid.map(x => ({ id: x.id, metaReason: x['เหตุผล'], ...(accRow(x.id) || { status: 'ไม่ได้รัน', reason: 'ไม่มีใน cases.mjs (ข้อยกเว้น)' }) }));
const accNeed = Math.ceil(0.9 * am.valid.length - 1e-9);

// ---------- diff ----------
const dm = readJSON(R + 'diff/META.json');
const dr = readJSON(`${OUT}/diff/last-run.json`)?.report || [];
if (!dr.length) errors.push({ ruler: 'diff', error: tail(`${OUT}/diff/stderr.log`) });
const dInvalid = dm.invalid.map(x => x.id);
const allIds = [...dm.valid, ...dInvalid];
const dRes = allIds.map(id => ({ id, valid: dm.valid.includes(id), ...(dr.find(r => r.id === id) || { result: 'ไม่ได้รัน', diffs: [] }) }));
const dValidOk = dRes.filter(r => r.valid && r.result === 'ตรง').length;
const dAllOk = dRes.filter(r => r.result === 'ตรง').length;

// ---------- scores / gate ----------
const structurePct = st?.pct ?? 0;
const visualPct = vis?.diffPct ?? 100;
const gate = {
  acceptance: { passed: validPassed, valid: am.valid.length, need: accNeed, ratioPct: pct(validPassed, am.valid.length), pass: validPassed >= accNeed },
  differential: { matched: dValidOk, valid: dm.valid.length, pass: dValidOk === dm.valid.length },
  flights: { initial: fl?.initial ?? null, all: fl?.afterMore ?? null, target, pass: fl?.initial === target.initial && fl?.afterMore === target.all },
};
gate.pass = gate.acceptance.pass && gate.differential.pass && gate.flights.pass;
gate.itemsPassed = validPassed + dValidOk + (gate.flights.initial === target.initial) + (gate.flights.all === target.all);
gate.itemsTotal = am.valid.length + dm.valid.length + 2;

const report = {
  base, at: new Date().toISOString(), status: 'measured',
  scores: {
    acceptance: `${validPassed}/${am.valid.length}`,
    acceptanceAll: `${ar.filter(x => x.status === 'ผ่าน').length}/${ar.length} (รวม invalid)`,
    differential: `${dAllOk}/${allIds.length}`,
    differentialValid: `${dValidOk}/${dm.valid.length}`,
    structurePct, visualDiffPct: visualPct,
    flights: `${fl?.initial ?? '?'} → ${fl?.afterMore ?? '?'}`,
  },
  Score: +(structurePct - visualPct).toFixed(2),
  gate,
  issues: {
    acceptanceFailed: validRes.filter(x => x.status !== 'ผ่าน').map(x => ({ id: x.id, reason: (x.reason || '').split('\n')[0].slice(0, 300) })),
    acceptanceInvalid: invalidRes.map(x => ({ id: x.id, status: x.status, reason: (x.reason || '').split('\n')[0].slice(0, 200), metaReason: x.metaReason })),
    differentialMismatch: dRes.filter(r => r.result !== 'ตรง').map(r => ({ id: r.id, valid: r.valid, result: r.result, count: r.count, diffs: (r.diffs || []).slice(0, 5) })),
    structureMissingKeys: (st?.missing || []).map(id => ({ id, key: keyName(id) })),
    structureMissingItems: st?.missingItems || [],
    structureExtraItems: st?.extra || [],
    visual: { diffPng: 'visual/diff.png', appPng: 'capture/app.png', redPx: redTotal, bandHeight: BAND,
      bands: redBands, worstBands: [...redBands].sort((a, b) => b.redPct - a.redPct).slice(0, 5) },
    flights: fl ? { initial: [fl.initial, target.initial], all: [fl.afterMore, target.all], clicks: fl.clicks } : null,
    rulerErrors: errors,
    capture: readJSON(`${OUT}/capture/capture.json`),
  },
  timings,
  rulersUnchanged: sumBefore && sumAfter ? { before: sumBefore, after: sumAfter, same: sumBefore === sumAfter } : null,
  exit: gate.pass ? 0 : 1,
};
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ scores: report.scores, Score: report.Score, gate: { acceptance: gate.acceptance.pass, differential: gate.differential.pass, flights: gate.flights.pass, pass: gate.pass }, timings }, null, 2));
process.exit(report.exit);

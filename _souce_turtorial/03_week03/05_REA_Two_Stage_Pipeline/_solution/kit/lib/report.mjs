// รวมผล 5 ไม้บรรทัดเป็น <out>/report.json (คะแนน + รายการปัญหาที่เครื่องอ่านได้) และ <out>/summary.md
// Score = โครงสร้าง% − visual diff% · gate: acceptance ≥ 74 · differential = 8/8 · เที่ยวบิน = 300
// node lib/report.mjs <BASE_URL> <out> <วินาทีที่ใช้>
import fs from 'node:fs';
import path from 'node:path';

const [BASE, outArg, secs] = process.argv.slice(2);
const OUT = path.resolve(outArg);
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')); } catch (e) { return { error: `อ่าน ${f} ไม่ได้: ${e.message}` }; } };
const A = read('accept.json'), D = read('diff.json'), S = read('structure.json'), V = read('visual.json'), F = read('flights.json');
const errors = Object.fromEntries(Object.entries({ accept: A, diff: D, structure: S, visual: V, flights: F }).filter(([, x]) => x.error).map(([k, x]) => [k, x.error]));

const structurePct = S.structure != null ? +(S.structure * 100).toFixed(1) : null;
const visualPct = V.percent != null ? +V.percent.toFixed(2) : null;
const score = structurePct != null && visualPct != null ? +(structurePct - visualPct).toFixed(2) : null;
const gate = {
  acceptance: { need: '≥ 74/82', got: A.pass ?? null, pass: (A.pass ?? -1) >= 74 },
  differential: { need: '8/8', got: D.pass ?? null, pass: D.pass === 8 && D.total === 8 },
  flights: { need: '300', got: F.total ?? null, pass: F.total === 300 },
};
gate.pass = gate.acceptance.pass && gate.differential.pass && gate.flights.pass;

const report = {
  baseURL: BASE, measuredAt: new Date().toISOString(), durationSec: Number(secs) || null,
  scores: {
    acceptance: { pass: A.pass ?? null, total: A.total ?? 82 },
    differential: { pass: D.pass ?? null, total: D.total ?? 8 },
    structure: { pct: structurePct, keyJaccardPct: S.keyJaccard != null ? +(S.keyJaccard * 100).toFixed(1) : null, keyElements: S.keyFound != null ? `${S.keyFound}/${S.keyTotal}` : null },
    visual: { diffPct: visualPct, pixels: V.pixels ?? null, totalPixels: V.totalPixels ?? null },
    flights: { initial: F.initial ?? null, total: F.total ?? null },
  },
  score, scoreFormula: 'structure% − visualDiff%',
  gate,
  issues: {
    acceptance: { failed: A.failed ?? [] },
    differential: { mismatched: D.mismatched ?? [] },
    structure: {
      missingKeyElements: S.missingKeyElements ?? [],
      // key token = กลุ่ม role + คำแรกของชื่อ (ตัวที่ใช้คิด Jaccard ในสูตรโครงสร้าง)
      tokensMissing: S.tokens?.key.missing ?? [], tokensExtra: S.tokens?.key.extra ?? [],
      // strict token = role + ชื่อเต็ม (ข้อมูลเสริม ไม่อยู่ในสูตร)
      strictTokensMissing: S.tokens?.strict.missing ?? [], strictTokensExtra: S.tokens?.strict.extra ?? [],
    },
    visual: { diffImage: V.diffImage ? path.join(OUT, V.diffImage) : null, screenshot: V.screenshot ? path.join(OUT, V.screenshot) : null, bandHeight: V.bandHeight ?? 75, bands: V.bands ?? [] },
    flights: F.total === 300 ? [] : [{ expected: 300, got: F.total ?? null, initial: F.initial ?? null }],
  },
  files: { accept: 'accept/REPORT.md', diff: 'diff.json', structure: 'structure.json', visual: 'visual.json', flights: 'flights.json' },
  ...(Object.keys(errors).length ? { errors } : {}),
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

const ok = (b) => (b ? 'ผ่าน' : 'ไม่ผ่าน');
const md = [
  `# ผลวัด ${BASE}`, '', `วัดเมื่อ ${report.measuredAt} · ใช้เวลา ${secs ?? '?'} วินาที`, '',
  '| ไม้บรรทัด | ค่า |', '|---|---:|',
  `| acceptance | ${A.pass ?? '—'}/${A.total ?? 82} |`,
  `| differential | ${D.pass ?? '—'}/${D.total ?? 8} |`,
  `| โครงสร้าง | ${structurePct ?? '—'}% (Jaccard ${report.scores.structure.keyJaccardPct}% · สำคัญ ${report.scores.structure.keyElements}) |`,
  `| visual diff | ${visualPct ?? '—'}% |`,
  `| เที่ยวบิน | ${F.initial ?? '—'} → ${F.total ?? '—'} |`, '',
  `**Score = ${structurePct} − ${visualPct} = ${score}** · gate: acceptance ${ok(gate.acceptance.pass)} · differential ${ok(gate.differential.pass)} · เที่ยวบิน ${ok(gate.flights.pass)} → **${ok(gate.pass)}**`, '',
  `acceptance ไม่ผ่าน: ${(A.failed ?? []).map((f) => f.id).join(' ') || '—'}`,
  `differential ไม่ตรง: ${(D.mismatched ?? []).map((m) => m.id).join(' ') || '—'}`,
  `token ขาด ${report.issues.structure.tokensMissing.length} · เกิน ${report.issues.structure.tokensExtra.length}`,
  ...(Object.keys(errors).length ? ['', `ข้อผิดพลาด: ${JSON.stringify(errors)}`] : []), '',
];
fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n'));
console.log(md.join('\n'));

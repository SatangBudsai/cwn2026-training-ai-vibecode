// รันกับ Google Flights สด "ครั้งเดียว" แล้วแช่แข็งผลเป็นไฟล์เฉลย (ห้ามรันซ้ำโดยไม่จำเป็น)
//   PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node capture-live.mjs [scenario-id ...]
//   ไม่ใส่อาร์กิวเมนต์ = ทำทั้งหมด · ใส่ id = รันซ้ำเฉพาะสถานการณ์นั้นแล้วรวมเข้า expected.json (บันทึกไว้ใน meta.reruns)
// ไม่ล็อกอิน · ไม่กด "เลือกเที่ยวบิน"/"ดำเนินการต่อ" · เจอ CAPTCHA = หยุด
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { open, standardRoute, recover, waitStable, rows, resultCount, ts, log } from './lib.mjs';
import { runAll } from './diff/scenarios.mjs';

const D = new URL('.', import.meta.url).pathname;
const args = process.argv.slice(2);
const scenariosOnly = args[0] === '--scenarios';   // ข้ามโครงสร้าง/ภาพ (ทำเสร็จแล้ว) แล้วรันทุกสถานการณ์ใหม่
const only = scenariosOnly ? [] : args;
const { browser, context, page } = await open();

// เก็บ response ของ GetShoppingResults ไว้เทียบกับ spec/data (ข้อมูลเครือข่ายของรอบเดียวกับเฉลย)
fs.mkdirSync(D + 'diff/live', { recursive: true });
let rpcN = 0; const RUN = ts().replace(/\D/g, "").slice(8, 12);   // HHMM ของรอบนี้ กันทับไฟล์รอบก่อน
context.on('response', async res => {
  if (!/FlightsFrontendService|batchexecute/.test(res.url())) return;
  const body = await res.text().catch(() => null);
  if (body && /wrb\.fr/.test(body)) fs.writeFileSync(`${D}diff/live/rpc-${RUN}-${String(++rpcN).padStart(3, '0')}.txt`, `# ${ts()} ${res.status()} ${new URL(res.url()).pathname}\n${body}`);
});

const settle = async p => {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1000);
};

try {
  const t0 = ts();
  const url = await standardRoute(page);
  log('results url', url);

  if (!only.length && !scenariosOnly) {
    // ---------- 1. โครงสร้าง ----------
    await settle(page);
    const y = await page.locator('body').ariaSnapshot();
    fs.writeFileSync(D + 'structure/original.yml', `# captured ${ts()} (Asia/Bangkok) · Google Flights สด · เส้นทางมาตรฐาน · 1366×900 th-TH\n# url: ${url}\n` + y + '\n');
    const r0 = await rows(page);
    log('structure: rows', r0.length, 'resultText', await resultCount(page));

    // ---------- 2. ภาพ: 3 รอบ แต่ละรอบเป็นแท็บใหม่ที่ไปตามเส้นทางมาตรฐาน (reload URL tfs ตรงๆ โดน ErrorResponse 13 ใน attempt 1) ----------
    fs.mkdirSync(D + 'visual/rounds', { recursive: true });
    const shots = [];
    for (let i = 1; i <= 3; i++) {
      const p = i === 1 ? page : await context.newPage();
      if (i > 1) { await p.waitForTimeout(10000); await standardRoute(p); }
      await settle(p);
      const f = `${D}visual/rounds/round-${i}.png`;
      await p.screenshot({ path: f });
      shots.push({ file: `rounds/round-${i}.png`, at: ts(), rows: (await rows(p)).length });
      if (i > 1) await p.close();
    }
    const img = shots.map(s => PNG.sync.read(fs.readFileSync(D + 'visual/' + s.file)));
    const { width, height } = img[0];
    const pairs = [];
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
      const px = pixelmatch(img[a].data, img[b].data, null, width, height, { threshold: 0.1, includeAA: false });
      pairs.push({ pair: `round-${a + 1} vs round-${b + 1}`, a, b, pixels: px, diffPct: +(100 * px / (width * height)).toFixed(4) });
    }
    const best = pairs.reduce((m, p) => p.pixels < m.pixels ? p : m);
    fs.copyFileSync(D + 'visual/' + shots[best.a].file, D + 'visual/reference.png');
    fs.writeFileSync(D + 'visual/noise.json', JSON.stringify({
      capturedAt: shots.map(s => s.at), url, viewport: '1366x900', options: { threshold: 0.1, includeAA: false },
      rounds: shots, pairs: pairs.map(({ a, b, ...p }) => p),
      reference: `${shots[best.a].file} (คู่ที่เหมือนกันมากที่สุด: ${best.pair})`,
      noiseFloorPct: { min: Math.min(...pairs.map(p => p.diffPct)), max: Math.max(...pairs.map(p => p.diffPct)) },
    }, null, 2));
    log('visual', JSON.stringify(pairs.map(p => [p.pair, p.diffPct])));
  }

  // ---------- 3. differential ----------
  const start = async p => { await p.waitForTimeout(10000); await standardRoute(p); };   // เว้นระยะกัน rate limit
  const f = D + 'diff/expected.json';
  let out = { meta: { source: 'Google Flights สด (ต้นฉบับ)', capturedFrom: t0, capturedTo: null, url, viewport: '1366x900', locale: 'th-TH', timezone: 'Asia/Bangkok', reruns: [] }, scenarios: {} };
  if (only.length && fs.existsSync(f)) { out = JSON.parse(fs.readFileSync(f, 'utf8')); out.meta.reruns.push({ at: t0, ids: only }); }
  fs.mkdirSync(D + 'diff/evidence', { recursive: true });
  const save = (id, r) => { out.scenarios[id] = { ...r, capturedAt: ts() }; out.meta.capturedTo = ts(); fs.writeFileSync(f, JSON.stringify(out, null, 1)); };
  await runAll(() => context.newPage(), start, only.length ? only : null, { onResult: save, shotsDir: D + 'diff/evidence' });
  log('expected.json written', Object.keys(out.scenarios).join(','));
} catch (e) {
  log('ERR', e.message);
  await page.screenshot({ path: D + 'capture-error.png' }).catch(() => {});
  process.exitCode = 1;
} finally { await browser.close(); }

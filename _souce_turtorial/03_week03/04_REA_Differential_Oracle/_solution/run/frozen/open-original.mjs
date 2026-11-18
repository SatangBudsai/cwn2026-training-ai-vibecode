// ต้นฉบับแช่แข็ง (frozen original) ของ Google Flights: กรุงเทพ → โตเกียว เที่ยวเดียว 15 พ.ย. 2026 (th / THB)
// เล่นซ้ำจาก HAR ของ LAB 3 แบบ offline ล้วน — ไม่มีคำขอใดออกอินเทอร์เน็ต
//   1) routeFromHAR(notFound:'fallback') ตอบคำขอที่ตรงกับ HAR พอดี
//   2) route เขียนเอง ตอบคำขอที่ "เปลี่ยนทุกครั้ง" ด้วย response ที่บันทึกไว้ (ดู installFrozenRoutes)
//   3) ที่เหลือ abort ทั้งหมด + เบราว์เซอร์ตั้ง proxy ไปพอร์ตที่ตาย กันรั่วซ้ำอีกชั้น
// ใช้เป็นโมดูล:  import { newFrozenContext, SEARCH_URL } from './open-original.mjs'
// รันตรง:       node frozen/open-original.mjs [รอบ=3]  → ทดสอบ 22 / 300 / 18 + ราคา 5 ใบแรก, วิดีโอ → gif/frozen-original.gif
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HAR = '/workspace/rea-flight-v3/har/flights.har';
export const SEARCH_URL = 'https://www.google.com/travel/flights?q=Flights+from+Bangkok+to+Tokyo+on+2026-11-15+one+way&hl=th&gl=TH&curr=THB';
// เวลาที่อัด HAR (คำขอแรก) — ตรึงนาฬิกาของหน้าไว้ที่นี่ ให้ข้อความที่อิง "วันนี้" ออกมาเหมือนเดิมทุกครั้ง
export const RECORDED_AT = '2026-10-31T17:03:15.000Z';
const CHROME = '/ms-playwright/chromium-1247/chrome-linux64/chrome';
const VIEWPORT = { width: 1366, height: 900 };

// ---------- อ่าน HAR ครั้งเดียว ----------
let harCache;
function loadHar() {
  if (harCache) return harCache;
  const entries = JSON.parse(fs.readFileSync(HAR, 'utf8')).log.entries;
  const body = (e) => {
    const c = e.response.content;
    return c.encoding === 'base64' ? Buffer.from(c.text || '', 'base64') : Buffer.from(c.text || '', 'utf8');
  };
  const headers = (e) => Object.fromEntries(e.response.headers
    .filter((h) => !/^(content-length|content-encoding|transfer-encoding|set-cookie|alt-svc|report-to|nel)$/i.test(h.name))
    .map((h) => [h.name.toLowerCase(), h.value]));
  // JS bundle ของ Google (boq): URL มีรายการโมดูล m=… และ exm=… (โมดูลที่โหลดแล้ว) ซึ่งจัดกลุ่มต่างกันตามจังหวะเวลาทุกครั้ง
  const js = entries.map((e, i) => ({ e, i })).filter(({ e }) => /gstatic\.com\/_\/mss\/.*\/m=/.test(e.request.url))
    .map(({ e, i }) => ({ i, mods: new Set(modList(e.request.url, 'm')), body: body(e), headers: headers(e) }));
  // GetShoppingResults: POST แบบ streaming มี _reqid สุ่มใน URL → จับคู่ด้วย f.req ใน body แทน
  const gsr = entries.filter((e) => e.request.url.includes('FlightsFrontendService/GetShoppingResults') && e.response.content.text)
    .map((e) => ({ freq: fReq(e.request.postData?.text), body: body(e), headers: headers(e), status: e.response.status }));
  return (harCache = { js, gsr });
}
const modList = (url, key) => (url.match(new RegExp(`/${key}=([^/?]+)`))?.[1] ?? '').split(',').filter(Boolean);
const fReq = (post) => new URLSearchParams(post || '').get('f.req') || '';

// ---------- ติดตั้ง route ทั้งหมดบน context ----------
export async function installFrozenRoutes(context, stats = newStats()) {
  const { js, gsr } = loadHar();
  // ลำดับ: Playwright ลอง route ที่ลงทะเบียนทีหลังก่อน → abort-all (ล่างสุด) ← HAR ← route เขียนเอง (บนสุด)
  await context.route('**/*', (route) => { stats.aborted.push(`${route.request().method()} ${route.request().url().slice(0, 140)}`); return route.abort('internetdisconnected'); });
  await context.routeFromHAR(HAR, { notFound: 'fallback' });
  // นับว่า HAR ตอบไปกี่คำขอ (คำขอที่ไม่ fallback มาถึง abort-all และไม่ถูก route เขียนเองจับ)
  context.on('requestfinished', (r) => { if (!stats.custom.has(r)) stats.har++; });

  // (ก) JS bundle: ประกอบ response จาก bundle ที่อัดไว้ซึ่งมีโมดูลที่ขอ เรียงตามลำดับในการอัด
  //     bundle ใดถูกส่งให้หน้านี้แล้วจะไม่ส่งซ้ำ (กันโค้ดรันซ้ำ) — ถ้าไม่เหลืออะไรตอบเป็น JS ว่าง
  const served = new WeakMap(); // page → Set(index ของ bundle ที่ส่งแล้ว)
  await context.route(/gstatic\.com\/_\/mss\/.*\/m=/, (route) => {
    const req = route.request();
    const want = modList(req.url(), 'm');
    const page = req.frame()?.page();
    let done = served.get(page);
    if (!done) served.set(page, (done = new Set()));
    // ส่งทุก bundle ที่ยังไม่ส่ง ตั้งแต่ต้นจนถึง bundle สุดท้ายที่มีโมดูลที่ขอ (ตามลำดับการอัด)
    // ไม่ใช่เฉพาะ bundle ที่มีโมดูลตรง — เพราะ bundle หลัง ๆ อ้างฟังก์ชันที่นิยามใน bundle ก่อนหน้า (_.QH is not a function)
    const last = Math.max(-1, ...js.filter((b) => want.some((m) => b.mods.has(m))).map((b) => b.i));
    const parts = js.filter((b) => !done.has(b.i) && b.i <= last);
    const missing = want.filter((m) => !js.some((b) => b.mods.has(m)));
    if (missing.length) stats.missingModules.push(...missing);
    parts.forEach((b) => done.add(b.i));
    stats.custom.add(req); stats.js++;
    return route.fulfill({
      status: 200,
      headers: parts[0]?.headers ?? { 'content-type': 'text/javascript; charset=UTF-8' },
      body: Buffer.concat(parts.flatMap((b) => [b.body, Buffer.from('\n')])),
    });
  });

  // (ข) GetShoppingResults: ตอบด้วย response ที่อัดไว้ซึ่ง f.req ตรงกัน (ไม่สน _reqid / f.sid ที่เปลี่ยนทุกครั้ง)
  await context.route(/FlightsFrontendService\/GetShoppingResults/, (route) => {
    const req = route.request();
    const hit = gsr.find((g) => g.freq === fReq(req.postData()));
    if (!hit) { stats.gsrMiss.push(fReq(req.postData()).slice(0, 300)); return route.fallback(); }
    stats.custom.add(req); stats.gsr++;
    return route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
  });
  return stats;
}
export const newStats = () => ({ har: 0, js: 0, gsr: 0, custom: new WeakSet(), aborted: [], gsrMiss: [], missingModules: [] });

export async function newFrozenContext({ video } = {}) {
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    // กันรั่วชั้นที่สอง: ถ้ามีคำขอใดหลุด route ไป จะชน proxy ที่ไม่มีอยู่จริง
    args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>'],
  });
  const context = await browser.newContext({
    locale: 'th-TH', timezoneId: 'Asia/Bangkok', viewport: VIEWPORT, serviceWorkers: 'block',
    ...(video ? { recordVideo: { dir: video, size: VIEWPORT } } : {}),
  });
  await context.clock.setFixedTime(new Date(RECORDED_AT)); // ตรึง Date (timer ยังเดินตามจริง)
  const stats = await installFrozenRoutes(context);
  return { browser, context, stats };
}

// ---------- สถานการณ์ทดสอบ ----------
const rowsOf = (page) => page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
// ราคา 5 ใบแรก: ใบเที่ยวบินแต่ละใบคือ li ที่มีปุ่มรายละเอียด ราคาเป็นข้อความ ฿x,xxx
const top5 = (page) => page.evaluate(() => [...document.querySelectorAll('li')]
  .filter((li) => li.querySelector('[aria-label^="รายละเอียดเที่ยวบิน"]'))
  .map((li) => (li.innerText.match(/฿\s?[\d,]+/) || [''])[0].replace(/\s/g, ''))
  .slice(0, 5));
// รอจนจำนวนแถวนิ่ง (ค่าเดิม 4 ครั้งติดกัน ห่างกัน 250 ms) และไม่ใช่ 0
async function stableCount(page, rows) {
  let last = -1, same = 0;
  for (let i = 0; i < 120 && same < 4; i++) {
    const n = await rows.count();
    same = n === last && n > 0 ? same + 1 : 0;
    last = n;
    await page.waitForTimeout(250);
  }
  return last;
}
const settle = (page) => page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

export async function runScenario(page) {
  const rows = rowsOf(page);
  const r = {};
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
  await rows.first().waitFor({ timeout: 30_000 });
  await settle(page);
  await stableCount(page, rows);
  r.initial = { count: await rows.count(), top5: await top5(page) };

  const more = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
  await more.scrollIntoViewIfNeeded();
  await more.click();
  for (let i = 0; i < 60 && (await rows.count()) <= r.initial.count; i++) await page.waitForTimeout(250);
  await settle(page);
  await stableCount(page, rows);
  r.more = { count: await rows.count(), top5: await top5(page) };

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: /^จำนวนครั้งที่แวะพัก/ }).click();
  // ระหว่างกล่องตัวกรองเปิด ส่วนที่เหลือของหน้าถูกซ่อนจาก accessibility tree (นับได้ 0) → รอ response แล้วปิดกล่องก่อนนับ
  const filtered = page.waitForResponse(/GetShoppingResults/, { timeout: 30_000 });
  await page.getByRole('radio', { name: /บินตรงเท่านั้น/ }).click();
  await filtered;
  await page.getByRole('button', { name: 'ปิดกล่องโต้ตอบ' }).first().click({ timeout: 3000 }).catch(() => page.keyboard.press('Escape'));
  await settle(page);
  await stableCount(page, rows);
  r.nonstop = { count: await rows.count(), top5: await top5(page) };
  return r;
}

// ---------- รันตรง: ทดสอบซ้ำ N รอบ ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const N = Number(process.argv[2] || 3);
  const EXPECT = { initial: 22, more: 300, nonstop: 18 };
  const videoDir = path.join(ROOT, 'frozen', 'video');
  fs.rmSync(videoDir, { recursive: true, force: true });
  const rounds = [];
  for (let k = 1; k <= N; k++) {
    const t0 = Date.now();
    const { browser, context, stats } = await newFrozenContext({ video: k === 1 ? videoDir : undefined });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    let r, err;
    try { r = await runScenario(page); } catch (e) { err = String(e.message || e).split('\n')[0]; }
    const vid = page.video();
    await context.close();
    await browser.close();
    if (vid) fs.renameSync(await vid.path(), path.join(videoDir, 'frozen-original.webm'));
    const round = {
      round: k, ms: Date.now() - t0, ...r, error: err,
      pass: !!r && Object.entries(EXPECT).every(([s, n]) => r[s].count === n),
      network: { fromHar: stats.har, customJs: stats.js, customGsr: stats.gsr, aborted: stats.aborted.length, gsrMiss: stats.gsrMiss.length, missingModules: [...new Set(stats.missingModules)] },
      abortedSample: [...new Set(stats.aborted.map((s) => s.replace(/\?.*/, '')))].slice(0, 15),
      pageErrors: errors.slice(0, 5),
    };
    rounds.push(round);
    console.log(`รอบ ${k}: ${JSON.stringify({ initial: r?.initial, more: r?.more, nonstop: r?.nonstop, pass: round.pass, err, network: round.network })}`);
  }
  const sig = (r) => JSON.stringify([r.initial, r.more, r.nonstop]);
  const identical = rounds.every((r) => sig(r) === sig(rounds[0]));
  fs.writeFileSync(path.join(ROOT, 'frozen', 'results.json'), JSON.stringify({ expect: EXPECT, identical, rounds }, null, 2));
  console.log(`ผ่านทุกรอบ: ${rounds.every((r) => r.pass)} · เหมือนกันทุกรอบ: ${identical}`);

  // วิดีโอรอบ 1 → GIF (ffmpeg palettegen/paletteuse)
  const webm = path.join(videoDir, 'frozen-original.webm');
  if (fs.existsSync(webm)) {
    fs.mkdirSync(path.join(ROOT, 'gif'), { recursive: true });
    const gif = path.join(ROOT, 'gif', 'frozen-original.gif');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf',
      'fps=5,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', gif]);
    console.log('gif:', path.relative(ROOT, gif), `${(fs.statSync(gif).size / 1e6).toFixed(1)} MB`);
  }
  process.exit(rounds.every((r) => r.pass) && identical ? 0 : 1);
}

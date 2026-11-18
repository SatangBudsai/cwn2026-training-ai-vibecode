// เส้นทางลูกค้า Google Flights: กรุงเทพ → โตเกียว เที่ยวเดียว 15 พ.ย. 2026 (th / THB)
// ผลค้นหา → "ดูเที่ยวบินเพิ่มเติม" → ตัวกรองบินตรง → ขยายรายละเอียด 1 ใบ → "เลือกเที่ยวบิน" 1 ใบ → หยุดที่หน้าตัวเลือกการจอง
// บันทึก: har/flights.har (เครือข่าย) · trace/journey.zip (trace) · video/*.webm (แปลงเป็น gif ด้วย scripts/webm2gif.py)
// ขอบเขต: ไม่ล็อกอิน ไม่จ่ายเงิน ไม่กด "ดำเนินการต่อ" ไปเว็บสายการบิน/ตัวแทน
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SEARCH_URL = 'https://www.google.com/travel/flights?q=Flights+from+Bangkok+to+Tokyo+on+2026-11-15+one+way&hl=th&gl=TH&curr=THB';
const CHROME = '/ms-playwright/chromium-1247/chrome-linux64/chrome';
const out = (...p) => path.join(ROOT, ...p);
for (const d of ['har', 'trace', 'video', 'gif', 'journey']) fs.mkdirSync(out(d), { recursive: true });

const log = [];
const step = async (page, name, fn) => {
  const t0 = Date.now();
  await fn();
  const shot = out('journey', `${String(log.length + 1).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: shot });
  log.push({ step: name, ms: Date.now() - t0, url: page.url(), screenshot: path.relative(ROOT, shot) });
  console.log(`✓ ${name} (${Date.now() - t0} ms)`);
};

const browser = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined });
const context = await browser.newContext({
  locale: 'th-TH',
  timezoneId: 'Asia/Bangkok',
  viewport: { width: 1366, height: 900 },
  recordHar: { path: out('har', 'flights.har'), content: 'embed' },
  recordVideo: { dir: out('video'), size: { width: 1366, height: 900 } },
});
await context.tracing.start({ screenshots: true, snapshots: true, sources: true, title: 'BKK→TYO journey' });
const page = await context.newPage();

// กันไม่ให้ออกนอก Google (เว็บสายการบิน/ตัวแทน): ดักเฉพาะ URL ที่ไม่ใช่ Google แล้วยกเลิกถ้าเป็น navigation
// (ไม่ดักคำขอของ Google เอง เพราะการดักทุกคำขอทำให้ HAR ไม่มี body ของ response แบบ streaming เช่น GetShoppingResults)
const isGoogle = (u) => /(^|\.)(google|gstatic|googleapis|googleusercontent|ggpht|doubleclick|youtube)\.com$|(^|\.)google\.co\.th$/.test(u.hostname);
await context.route((u) => !isGoogle(u), (route) =>
  route.request().isNavigationRequest() ? route.abort() : route.continue());

// Google ยกเลิก (abort) response แบบ streaming ของ FlightsFrontendService หลังได้ข้อมูลครบ
// HAR ของเบราว์เซอร์จึงไม่มี body (net::ERR_ABORTED) → เก็บ chunk เองผ่าน CDP Network.streamResourceContent
// แล้วนำไปเติมใน HAR หลังปิด context (ดู mergeStreams)
const streams = new Map(); // requestId → { url, postData, chunks: [] }
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.requestWillBeSent', (e) => {
  if (e.request.url.includes('FlightsFrontendService/')) streams.set(e.requestId, { url: e.request.url, postData: e.request.postData ?? null, chunks: [] });
});
cdp.on('Network.responseReceived', async (e) => {
  const s = streams.get(e.requestId);
  if (!s) return;
  try {
    const { bufferedData } = await cdp.send('Network.streamResourceContent', { requestId: e.requestId });
    if (bufferedData) s.chunks.push(Buffer.from(bufferedData, 'base64'));
  } catch (err) { s.error = String(err.message || err); }
});
cdp.on('Network.dataReceived', (e) => {
  const s = streams.get(e.requestId);
  if (s && e.data) s.chunks.push(Buffer.from(e.data, 'base64'));
});

const rows = () => page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
const waitIdle = () => page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

try {
  await step(page, 'results', async () => {
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
    await rows().first().waitFor({ timeout: 30_000 });
    await waitIdle();
  });
  const before = await rows().count();

  await step(page, 'more-flights', async () => {
    const more = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
    await more.scrollIntoViewIfNeeded();
    await more.click();
    // ปุ่มกลายเป็น "ดูเที่ยวบินน้อยลง" ทันที แต่แถวใหม่มาจากคำขอเครือข่าย จึงรอจนจำนวนแถวเพิ่ม
    await page.getByRole('button', { name: 'ดูเที่ยวบินน้อยลง' }).waitFor({ timeout: 30_000 });
    for (let i = 0; i < 60 && (await rows().count()) <= before; i++) await page.waitForTimeout(500);
    await waitIdle();
  });
  const afterMore = await rows().count();

  await step(page, 'nonstop-filter', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: /^จำนวนครั้งที่แวะพัก/ }).click();
    await page.getByRole('radio', { name: /บินตรงเท่านั้น/ }).click();
    await waitIdle();
    await page.getByRole('button', { name: 'ปิดกล่องโต้ตอบ' }).first().click().catch(() => page.keyboard.press('Escape'));
    await page.getByRole('button', { name: /^จำนวนครั้งที่แวะพัก.*บินตรง/ }).first().waitFor({ timeout: 15_000 }).catch(() => {});
    await waitIdle();
  });
  const afterFilter = await rows().count();

  let chosen = '';
  await step(page, 'expand-details', async () => {
    const r = rows().first();
    chosen = (await r.getAttribute('aria-label')) || '';
    await r.scrollIntoViewIfNeeded();
    await r.click();
    await page.getByRole('button', { name: /^เลือกเที่ยวบิน/ }).first().waitFor({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  });

  await step(page, 'select-flight', async () => {
    const sel = page.getByRole('button', { name: /^เลือกเที่ยวบิน/ }).filter({ visible: true }).first();
    await sel.scrollIntoViewIfNeeded();
    await sel.click();
    await page.waitForURL(/\/travel\/flights\/booking/, { timeout: 30_000 });
    await page.getByText(/ตัวเลือกการจอง/).first().waitFor({ timeout: 30_000 });
    await waitIdle();
  });

  fs.writeFileSync(out('journey', 'journey-log.json'), JSON.stringify({ url: SEARCH_URL, rows: { before, afterMore, afterFilter }, chosen, steps: log }, null, 2));
  console.log({ before, afterMore, afterFilter, chosen: chosen.slice(0, 160) });
} finally {
  await context.tracing.stop({ path: out('trace', 'journey.zip') });
  const video = page.video();
  await context.close(); // เขียน HAR + วิดีโอตอนปิด context
  await browser.close();
  mergeStreams();
  if (video) {
    const dst = out('video', 'journey.webm');
    fs.renameSync(await video.path(), dst);
    console.log('video:', path.relative(ROOT, dst));
  }
}

// เติม body ที่เก็บจาก CDP ลงใน entry ของ HAR ที่ไม่มี body (จับคู่ด้วย URL + postData ตามลำดับ)
function mergeStreams() {
  const harPath = out('har', 'flights.har');
  const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
  const pending = [...streams.values()].filter((s) => s.chunks.length);
  let merged = 0;
  for (const e of har.log.entries) {
    const c = e.response.content;
    if (c.text || !e.request.url.includes('FlightsFrontendService/')) continue;
    const i = pending.findIndex((s) => s.url === e.request.url && (s.postData ?? null) === (e.request.postData?.text ?? null));
    if (i < 0) continue;
    const [s] = pending.splice(i, 1);
    const body = Buffer.concat(s.chunks);
    c.text = body.toString('utf8');
    c.size = body.length;
    e._comment = 'response body เติมจาก CDP Network.streamResourceContent (เบราว์เซอร์ abort stream จึงไม่มี body ใน HAR เดิม)';
    merged++;
  }
  fs.writeFileSync(harPath, JSON.stringify(har, null, 2));
  console.log(`HAR: เติม body จาก CDP ${merged}/${streams.size} คำขอ FlightsFrontendService`);
}

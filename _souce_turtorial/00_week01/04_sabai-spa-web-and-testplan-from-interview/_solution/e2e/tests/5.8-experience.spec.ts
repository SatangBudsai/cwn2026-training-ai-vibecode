/**
 * หัวข้อ 5.8 ตัวช่วยเลือก แชต ภาษา และบรรยากาศ (TC-EXPR-01 ถึง TC-EXPR-10)
 * ที่มา: TEST-PLAN.md บรรทัด 1489-1674
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, plan, lineAmount, settle, type App } from '../fixtures';

// ---------------------------------------------------------------- helper ของหัวข้อนี้

const OWNER_DATE = '2026-06-17';

/** regex ของแผน [฀-๿] คือ U+0E00–U+0E7F (รวม ฿ U+0E3F) */
const THAI_BLOCK = /[฀-๿]/;
/** ตัวอักษรไทยจริง ไม่รวม ฿ ซึ่งเป็นสัญลักษณ์เงิน ใช้ใน TC-EXPR-04 ส่วนที่คำตอบอังกฤษแสดงราคา */
const THAI_LETTER = /[฀-฾เ-๿]/;
/** ชื่อบริการ AI ภายนอกที่นับใน NFR-14 */
const AI_HOST = /openai|anthropic|claude\.ai|generativelanguage|gemini|vertexai|cohere|huggingface|mistral|replicate|deepseek|azure.*(cognitive|openai)|groq/i;

/** JPEG 16×16 ที่ถอดรหัสได้จริง ใช้เป็น selfie-test.jpg */
const JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkACpP/9k=';

/** รหัสนักบำบัดตามลำดับการ์ดบนจอ */
async function cardOrder(page: Page): Promise<string[]> {
  return page.locator('[data-testid^="therapist-card-"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.testid!.replace('therapist-card-', '')));
}

function serviceOf(href: string | null): string {
  return /[?&]service=([A-Za-z0-9]+)/.exec(href ?? '')?.[1] ?? '';
}

function aiRequests(app: App, page: Page): string[] {
  return app.requestsOf(page).map((r) => r.url).filter((u) => AI_HOST.test(new URL(u).hostname));
}

function botMessages(page: Page): Locator {
  return page.locator('[data-testid^="chat-message-"][data-role="bot"]');
}

type Reply = { el: Locator; text: string };

/** รอคำตอบใหม่ของแชตหลัง action แล้วคืน element กับข้อความ · ไม่มีคำตอบใน 15 วินาทีคืนข้อความว่าง */
async function waitReply(page: Page, action: () => Promise<unknown>): Promise<Reply> {
  const bots = botMessages(page);
  const before = await bots.count();
  await action();
  const el = bots.nth(before);
  await el.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
  await settle(page);
  const text = await el.innerText({ timeout: 800 }).catch(() => '');
  return { el, text };
}

async function chatSay(page: Page, message: string): Promise<Reply> {
  return waitReply(page, async () => {
    await page.getByTestId('chat-input').fill(message);
    await page.getByTestId('chat-send').click();
  });
}

async function chatOpen(page: Page) {
  await page.getByTestId('chat-open').click();
  await page.getByTestId('chat-panel').waitFor({ state: 'visible' });
}

/** จุดที่ตรงกับ regex ของแผนใน document.body.innerText พร้อมข้อความรอบข้าง */
async function thaiHits(page: Page): Promise<string[]> {
  const text = await page.evaluate(() => document.body.innerText);
  return text.match(/.{0,18}[฀-๿]+.{0,12}/g) ?? [];
}

/** header-lang-* บนจอแคบอาจอยู่ในเมนู */
async function clickHeaderLang(page: Page, lang: string) {
  const btn = page.getByTestId(`header-lang-${lang}`);
  if (!(await btn.isVisible())) await page.getByTestId('header-menu-toggle').click();
  await btn.click();
}

/** ข้อมูลใน localStorage, sessionStorage, IndexedDB, Cache */
async function readStorage(page: Page) {
  return page.evaluate(async () => {
    const dump = (s: Storage) => {
      const out: string[] = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i) ?? ''; out.push(`${k}=${s.getItem(k)}`); }
      return out.join('\n');
    };
    const idb: string[] = [];
    let idbBlobs = 0;
    try {
      for (const info of await indexedDB.databases()) {
        if (!info.name) continue;
        const db = await new Promise<IDBDatabase>((res, rej) => {
          const r = indexedDB.open(info.name!);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        for (const store of Array.from(db.objectStoreNames)) {
          const rows = await new Promise<unknown[]>((res, rej) => {
            const r = db.transaction(store).objectStore(store).getAll();
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });
          for (const row of rows) {
            idb.push(`${info.name}/${store}: ${JSON.stringify(row, (_k, v) => {
              if (v instanceof Blob) { idbBlobs++; return `[Blob ${v.type}]`; }
              return v;
            })}`);
          }
        }
        db.close();
      }
    } catch (e) { idb.push(`อ่านไม่ได้: ${String(e)}`); }
    const cacheUrls: string[] = [];
    try {
      for (const name of await caches.keys()) {
        const c = await caches.open(name);
        for (const req of await c.keys()) cacheUrls.push(req.url);
      }
    } catch { /* ไม่มี Cache API */ }
    return { local: dump(localStorage), session: dump(sessionStorage), idb: idb.join('\n'), idbBlobs, cacheUrls };
  });
}

/** รายการที่พบรูปในที่เก็บข้อมูล ต้องเป็น [] */
async function storageImageFindings(page: Page): Promise<string[]> {
  const s = await readStorage(page);
  const findings: string[] = [];
  const bad = /data:image|selfie-test/i;
  const hasB64 = (t: string) => t.includes(JPEG_B64) || t.includes(JPEG_B64.slice(0, 80));
  for (const [name, text] of [['localStorage', s.local], ['sessionStorage', s.session], ['IndexedDB', s.idb]] as const) {
    if (bad.test(text) || hasB64(text)) findings.push(`${name}: ${text.slice(0, 160)}`);
  }
  if (s.idbBlobs > 0) findings.push(`IndexedDB มี Blob ${s.idbBlobs} รายการ`);
  for (const u of s.cacheUrls) if (/selfie-test|^blob:|data:image/i.test(u)) findings.push(`Cache: ${u.slice(0, 120)}`);
  return findings;
}

/** request ตั้งแต่ลำดับ from ที่พกข้อมูลรูป ต้องเป็น [] */
function imageRequests(app: App, page: Page, from: number): string[] {
  const out: string[] = [];
  for (const r of app.requestsOf(page).slice(from)) {
    const body = r.postData ?? '';
    const reasons: string[] = [];
    const isWrite = r.method === 'POST' || r.method === 'PUT' || r.method === 'PATCH';
    if (/multipart\/form-data/i.test(r.contentType)) reasons.push('multipart');
    if (isWrite && /^image\//i.test(r.contentType)) reasons.push('content-type รูป');
    if (/data:image/i.test(body) || /data:image/i.test(r.url)) reasons.push('data:image');
    if (/selfie-test/i.test(body) || /selfie-test/i.test(r.url)) reasons.push('ชื่อไฟล์');
    if (body.includes(JPEG_B64.slice(0, 80)) || r.url.includes(JPEG_B64.slice(0, 80))) reasons.push('base64');
    if (AI_HOST.test(new URL(r.url).hostname)) reasons.push('บริการ AI ภายนอก');
    if (reasons.length) out.push(`${r.method} ${r.url.slice(0, 100)} (${reasons.join(', ')})`);
  }
  return out;
}

/** กล่องผลเซลฟี่ · ไม่ขึ้นภายในเวลาคืน false */
async function waitSkinResult(page: Page): Promise<boolean> {
  const ok = await page.getByTestId('skin-result').waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
  await settle(page);
  return ok;
}

/** อ่านค่าล้นจอของหน้าที่เปิดอยู่ */
async function measureWidth(page: Page) {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

/** ซ่อน vignette และคำใบ้บนภาพทัวร์เฉพาะตอนเปรียบเทียบ เพราะคำใบ้หายหลังลากครั้งแรก */
const HIDE_TOUR_OVERLAY = '[data-testid="tour-viewport"] > :not(:first-child){visibility:hidden !important}';

/** ความต่างเฉลี่ยของภาพ 2 ภาพ (0–255) ถอดรหัสใน browser เพราะชุดทดสอบไม่มี library เทียบภาพ */
async function imageDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(async ({ a, b }) => {
    const load = async (b64: string) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext('2d')!;
      x.drawImage(bmp, 0, 0);
      return x.getImageData(0, 0, c.width, c.height);
    };
    const [p, q] = await Promise.all([load(a), load(b)]);
    if (p.width !== q.width || p.height !== q.height) return 255;
    let sum = 0;
    for (let i = 0; i < p.data.length; i += 4) {
      sum += Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2]);
    }
    return sum / ((p.data.length / 4) * 3);
  }, { a: a.toString('base64'), b: b.toString('base64') });
}

/** ลากแนวนอนทีละช่วงจนมุมครบรอบ คืนลำดับมุมและความต่างของภาพ */
async function dragFullTurn(page: Page, step: number) {
  const v = page.getByTestId('tour-viewport');
  await v.scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: HIDE_TOUR_OVERLAY });
  await page.waitForTimeout(600);
  const angle = async () => Number(await v.getAttribute('aria-valuenow'));
  const shot = () => v.screenshot({ animations: 'disabled' });
  // รูปพาโนรามาโหลดเป็นช่วง ต้องรอภาพนิ่งก่อนเก็บเป็นภาพเริ่ม
  let start = await shot();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(400);
    const next = await shot();
    const moved = await imageDiff(page, start, next);
    start = next;
    if (moved < 0.2) break;
  }
  const angles = [await angle()];
  const diffs: number[] = [];
  let rate = 0;
  for (let i = 0; i < 40; i++) {
    const cur = angles[angles.length - 1];
    const remaining = (360 - cur) % 360;
    if (i > 0 && remaining === 0) break;
    const px = rate ? Math.max(1, Math.min(step, Math.round(remaining / rate))) : step;
    const box = await v.boundingBox();
    if (!box) break;
    const x = box.x + box.width - 20;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - px, y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const next = await angle();
    angles.push(next);
    diffs.push(await imageDiff(page, start, await shot()));
    if (i === 0) {
      rate = Math.abs(next - cur) / px;
      if (!rate) break; // ลากแล้วมุมไม่เปลี่ยน
    }
    if (next < cur) break; // วนผ่าน 0° แล้ว
  }
  const last = angles[angles.length - 1];
  return {
    angles,
    /** ระยะเชิงมุมจากภาพเริ่ม */
    fromStart: Math.min(last % 360, 360 - (last % 360)),
    maxDiff: diffs.length ? Math.max(...diffs) : 0,
    finalDiff: diffs.length ? diffs[diffs.length - 1] : 255,
  };
}

const SAME_IMAGE_MAX_DIFF = 10;
const CHANGED_IMAGE_MIN_DIFF = 15;

// ---------------------------------------------------------------- test

test.describe('5.8 ตัวช่วยเลือก แชต ภาษา และบรรยากาศ', () => {
  test('TC-EXPR-01 ตัวกรอง 4.5 ดาวขึ้นไปแสดงเฉพาะคนที่ถึงขอบและคงอยู่หลังรีโหลดและจากลิงก์ตรง', {
    tag: ['@P2', '@5.8'],
    annotation: plan({
      expected: 'ขั้น 1: แสดง 6 คน · การ์ด T04 มีข้อความ "ยังไม่มีรีวิว"\nขั้น 2–4: แสดง 3 คน ตามลำดับ T01, T05, T02 · ไม่แสดง T03, T06, T04\n(ถ้าใช้ มากกว่า 4.5 จะเหลือ 2 คนและหาย T02 · ถ้าใช้ค่าขอบ 4.4 จะได้ 4 คนและมี T03 · ถ้าตัวกรองไม่คงอยู่ ขั้น 3 จะกลับเป็น 6 คน)',
      source: '[D] §4 รีวิว · [D][R] E219–E222 · [D] E226 · [R] ⚠️A-06 ลำดับ',
      frbr: 'FR-71, BR-47, BR-49',
      rules: 'R86',
      technique: 'Happy path, Boundary, State',
      timing: 'ทันที · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    const expectedOrder = ['T01', 'T05', 'T02'];

    await test.step('1. เปิด /th/therapists นับการ์ดและอ่านคะแนนของ T04', async () => {
      await app.goto(page, '/th/therapists');
      await app.check(page.locator('[data-testid^="therapist-card-"]'), 'ขั้น 1 แสดงการ์ด 6 คน', async (el) => {
        await expect.soft(el).toHaveCount(6);
      });
      await app.check(page.getByTestId('therapist-rating-T04'), 'ขั้น 1 การ์ด T04 มี "ยังไม่มีรีวิว" ไม่มี 0.0', async (el) => {
        await expect.soft(el).toContainText('ยังไม่มีรีวิว');
        await expect.soft(el).not.toContainText('0.0');
      });
    });

    await test.step('2. เปิดตัวกรอง 4.5 ดาวขึ้นไปแล้วอ่านรายชื่อ', async () => {
      await page.getByTestId('therapists-filter').click();
      await page.waitForURL(/[?&]filter=4\.5/, { timeout: 10_000 }).catch(() => {});
      await settle(page);
      await app.checkValue(page, 'ขั้น 2 URL มี ?filter=4.5', new URL(page.url()).search, (v) => {
        expect.soft(v).toContain('filter=4.5');
      });
      await app.check(page.getByTestId('therapists-grid'), 'ขั้น 2 แสดง T01, T05, T02 ตามลำดับ', async () => {
        expect.soft(await cardOrder(page)).toEqual(expectedOrder);
      });
    });

    await test.step('3. รีโหลดแล้วอ่านรายชื่ออีกครั้ง', async () => {
      await app.reload(page);
      await app.check(page.getByTestId('therapists-grid'), 'ขั้น 3 หลังรีโหลดยังเป็น T01, T05, T02', async () => {
        expect.soft(await cardOrder(page)).toEqual(expectedOrder);
      });
    });

    await test.step('4. เปิดแท็บใหม่ที่ /th/therapists?filter=4.5 แล้วอ่านรายชื่อ', async () => {
      const tab = await app.actor('new-tab');
      await app.goto(tab.page, '/th/therapists?filter=4.5');
      await app.check(tab.page.getByTestId('therapists-grid'), 'ขั้น 4 ลิงก์ตรงแสดง T01, T05, T02 ไม่มี T03, T06, T04', async () => {
        expect.soft(await cardOrder(tab.page)).toEqual(expectedOrder);
      });
    });
  });

  test('TC-EXPR-02 คะแนนเฉลี่ยบนการ์ดตรงกับค่าที่คิดจากรีวิวเก่า', {
    tag: ['@P2', '@5.8'],
    annotation: plan({
      expected: 'T01 5.0 ((5+5+5) ÷ 3 = 15 ÷ 3)\nT05 4.6 ((5+5+5+4+4) ÷ 5 = 23 ÷ 5)\nT02 4.5 ((5+4) ÷ 2 = 9 ÷ 2)\nT03 4.4 ((5+5+4+4+4) ÷ 5 = 22 ÷ 5)\nT06 4.0 ((5+3) ÷ 2 = 8 ÷ 2)\n(ถ้าปัดเป็นจำนวนเต็ม T02 จะได้ 5 หรือ 4 · T03 จะได้ 4 · ถ้าไม่ตั้งทศนิยม T01 จะแสดง 5 แทน 5.0)\nค่าที่เหลือเป็น unit test ไม่ตรวจบนเว็บ: 4.44 → 4.4 ไม่ผ่าน · 4.45 → 4.5 ผ่าน · 4.46 → 4.5 ผ่าน · 1 รีวิว 5 ดาว → 5.0 ผ่าน',
      source: '[D] §2 ดาว · [D][R] คะแนนใน TEST-DATA · [D][R] E228 · [R] ⚠️A-37',
      frbr: 'FR-71, BR-48, BR-49',
      rules: 'R86, R87',
      technique: 'Boundary, Equivalence partition',
      timing: 'ทันที · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    const table: [string, string][] = [['T01', '5.0'], ['T05', '4.6'], ['T02', '4.5'], ['T03', '4.4'], ['T06', '4.0']];
    const expectedMap = Object.fromEntries(table);
    /** คะแนนต้นข้อความ เช่น "5.0 3 รีวิว" → "5.0" · "5 3 รีวิว" → "5" */
    const readRatings = async () => {
      const out: Record<string, string> = {};
      for (const [id] of table) {
        const text = await page.getByTestId(`therapist-rating-${id}`).innerText();
        out[id] = /^\s*(\d+(?:\.\d+)?)/.exec(text)?.[1] ?? text;
      }
      return out;
    };

    await test.step('1. เปิด /th/therapists โดยไม่เปิดตัวกรอง', async () => {
      await app.goto(page, '/th/therapists');
    });

    await test.step('2. อ่านคะแนนบนการ์ด T01, T05, T02, T03, T06', async () => {
      for (const [id, score] of table) {
        await app.check(page.getByTestId(`therapist-rating-${id}`), `ขั้น 2 ${id} คะแนน ${score}`, async (el) => {
          const text = await el.innerText();
          expect.soft(/^\s*(\d+(?:\.\d+)?)/.exec(text)?.[1] ?? text).toBe(score);
        });
      }
    });

    await test.step('3. รีโหลดแล้วอ่านอีกครั้ง', async () => {
      await app.reload(page);
      await app.checkValue(page, 'ขั้น 3 หลังรีโหลดคะแนนทั้ง 5 คนเท่าเดิม', await readRatings(), (v) => {
        expect.soft(v).toEqual(expectedMap);
      });
    });
  });

  test('TC-EXPR-03 แบบทดสอบ 4 ข้อแสดงผลเมื่อครบ ตารางอารมณ์ 3 แบบ และถามซ้ำได้ผลเดิม', {
    tag: ['@P3', '@5.8'],
    annotation: plan({
      expected: 'ค่าเข้าและผลของแบบทดสอบ:\nตอบ 3 ข้อ → ยังไม่แสดงผล แนะนำ 0 รายการ ไม่มีปุ่มจอง\nตอบ 4 ข้อ → แนะนำ 1 รายการจาก S01–S07 หรือ P01 มีเหตุผล 1 ชุด และปุ่มจอง 1 ปุ่ม\nขอข้อที่ 5 → ไม่มีข้อที่ 5 จำนวนคำถามรวม 4 ข้อ\nขั้น 4: บริการในหน้าจองตรงกับรายการที่แนะนำ\nตารางอารมณ์: เหนื่อย → S02 · เครียด → S04 · ปวดเมื่อย → S03 (สลับกันหรือแนะนำ S01 ทุกอารมณ์ถือว่าผิด)\nขั้น 6: ผลทั้ง 20 รอบเหมือนกันทุกตัวอักษร · request ไปบริการ AI ภายนอก 0 ครั้ง',
      source: '[R] ⚠️A-25 · [R] ⚠️A-24 · [D] §4 หลังร้านและข้อมูลส่วนตัว · F-ร้าน 21',
      frbr: 'FR-67, FR-68, FR-69, FR-70, BR-50, NFR-14',
      rules: 'R101, R102, R103',
      technique: 'Boundary, Equivalence partition, Happy path',
      timing: 'ทันที',
    }),
  }, async ({ page, app }) => {
    test.setTimeout(8 * 60_000);
    const firstOption = (q: number) => page.locator(`[data-testid^="quiz-option-q${q}-"]`).first();
    const answerThree = async () => { for (const q of [1, 2, 3]) await firstOption(q).click(); };
    let recommended = '';

    await test.step('1. เปิด /th/quiz ตอบ 3 ข้อแล้วดูว่ามีผลหรือไม่', async () => {
      await app.goto(page, '/th/quiz');
      await answerThree();
      await app.check(page.getByTestId('quiz-progress'), 'ตอบ 3 ข้อ ยังไม่มีผลและไม่มีปุ่มจอง', async () => {
        await expect.soft(page.getByTestId('quiz-result')).toHaveCount(0);
        await expect.soft(page.getByTestId('quiz-service-name')).toHaveCount(0);
        await expect.soft(page.getByTestId('quiz-book')).toHaveCount(0);
      });
    });

    await test.step('2–3. ตอบข้อที่ 4 นับรายการแนะนำ เหตุผล ปุ่มจอง และหาข้อที่ 5', async () => {
      await app.check(page.locator('[data-testid^="quiz-question-"]'), 'จำนวนคำถามรวม 4 ข้อ ไม่มีข้อที่ 5', async (el) => {
        await expect.soft(el).toHaveCount(4);
      });
      await firstOption(4).click();
      await page.getByTestId('quiz-submit').click();
      await page.getByTestId('quiz-result').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await settle(page);
      await app.check(page.getByTestId('quiz-result'), 'ตอบ 4 ข้อ แนะนำ 1 รายการ เหตุผล 1 ชุด ปุ่มจอง 1 ปุ่ม', async () => {
        await expect.soft(page.getByTestId('quiz-service-name')).toHaveCount(1);
        await expect.soft(page.getByTestId('quiz-reason')).toHaveCount(1);
        await expect.soft(page.getByTestId('quiz-reason')).not.toBeEmpty();
        await expect.soft(page.getByTestId('quiz-book')).toHaveCount(1);
      });
      if (await page.getByTestId('quiz-book').count()) {
        recommended = serviceOf(await page.getByTestId('quiz-book').getAttribute('href'));
      }
      await app.checkValue(page, 'รายการแนะนำอยู่ใน S01–S07 หรือ P01', recommended, (v) => {
        expect.soft(v).toMatch(/^(S0[1-7]|P01)$/);
      });
      await app.check(page.getByTestId('quiz-result'), 'หลังส่งคำตอบไม่มีคำถามข้อที่ 5', async () => {
        await expect.soft(page.getByTestId('quiz-question-4')).toHaveCount(0);
      });
    });

    await test.step('4. กดปุ่มจองแล้วอ่านบริการที่ถูกเลือกในหน้าจอง', async () => {
      if (!(await page.getByTestId('quiz-book').count()) || !recommended) {
        await app.checkValue(page, 'ขั้น 4 ไม่มีปุ่มจองจากผลแบบทดสอบ', recommended, (v) => { expect.soft(v).not.toBe(''); });
        return;
      }
      await page.getByTestId('quiz-book').click();
      await page.waitForURL(/\/booking/, { timeout: 15_000 });
      await page.waitForSelector('html[data-ready="true"]');
      await settle(page);
      await app.check(page.getByTestId(`booking-service-${recommended}`), `ขั้น 4 หน้าจองเลือก ${recommended} ตามที่แนะนำ`, async (el) => {
        await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
      });
    });

    const moods: [string, string, string][] = [
      ['mood-tired', 'เหนื่อย', 'S02'],
      ['mood-stress', 'เครียด', 'S04'],
      ['mood-achy', 'ปวดเมื่อย', 'S03'],
    ];

    await test.step('5. เปิด /th/mood เลือกอารมณ์ทีละแบบแล้วอ่านบริการที่แนะนำ', async () => {
      await app.goto(page, '/th/mood');
      for (const [id, name, service] of moods) {
        await page.getByTestId(id).click();
        await page.getByTestId('mood-result').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
        await settle(page);
        const href = await page.getByTestId('mood-book').getAttribute('href', { timeout: 3_000 }).catch(() => null);
        await app.check(page.getByTestId('mood-result'), `${name} → ${service}`, async () => {
          expect.soft(serviceOf(href)).toBe(service);
        });
      }
    });

    await test.step('6. ทำแบบทดสอบชุดเดิม 20 รอบ เลือกอารมณ์แต่ละแบบ 20 รอบ แล้วเทียบข้อความผล', async () => {
      const quizResults = new Set<string>();
      for (let i = 0; i < 20; i++) {
        await app.goto(page, '/th/quiz');
        await answerThree();
        await firstOption(4).click();
        await page.getByTestId('quiz-submit').click();
        await page.getByTestId('quiz-result').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
        await settle(page);
        quizResults.add(await page.getByTestId('quiz-result').innerText({ timeout: 2_000 }).catch(() => '(ไม่มีผล)'));
      }
      const moodResults: Record<string, Set<string>> = { 'mood-tired': new Set(), 'mood-stress': new Set(), 'mood-achy': new Set() };
      await app.goto(page, '/th/mood');
      // สลับอารมณ์ทุกครั้ง เพื่อให้เกิดการถามใหม่จริงทุกรอบ
      for (let i = 0; i < 20; i++) {
        for (const [id] of moods) {
          try {
            await app.capture(page, /\/api\/mood$/, () => page.getByTestId(id).click());
          } catch { /* ไม่มีคำขอใหม่ ถือว่าใช้ข้อความบนจอ */ }
          await settle(page);
          moodResults[id].add(await page.getByTestId('mood-result').innerText({ timeout: 2_000 }).catch(() => '(ไม่มีผล)'));
        }
      }
      await app.checkValue(page, 'แบบทดสอบ 20 รอบ ได้ข้อความผลแบบเดียว', quizResults.size, (v) => { expect.soft(v).toBe(1); });
      const moodSizes = Object.fromEntries(Object.entries(moodResults).map(([k, s]) => [k, s.size]));
      await app.checkValue(page, 'อารมณ์แต่ละแบบ 20 รอบ ได้ข้อความผลแบบเดียว', moodSizes, (v) => {
        expect.soft(v).toEqual({ 'mood-tired': 1, 'mood-stress': 1, 'mood-achy': 1 });
      });
      await app.checkValue(page, 'request ไปบริการ AI ภายนอก 0 ครั้ง', aiRequests(app, page), (v) => { expect.soft(v).toEqual([]); });
    });
  });

  test('TC-EXPR-04 แชตตอบเวลา ราคา และนอกเรื่องตามภาษาที่ถาม ข้อความไม่มีตัวอักษรภาษาตอบภาษาหน้าเว็บ', {
    tag: ['@P1', '@5.8'],
    annotation: plan({
      expected: 'เวลา: ทุกภาษามี 10:00 และ 22:00\nราคา S04: ทุกภาษามี 2,000 (ราคาเต็ม ฿2,000/คน · ถ้าตอบราคา S03 จะได้ 1,200 · ถ้าคิดส่วนลด Gold 5% จะได้ 1,900)\nนอกเรื่องและตอบไม่ได้: ทุกภาษามี 02-123-4567\nภาษา: คำตอบข้อความไทยเป็นภาษาไทย · คำตอบข้อความอังกฤษและจีนมีตัวอักษรไทย 0 จุด\nR105: คำตอบของ `12345` และ `???` มีตัวอักษรไทยอย่างน้อย 1 ตัว และมี 02-123-4567 (คำตอบอังกฤษล้วนถือว่าผิด)\nขั้น 4: ทั้ง 20 รอบเหมือนกันทุกตัวอักษร',
      source: '[D] §4 หลังร้านและข้อมูลส่วนตัว · [D] บ.9 · [R] ⚠️A-20 · [R] · F-สร้าง 26',
      frbr: 'FR-58, FR-59, NFR-14',
      rules: 'R103, R104, R105',
      technique: 'Happy path, Negative, Equivalence partition',
      timing: 'ทันที',
    }),
  }, async ({ page, app }) => {
    const PHONE = '02-123-4567';
    const priceTh = 'นวดน้ำมันอโรมาราคาเท่าไหร่';
    const rows: { kind: 'เวลา' | 'ราคา' | 'นอกเรื่อง'; lang: 'th' | 'en' | 'zh'; q: string }[] = [
      { kind: 'เวลา', lang: 'th', q: 'ร้านเปิดกี่โมง' },
      { kind: 'เวลา', lang: 'en', q: 'What time do you open?' },
      { kind: 'เวลา', lang: 'zh', q: '几点开门' },
      { kind: 'ราคา', lang: 'th', q: priceTh },
      { kind: 'ราคา', lang: 'en', q: 'How much is Aroma Oil Massage?' },
      { kind: 'ราคา', lang: 'zh', q: '香薰精油按摩多少钱' },
      { kind: 'นอกเรื่อง', lang: 'th', q: 'พรุ่งนี้ฝนตกไหม' },
      { kind: 'นอกเรื่อง', lang: 'en', q: 'Will it rain tomorrow?' },
      { kind: 'นอกเรื่อง', lang: 'zh', q: '明天会下雨吗' },
    ];
    const replies: { lang: string; q: string; text: string }[] = [];

    await test.step('1. จาก /th ส่งคำถามเวลา ราคา นอกเรื่องครบ 3 ภาษา รวม 9 ข้อความ', async () => {
      await app.goto(page, '/th');
      await chatOpen(page);
      for (const row of rows) {
        const reply = await chatSay(page, row.q);
        replies.push({ lang: row.lang, q: row.q, text: reply.text });
        await app.check(reply.el, `${row.kind} ${row.lang}: "${row.q}"`, async (el) => {
          if (row.kind === 'เวลา') {
            await expect.soft(el).toContainText('10:00');
            await expect.soft(el).toContainText('22:00');
          } else if (row.kind === 'ราคา') {
            await expect.soft(el).toHaveText(/(^|[^\d,])2,000(?![\d,])/);
          } else {
            await expect.soft(el).toContainText(PHONE);
          }
          if (row.lang === 'th') await expect.soft(el).toHaveText(THAI_LETTER);
        });
      }
    });

    await test.step('2. ค้นตัวอักษรไทยในคำตอบของข้อความอังกฤษและจีน', async () => {
      const foreign = replies.filter((r) => r.lang !== 'th');
      // ใช้ regex ตามแผนตรงตัว [฀-๿] ซึ่งครอบ ฿ (U+0E3F) ด้วย
      const withThai = foreign.filter((r) => THAI_BLOCK.test(r.text)).map((r) => `${r.q} → ${r.text}`);
      await app.checkValue(page, 'คำตอบอังกฤษและจีนตาม regex ของแผน 0 จุด', withThai, (v) => { expect.soft(v).toEqual([]); });
    });

    await test.step('3. ส่ง 12345 และ ??? จากหน้า /th', async () => {
      for (const q of ['12345', '???']) {
        const reply = await chatSay(page, q);
        await app.check(reply.el, `คำตอบของ "${q}" เป็นภาษาไทยและมี ${PHONE}`, async (el) => {
          await expect.soft(el).toHaveText(THAI_LETTER);
          await expect.soft(el).toContainText(PHONE);
        });
      }
    });

    await test.step('4. ส่งคำถามราคาภาษาไทยซ้ำ 20 รอบแล้วเทียบข้อความ', async () => {
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) seen.add((await chatSay(page, priceTh)).text);
      await app.checkValue(page, 'ถามราคาไทย 20 รอบ ได้ข้อความเดียวกันทุกตัวอักษร', [...seen], (v) => {
        expect.soft(v.length).toBe(1);
        expect.soft(v[0] ?? '').not.toBe('');
      });
    });
  });

  test('TC-EXPR-05 จองผ่านแชตปฏิเสธรอบผิดทันที รายการบริการมี P01 และจองจริงได้ยอดกับนักบำบัดถูกต้อง', {
    tag: ['@P1', '@5.8'],
    annotation: plan({
      expected: 'ขั้น 2 (R108): รายการมี S01–S07 และ P01 รวม 8 บริการ · ไม่มี K01\nขั้น 3–4 (R107): ทุกรอบถูกปฏิเสธในคำตอบถัดจากเวลาทันที โดยยังไม่ถามจำนวนคน\n10:15 → ไม่อยู่ในรอบทุก 30 นาที · 21:30 → S01 จบ 22:30 เกิน 22:00 · 09:30 → ก่อนรอบแรก 10:00\nหลังถูกปฏิเสธ 3 รอบ คิววันที่ 17 มิ.ย. 2026 เพิ่ม 0 รายการ\nขั้น 5: ได้รหัสจอง 1 รหัส ยอด ฿1,000 (S01 ฿1,000 × 1 คน = ฿1,000 แขกไม่มีส่วนลด · ถ้าคิดส่วนลดระดับจะได้ ฿950 หรือ ฿900)\nขั้น 6: คิววันที่ 17 มิ.ย. 2026 เพิ่ม 1 รายการพอดี รอบ 12:00 นักบำบัด T01 ยอดจ่ายหน้าร้าน ฿1,000',
      source: '[D] บ.9 · [R] ⚠️A-21 · [R] · F-สร้าง 26 · F-ร้าน 22',
      frbr: 'FR-60, BR-01, BR-02',
      rules: 'R106, R107, R108',
      technique: 'Happy path, Negative, Boundary',
      timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    const ASK_PARTY = /กี่คน|How many|几位|多少人/i;
    const admin = await app.admin();
    let before = 0;
    let code = '';

    await test.step('1. เข้าหลังร้านด้วยบัญชีร้าน จดจำนวนคิววันที่ 17 มิ.ย. 2026', async () => {
      await admin.open(OWNER_DATE);
      before = await admin.rowCount();
      await app.checkValue(admin.page, 'คิววันที่ 17 มิ.ย. 2026 ก่อนเริ่ม', before, (v) => { expect.soft(v).toBeGreaterThanOrEqual(0); });
    });

    await test.step('2. เริ่มจองในแชตแล้วอ่านรายการบริการ', async () => {
      await app.goto(page, '/th');
      await chatOpen(page);
      const reply = await waitReply(page, () => page.getByTestId('chat-suggest-book').click());
      await app.check(reply.el, 'รายการบริการมี S01–S07 และ P01 รวม 8 บริการ ไม่มี K01', async (el) => {
        const text = await el.innerText().catch(() => '');
        const ids = text.match(/\b[SPK]\d\d\b/g) ?? [];
        expect.soft([...new Set(ids)].sort()).toEqual(['P01', 'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07']);
        expect.soft(text).not.toMatch(/\bK01\b/);
      });
    });

    await test.step('3–4. เลือก S01 วัน 17 มิ.ย. 2026 แล้วพิมพ์รอบผิด 10:15, 21:30, 09:30', async () => {
      await chatSay(page, 'S01');
      await chatSay(page, OWNER_DATE);
      const wrong: [string, RegExp, string][] = [
        ['10:15', /30\s*นาที|ครึ่งชั่วโมง/, 'ไม่อยู่ในรอบทุก 30 นาที'],
        ['21:30', /22:00|21:00|จบ|เกิน|ปิด/, 'S01 จบ 22:30 เกิน 22:00'],
        ['09:30', /10:00|ก่อน/, 'ก่อนรอบแรก 10:00'],
      ];
      for (const [time, reason, why] of wrong) {
        const reply = await chatSay(page, time);
        await app.check(reply.el, `รอบ ${time} ถูกปฏิเสธทันที (${why}) ยังไม่ถามจำนวนคน`, async (el) => {
          await expect.soft(el).not.toHaveText(ASK_PARTY);
          await expect.soft(el).toHaveText(reason);
        });
      }
      await admin.open(OWNER_DATE);
      await app.checkValue(admin.page, 'หลังถูกปฏิเสธ 3 รอบ คิววันที่ 17 มิ.ย. 2026 เพิ่ม 0 รายการ', (await admin.rowCount()) - before, (v) => {
        expect.soft(v).toBe(0);
      });
    });

    await test.step('5. ใช้รอบ 12:00 ระบุ T01 จำนวน 1 คน ชื่อและเบอร์แขก แล้วยืนยัน', async () => {
      await chatSay(page, '12:00 T01');
      await chatSay(page, '1');
      await chatSay(page, 'ทดสอบ แชต 0812345678');
      await chatSay(page, 'ยืนยัน');
      const codes = page.locator('[data-testid^="chat-booking-code-"]');
      await app.check(page.getByTestId('chat-log'), 'ได้รหัสจอง 1 รหัส', async () => {
        await expect.soft(codes).toHaveCount(1);
      });
      if (await codes.count()) code = (await codes.first().innerText()).trim();
      const card = page.locator('[data-testid^="chat-booking-"]:not([data-testid^="chat-booking-code-"])').first();
      await app.check(card, 'ยอดจอง ฿1,000', async (el) => {
        expect.soft(lineAmount(await el.innerText().catch(() => ''))).toBe(1000);
      });
    });

    await test.step('6. เปิดหลังร้านอ่านคิววันที่ 17 มิ.ย. 2026 แล้วรีโหลด', async () => {
      await admin.open(OWNER_DATE);
      await app.checkValue(admin.page, 'คิววันที่ 17 มิ.ย. 2026 เพิ่ม 1 รายการพอดี', (await admin.rowCount()) - before, (v) => {
        expect.soft(v).toBe(1);
      });
      if (!code) {
        await app.checkValue(admin.page, 'ไม่มีรหัสจองให้ตรวจแถวในหลังร้าน', code, (v) => { expect.soft(v).not.toBe(''); });
        return;
      }
      const verifyRow = async (when: string) => {
        await app.check(admin.time(code), `${when} รอบ 12:00`, async (el) => { await expect.soft(el).toContainText('12:00'); });
        await app.check(admin.therapists(code), `${when} นักบำบัด T01 (พี่ศรี)`, async (el) => { await expect.soft(el).toContainText('พี่ศรี'); });
        await app.check(admin.pay(code), `${when} ยอดจ่ายหน้าร้าน ฿1,000`, async (el) => {
          expect.soft(lineAmount(await el.innerText().catch(() => ''))).toBe(1000);
        });
      };
      await verifyRow('หลังร้าน');
      // รีโหลดแล้วหน้าอาจกลับไปวันปัจจุบัน จึงเลือกวันของนัดซ้ำตามกติกา 7.3
      await app.reload(admin.page);
      await admin.page.getByTestId('admin-date').fill(OWNER_DATE);
      await settle(admin.page);
      await verifyRow('หลังรีโหลด');
    });
  });

  test('TC-EXPR-06 วิเคราะห์เซลฟี่ในเครื่อง รูปไม่ออกจากเครื่องและไม่เหลือในเครื่อง', {
    tag: ['@P1', '@5.8'],
    annotation: plan({
      expected: 'ขั้น 1: มีข้อความบอกว่ารูปวิเคราะห์ในเครื่อง ไม่ส่งออก และไม่เก็บ ก่อนมีการเลือกรูป\nขั้น 2 และ 4 (R111): ผลมีบริการแนะนำ 1 รายการ และมีข้อความว่าเป็นคำแนะนำเบื้องต้น\nขั้น 3 และ 5: request ที่มีข้อมูลรูป 0 รายการ · request POST หรือ PUT ที่มีชื่อไฟล์ base64 หรือ multipart 0 รายการ · request ไปบริการ AI ภายนอก 0 ครั้ง (ถ้าอัปโหลดจริงจะพบอย่างน้อย 1 รายการ)\nlocalStorage, IndexedDB, Cache มีรูป 0 รูป และไม่พบ `data:image` หรือชื่อไฟล์\nขั้น 6: รูปค้างบนหน้า 0 รูป\nขั้น 7: ทั้ง 20 รอบเหมือนกันทุกตัวอักษร\nไม่ตรวจขอบตารางความสว่าง เพราะตารางยังเป็นร่างของทีม (F-ร้าน 21)',
      source: '[D] §4 หลังร้านและข้อมูลส่วนตัว · [R] ⚠️A-26 · F-ร้าน 21',
      frbr: 'FR-74, FR-75, NFR-09, NFR-14',
      rules: 'R103, R109, R110, R111',
      technique: 'Happy path, Boundary, Security',
      timing: 'ทันที · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    test.setTimeout(6 * 60_000);
    const verifyResult = async (label: string) => {
      await app.check(page.getByTestId('skin-result'), `${label} ผลมีบริการแนะนำ 1 รายการ`, async () => {
        await expect.soft(page.getByTestId('skin-service-name')).toHaveCount(1);
      });
      await app.check(page.getByTestId('skin-disclaimer'), `${label} มีข้อความว่าเป็นคำแนะนำเบื้องต้น`, async (el) => {
        await expect.soft(el).toContainText('คำแนะนำเบื้องต้น');
      });
    };
    let mark = 0;

    await test.step('1. เปิด /th/skin อ่านข้อความก่อนเลือกรูป', async () => {
      await app.goto(page, '/th/skin');
      mark = app.requestsOf(page).length;
      await app.check(page.getByTestId('skin-privacy-notice'), 'ก่อนเลือกรูปมีข้อความ วิเคราะห์ในเครื่อง ไม่ส่งออก ไม่เก็บ', async (el) => {
        await expect.soft(el).toContainText('ในเครื่อง');
        await expect.soft(el).toHaveText(/ไม่.{0,12}(ส่ง|อัปโหลด)/);
        await expect.soft(el).toHaveText(/ไม่.{0,12}(เก็บ|บันทึก)/);
      });
      await app.check(page.getByTestId('skin-intro'), 'ก่อนเลือกรูปยังไม่มีผลวิเคราะห์', async () => {
        await expect.soft(page.getByTestId('skin-result')).toHaveCount(0);
      });
    });

    await test.step('2. กดปุ่มรูปตัวอย่าง อ่านผลและข้อความกำกับ', async () => {
      await page.getByTestId('skin-use-sample').click();
      await waitSkinResult(page);
      await verifyResult('รูปตัวอย่าง');
    });

    await test.step('3. ตรวจ request หลังขั้น 1 และ localStorage, IndexedDB, Cache', async () => {
      await app.checkValue(page, 'รูปตัวอย่าง: request ที่มีข้อมูลรูปหรือไปบริการ AI 0 รายการ', imageRequests(app, page, mark), (v) => { expect.soft(v).toEqual([]); });
      await app.checkValue(page, 'รูปตัวอย่าง: ที่เก็บข้อมูลมีรูป 0 รูป', await storageImageFindings(page), (v) => { expect.soft(v).toEqual([]); });
    });

    await test.step('4. รีโหลด อัปโหลด selfie-test.jpg ที่ skin-file อ่านผลและข้อความกำกับ', async () => {
      await app.reload(page);
      mark = app.requestsOf(page).length;
      await page.getByTestId('skin-file').setInputFiles({
        name: 'selfie-test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from(JPEG_B64, 'base64'),
      });
      await waitSkinResult(page);
      await verifyResult('ไฟล์จริง');
    });

    await test.step('5. ตรวจ request และที่เก็บข้อมูลอีกครั้ง', async () => {
      await app.checkValue(page, 'ไฟล์จริง: ไม่พบชื่อไฟล์ data:image base64 multipart ใน request', imageRequests(app, page, mark), (v) => { expect.soft(v).toEqual([]); });
      await app.checkValue(page, 'ไฟล์จริง: ที่เก็บข้อมูลมีรูป 0 รูป', await storageImageFindings(page), (v) => { expect.soft(v).toEqual([]); });
    });

    await test.step('6. รีโหลดแล้วดูว่ามีรูปหรือผลเดิมค้างบนหน้าหรือไม่', async () => {
      await app.reload(page);
      await app.check(page.getByTestId('skin-intro'), 'หลังรีโหลดรูปค้างบนหน้า 0 รูป และไม่มีผลเดิม', async () => {
        await expect.soft(page.locator('img[src^="blob:"], img[src^="data:image"]')).toHaveCount(0);
        await expect.soft(page.getByTestId('skin-result')).toHaveCount(0);
      });
    });

    await test.step('7. วิเคราะห์รูปตัวอย่างซ้ำ 20 รอบแล้วเทียบข้อความผล', async () => {
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) {
        await app.goto(page, '/th/skin');
        await page.getByTestId('skin-use-sample').click();
        const ok = await waitSkinResult(page);
        seen.add(ok ? await page.getByTestId('skin-result').innerText() : '(ไม่มีผล)');
      }
      await app.checkValue(page, 'วิเคราะห์รูปตัวอย่าง 20 รอบ ได้ข้อความเดียวกันทุกตัวอักษร', [...seen], (v) => {
        expect.soft(v.length).toBe(1);
        expect.soft(v[0]).not.toBe('(ไม่มีผล)');
      });
    });
  });

  test('TC-EXPR-07 ภาพจำลองก่อนและหลังยังไม่เปิดใช้ที่ /th/skin', {
    tag: ['@P1', '@5.8'],
    annotation: plan({
      expected: 'ทุกขั้น: ภาพจำลองก่อน/หลัง 0 ภาพ · ข้อความ "ภาพจำลอง ผลจริงอาจต่างกัน" 0 จุด\n(ถ้าฟีเจอร์เปิดอยู่จะเห็นภาพก่อน/หลังทันทีตั้งแต่ขั้น 1 ตามที่พบใน R112)\nการวิเคราะห์ผิวยังใช้งานได้ตาม TC-EXPR-06 ข้อนี้ตรวจเฉพาะภาพจำลอง',
      source: '[R] ⚠️A-23 · F-ร้าน 19 · F-สร้าง 23',
      frbr: 'FR-76',
      rules: 'R112',
      technique: 'Negative, State',
      timing: 'ทันที · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    const verifyNoPreview = async (label: string) => {
      // มีภาพจำลองให้ตีกรอบที่ภาพนั้น ไม่มีจึงตีกรอบส่วนต้นหน้า
      const preview = page.getByTestId('skin-preview');
      await app.check((await preview.count()) > 0 ? preview : page.getByTestId('skin-intro'), `${label} ภาพก่อน/หลัง 0 ภาพ และข้อความกำกับ 0 จุด`, async () => {
        await expect.soft(page.getByTestId('skin-preview')).toHaveCount(0);
        await expect.soft(page.getByTestId('skin-preview-before')).toHaveCount(0);
        await expect.soft(page.getByTestId('skin-preview-after')).toHaveCount(0);
        await expect.soft(page.getByText('ภาพจำลอง ผลจริงอาจต่างกัน')).toHaveCount(0);
      });
    };

    await test.step('1. เปิด /th/skin ยังไม่เลือกรูป นับภาพก่อน/หลังและค้นข้อความกำกับ', async () => {
      await app.goto(page, '/th/skin');
      await verifyNoPreview('ขั้น 1');
    });

    await test.step('2. กดปุ่มรูปตัวอย่าง แล้วนับอีกครั้ง', async () => {
      await page.getByTestId('skin-use-sample').click();
      await waitSkinResult(page);
      await verifyNoPreview('ขั้น 2');
    });

    await test.step('3. รีโหลดแล้วนับอีกครั้ง', async () => {
      await app.reload(page);
      await verifyNoPreview('ขั้น 3');
    });
  });

  test('TC-EXPR-08 โหมด /zh เหลือข้อความไทย 0 จุดตั้งแต่เริ่มจองถึงหน้ายืนยัน รวมแชตและ error', {
    tag: ['@P2', '@5.8'],
    annotation: plan({
      expected: 'ทุกขั้น: regex `[฀-๿]` ได้ 0 จุด (จุดเสี่ยงคือแชตและ error ที่ R113 ยังไม่ได้ลอง · ถ้าคำตอบแชตหรือ error เป็นไทยจะได้อย่างน้อย 1 จุด)\nขั้น 4: มีข้อความแจ้งเป็นภาษาจีน และยังไม่เกิดการจอง คิววันที่ 17 มิ.ย. 2026 เพิ่ม 0 รายการ\nขั้น 6: ได้รหัสจอง 1 รหัส ยอด 1,000 (S01 ฿1,000 × 1 คน = ฿1,000) นักบำบัด 诗丽 · ในหลังร้านคิววันที่ 17 มิ.ย. 2026 เพิ่ม 1 รายการพอดี',
      source: '[D] บ.22 · [R] ⚠️A-38 · [R] · F-สร้าง 26',
      frbr: 'FR-56, FR-57, NFR-07',
      rules: 'R113',
      technique: 'Happy path, Negative',
      timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
    }),
  }, async ({ page, app, booking }) => {
    const admin = await app.admin();
    const CHINESE = /[一-鿿]/;
    await admin.open(OWNER_DATE);
    const before = await admin.rowCount();
    let code: string | null = null;

    const verifyNoThai = async (label: string) => {
      await app.checkValue(page, `${label}: regex [฀-๿] ได้ 0 จุด`, await thaiHits(page), (v) => { expect.soft(v).toEqual([]); });
    };

    await test.step('1. สลับภาษาจาก /th เป็น 中文 แล้วค้นข้อความไทย', async () => {
      await app.goto(page, '/th');
      await clickHeaderLang(page, 'zh');
      await page.waitForURL(/\/zh(\/|$)/, { timeout: 15_000 });
      await page.waitForSelector('html[data-ready="true"]');
      await settle(page);
      await verifyNoThai('ขั้น 1 หลังสลับภาษา');
    });

    await test.step('2. เปิด /zh/booking เลือก S01 แล้วค้นซ้ำ', async () => {
      await booking.open('zh');
      await booking.chooseService('S01', 1);
      await verifyNoThai('ขั้น 2 หน้าจอ 1');
    });

    await test.step('3. เลือกวัน รอบ และ T01 แล้วค้นซ้ำ', async () => {
      await booking.nextFromStep1();
      await booking.chooseDate(OWNER_DATE);
      await booking.chooseTherapist('T01');
      await booking.chooseSlot('12:00');
      await verifyNoThai('ขั้น 3 หน้าจอ 2');
      await booking.nextFromStep2();
      await verifyNoThai('ขั้น 3 หน้าจอ 3');
    });

    await test.step('4. ส่งฟอร์มแบบชื่อว่าง และแบบเบอร์ 12345 อ่านข้อความ error แล้วค้นซ้ำ', async () => {
      const errors = page.locator('[data-testid^="error-"], [data-testid*="error"], [role="alert"]');
      const readErrors = async () => (await errors.evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()))).filter(Boolean);
      const cases: [string, string, string][] = [
        ['ชื่อว่าง', '', '0812345678'],
        ['เบอร์ 12345', 'Test Guest', '12345'],
      ];
      for (const [label, name, phone] of cases) {
        await page.getByTestId('booking-guest-name').fill(name);
        await page.getByTestId('booking-guest-phone').fill(phone);
        await booking.quoteReady();
        if (await booking.confirmButton().isEnabled()) await booking.confirmButton().click();
        await settle(page);
        await app.checkValue(page, `${label}: มีข้อความแจ้งเป็นภาษาจีน`, await readErrors(), (v) => {
          expect.soft(v.join(' ')).toMatch(CHINESE);
        });
        await verifyNoThai(`ขั้น 4 ${label}`);
      }
      await admin.open(OWNER_DATE);
      await app.checkValue(admin.page, 'ขั้น 4 คิววันที่ 17 มิ.ย. 2026 เพิ่ม 0 รายการ', (await admin.rowCount()) - before, (v) => { expect.soft(v).toBe(0); });
    });

    await test.step('5. เปิดแชต ส่งราคา นอกเรื่อง 12345 และเริ่มจองด้วยรอบ 10:15 แล้วค้นซ้ำทุกคำตอบ', async () => {
      await chatOpen(page);
      for (const q of ['香薰精油按摩多少钱', '明天会下雨吗', '12345']) {
        await chatSay(page, q);
        await verifyNoThai(`ขั้น 5 แชต "${q}"`);
      }
      await waitReply(page, () => page.getByTestId('chat-suggest-book').click());
      await verifyNoThai('ขั้น 5 แชต เริ่มจอง');
      for (const q of ['S01', OWNER_DATE, '10:15']) {
        await chatSay(page, q);
        await verifyNoThai(`ขั้น 5 แชตจอง "${q}"`);
      }
      await page.getByTestId('chat-close').click();
    });

    await test.step('6. กรอกข้อมูลถูกต้องแล้วยืนยัน ค้นซ้ำที่หน้ายืนยัน', async () => {
      await booking.guest('Test Guest', '0812345678');
      await app.checkValue(page, 'ขั้น 6 ยอดจ่ายหน้าร้านก่อนยืนยัน 1,000', await booking.pay(), (v) => { expect.soft(v).toBe(1000); });
      const result = await booking.confirm();
      code = result.code;
      await app.check(page.getByTestId('booking-code'), 'ขั้น 6 ได้รหัสจอง 1 รหัส', async (el) => {
        await expect.soft(el).toHaveCount(1);
        await expect.soft(el).not.toBeEmpty();
      });
      await app.check(page.getByTestId('booking-confirmation'), 'ขั้น 6 หน้ายืนยันยอด 1,000', async (el) => {
        await expect.soft(el).toHaveText(/(^|[^\d,])1,000(?![\d,])/);
      });
      await app.check(page.getByTestId('booking-done-therapists'), 'ขั้น 6 นักบำบัด 诗丽', async (el) => {
        await expect.soft(el).toContainText('诗丽');
      });
      await verifyNoThai('ขั้น 6 หน้ายืนยัน');
      await admin.open(OWNER_DATE);
      await app.checkValue(admin.page, 'ขั้น 6 หลังร้านคิววันที่ 17 มิ.ย. 2026 เพิ่ม 1 รายการพอดี', (await admin.rowCount()) - before, (v) => { expect.soft(v).toBe(1); });
      if (code) {
        await app.check(admin.pay(code), 'ขั้น 6 หลังร้านยอด 1,000', async (el) => {
          expect.soft(lineAmount(await el.innerText().catch(() => ''))).toBe(1000);
        });
      }
    });

    await test.step('7. รีโหลดหน้ายืนยันแล้วค้นซ้ำ', async () => {
      await app.reload(page);
      await verifyNoThai('ขั้น 7 หลังรีโหลด');
    });
  });

  test('TC-EXPR-09 จอกว้าง 375px ไม่ต้องเลื่อนซ้ายขวาในทุกหน้าและทุกขั้นจอง', {
    tag: ['@P2', '@5.8', '@mobile'],
    annotation: plan({
      expected: '0 หน้าที่ล้น: ทุกหน้า ทุกภาษา ทุกขั้นจอง `scrollWidth` ≤ `clientWidth` (375)\nค่าขอบ: 375 ผ่าน · 376 ไม่ผ่าน\n(R114 ลองเฉพาะ `/zh` บางหน้า ข้อความไทยหรือจีนที่ยาวกว่าอาจล้นเฉพาะภาษา จึงต้องครบ 3 ภาษา)',
      source: '[R] ⚠️A-22 · [R] ⚠️A-41',
      frbr: 'NFR-01, FR-56',
      rules: 'R114',
      technique: 'Boundary',
      timing: 'ทันที',
    }),
  }, async ({ page, app, booking }) => {
    test.setTimeout(10 * 60_000);
    const LOCALES = ['th', 'en', 'zh'] as const;
    const PUBLIC_PATHS = [
      '', '/services', '/services/K01', '/herbs', '/packages/bangkok-relax', '/therapists', '/team', '/reviews',
      '/gallery', '/about', '/tour', '/quiz', '/mood', '/skin', '/shuttle', '/gift-cards', '/booking', '/booking/cancel',
      '/login', '/register', '/nope-xyz',
    ];
    const MEMBER_PATHS = ['/account', '/account/history', '/wallet'];
    const TIMES: Record<(typeof LOCALES)[number], string> = { th: '12:00', en: '13:30', zh: '15:00' };

    const overflow: string[] = [];
    const failures: string[] = [];
    let measured = 0;
    const measure = async (where: string) => {
      const { sw, cw } = await measureWidth(page);
      measured++;
      if (sw > cw || sw > 375) overflow.push(`${where}: scrollWidth=${sw} clientWidth=${cw}`);
    };
    const visit = async (urlPath: string) => {
      try {
        await app.goto(page, urlPath);
      } catch (e) {
        failures.push(`${urlPath}: ${String(e).slice(0, 100)}`);
      }
      await measure(urlPath);
    };

    await test.step('1. ตั้ง viewport 375×812', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
    });

    await test.step('2–3. เปิดทุกหน้าทีละภาษา วัดความกว้าง และเปิดแชตที่หน้าแรกแล้ววัดซ้ำ', async () => {
      for (const loc of LOCALES) {
        for (const p of PUBLIC_PATHS) await visit(`/${loc}${p}`);
        try {
          await app.goto(page, `/${loc}`);
          await chatOpen(page);
        } catch (e) {
          failures.push(`/${loc} เปิดแชต: ${String(e).slice(0, 100)}`);
        }
        await measure(`/${loc} เปิดแชต`);
      }
      await app.login(page, 'U01');
      for (const loc of LOCALES) for (const p of MEMBER_PATHS) await visit(`/${loc}${p}`);
      await app.login(page, 'U07');
      for (const loc of LOCALES) await visit(`/${loc}/admin`);
      await page.context().clearCookies();
    });

    await test.step('4. จองจาก /booking ทั้ง 3 หน้าจอถึงหน้ายืนยัน แล้ววัดทุกหน้าจอ ใน 3 ภาษา', async () => {
      for (const loc of LOCALES) {
        try {
          await booking.open(loc);
          await measure(`/${loc}/booking หน้าจอ 1`);
          await booking.chooseService('S01', 1);
          await booking.nextFromStep1();
          await booking.chooseDate(OWNER_DATE);
          await booking.chooseTherapist('any');
          await booking.chooseSlot(TIMES[loc]);
          await measure(`/${loc}/booking หน้าจอ 2`);
          await booking.nextFromStep2();
          await booking.guest('ทดสอบ มือถือ', '0812345678');
          await measure(`/${loc}/booking หน้าจอ 3`);
          const { code, request } = await booking.confirm();
          if (!code) failures.push(`/${loc}/booking จองไม่สำเร็จ ${request.responseStatus}`);
          await measure(`/${loc}/booking หน้ายืนยัน`);
        } catch (e) {
          failures.push(`/${loc}/booking: ${String(e).slice(0, 140)}`);
        }
      }
    });

    await test.step('5. จดหน้าที่ scrollWidth มากกว่า clientWidth พร้อมค่าทั้งสอง', async () => {
      // 21 หน้าทั่วไป + 3 หน้าสมาชิก + หลังร้าน = 25 หน้า × 3 ภาษา = 75 · แชต 3 · ขั้นจอง 4 × 3 ภาษา = 12
      await app.checkValue(page, 'จำนวนจุดที่วัดครบ 90 จุด', measured, (v) => { expect.soft(v).toBe(90); });
      await app.checkValue(page, 'หน้าที่เปิดหรือจองไม่สำเร็จ 0 รายการ', failures, (v) => { expect.soft(v).toEqual([]); });
      await app.checkValue(page, 'หน้าที่ล้นจอ 375px 0 หน้า', overflow, (v) => { expect.soft(v).toEqual([]); });
    });
  });

  test('TC-EXPR-10 เพลงเงียบจนกว่าจะกดเอง และทัวร์หมุนด้วยการลากครบ 360 องศาทั้งจอ 375px และ 1280px', {
    tag: ['@P3', '@5.8', '@mobile'],
    annotation: plan({
      expected: 'ขั้น 1–2: `audio.paused` = true\nขั้น 3: กดครั้งแรก false · กดครั้งที่สอง true\nขั้น 4: `audio.paused` = true (เพลงดังเองหลังโหลดถือว่าผิด)\nขั้น 5–6: ภาพเปลี่ยนระหว่างลาก และกลับมาตรงภาพเริ่มเมื่อครบ 360° ทั้ง 2 ขนาด (ถ้าการลากใช้ไม่ได้ ภาพจะไม่เปลี่ยนเลย)\nขั้น 7: error ใน console 0 รายการ',
      source: '[D] บ.21 · [R] ⚠️A-41',
      frbr: 'FR-65, FR-66, NFR-04, NFR-10',
      rules: 'R116, R117, R118',
      technique: 'Happy path, State',
      timing: 'ทันที · หลังรีโหลด',
    }),
  }, async ({ page, app }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));

    await page.setViewportSize({ width: 375, height: 812 });
    const paused = () => page.getByTestId('music-audio').evaluate((a) => (a as HTMLAudioElement).paused);
    const toggle = async () => {
      const btn = page.getByTestId('music-toggle');
      if (!(await btn.isVisible())) await page.getByTestId('header-menu-toggle').click();
      await btn.click();
      await page.waitForTimeout(400);
    };

    await test.step('1. เปิด /th ไม่กดอะไร อ่าน audio.paused', async () => {
      await app.goto(page, '/th');
      await app.checkValue(page, 'ขั้น 1 /th audio.paused = true', await paused(), (v) => { expect.soft(v).toBe(true); });
    });

    await test.step('2. เปิด /th/tour อ่าน audio.paused', async () => {
      await app.goto(page, '/th/tour');
      await app.checkValue(page, 'ขั้น 2 /th/tour audio.paused = true', await paused(), (v) => { expect.soft(v).toBe(true); });
    });

    await test.step('3. กด music-toggle อ่านค่า แล้วกดอีกครั้งและอ่านค่า', async () => {
      await toggle();
      await app.checkValue(page, 'ขั้น 3 กดครั้งแรก audio.paused = false', await paused(), (v) => { expect.soft(v).toBe(false); });
      await toggle();
      await app.checkValue(page, 'ขั้น 3 กดครั้งที่สอง audio.paused = true', await paused(), (v) => { expect.soft(v).toBe(true); });
    });

    await test.step('4. รีโหลดแล้วอ่านค่า', async () => {
      await app.reload(page);
      await app.checkValue(page, 'ขั้น 4 หลังรีโหลด audio.paused = true', await paused(), (v) => { expect.soft(v).toBe(true); });
    });

    const verifyTurn = async (width: number, step: number) => {
      const r = await dragFullTurn(page, step);
      await app.checkValue(page, `จอ ${width}px ภาพเปลี่ยนระหว่างลาก`, { angles: r.angles, maxDiff: r.maxDiff }, (v) => {
        expect.soft(v.maxDiff).toBeGreaterThan(CHANGED_IMAGE_MIN_DIFF);
      });
      await app.checkValue(page, `จอ ${width}px ลากครบ 360° มุมกลับมาที่จุดเริ่ม`, { angles: r.angles, fromStart: r.fromStart }, (v) => {
        expect.soft(v.fromStart).toBeLessThanOrEqual(1);
      });
      await app.check(page.getByTestId('tour-viewport'), `จอ ${width}px ภาพกลับมาตรงภาพเริ่ม (ต่างเฉลี่ย ${r.finalDiff.toFixed(2)})`, async () => {
        expect.soft(r.finalDiff).toBeLessThanOrEqual(SAME_IMAGE_MAX_DIFF);
      });
    };

    await test.step('5. ที่ viewport 375 ลากแนวนอนทีละช่วงจนภาพวนกลับมาตรงภาพเริ่ม', async () => {
      await verifyTurn(375, 100);
    });

    await test.step('6. ทำขั้น 5 ซ้ำที่ viewport 1280', async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await app.goto(page, '/th/tour');
      await verifyTurn(1280, 300);
    });

    await test.step('7. นับ error ใน console', async () => {
      await app.checkValue(page, 'ขั้น 7 error ใน console 0 รายการ', consoleErrors, (v) => { expect.soft(v).toEqual([]); });
    });
  });
});

import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

// ตัวช่วยกลางของชุด test เปรียบเทียบ — หาทุกอย่างจากสิ่งที่ผู้ใช้เห็น (role / ชื่อที่อ่านได้ / ข้อความ)
// ห้ามใช้ data-testid, class, id หรือ URL ภายในของแอปใดแอปหนึ่ง

export const EVIDENCE = !!process.env.EVIDENCE;
const APP_NAME: Record<string, string> = { v1: 'v1 · SkyThai Mini', v2: 'v2 · SkyThai Plus' };

// ---------- หลักฐานภาพ (เฉพาะ EVIDENCE=1) ----------

let currentStep = '';
export function step(text: string) {
  currentStep = text;
}
/** แปลง regex เป็นข้อความอ่านง่ายสำหรับป้ายบนภาพ */
export function human(re: RegExp) {
  return re.source.replace(/\(\?[!=][^)]*\)/g, '').replace(/\|/g, ' / ').replace(/\\s\??|\\b|[\^$*?+()]|\.\*|\\/g, '').trim();
}
export function lastStep() {
  return currentStep;
}

/** ป้ายหัวภาพบอกเวอร์ชันและฟีเจอร์ — ใส่ซ้ำทุกครั้งที่เปลี่ยนหน้า */
export async function installBanner(page: Page, info: TestInfo) {
  if (!EVIDENCE) return;
  const label = `${APP_NAME[info.project.name] ?? info.project.name} — ${info.title}`;
  await page.addInitScript((text) => {
    const put = () => {
      if (document.getElementById('__cmp_banner')) return;
      const b = document.createElement('div');
      b.id = '__cmp_banner';
      b.textContent = text;
      b.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(17,17,17,.85);color:#fff;' +
        'font:600 18px sans-serif;padding:6px 12px;pointer-events:none';
      document.body.appendChild(b);
    };
    if (document.body) put();
    else document.addEventListener('DOMContentLoaded', put);
  }, label);
}

/** วาดกรอบสีแดงรอบจุดที่กำลังตรวจ (ไม่แตะ DOM ของแอปนอกจาก overlay ชั่วคราว) */
export async function mark(target: Locator, note?: string) {
  if (!EVIDENCE) return;
  try {
    await target.scrollIntoViewIfNeeded({ timeout: 1500 });
    const box = await target.boundingBox({ timeout: 1500 });
    if (!box) return;
    await target.page().evaluate(
      ({ box, note }) => {
        // เหลือไว้เฉพาะกรอบล่าสุด กันกรอบเก่าค้างผิดที่หลังหน้าจอเปลี่ยน
        document.querySelectorAll('.__cmp_mark').forEach((e) => e.remove());
        const d = document.createElement('div');
        d.className = '__cmp_mark';
        d.style.cssText =
          `position:absolute;z-index:2147483646;pointer-events:none;border:4px solid #e00;border-radius:6px;` +
          `box-shadow:0 0 0 3px rgba(255,0,0,.25);left:${box.x + scrollX - 6}px;top:${box.y + scrollY - 6}px;` +
          `width:${box.width + 4}px;height:${box.height + 4}px`;
        if (note) {
          const t = document.createElement('span');
          t.textContent = note;
          t.style.cssText =
            'position:absolute;left:-4px;top:-30px;background:#e00;color:#fff;font:600 14px sans-serif;' +
            'padding:2px 6px;border-radius:4px;white-space:nowrap';
          d.appendChild(t);
        }
        document.body.appendChild(d);
      },
      { box, note },
    );
    await target.page().waitForTimeout(700);
  } catch {
    /* ไฮไลต์ไม่ได้ก็ไม่เป็นไร — ไม่ให้กระทบผล test */
  }
}

/** ค้างภาพผลลัพธ์ 3 วินาที (ถ้าล้มเหลวจะขึ้นป้ายแดงบอกขั้นที่หาไม่เจอ) */
export async function holdResult(page: Page, info: TestInfo) {
  if (!EVIDENCE || page.isClosed()) return;
  const passed = info.status === info.expectedStatus;
  const text = passed ? '✔ ผ่าน' : `✘ ไม่ผ่าน — ${currentStep || 'ไม่พบฟีเจอร์'}`;
  await page
    .evaluate(
      ({ text, passed }) => {
        const d = document.createElement('div');
        d.textContent = text;
        d.style.cssText =
          `position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;` +
          `background:${passed ? '#0a7d2c' : '#c00'};color:#fff;font:700 22px sans-serif;padding:10px 18px;` +
          `border-radius:8px;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);max-width:90vw`;
        document.body.appendChild(d);
      },
      { text, passed },
    )
    .catch(() => {});
  await page.waitForTimeout(3000);
}

// ---------- การหาองค์ประกอบ ----------

/** ปุ่ม/ช่องเลือก/แท็บ/ลิงก์ ที่ชื่อที่ผู้ใช้อ่านได้ตรงกับ name */
export function control(page: Page | Locator, name: RegExp): Locator {
  return page
    .getByRole('combobox', { name })
    .or(page.getByRole('button', { name }))
    .or(page.getByRole('tab', { name }))
    .or(page.getByRole('link', { name }))
    .or(page.getByRole('switch', { name }))
    .first();
}

/** ตัวเลือกในเมนู/ป๊อปอัป */
export function choice(page: Page, name: RegExp): Locator {
  return page
    .getByRole('option', { name })
    .or(page.getByRole('menuitem', { name }))
    .or(page.getByRole('menuitemradio', { name }))
    .or(page.getByRole('radio', { name }))
    .or(page.getByRole('button', { name }))
    .first();
}

/** เลือกค่าใน dropdown — รองรับทั้ง <select> ปกติ และเมนูแบบกดแล้วมีตัวเลือก */
export async function pick(page: Page, controlName: RegExp, optionName: RegExp) {
  step(`เลือก "${human(optionName)}" ใน ${human(controlName)}`);
  const c = control(page, controlName);
  await expect(c).toBeVisible();
  await mark(c);
  const tag = await c.evaluate((e) => e.tagName);
  if (tag === 'SELECT') {
    const opts = await c.evaluate((e) =>
      Array.from((e as HTMLSelectElement).options).map((o) => ({ value: o.value, text: o.text })),
    );
    const o = opts.find((x) => optionName.test(x.text));
    expect(o, `ไม่มีตัวเลือก ${optionName}`).toBeTruthy();
    await c.selectOption(o!.value);
  } else {
    await c.click();
    const o = choice(page, optionName);
    await expect(o).toBeVisible();
    await mark(o);
    await o.click();
  }
}

/** รายการตัวเลือกทั้งหมดของ dropdown (ใช้ตรวจว่ามีครบ) */
export async function optionTexts(page: Page, controlName: RegExp): Promise<string[]> {
  const c = control(page, controlName);
  const tag = await c.evaluate((e) => e.tagName);
  if (tag === 'SELECT') return c.locator('option').allTextContents();
  await c.click();
  const texts = await page
    .getByRole('option')
    .or(page.getByRole('menuitem'))
    .or(page.getByRole('menuitemradio'))
    .allTextContents();
  await page.keyboard.press('Escape');
  return texts;
}

// ---------- ผลการค้นหา ----------

const PRICE = /฿\s?([\d,]+)/;
export const priceOf = (t: string) => Number((t.match(PRICE)?.[1] ?? 'NaN').replace(/,/g, ''));
const DURATION = /(\d+)\s*ชม\.(?:\s*(\d+)\s*นาที)?/;
export const minutesOf = (t: string) => {
  const m = t.match(DURATION);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : NaN;
};
export const departOf = (t: string) => t.match(/(\d{2}):(\d{2})/)?.slice(1, 3).join(':') ?? '';

/** แถวเที่ยวบิน = รายการ/ลิงก์ที่มีทั้งเวลา HH:MM และราคา ฿ */
export async function rows(page: Page): Promise<Locator> {
  const items = page.getByRole('listitem').filter({ hasText: /\d{2}:\d{2}/ }).filter({ hasText: PRICE });
  if ((await items.count()) > 0) return items;
  return page.getByRole('link', { name: /฿\s?[\d,]+/ }).filter({ hasText: /\d{2}:\d{2}/ });
}
export async function rowTexts(page: Page): Promise<string[]> {
  return (await rows(page)).allInnerTexts();
}

/** รอจนรายการเที่ยวบินขึ้น (หลังเปลี่ยนหน้า) */
export async function waitRows(page: Page) {
  await expect.poll(async () => (await rows(page)).count(), { timeout: 10_000 }).toBeGreaterThan(0);
  return rows(page);
}

/** จำนวนผลลัพธ์ที่แอปบอก ("มีผลลัพธ์ N รายการ" / "พบ N เที่ยวบิน") ถ้าไม่มีให้นับแถว */
export async function resultCount(page: Page): Promise<number> {
  const t = page.getByText(/(?:ผลลัพธ์|พบ)\s*\d+\s*(?:รายการ|เที่ยวบิน)/).first();
  if (await t.isVisible().catch(() => false)) {
    return Number((await t.innerText()).match(/(\d+)\s*(?:รายการ|เที่ยวบิน)/)![1]);
  }
  if (await page.getByText(/ไม่พบผลลัพธ์|ไม่พบเที่ยวบิน|ไม่พบตัวเลือก/).first().isVisible().catch(() => false)) return 0;
  return (await rows(page)).count();
}

/** เปิดหน้าแรก แล้วไปให้ถึงรายการผลการค้นหา (ถ้าต้องกด "ค้นหา" ก็กด) */
export async function gotoResults(page: Page) {
  step('เปิดหน้าผลการค้นหา');
  await page.goto('/');
  const firstRow = async () => (await rows(page)).first();
  if (!(await (await firstRow()).isVisible().catch(() => false))) {
    const search = page.getByRole('button', { name: /ค้นหา/ }).first();
    if (await search.isVisible().catch(() => false)) await search.click();
  }
  await expect(await firstRow()).toBeVisible({ timeout: 10_000 });
}

/** มุมมองค่าเริ่มต้นแบบ Google Flights: แท็บ "ดีที่สุด" + เรียง "เที่ยวบินยอดนิยม" (ถ้าแอปมีให้เลือก) */
export async function defaultView(page: Page) {
  const best = page.getByRole('tab', { name: /ดีที่สุด/ });
  if (await best.isVisible().catch(() => false)) await best.click();
  const sort = control(page, /จัดเรียง|เรียงตาม|เรียงลำดับ/);
  if (await sort.isVisible().catch(() => false)) {
    if ((await sort.evaluate((e) => e.tagName)) === 'SELECT') {
      const opts = await sort.evaluate((e) =>
        Array.from((e as HTMLSelectElement).options).map((o) => ({ value: o.value, text: o.text })),
      );
      const pop = opts.find((o) => /ยอดนิยม/.test(o.text));
      if (pop) await sort.selectOption(pop.value);
    }
  }
}

/** เปิดชิปตัวกรองในแถวตัวกรอง */
export async function openFilter(page: Page, name: RegExp) {
  step(`หาตัวกรอง "${human(name)}"`);
  const chip = page.getByRole('button', { name }).first();
  await expect(chip).toBeVisible();
  await mark(chip);
  await chip.click();
  return chip;
}

/** ตั้งค่า slider ด้วยคีย์บอร์ด (Home/End/ลูกศร) เหมือนผู้ใช้ */
export async function setSlider(slider: Locator, key: 'Home' | 'End') {
  await slider.focus();
  await slider.press(key);
}

/** ปุ่ม "เท่านั้น" ที่อยู่แถวเดียวกับข้อความ label */
export function onlyButtonFor(page: Page, label: RegExp): Locator {
  return page
    .getByRole('button', { name: new RegExp(`${label.source}.*เท่านั้น`) })
    .or(
      page
        .getByRole('checkbox', { name: label })
        .locator('xpath=ancestor::*[.//button[normalize-space()="เท่านั้น"]][1]')
        .getByRole('button', { name: /^เท่านั้น$/ }),
    )
    .first();
}

/** ปิดป๊อปอัป/แผงที่เปิดอยู่ (ปุ่ม เสร็จ/ปิด/ตกลง หรือ Esc) */
export async function closePopup(page: Page) {
  // ถ้ามีกล่องโต้ตอบเปิดอยู่ ให้ปิดจากปุ่มในกล่องนั้นก่อน
  const dialog = page.getByRole('dialog').last();
  const scope = (await dialog.isVisible().catch(() => false)) ? dialog : page;
  const btn = scope.getByRole('button', { name: /^(เสร็จ|ปิด|ตกลง|ปิดกล่องโต้ตอบ|ใช้ตัวกรอง|แสดง.*รายการ)$/ }).first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
  else await page.keyboard.press('Escape');
}

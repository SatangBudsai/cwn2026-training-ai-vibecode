/**
 * หัวข้อ 5.8 โครงเว็บ มือถือ และการเข้าถึง (TEST-PLAN.md) — 42 test case
 * โมดูล: NAV (หัว/ท้ายเว็บ), DRW (drawer มือถือ), NEWS (ฟอร์มรับข่าวสาร), ERR (404/URL), A11Y (การเข้าถึง)
 *
 * tag เลือก project (หัวข้อ 2.3):
 *   @mobile        = NAV-004, NAV-007, DRW-001…008, DRW-011, A11Y-008, A11Y-012
 *   DRW-010        = @mobile + @webkit-desktop + @no-mobile-safari (บน webkit desktop ตั้ง 375×812 เอง)
 *   A11Y-004       = @mobile-too (ส่วน @desktop / @mobile แยกด้วย isMobile)
 *   A11Y-007       = @chromium-only (forcedColors)
 */
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page, Response } from '@playwright/test';
import { test, expect, check, checkApi, baseURL } from './support/pp';

// ---------------------------------------------------------------------------
// ตัวช่วยของไฟล์นี้
// ---------------------------------------------------------------------------

const HOME_TITLE = 'PawPantry — อาหารแมวและสุนัขคัดพิเศษ';
const NF_H1 = 'อุ๊ย! ไม่พบหน้าที่คุณตามหา';
const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };

/** ชุด 11 หน้า (TC-A11Y-002) */
const PAGES11 = [
  '/',
  '/products',
  '/products?pet=cat',
  '/products/kitten-salmon-dry',
  '/finder',
  '/wishlist',
  '/cart',
  '/login',
  '/register',
  '/account',
  '/nope',
];
/** ชุด 11 หน้า ยกเว้น /account (10 หน้า) */
const PAGES10 = PAGES11.filter((p) => p !== '/account');

const softPoll = expect.configure({ soft: true });

/** ปุ่ม Tab ตามข้อตกลงหัวข้อ 5.8: WebKit บน macOS ใช้ Alt+Tab */
function tabKey(browserName: string, shift = false): string {
  const alt = process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+' : '';
  return `${alt}${shift ? 'Shift+' : ''}Tab`;
}

/** แตะ (จอสัมผัส) หรือคลิก */
async function tapOrClick(loc: Locator, hasTouch: boolean): Promise<void> {
  if (hasTouch) await loc.tap();
  else await loc.click();
}

/** รอ animation ของ drawer (drawer-in) จบ เพื่อให้วัดตำแหน่ง/elementFromPoint ได้นิ่ง */
async function drawerSettled(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const m = document.querySelector('#mobile-menu');
        const b = document.querySelector('.drawer-backdrop');
        return [m, b].every((e) => !e || e.getAnimations({ subtree: true }).every((a) => a.playState !== 'running'));
      },
      null,
      { timeout: 3000 },
    )
    .catch(() => {});
}

/** แตะ ☰ แล้วรอ #mobile-menu แสดงและ animation จบ */
async function openMenu(page: Page, hasTouch: boolean): Promise<void> {
  await tapOrClick(page.getByTestId('menu-toggle'), hasTouch);
  await page.locator('#mobile-menu').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await drawerSettled(page);
}

/** รอให้หน้าโหลดและ hydrate เสร็จ (ไม่ล้มถ้า networkidle ไม่มา) */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

/** path + query ของ URL ปัจจุบัน (ถอดรหัสแล้ว) */
function pathOf(url: string): string {
  const u = new URL(url);
  return decodeURIComponent(u.pathname + u.search);
}

/** ตะกร้ามี tuna-pouch ×1 (และ wishlist มี kitten-salmon-dry ถ้าขอ) — ตั้งใน localStorage ก่อนสคริปต์ของหน้าทำงาน เฉพาะเมื่อยังไม่มีค่า */
async function seedStorage(page: Page, opts: { wishlist?: boolean } = {}): Promise<void> {
  await page.addInitScript((wish: boolean) => {
    try {
      if (localStorage.getItem('pp-cart') === null)
        localStorage.setItem('pp-cart', JSON.stringify([{ slug: 'tuna-pouch', size: 'ซอง 85 g', qty: 1 }]));
      if (wish && localStorage.getItem('pp-wishlist') === null)
        localStorage.setItem('pp-wishlist', JSON.stringify(['kitten-salmon-dry']));
    } catch {
      /* about:blank */
    }
  }, !!opts.wishlist);
}

/** ล็อกอิน demo ผ่าน API (แชร์ cookie กับ page) */
async function loginDemo(page: Page): Promise<void> {
  const r = await page.request.post('/api/auth/login', { data: DEMO });
  if (!r.ok()) throw new Error(`ล็อกอิน demo ไม่สำเร็จ: HTTP ${r.status()}`);
}

type AxeViolation = { id: string; impact: string | null | undefined; nodes: string[] };
async function axe(page: Page, rules: string[]): Promise<AxeViolation[]> {
  const res = await new AxeBuilder({ page }).withRules(rules).analyze();
  return res.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => `${n.target.join(' ')} :: ${(n.failureSummary ?? '').split('\n').slice(1).join(' ').slice(0, 160)}`),
  }));
}

/** ข้อมูลของ document.activeElement (ใช้ใน page.evaluate — ต้องไม่อ้างตัวแปรภายนอก) */
const focusInfo = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || el === document.documentElement) {
    return {
      none: true, desc: '(body)', id: '', tag: '', name: '', inMenu: false, inDesktopNav: false, isToggle: false,
      isLink: false, isButton: false, hitSelf: false, inViewport: false, visible: false, inMain: false,
      outlineStyle: '', outlineWidth: '', boxShadow: '', ring: false, rect: { x: 0, y: 0, w: 0, h: 0 },
    };
  }
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const cs = getComputedStyle(el);
  const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const cv = (el as unknown as { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  const visible =
    typeof cv === 'function'
      ? cv.call(el) // checkVisibility() ตามแผน (ไม่นับ opacity ระหว่าง animation เข้าหน้า)
      : r.width > 0 && r.height > 0;
  const id = el.dataset.testid || (el.classList.contains('skip-link') ? 'skip-link' : '');
  return {
    none: false,
    desc: `${el.tagName.toLowerCase()}${id ? `[${id}]` : ''} "${name}"`,
    id,
    tag: el.tagName,
    name,
    inMenu: !!el.closest('#mobile-menu'),
    inDesktopNav: !!el.closest('.desktop-nav, header nav[aria-label="เมนูหลัก"]'),
    isToggle: el.matches('[data-testid="menu-toggle"]'),
    isLink: el.tagName === 'A',
    isButton: el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
    hitSelf: !!hit && (hit === el || el.contains(hit)),
    inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight,
    visible,
    inMain: !!el.closest('main#main'),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    boxShadow: cs.boxShadow,
    ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none',
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
  };
};
type FocusInfo = ReturnType<typeof focusInfo>;

/** "ปุ่มปิดเมนูที่มองเห็น" = ปุ่มที่ชื่อมีคำว่า "ปิด" (ไม่ใช่ "เปิด") และ elementFromPoint ที่ center คืนตัวมันเอง */
function isVisibleCloseBtn(f: FocusInfo): boolean {
  return f.isButton && /(?<!เ)ปิด/.test(f.name) && f.hitSelf;
}

/** element ที่ locator ชี้ — elementFromPoint ที่ center คืนตัวมันเองหรือลูก และไม่ใช่ของใน header */
async function hitTest(loc: Locator) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      self: !!hit && (hit === el || el.contains(hit)),
      inHeader: !!hit && !!hit.closest('header'),
      hit: hit ? `${hit.tagName.toLowerCase()}.${(hit as HTMLElement).className || ''}`.slice(0, 80) : '(null)',
    };
  });
}

/** ข้อความใน live region ทั้งหน้า (role=status / role=alert / aria-live ที่ไม่ใช่ off) */
async function liveTexts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="status"], [role="alert"], [aria-live]')]
      .filter((e) => e.getAttribute('aria-live') !== 'off')
      .map((e) => (e.textContent || '').trim())
      .filter((t) => t.length > 0),
  );
}

/** ส่งฟอร์มรับข่าวสาร (คลิก "สมัคร" หรือกด Enter) แล้วรอ live region สูงสุด 2 วินาที อ่านผล */
async function submitNewsletter(page: Page, value: string, via: 'click' | 'enter') {
  const input = page.getByTestId('newsletter-input');
  if (via === 'enter') {
    await input.click();
    await input.fill('');
    if (value) await input.pressSequentially(value, { delay: 0 });
    await input.press('Enter');
  } else {
    await input.fill(value);
    await page.getByTestId('newsletter-submit').click();
  }
  await expect
    .poll(async () => (await liveTexts(page)).length, { timeout: 2000 })
    .toBeGreaterThan(0)
    .catch(() => {});
  return readNewsletter(page);
}

async function readNewsletter(page: Page) {
  const live = await liveTexts(page);
  const field = await page.getByTestId('newsletter-input').evaluate((el) => {
    const inp = el as HTMLInputElement;
    const ids = (inp.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return {
      value: inp.value,
      ariaInvalid: inp.getAttribute('aria-invalid'),
      describedby: inp.getAttribute('aria-describedby'),
      describedText: ids.map((id) => (document.getElementById(id)?.textContent || '').trim()).join(' ').trim(),
      validityValid: inp.validity.valid,
    };
  });
  return { live, ...field };
}

/** contrast ของข้อความใน element (ใช้ใน evaluate) — คืน ratio, เกณฑ์ และสีที่ใช้คำนวณ */
const contrastOf = (el: Element) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const rgba = (c: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const blend = (top: number[], bot: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3]));
  // พื้นหลังจริง: ไล่ ancestor จนเจอสีทึบ ซ้อนสีโปร่งแสงทับพื้นขาว
  // ถ้าเจอพื้นแบบ gradient (background-image) ก่อนถึงสีทึบ ให้ใช้จุดสีแต่ละจุดของ gradient เป็นพื้น แล้วเอา contrast ต่ำสุด
  const layers: [number, number, number, number][] = [];
  let stops: [number, number, number, number][] | null = null;
  let gradient = '';
  let n: Element | null = el;
  while (n) {
    const ncs = getComputedStyle(n);
    const c = rgba(ncs.backgroundColor);
    if (!stops && /gradient\(/.test(ncs.backgroundImage)) {
      const found = ncs.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|hsla?\([^)]*\)/gi) ?? [];
      if (found.length) {
        stops = found.map(rgba);
        gradient = ncs.backgroundImage.slice(0, 120);
        if (stops.every((s) => s[3] >= 1)) break; // gradient ทึบ = พื้นหลังจริง ไม่ต้องไล่ต่อ
      }
    }
    if (c[3] > 0) {
      layers.push(c);
      if (c[3] >= 1) break;
    }
    n = n.parentElement;
  }
  let base = [255, 255, 255];
  for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
  const bgs = stops ? stops.map((s) => blend(s, base)) : [base];
  const cs = getComputedStyle(el);
  const fgA = rgba(cs.color);
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  let ratio = Infinity;
  let bg = bgs[0];
  let fg = blend(fgA, bg);
  for (const b of bgs) {
    const f = blend(fgA, b);
    const L1 = lum(f);
    const L2 = lum(b);
    const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (r < ratio) {
      ratio = r;
      bg = b;
      fg = f;
    }
  }
  const size = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10) || 400;
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  return {
    ratio: Math.round(ratio * 100) / 100,
    need: large ? 3 : 4.5,
    fg: hex(fg),
    bg: hex(bg),
    gradient: gradient || undefined,
    fontSize: size,
    fontWeight: weight,
    text: (el.textContent || '').trim().slice(0, 30),
  };
};

/** ข้อความที่สีตัวอักษร = สีพื้นหลังจริง (ancestor ตัวแรกที่ไม่โปร่งใส) */
const sameColorText = () => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const cache = new Map<string, string>();
  const norm = (c: string) => {
    if (cache.has(c)) return cache.get(c)!;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const v = `${d[0]},${d[1]},${d[2]},${d[3]}`;
    cache.set(c, v);
    return v;
  };
  const out: string[] = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && (c.textContent || '').trim());
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let n: Element | null = el;
    let bg = '';
    while (n) {
      const b = norm(getComputedStyle(n).backgroundColor);
      if (!b.endsWith(',0')) {
        bg = b;
        break;
      }
      n = n.parentElement;
    }
    if (!bg) bg = '255,255,255,255';
    const fg = norm(cs.color);
    if (fg.split(',').slice(0, 3).join() === bg.split(',').slice(0, 3).join() && !fg.endsWith(',0'))
      out.push(`${el.tagName.toLowerCase()}.${(el as HTMLElement).className} "${(el.textContent || '').trim().slice(0, 30)}" rgb(${fg})`);
  }
  return out.slice(0, 30);
};

const scrollWidthOf = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

// ===========================================================================
// F24 หัวเว็บ/ท้ายเว็บ และการไฮไลต์เมนู (P3)
// ===========================================================================

test('TC-NAV-001 ลิงก์หัวเว็บ 8 อันและท้ายเว็บ 9 อันพาไปหน้าที่ใช้ได้', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "จำนวนลิงก์หัวเว็บ = 8 และท้ายเว็บ = 9 · `page.request.get(href)` ทุกอันได้ status < 400 · ไม่มี response 4xx/5xx (ไม่นับ `/favicon.ico` ซึ่งตรวจใน TC-A11Y-013) · ปลายทาง: โลโก้ → `/` · \"อาหารแมว\" → `/products?pet=cat` · \"อาหารสุนัข\" → `/products?pet=dog` · \"ของเล่น\" → `/products?type=toy` · \"ช่วยเลือกอาหาร\" → `/finder` · ♥ → `/wishlist` · 🛒 → `/cart` · \"เข้าสู่ระบบ\" → `/login` · ท้ายเว็บ: \"อาหารแมว\" → `/products?pet=cat` · \"ขนม\" → `/products?type=treat` · ลิงก์ไป `/finder`, `/wishlist`, `/cart`, `/register` อย่างละ 1 · \"ประวัติการสั่งซื้อ\" → `/login?next=/account` (เพราะไม่ล็อกอิน) · อีก 2 ลิงก์: ผู้ทดสอบจดข้อความ + href จากหน้าเว็บลงแผนก่อนรัน แล้วตรวจว่า URL หลังคลิก = href" },
    { type: 'source', description: "[R] · R186 · ความเสี่ยง: ลิงก์เสีย/พาไปผิดหน้า · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const bad: string[] = [];
  const headerSel = 'header a[href]:not([href^="#"])';
  const headerLinks = page.locator(headerSel).filter({ hasNot: page.locator('#mobile-menu') });
  const footerLinks = page.locator('footer a[href]');
  let headerHrefs: string[] = [];
  let footerHrefs: string[] = [];

  await test.step('1. ติดตัวเก็บ response ที่ status ≥ 400 แล้วเปิด / นับลิงก์หัวเว็บและท้ายเว็บ', async () => {
    page.on('response', (r) => {
      if (r.status() >= 400 && !/\/favicon\.ico(\?|$)/.test(r.url())) bad.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/');
    await settle(page);
    headerHrefs = await page.$$eval(headerSel, (as) =>
      as.filter((a) => !a.closest('#mobile-menu')).map((a) => a.getAttribute('href') || ''),
    );
    footerHrefs = await footerLinks.evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
  });
  await check(page, 'ลิงก์หัวเว็บ = 8', headerLinks, async (el) => {
    await expect.soft(el).toHaveCount(8);
  }, { actual: async () => headerHrefs });
  await check(page, 'ลิงก์ท้ายเว็บ = 9', footerLinks, async (el) => {
    await expect.soft(el).toHaveCount(9);
  }, { actual: async () => footerHrefs });

  await test.step('2. page.request.get(href) ทุกอัน (ตาม redirect) จด status สุดท้าย', async () => {
    const results: { href: string; status: number; final: string }[] = [];
    for (const href of [...headerHrefs, ...footerHrefs]) {
      const r = await page.request.get(href);
      results.push({ href, status: r.status(), final: r.url() });
    }
    await checkApi('ทุก href ได้ status < 400', results, () => {
      for (const x of results) expect.soft(x.status, `${x.href} → ${x.status}`).toBeLessThan(400);
    });
  });

  await test.step('3. คลิกลิงก์หัวเว็บทีละอัน (กลับมา / ก่อนคลิกอันถัดไป) จด page.url()', async () => {
    const header = page.locator('header');
    const items: { name: string; loc: () => Locator; want: string }[] = [
      { name: 'โลโก้', loc: () => header.getByTestId('logo'), want: '/' },
      { name: 'อาหารแมว', loc: () => header.getByTestId('nav-cat'), want: '/products?pet=cat' },
      { name: 'อาหารสุนัข', loc: () => header.getByTestId('nav-dog'), want: '/products?pet=dog' },
      { name: 'ของเล่น', loc: () => header.getByTestId('nav-toys'), want: '/products?type=toy' },
      { name: 'ช่วยเลือกอาหาร', loc: () => header.getByTestId('nav-finder'), want: '/finder' },
      { name: '♥', loc: () => header.getByTestId('wishlist-link'), want: '/wishlist' },
      { name: '🛒', loc: () => header.getByTestId('cart-link'), want: '/cart' },
      { name: 'เข้าสู่ระบบ', loc: () => header.getByTestId('login-link'), want: '/login' },
    ];
    for (const it of items) {
      await page.goto('/');
      await it.loc().click();
      await page.waitForURL((u) => decodeURIComponent(u.pathname + u.search) === it.want, { timeout: 8000 }).catch(() => {});
      await settle(page);
      await check(page, `หัวเว็บ "${it.name}" → ${it.want}`, null, async () => {
        expect.soft(pathOf(page.url())).toBe(it.want);
      });
    }
  });

  await test.step('3. คลิกลิงก์ท้ายเว็บทีละอัน (กลับมา / ก่อนคลิกอันถัดไป) จด page.url()', async () => {
    const want4 = ['/finder', '/wishlist', '/cart', '/register'];
    await check(page, 'ท้ายเว็บมีลิงก์ไป /finder, /wishlist, /cart, /register อย่างละ 1', footerLinks, async () => {
      for (const w of want4) expect.soft(footerHrefs.filter((h) => h === w).length, `ลิงก์ไป ${w}`).toBe(1);
    }, { actual: async () => footerHrefs });
    const n = footerHrefs.length;
    for (let i = 0; i < n; i++) {
      await page.goto('/');
      const link = page.locator('footer a[href]').nth(i);
      const text = (await link.innerText()).trim();
      const href = (await link.getAttribute('href')) || '';
      let want = href;
      if (text.includes('ประวัติการสั่งซื้อ')) want = '/login?next=/account';
      else if (text === 'อาหารแมว') want = '/products?pet=cat';
      else if (text.startsWith('ขนม')) want = '/products?type=treat';
      await link.click();
      await page.waitForURL((u) => decodeURIComponent(u.pathname + u.search) === want, { timeout: 8000 }).catch(() => {});
      await settle(page);
      await check(page, `ท้ายเว็บ "${text}" (href ${href}) → ${want}`, null, async () => {
        expect.soft(pathOf(page.url())).toBe(want);
      });
    }
  });

  await test.step('4. สรุป response 4xx/5xx ตลอด test', async () => {
    await checkApi('ไม่มี response 4xx/5xx (ไม่นับ /favicon.ico)', bad, () => {
      expect.soft(bad).toEqual([]);
    });
  });
});

test('TC-NAV-002 เมนูที่ตรงกับหน้าปัจจุบันได้ class `active` และ `aria-current="page"` เพียงอันเดียว', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุก URL: ลิงก์ที่ href ตรงกับ URL (เช่น `/products?pet=cat` → \"อาหารแมว\") มี class `active` และ `aria-current=\"page\"` · อีก 3 ลิงก์ไม่มีทั้งสองอย่าง · จำนวน `aria-current=\"page\"` ในเมนูหลัก 4 ลิงก์ของหัวเว็บ (ไม่นับ `#mobile-menu`) = 1 (ตอนนี้ล้ม: มีแค่ `/finder` ที่ได้ `active` และไม่มี `aria-current` เลยทุกหน้า)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R] · R187 · R188 · Q43 · ความเสี่ยง: ผู้ใช้ไม่รู้ว่าอยู่หน้าไหน, โปรแกรมอ่านจอไม่รู้หน้าปัจจุบัน (สื่อด้วยสีอย่างเดียว) · เทคนิค: Happy path · Equivalence partition" },
  ],
}, async ({ page }) => {
  const mainLinks = page.locator('header').getByTestId(/^nav-(cat|dog|toys|finder)$/);
  const cases = [
    { url: '/products?pet=cat', id: 'nav-cat', name: 'อาหารแมว' },
    { url: '/products?pet=dog', id: 'nav-dog', name: 'อาหารสุนัข' },
    { url: '/products?type=toy', id: 'nav-toys', name: 'ของเล่น' },
    { url: '/finder', id: 'nav-finder', name: 'ช่วยเลือกอาหาร' },
  ];
  const state = () =>
    mainLinks.evaluateAll((as) =>
      as.map((a) => `${(a as HTMLElement).dataset.testid} class="${a.className}" aria-current=${a.getAttribute('aria-current')}`),
    );
  for (const c of cases) {
    await test.step(`1–3. เปิด ${c.url} อ่าน classList และ aria-current ของเมนูหลัก 4 ลิงก์`, async () => {
      await page.goto(c.url);
      await settle(page);
      const target = page.locator('header').getByTestId(c.id);
      await check(page, `${c.url}: "${c.name}" มี class active และ aria-current="page"`, target, async (el) => {
        await expect.soft(el).toHaveClass(/(^|\s)active(\s|$)/, { timeout: 2000 });
        await expect.soft(el).toHaveAttribute('aria-current', 'page', { timeout: 2000 });
      }, { actual: state });
      const others = mainLinks.and(page.locator(`:not([data-testid="${c.id}"])`));
      await check(page, `${c.url}: อีก 3 ลิงก์ไม่มี active และไม่มี aria-current`, others, async () => {
        for (const o of cases.filter((x) => x.id !== c.id)) {
          const l = page.locator('header').getByTestId(o.id);
          await expect.soft(l, `${o.name} ไม่ active`).not.toHaveClass(/(^|\s)active(\s|$)/, { timeout: 1000 });
          await expect.soft(l, `${o.name} ไม่มี aria-current`).not.toHaveAttribute('aria-current', /.*/, { timeout: 1000 });
        }
      }, { actual: state });
      await check(page, `${c.url}: จำนวน aria-current="page" ในเมนูหลัก = 1`, mainLinks, async (el) => {
        await expect.soft(el.and(page.locator('[aria-current="page"]'))).toHaveCount(1, { timeout: 2000 });
      }, { actual: state });
    });
  }
});

test('TC-NAV-003 หน้าที่ไม่ตรงกับเมนูใดต้องไม่มีเมนู active (กันการเทียบแค่ pathname)', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "`/`, `/products`, `/products?q=แซลมอน`, `/cart`, `/login`: ลิงก์เมนูหลักที่มี `active` = 0 และ `aria-current=\"page\"` = 0 · `/products?pet=cat&type=toy`: ไม่มีมากกว่า 1 ลิงก์ active (ห้าม \"อาหารแมว\" กับ \"ของเล่น\" active พร้อมกัน)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R] · R187 · R188 · Q43 · ความเสี่ยง: เทียบแค่ `/products` ทำให้ไฮไลต์ทุกเมนูพร้อมกัน · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  const mainLinks = page.locator('header').getByTestId(/^nav-(cat|dog|toys|finder)$/);
  const active = mainLinks.and(page.locator('.active'));
  const current = mainLinks.and(page.locator('[aria-current="page"]'));
  const state = () =>
    mainLinks.evaluateAll((as) =>
      as.map((a) => `${(a as HTMLElement).dataset.testid} class="${a.className}" aria-current=${a.getAttribute('aria-current')}`),
    );
  for (const url of ['/', '/products', '/products?q=แซลมอน', '/cart', '/login']) {
    await test.step(`1–3. เปิด ${url} นับเมนูหลักที่ active และ aria-current="page"`, async () => {
      await page.goto(url);
      await settle(page);
      await check(page, `${url}: เมนูหลักที่ active = 0 และ aria-current="page" = 0`, mainLinks, async () => {
        await expect.soft(active, 'จำนวน active').toHaveCount(0, { timeout: 2000 });
        await expect.soft(current, 'จำนวน aria-current="page"').toHaveCount(0, { timeout: 1000 });
      }, { actual: state });
    });
  }
  await test.step('1–3. เปิด /products?pet=cat&type=toy นับเมนูหลักที่ active', async () => {
    await page.goto('/products?pet=cat&type=toy');
    await settle(page);
    await check(page, '/products?pet=cat&type=toy: active ไม่เกิน 1 ลิงก์ ("อาหารแมว" กับ "ของเล่น" ไม่ active พร้อมกัน)', mainLinks, async () => {
      expect.soft(await active.count(), 'จำนวน active').toBeLessThanOrEqual(1);
      const cat = await page.locator('header').getByTestId('nav-cat').evaluate((e) => e.classList.contains('active'));
      const toy = await page.locator('header').getByTestId('nav-toys').evaluate((e) => e.classList.contains('active'));
      expect.soft(cat && toy, '"อาหารแมว" และ "ของเล่น" active พร้อมกัน').toBe(false);
    }, { actual: state });
  });
});

test('TC-NAV-004 เมนู active ใน drawer มือถือ', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ลิงก์ที่ตรงหน้าใน `nav#mobile-menu` มี class `active` และ `aria-current=\"page\"` · จำนวน `#mobile-menu [aria-current=\"page\"]` = 1 ทั้งสอง URL (ตอนนี้ล้ม: \"อาหารแมว\" ไม่ active และไม่มี `aria-current`)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R] · R187 · R188 · Q43 · ความเสี่ยง: ผู้ใช้มือถือไม่รู้ว่าอยู่หมวดไหน · เทคนิค: Happy path" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('nav#mobile-menu');
  const state = () =>
    mm.locator('a').evaluateAll((as) =>
      as.map((a) => `${a.textContent?.trim()} class="${a.className}" aria-current=${a.getAttribute('aria-current')}`),
    );
  for (const c of [
    { url: '/products?pet=cat', id: 'nav-cat', name: 'อาหารแมว' },
    { url: '/finder', id: 'nav-finder', name: 'ช่วยเลือกอาหาร' },
  ]) {
    await test.step(`1. เปิด ${c.url} แตะ ☰`, async () => {
      await page.goto(c.url);
      await settle(page);
      await openMenu(page, hasTouch);
    });
    await test.step(`2. อ่าน class และ aria-current ของ "${c.name}" ใน nav#mobile-menu`, async () => {
      const link = mm.getByTestId(c.id);
      await check(page, `${c.url}: "${c.name}" ใน drawer มี class active และ aria-current="page"`, link, async (el) => {
        await expect.soft(el).toHaveClass(/(^|\s)active(\s|$)/, { timeout: 2000 });
        await expect.soft(el).toHaveAttribute('aria-current', 'page', { timeout: 2000 });
      }, { actual: state });
      await check(page, `${c.url}: #mobile-menu [aria-current="page"] = 1`, mm, async () => {
        await expect.soft(page.locator('#mobile-menu [aria-current="page"]')).toHaveCount(1, { timeout: 2000 });
      }, { actual: state });
    });
  }
});

test('TC-NAV-005 ตัวนับบน ♥ และ 🛒 อยู่ในชื่อที่โปรแกรมอ่านจออ่าน', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ตัวนับที่เห็นบน 🛒 = \"1\" และบน ♥ = \"1\" · accessible name ของ 🛒 ขึ้นต้นด้วย \"ตะกร้าสินค้า\" และมีเลข \"1\" · ของ ♥ ขึ้นต้นด้วย \"รายการโปรด\" และมีเลข \"1\" (ตอนนี้ล้ม: `aria-label` ทับเป็น \"ตะกร้าสินค้า\" / \"รายการโปรด\" ไม่มีตัวเลข)" },
    { type: 'source', description: "[R] · R189 · ความเสี่ยง: ผู้ใช้โปรแกรมอ่านจอไม่รู้ว่าในตะกร้ามีของ · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  const cartLink = page.locator('header').getByTestId('cart-link');
  const wishLink = page.locator('header').getByTestId('wishlist-link');
  await test.step('1. เปิด /products/tuna-pouch กด "🛒 เพิ่มลงตะกร้า" (จำนวน 1)', async () => {
    await page.goto('/products/tuna-pouch');
    await settle(page);
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('cart-count').filter({ hasText: '1' }).waitFor({ timeout: 5000 }).catch(() => {});
  });
  await test.step('2. เปิด /products/kitten-salmon-dry กด ♥', async () => {
    await page.goto('/products/kitten-salmon-dry');
    await settle(page);
    await page.locator('main').getByTestId('wishlist-toggle').first().click();
    await page.getByTestId('wishlist-count').filter({ hasText: '1' }).waitFor({ timeout: 5000 }).catch(() => {});
  });
  await test.step('3. อ่าน accessible name ของลิงก์ 🛒 และ ♥ บนหัวเว็บ', async () => {
    await check(page, 'ตัวนับบน 🛒 = "1" และบน ♥ = "1"', page.getByTestId('cart-count').or(page.getByTestId('wishlist-count')), async () => {
      await expect.soft(page.getByTestId('cart-count')).toHaveText('1');
      await expect.soft(page.getByTestId('wishlist-count')).toHaveText('1');
    });
    await check(page, 'accessible name ของ 🛒 ขึ้นต้นด้วย "ตะกร้าสินค้า" และมีเลข "1"', cartLink, async (el) => {
      await expect.soft(el).toHaveAccessibleName(/^ตะกร้าสินค้า.*1/, { timeout: 2000 });
    }, { actual: async () => `aria-label="${await cartLink.getAttribute('aria-label')}" · ข้อความ "${(await cartLink.innerText()).trim()}"` });
    await check(page, 'accessible name ของ ♥ ขึ้นต้นด้วย "รายการโปรด" และมีเลข "1"', wishLink, async (el) => {
      await expect.soft(el).toHaveAccessibleName(/^รายการโปรด.*1/, { timeout: 2000 });
    }, { actual: async () => `aria-label="${await wishLink.getAttribute('aria-label')}" · ข้อความ "${(await wishLink.innerText()).trim()}"` });
  });
});

test('TC-NAV-006 กลุ่มลิงก์ท้ายเว็บเป็นหัวข้อและ landmark', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทั้ง 3 ข้อความเป็น heading (`h2`–`h6` หรือ `role=heading`) จำนวนที่พบ = 3 · มี `nav` ใน `footer` ≥ 1 อันที่ครอบลิงก์ทั้ง 9 (ตอนนี้ล้ม: ทั้ง 3 เป็น `<p>` และไม่มี `<nav>`)" },
    { type: 'source', description: "[R] · R190 · ความเสี่ยง: ผู้ใช้โปรแกรมอ่านจอข้ามไปกลุ่มลิงก์ท้ายเว็บไม่ได้ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /', async () => {
    await page.goto('/');
    await settle(page);
  });
  const names = ['ช้อปเลย', 'บัญชีของฉัน', 'รับข่าวสารและโปรโมชัน'];
  await test.step('2. getByRole("heading") ของ "ช้อปเลย" และอีก 2 หัวข้อ', async () => {
    for (const name of names) {
      const h = page.locator('footer').getByRole('heading', { name, exact: true });
      await check(page, `"${name}" เป็น heading`, page.locator('footer').getByText(name, { exact: true }), async () => {
        await expect.soft(h).toHaveCount(1, { timeout: 2000 });
      }, {
        actual: () =>
          page.locator('footer').getByText(name, { exact: true }).evaluateAll((es) =>
            es.map((e) => `<${e.tagName.toLowerCase()} role=${e.getAttribute('role')}>`),
          ),
      });
    }
    await check(page, 'จำนวน heading ที่พบ = 3', page.locator('footer'), async () => {
      let n = 0;
      for (const name of names) n += await page.locator('footer').getByRole('heading', { name, exact: true }).count();
      expect.soft(n).toBe(3);
    }, { actual: async () => page.locator('footer').getByRole('heading').allInnerTexts() });
  });
  await test.step('3. นับ footer nav หรือ footer [role=navigation]', async () => {
    const navs = page.locator('footer nav, footer [role="navigation"]');
    await check(page, 'มี nav ใน footer ≥ 1 อันที่ครอบลิงก์ทั้ง 9', navs, async () => {
      expect.soft(await navs.count(), 'จำนวน nav ใน footer').toBeGreaterThanOrEqual(1);
      const inNav = await page.locator('footer a[href]').evaluateAll(
        (as) => as.filter((a) => a.closest('footer nav, footer [role="navigation"]')).length,
      );
      expect.soft(inNav, 'ลิงก์ท้ายเว็บที่อยู่ใน nav').toBe(9);
    }, { actual: async () => ({ navCount: await navs.count() }) });
  });
});

test('TC-NAV-007 หัวเว็บแบบ fixed บนมือถือไม่บังเนื้อหาท้ายเว็บ', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "`elementFromPoint` คืนตัว element นั้นเอง (หรือลูกของมัน) ทั้ง 2 จุด ไม่ใช่ element ใน `header` · ลิงก์ \"อาหารแมว\" ใน footer กดได้ด้วย `click({trial:true})` โดยไม่ต้อง `force` (ตอนนี้ล้ม: ทั้งคู่ซ้อนอยู่ใต้ช่องค้นหาของหัวเว็บสูง 118px)" },
    { type: 'source', description: "[R] · R191 · ความเสี่ยง: มือถือกดลิงก์ท้ายเว็บไม่ได้ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const footer = page.locator('footer');
  const heading = footer.getByText('ช้อปเลย', { exact: true });
  const catLink = footer.getByRole('link', { name: 'อาหารแมว', exact: true });
  await test.step('1. เปิด / เลื่อนลงจนสุด', async () => {
    await page.goto('/');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => window.scrollY > 0, null, { timeout: 3000 }).catch(() => {});
  });
  for (const [name, loc] of [
    ['หัวข้อ "ช้อปเลย"', heading],
    ['ลิงก์ "อาหารแมว" ใน footer', catLink],
  ] as const) {
    await test.step(`2–3. elementFromPoint ที่ center ของ${name}`, async () => {
      let r = await hitTest(loc);
      const vh = page.viewportSize()?.height ?? 812;
      if (r.y < 0 || r.y > vh) {
        await loc.evaluate((e) => e.scrollIntoView({ block: 'start' }));
        r = await hitTest(loc);
      }
      await check(page, `${name}: elementFromPoint คืนตัวมันเอง (ไม่ใช่ element ใน header)`, loc, async () => {
        expect.soft(r.self, `elementFromPoint(${r.x},${r.y}) = ${r.hit}`).toBe(true);
        expect.soft(r.inHeader, 'ถูก header บัง').toBe(false);
      }, { actual: async () => r });
    });
  }
  await test.step('ลิงก์ "อาหารแมว" ใน footer กดได้ด้วย click({trial:true}) โดยไม่ต้อง force', async () => {
    let err = '';
    try {
      await catLink.click({ trial: true, timeout: 3000 });
    } catch (e) {
      err = (e as Error).message.split('\n').slice(0, 4).join(' | ');
    }
    await check(page, 'click({trial:true}) ที่ "อาหารแมว" สำเร็จ', catLink, async () => {
      expect.soft(err, 'ข้อผิดพลาดจาก click trial').toBe('');
    }, { actual: async () => err || 'คลิกได้' });
  });
});

// ===========================================================================
// F25 เมนู drawer มือถือ (P3)
// ===========================================================================

test('TC-DRW-001 ลิงก์ 7 อันใน drawer พาไปหน้าที่ใช้ได้และ drawer ปิดเองหลังเปลี่ยนหน้า', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "จำนวนลิงก์ = 7 · `page.request.get(href)` ทุกอันได้ status < 400 · ปลายทาง `/products?pet=cat`, `/products?pet=dog`, `/products?type=toy`, `/finder`, `/wishlist`, `/cart` และ pathname `/login` หรือ `/register` · หลังเปลี่ยนหน้า ☰ `aria-expanded=\"false\"` และ `#mobile-menu` มองไม่เห็น" },
    { type: 'source', description: "[R] · R186 · ความเสี่ยง: ผู้ใช้มือถือไปหน้าหลักไม่ได้ · เทคนิค: Happy path" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  let hrefs: string[] = [];
  await test.step('1. เปิด / แตะ ☰ นับ #mobile-menu a[href] แล้ว request.get(href) ทุกอัน', async () => {
    await page.goto('/');
    await settle(page);
    await openMenu(page, hasTouch);
    hrefs = await mm.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
    await check(page, 'จำนวนลิงก์ใน drawer = 7', mm.locator('a[href]'), async (el) => {
      await expect.soft(el).toHaveCount(7);
    }, { actual: async () => hrefs });
    const results: { href: string; status: number }[] = [];
    for (const h of hrefs) results.push({ href: h, status: (await page.request.get(h)).status() });
    await checkApi('ทุก href ใน drawer ได้ status < 400', results, () => {
      for (const x of results) expect.soft(x.status, `${x.href} → ${x.status}`).toBeLessThan(400);
    });
  });
  await test.step('2–3. แตะลิงก์ทีละอัน (กลับ / แล้วเปิด ☰ ใหม่ทุกรอบ) จด URL, aria-expanded และการมองเห็นของ #mobile-menu', async () => {
    const wantSet = ['/products?pet=cat', '/products?pet=dog', '/products?type=toy', '/finder', '/wishlist', '/cart'];
    for (let i = 0; i < hrefs.length; i++) {
      await page.goto('/');
      await settle(page);
      await openMenu(page, hasTouch);
      const link = mm.locator('a[href]').nth(i);
      const text = (await link.innerText()).trim();
      const href = hrefs[i];
      const isAuth = /^\/(login|register)/.test(href);
      await tapOrClick(link, hasTouch);
      if (isAuth) await page.waitForURL((u) => /^\/(login|register)$/.test(u.pathname), { timeout: 8000 }).catch(() => {});
      else await page.waitForURL((u) => decodeURIComponent(u.pathname + u.search) === href, { timeout: 8000 }).catch(() => {});
      await settle(page);
      await check(page, `แตะ "${text}" → ปลายทางถูก และ drawer ปิด`, toggle, async (el) => {
        const got = pathOf(page.url());
        if (isAuth) expect.soft(['/login', '/register'], `pathname ${new URL(page.url()).pathname}`).toContain(new URL(page.url()).pathname);
        else {
          expect.soft(wantSet, `href ${href} อยู่ในปลายทางที่กำหนด`).toContain(href);
          expect.soft(got).toBe(href);
        }
        await expect.soft(el).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
        await expect.soft(mm).toBeHidden({ timeout: 2000 });
      }, { actual: async () => ({ url: pathOf(page.url()), ariaExpanded: await toggle.getAttribute('aria-expanded'), menuVisible: await mm.isVisible() }) });
    }
  });
});

test('TC-DRW-002 ปุ่ม ☰ มี attribute ครบ และ Esc ปิดเมนูแล้วคืนโฟกัส', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ก่อนเปิด: `aria-controls=\"mobile-menu\"`, `aria-expanded=\"false\"`, ชื่อ \"เปิดเมนู\" · หลังเปิด: `aria-expanded=\"true\"`, ชื่อ \"ปิดเมนู\", `#mobile-menu` มองเห็น · หลัง Esc: `aria-expanded=\"false\"`, `#mobile-menu` มองไม่เห็น, `document.activeElement` = ปุ่ม ☰" },
    { type: 'source', description: "[R] · R192 · R209 · ความเสี่ยง: ผู้ใช้คีย์บอร์ดปิดเมนูแล้วหลงโฟกัส · เทคนิค: Happy path · State" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  const attrs = async () => ({
    ariaControls: await toggle.getAttribute('aria-controls'),
    ariaExpanded: await toggle.getAttribute('aria-expanded'),
    ariaLabel: await toggle.getAttribute('aria-label'),
    menuVisible: await mm.isVisible(),
    active: (await page.evaluate(focusInfo)).desc,
  });
  await test.step('1. เปิด / อ่าน aria-controls, aria-expanded, accessible name ของ ☰', async () => {
    await page.goto('/');
    await settle(page);
    await check(page, 'ก่อนเปิด: aria-controls="mobile-menu", aria-expanded="false", ชื่อ "เปิดเมนู"', toggle, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-controls', 'mobile-menu');
      await expect.soft(el).toHaveAttribute('aria-expanded', 'false');
      await expect.soft(el).toHaveAccessibleName('เปิดเมนู');
    }, { actual: attrs });
  });
  await test.step('2. แตะ ☰ อ่านค่าเดิมซ้ำ', async () => {
    await openMenu(page, hasTouch);
    await check(page, 'หลังเปิด: aria-expanded="true", ชื่อ "ปิดเมนู", #mobile-menu มองเห็น', mm, async () => {
      await expect.soft(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect.soft(toggle).toHaveAccessibleName('ปิดเมนู');
      await expect.soft(mm).toBeVisible();
    }, { actual: attrs });
  });
  await test.step('3. กด Escape อ่าน aria-expanded และ document.activeElement', async () => {
    await page.keyboard.press('Escape');
    await check(page, 'หลัง Esc: aria-expanded="false", #mobile-menu มองไม่เห็น, activeElement = ☰', toggle, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
      await expect.soft(mm).toBeHidden({ timeout: 2000 });
      await expect.soft(el).toBeFocused({ timeout: 2000 });
    }, { actual: attrs });
  });
});

test('TC-DRW-003 เปิดเมนูด้วยคีย์บอร์ดแล้วโฟกัสย้ายเข้า drawer และมองเห็น', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "หลัง Enter: `aria-expanded=\"true\"` และ `document.activeElement` อยู่ใน `#mobile-menu` หรือเป็นปุ่มปิดเมนูที่มองเห็น และไม่ใช่ปุ่ม ☰ ที่ถูก drawer บัง · มองเห็นได้ (`elementFromPoint` ที่ center คืนตัวมันเอง) และมีกรอบโฟกัสมองเห็นตามนิยามในข้อตกลงหัวข้อ 5.8 · หลัง Space: ถ้า activeElement เป็นลิงก์ → เมนูยังเปิด `aria-expanded=\"true\"` · ถ้าเป็นปุ่มปิดที่มองเห็น → เมนูปิด `aria-expanded=\"false\"` และ `document.activeElement` = ☰ (ตอนนี้ล้ม: โฟกัสค้างที่ ☰ ที่ถูก drawer บัง และ Space ปิดเมนู)" },
    { type: 'source', description: "[R] · R197 · ความเสี่ยง: ผู้ใช้คีย์บอร์ดมองไม่เห็นโฟกัส ปิดเมนูโดยไม่ตั้งใจ · เทคนิค: Negative · State" },
  ],
}, async ({ page, browserName }) => {
  const toggle = page.getByTestId('menu-toggle');
  let afterEnter: FocusInfo | undefined;
  await test.step('1. เปิด / กด Tab จนโฟกัสอยู่ที่ ☰', async () => {
    await page.goto('/');
    await settle(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(tabKey(browserName));
      if ((await page.evaluate(focusInfo)).isToggle) break;
    }
    await check(page, 'โฟกัสอยู่ที่ ☰ ก่อนกด Enter', toggle, async (el) => {
      await expect.soft(el).toBeFocused();
    }, { actual: async () => (await page.evaluate(focusInfo)).desc });
  });
  await test.step('2. กด Enter อ่าน document.activeElement และ outline/box-shadow', async () => {
    await page.keyboard.press('Enter');
    await page.locator('#mobile-menu').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    await drawerSettled(page);
    afterEnter = await page.evaluate(focusInfo);
    const f = afterEnter;
    await check(page, 'หลัง Enter: aria-expanded="true" และโฟกัสอยู่ใน #mobile-menu หรือเป็นปุ่มปิดที่มองเห็น (ไม่ใช่ ☰ ที่ถูกบัง)', page.locator(':focus'), async () => {
      await expect.soft(toggle).toHaveAttribute('aria-expanded', 'true');
      expect.soft(f.inMenu || isVisibleCloseBtn(f), `activeElement = ${f.desc}`).toBe(true);
      expect.soft(f.isToggle && !f.hitSelf, '☰ ที่ถูก drawer บัง').toBe(false);
    }, { actual: async () => f });
    await check(page, 'activeElement มองเห็นได้ (elementFromPoint ที่ center คืนตัวมันเอง) และมีกรอบโฟกัสมองเห็น', page.locator(':focus'), async () => {
      expect.soft(f.hitSelf, `elementFromPoint ที่ center ของ ${f.desc}`).toBe(true);
      expect.soft(f.ring, `outline ${f.outlineStyle} ${f.outlineWidth} · box-shadow ${f.boxShadow}`).toBe(true);
    }, { actual: async () => f });
  });
  await test.step('3. กด Space 1 ครั้ง อ่าน aria-expanded ของ ☰ และ document.activeElement', async () => {
    const before = afterEnter!;
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const after = await page.evaluate(focusInfo);
    const expanded = await toggle.getAttribute('aria-expanded');
    await check(page, 'หลัง Space: ลิงก์ → เมนูยังเปิด · ปุ่มปิดที่มองเห็น → เมนูปิดและโฟกัสกลับ ☰', toggle, async () => {
      if (before.isLink && before.inMenu) {
        expect.soft(expanded, 'activeElement เป็นลิงก์ → aria-expanded').toBe('true');
      } else if (isVisibleCloseBtn(before)) {
        expect.soft(expanded, 'activeElement เป็นปุ่มปิด → aria-expanded').toBe('false');
        expect.soft(after.isToggle, `activeElement หลัง Space = ${after.desc}`).toBe(true);
      } else {
        expect.soft(false, `ก่อนกด Space โฟกัสไม่ได้อยู่ที่ลิงก์ใน drawer หรือปุ่มปิดที่มองเห็น (${before.desc}) · หลัง Space aria-expanded=${expanded}`).toBe(true);
      }
    }, { actual: async () => ({ before: before.desc, after: after.desc, ariaExpanded: expanded }) });
  });
});

test('TC-DRW-004 กด back ขณะ/หลังเปิดเมนูแล้วเมนูไม่ค้าง', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "URL = `/` · ☰ `aria-expanded=\"false\"` · `#mobile-menu` มองไม่เห็น · ไม่มีอะไรบังหน้า: `document.querySelector('main#main').contains(document.elementFromPoint(187,400))` = true" },
    { type: 'source', description: "[R] · R192 · ความเสี่ยง: เมนูค้างบังหน้าหลังย้อนกลับ · เทคนิค: State" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  await test.step('1. เปิด / แล้วไป /finder', async () => {
    await page.goto('/');
    await settle(page);
    await page.goto('/finder');
    await settle(page);
  });
  await test.step('2. แตะ ☰ (เมนูเปิด)', async () => {
    await openMenu(page, hasTouch);
  });
  await test.step('3. page.goBack()', async () => {
    await page.goBack();
    await settle(page);
    const hit = await page.evaluate(() => {
      const e = document.elementFromPoint(187, 400);
      return { inMain: !!document.querySelector('main#main')?.contains(e), el: e ? `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`.slice(0, 80) : '(null)' };
    });
    await check(page, 'URL = / · ☰ aria-expanded="false" · #mobile-menu มองไม่เห็น · ไม่มีอะไรบังหน้า', toggle, async (el) => {
      expect.soft(pathOf(page.url())).toBe('/');
      await expect.soft(el).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
      await expect.soft(mm).toBeHidden({ timeout: 2000 });
      expect.soft(hit.inMain, `elementFromPoint(187,400) = ${hit.el}`).toBe(true);
    }, { actual: async () => ({ url: page.url(), ariaExpanded: await toggle.getAttribute('aria-expanded'), menuVisible: await mm.isVisible(), hit }) });
  });
});

test('TC-DRW-005 ตอนเปิด drawer โฟกัสถูกกักไว้ใน drawer', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ทั้ง 28 ครั้ง `activeElement` อยู่ใน `#mobile-menu` (หรือเป็นปุ่มปิดของเมนู) จำนวนครั้งที่โฟกัสออกนอก = 0 · ไม่โดนโลโก้/ช่องค้นหา/♥/🛒/\"เข้าสู่ระบบ\"/\"🐱 ช้อปอาหารแมว\" ที่ถูกบังอยู่ · พ้นลิงก์สุดท้ายแล้ววนกลับลิงก์แรก (ตอนนี้ล้ม: 6 ครั้งแรกไปโลโก้/ช่องค้นหา/ปุ่มค้นหา/♥/🛒/เข้าสู่ระบบ แล้วหลุดไป \"🐱 ช้อปอาหารแมว\")" },
    { type: 'source', description: "[R] · R193 · Q45 · ความเสี่ยง: ผู้ใช้คีย์บอร์ด/โปรแกรมอ่านจอทำงานกับของที่ถูกบัง (WCAG 2.4.3, 2.4.11) · เทคนิค: Negative" },
  ],
}, async ({ page, hasTouch, browserName }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  const log: { key: string; desc: string; inMenu: boolean; ok: boolean; idx: number }[] = [];
  let links: string[] = [];
  await test.step('1. เปิด / แตะ ☰', async () => {
    await page.goto('/');
    await settle(page);
    await openMenu(page, hasTouch);
    links = await mm.locator('a[href], button, input, [tabindex]:not([tabindex="-1"])').evaluateAll((es) =>
      es.map((e) => (e.textContent || '').trim()),
    );
  });
  const record = async (key: string) => {
    await page.keyboard.press(key);
    const f = await page.evaluate(focusInfo);
    const idx = await page.evaluate(() => {
      const all = [...document.querySelectorAll('#mobile-menu a[href], #mobile-menu button, #mobile-menu input, #mobile-menu [tabindex]:not([tabindex="-1"])')];
      return all.indexOf(document.activeElement as Element);
    });
    log.push({ key, desc: f.desc, inMenu: f.inMenu, ok: f.inMenu || isVisibleCloseBtn(f), idx });
  };
  await test.step('2. กด Tab 14 ครั้ง บันทึก document.activeElement ทุกครั้ง', async () => {
    for (let i = 0; i < 14; i++) await record(tabKey(browserName));
  });
  await test.step('3. กด Shift+Tab 14 ครั้ง บันทึกเหมือนเดิม', async () => {
    for (let i = 0; i < 14; i++) await record(tabKey(browserName, true));
  });
  await check(page, 'ทั้ง 28 ครั้ง activeElement อยู่ใน #mobile-menu (หรือปุ่มปิดของเมนู) — ออกนอก = 0', mm, async () => {
    const out = log.filter((l) => !l.ok);
    expect.soft(out.length, `ครั้งที่โฟกัสออกนอก: ${out.map((o) => o.desc).join(', ')}`).toBe(0);
  }, { actual: async () => log.map((l, i) => `${i + 1}. ${l.key} → ${l.desc}${l.ok ? '' : '  ✗ นอก drawer'}`).join('\n') });
  await check(page, 'Tab พ้นลิงก์สุดท้ายแล้ววนกลับลิงก์แรก', mm, async () => {
    const tabs = log.slice(0, 14);
    const last = links.length - 1;
    const i = tabs.findIndex((l) => l.idx === last);
    expect.soft(i, 'โฟกัสถึงลิงก์สุดท้ายของ drawer ภายใน 13 ครั้งแรก').toBeGreaterThanOrEqual(0);
    expect.soft(i, 'โฟกัสถึงลิงก์สุดท้ายของ drawer ภายใน 13 ครั้งแรก').toBeLessThan(13);
    if (i >= 0 && i < 13) {
      const next = tabs[i + 1];
      expect.soft(next.idx === 0 || (next.ok && !next.inMenu), `Tab ถัดจากลิงก์สุดท้าย = ${next.desc}`).toBe(true);
    }
  }, { actual: async () => ({ drawerItems: links, tabs: log.slice(0, 14).map((l) => `${l.desc} (idx ${l.idx})`) }) });
});

test('TC-DRW-006 drawer ที่เปิดอยู่มีปุ่มปิดที่มองเห็นและใช้ได้', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "มีปุ่มชื่อมีคำว่า \"ปิด\" อย่างน้อย 1 ปุ่มที่ `elementFromPoint` ที่ center คืนตัวปุ่มเอง (ไม่ถูก drawer บัง) และขนาด ≥ 24×24 px · แตะแล้ว ☰ `aria-expanded=\"false\"` และ `#mobile-menu` มองไม่เห็น (ตอนนี้ล้ม: ไม่มีปุ่ม ✕ และ drawer กว้าง ~320px ทับปุ่ม ☰)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R194 · Q45 · ความเสี่ยง: ผู้ใช้ไม่รู้วิธีปิดเมนู · เทคนิค: Negative" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  const found: { name: string; box: unknown; self: boolean; size: boolean }[] = [];
  let usable: Locator | null = null;
  await test.step('1. เปิด / แตะ ☰', async () => {
    await page.goto('/');
    await settle(page);
    await openMenu(page, hasTouch);
  });
  await test.step('2. วนทุกปุ่มที่ชื่อมีคำว่า "ปิด" วัด boundingBox() และ elementFromPoint ที่ center', async () => {
    const btns = await page.getByRole('button', { name: /(?<!เ)ปิด/ }).all();
    for (const b of btns) {
      const box = await b.boundingBox();
      const r = await hitTest(b);
      const name = (await b.getAttribute('aria-label')) || (await b.innerText()).trim();
      const size = !!box && box.width >= 24 && box.height >= 24;
      found.push({ name, box, self: r.self, size });
      if (!usable && r.self && size) usable = b;
    }
    await check(page, 'มีปุ่มชื่อมี "ปิด" ≥ 1 ปุ่มที่ไม่ถูกบัง (elementFromPoint คืนตัวเอง) และขนาด ≥ 24×24 px', usable ?? page.getByRole('button', { name: /(?<!เ)ปิด/ }), async () => {
      expect.soft(found.filter((f) => f.self && f.size).length).toBeGreaterThanOrEqual(1);
    }, { actual: async () => found });
  });
  await test.step('3. แตะปุ่มที่ elementFromPoint คืนตัวปุ่มเอง', async () => {
    if (usable) await tapOrClick(usable, hasTouch);
    await check(page, 'แตะปุ่มปิดแล้ว ☰ aria-expanded="false" และ #mobile-menu มองไม่เห็น', toggle, async (el) => {
      expect.soft(usable !== null, 'มีปุ่มปิดที่แตะได้').toBe(true);
      await expect.soft(el).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
      await expect.soft(mm).toBeHidden({ timeout: 2000 });
    }, { actual: async () => ({ ariaExpanded: await toggle.getAttribute('aria-expanded'), menuVisible: await mm.isVisible() }) });
  });
});

test('TC-DRW-007 แตะลิงก์ของหน้าที่อยู่แล้วเมนูปิด', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ทั้งสองกรณี ☰ `aria-expanded=\"false\"` · `#mobile-menu` มองไม่เห็น · URL ยังเป็น `/products?pet=cat` และ `/finder` ตามลำดับ (ตอนนี้ล้ม: drawer ค้างเปิด `aria-expanded=\"true\"` เพราะ URL ไม่เปลี่ยน)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R195 · Q45 · ความเสี่ยง: กดแล้วเหมือนไม่มีอะไรเกิดขึ้น · เทคนิค: Negative · State" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  for (const c of [
    { url: '/products?pet=cat', id: 'nav-cat', name: 'อาหารแมว' },
    { url: '/finder', id: 'nav-finder', name: 'ช่วยเลือกอาหาร' },
  ]) {
    await test.step(`1. เปิด ${c.url} แตะ ☰`, async () => {
      await page.goto(c.url);
      await settle(page);
      await openMenu(page, hasTouch);
    });
    await test.step(`2. แตะ "${c.name}" ใน drawer รอ 500 ms อ่าน aria-expanded และ URL`, async () => {
      await tapOrClick(mm.getByTestId(c.id), hasTouch);
      await page.waitForTimeout(500);
      await check(page, `${c.url}: ☰ aria-expanded="false" · #mobile-menu มองไม่เห็น · URL ยังเป็น ${c.url}`, toggle, async (el) => {
        await expect.soft(el).toHaveAttribute('aria-expanded', 'false', { timeout: 1000 });
        await expect.soft(mm).toBeHidden({ timeout: 1000 });
        expect.soft(pathOf(page.url())).toBe(c.url);
      }, { actual: async () => ({ url: pathOf(page.url()), ariaExpanded: await toggle.getAttribute('aria-expanded'), menuVisible: await mm.isVisible() }) });
    });
  }
});

test('TC-DRW-008 ขยายหน้าต่างจากมือถือเป็นเดสก์ท็อปขณะเมนูเปิด', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "หลัง resize ทางใดทางหนึ่ง: (ก) `elementFromPoint` ที่ center ของ \"อาหารแมว\" ในหัวเว็บคืนลิงก์นั้นทันที หรือ (ข) มีปุ่มปิดที่มองเห็น และหลัง Escape `elementFromPoint` คืนลิงก์นั้น · คลิก \"อาหารแมว\" แล้ว URL = `/products?pet=cat` (ตอนนี้ล้ม: drawer + พื้นหลังเบลอค้างเต็มจอ แต่ปุ่ม ☰ หายไป)" },
    { type: 'source', description: "[R] · R196 · ความเสี่ยง: หมุนแท็บเล็ตแล้วหน้าใช้ไม่ได้ · เทคนิค: Boundary · State" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  const cat = page.locator('header').getByTestId('nav-cat');
  let a: Awaited<ReturnType<typeof hitTest>> | undefined;
  let b: Awaited<ReturnType<typeof hitTest>> | undefined;
  let closeBtn: { name: string; self: boolean; size: boolean }[] = [];
  await test.step('1. เปิด / แตะ ☰ (เมนูเปิด)', async () => {
    await page.goto('/');
    await settle(page);
    await openMenu(page, hasTouch);
  });
  await test.step('2. page.setViewportSize({width:1280,height:800})', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await cat.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  });
  await test.step('3. วัด elementFromPoint ที่ center ของ "อาหารแมว" ในหัวเว็บ · ถ้าไม่ใช่ลิงก์นั้น หาปุ่มปิดที่มองเห็นแล้วกด Escape วัดซ้ำ', async () => {
    a = await hitTest(cat);
    if (!a.self) {
      for (const btn of await page.getByRole('button', { name: /(?<!เ)ปิด/ }).all()) {
        const box = await btn.boundingBox();
        const r = await hitTest(btn);
        closeBtn.push({ name: (await btn.getAttribute('aria-label')) || (await btn.innerText()).trim(), self: r.self, size: !!box && box.width >= 24 && box.height >= 24 });
      }
      await page.keyboard.press('Escape');
      b = await hitTest(cat);
    }
    await check(page, 'หลัง resize: (ก) "อาหารแมว" ไม่ถูกบัง หรือ (ข) มีปุ่มปิดที่มองเห็น และหลัง Escape ไม่ถูกบัง', cat, async () => {
      const ok = a!.self || (closeBtn.some((c) => c.self && c.size) && !!b?.self);
      expect.soft(ok).toBe(true);
    }, { actual: async () => ({ ก_หลังresize: a, ปุ่มปิด: closeBtn, ข_หลังEscape: b ?? '(ไม่ต้องวัด)' }) });
  });
  await test.step('4. click({trial:true}) แล้วคลิกจริงที่ "อาหารแมว"', async () => {
    let err = '';
    try {
      await cat.click({ trial: true, timeout: 3000 });
      await cat.click({ timeout: 3000 });
      await page.waitForURL((u) => decodeURIComponent(u.pathname + u.search) === '/products?pet=cat', { timeout: 8000 }).catch(() => {});
    } catch (e) {
      err = (e as Error).message.split('\n').slice(0, 3).join(' | ');
    }
    await check(page, 'คลิก "อาหารแมว" แล้ว URL = /products?pet=cat', null, async () => {
      expect.soft(err, 'คลิกได้').toBe('');
      expect.soft(pathOf(page.url())).toBe('/products?pet=cat');
    }, { actual: async () => ({ url: page.url(), error: err }) });
  });
});

test('TC-DRW-009 ความกว้างขอบ 1024/1025 px ต้องมีทางนำทางเสมอ', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุกความกว้าง: (☰ มองเห็น) หรือ (เมนูหลัก 4 ลิงก์มองเห็นครบ) อย่างใดอย่างหนึ่งเท่านั้น ไม่มีกรณีที่ทั้งสองถูกซ่อน · ทั้ง 2 ความกว้างไปถึง `/products?pet=cat` ได้" },
    { type: 'source', description: "[R] · R186 · R196 · ความเสี่ยง: ช่วงความกว้างที่ไม่มีเมนูให้กด · เทคนิค: Boundary" },
  ],
}, async ({ page, hasTouch }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mainLinks = page.locator('header').getByTestId(/^nav-(cat|dog|toys|finder)$/);
  for (const w of [1024, 1025]) {
    await test.step(`1–2. เปิด / ที่ ${w}×800 อ่าน isVisible() ของ ☰ และเมนูหลัก 4 ลิงก์`, async () => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/');
      await settle(page);
      const burger = await toggle.isVisible();
      const vis = await Promise.all([0, 1, 2, 3].map((i) => mainLinks.nth(i).isVisible()));
      const navAll = vis.length === 4 && vis.every(Boolean);
      await check(page, `${w}px: (☰ มองเห็น) หรือ (เมนูหลัก 4 ลิงก์มองเห็นครบ) อย่างใดอย่างหนึ่งเท่านั้น`, burger ? toggle : mainLinks, async () => {
        expect.soft(burger !== navAll, `☰=${burger} · เมนูหลัก=${vis.join(',')}`).toBe(true);
        expect.soft(burger || navAll, 'ทั้งสองถูกซ่อน').toBe(true);
      }, { actual: async () => ({ width: w, burgerVisible: burger, mainLinksVisible: vis }) });
    });
    await test.step(`3. คลิก "อาหารแมว" ผ่านทางที่มองเห็นที่ ${w}px`, async () => {
      let err = '';
      try {
        const headerCat = page.locator('header').getByTestId('nav-cat');
        if (await headerCat.isVisible()) await headerCat.click({ timeout: 5000 });
        else {
          await tapOrClick(toggle, hasTouch);
          await page.locator('#mobile-menu').getByTestId('nav-cat').click({ timeout: 5000 });
        }
        await page.waitForURL((u) => decodeURIComponent(u.pathname + u.search) === '/products?pet=cat', { timeout: 8000 }).catch(() => {});
      } catch (e) {
        err = (e as Error).message.split('\n')[0];
      }
      await check(page, `${w}px: ไปถึง /products?pet=cat`, null, async () => {
        expect.soft(pathOf(page.url())).toBe('/products?pet=cat');
      }, { actual: async () => ({ url: page.url(), error: err }) });
    });
  }
});

test('TC-DRW-010 ตอนเปิด drawer หน้าข้างหลังไม่เลื่อนตาม', {
  tag: ['@P3', '@5.8', '@mobile', '@webkit-desktop', '@no-mobile-safari'],
  annotation: [
    { type: 'expected', description: "`window.scrollY` = 0 หลังหมุนล้อระหว่างเมนูเปิด · กด Escape ปิดเมนูแล้วเลื่อนหน้าได้ตามปกติ (`scrollY` > 0 หลังหมุนล้อซ้ำ) (ตอนนี้ล้ม: หน้าข้างหลังเลื่อนไป 800px ระหว่างเมนูเปิด)" },
    { type: 'source', description: "[R] · R198 · ความเสี่ยง: ปิดเมนูแล้วผู้ใช้หลงตำแหน่งบนหน้า · เทคนิค: Negative" },
  ],
}, async ({ page, hasTouch, isMobile }) => {
  const toggle = page.getByTestId('menu-toggle');
  const mm = page.locator('#mobile-menu');
  const scrollY = () => page.evaluate(() => window.scrollY);
  await test.step('1. เปิด / อ่าน window.scrollY (= 0)', async () => {
    if (!isMobile) await page.setViewportSize({ width: 375, height: 812 }); // project webkit (desktop) ตั้ง 375×812 เอง
    await page.goto('/');
    await settle(page);
    const y = await scrollY();
    await check(page, 'ก่อนเปิดเมนู scrollY = 0', null, async () => {
      expect.soft(y).toBe(0);
    }, { actual: async () => y });
  });
  await test.step('2. แตะ ☰ แล้ว mouse.move(40,600) และ mouse.wheel(0,800) อ่าน window.scrollY', async () => {
    await openMenu(page, hasTouch);
    await page.mouse.move(40, 600);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(600);
    const y = await scrollY();
    await check(page, 'scrollY = 0 หลังหมุนล้อระหว่างเมนูเปิด', null, async () => {
      expect.soft(y).toBe(0);
    }, { actual: async () => y });
  });
  await test.step('3. กด Escape ปิดเมนู แล้ว mouse.wheel(0,800) ซ้ำ อ่าน window.scrollY', async () => {
    await page.keyboard.press('Escape');
    await mm.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    await page.mouse.move(187, 600);
    await page.mouse.wheel(0, 800);
    await page.waitForFunction(() => window.scrollY > 0, null, { timeout: 3000 }).catch(() => {});
    const y = await scrollY();
    await check(page, 'ปิดเมนูแล้วเลื่อนหน้าได้ตามปกติ (scrollY > 0)', null, async () => {
      expect.soft(y).toBeGreaterThan(0);
    }, { actual: async () => y });
  });
});

test('TC-DRW-011 ตอนเมนูปิด ลำดับ Tab ไม่ไปโดนลิงก์ที่ซ่อน', {
  tag: ['@P3', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ลำดับ: \"ข้ามไปยังเนื้อหา\" (ครั้งที่ 1) → ☰ → โลโก้ → ช่องค้นหา → ปุ่มค้นหา → ♥ → 🛒 → \"เข้าสู่ระบบ\" (ครั้งที่ 8) → \"🐱 ช้อปอาหารแมว\" (ครั้งที่ 9 ตาม R193) · ครั้งที่ 10 ไม่กำหนดตัว แต่ต้อง `checkVisibility()` = true · ทั้ง 10 ครั้ง `checkVisibility()` = true และไม่มีครั้งไหนอยู่ใน `#mobile-menu` หรือเมนูเดสก์ท็อปที่ซ่อน" },
    { type: 'source', description: "[R] · R199 · ความเสี่ยง: โฟกัสหายไปที่ลิงก์ที่มองไม่เห็น · เทคนิค: Negative" },
  ],
}, async ({ page, browserName }) => {
  const seq: FocusInfo[] = [];
  await test.step('1. เปิด / (ไม่คลิกอะไร)', async () => {
    await page.goto('/');
    await settle(page);
  });
  await test.step('2. กด Tab 10 ครั้ง บันทึก activeElement และ checkVisibility() ทุกครั้ง', async () => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(tabKey(browserName));
      seq.push(await page.evaluate(focusInfo));
    }
  });
  const want = [
    ['skip-link', '"ข้ามไปยังเนื้อหา"'],
    ['menu-toggle', '☰'],
    ['logo', 'โลโก้'],
    ['search-input', 'ช่องค้นหา'],
    ['search-submit', 'ปุ่มค้นหา'],
    ['wishlist-link', '♥'],
    ['cart-link', '🛒'],
    ['login-link', '"เข้าสู่ระบบ"'],
    ['hero-cta-cat', '"🐱 ช้อปอาหารแมว"'],
  ];
  const actual = async () => seq.map((f, i) => `${i + 1}. ${f.desc} visible=${f.visible} inMenu=${f.inMenu} inDesktopNav=${f.inDesktopNav}`).join('\n');
  await check(page, 'ลำดับ Tab 1–9: ข้ามไปยังเนื้อหา → ☰ → โลโก้ → ช่องค้นหา → ปุ่มค้นหา → ♥ → 🛒 → เข้าสู่ระบบ → 🐱 ช้อปอาหารแมว', page.locator(':focus'), async () => {
    want.forEach(([id, label], i) => expect.soft(seq[i]?.id, `ครั้งที่ ${i + 1} ต้องเป็น ${label} (ได้ ${seq[i]?.desc})`).toBe(id));
  }, { actual });
  await check(page, 'ทั้ง 10 ครั้ง checkVisibility() = true และไม่อยู่ใน #mobile-menu หรือเมนูเดสก์ท็อปที่ซ่อน', page.locator(':focus'), async () => {
    seq.forEach((f, i) => {
      expect.soft(f.visible, `ครั้งที่ ${i + 1} ${f.desc} checkVisibility`).toBe(true);
      expect.soft(f.inMenu || f.inDesktopNav, `ครั้งที่ ${i + 1} ${f.desc} อยู่ในเมนูที่ซ่อน`).toBe(false);
    });
  }, { actual });
});

// ===========================================================================
// F26 ฟอร์มรับข่าวสาร (P2)
// ===========================================================================

test('TC-NEWS-001 กด "สมัคร" ด้วยอีเมลถูกได้ข้อความสำเร็จผ่าน live region', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "มี element `role=status` หรือ `aria-live=\"polite\"`/`\"assertive\"` ที่ข้อความไม่ว่าง (ยาว ≥ 1 ตัวหลัง trim) · ช่องอีเมลไม่มี `aria-invalid=\"true\"` (ตอนนี้ล้ม: ไม่มีข้อความ ไม่มี toast ไม่มีอะไรเกิดขึ้นเลย)" },
    { type: 'source', description: "[R] · R200 · Q44 · ความเสี่ยง: ลูกค้าคิดว่าสมัครแล้วแต่ไม่ได้อะไร (WCAG 4.1.3) · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const input = page.getByTestId('newsletter-input');
  let res: Awaited<ReturnType<typeof readNewsletter>> | undefined;
  await test.step('1. เปิด / เลื่อนไปท้ายเว็บ กรอก qa-news-001@pawpantry.test ในช่องอีเมล "รับข่าวสารและโปรโมชัน"', async () => {
    await page.goto('/');
    await settle(page);
    await input.scrollIntoViewIfNeeded();
  });
  await test.step('2–3. คลิก "สมัคร" ภายใน 2 วินาที อ่าน live region และ aria-invalid', async () => {
    res = await submitNewsletter(page, 'qa-news-001@pawpantry.test', 'click');
  });
  await check(page, 'มี role=status / aria-live ที่ข้อความไม่ว่าง', page.locator('[role="status"], [aria-live]'), async () => {
    expect.soft(res!.live.length, 'จำนวน live region ที่มีข้อความ').toBeGreaterThanOrEqual(1);
  }, { actual: async () => res });
  await check(page, 'ช่องอีเมลไม่มี aria-invalid="true"', input, async (el) => {
    await expect.soft(el).not.toHaveAttribute('aria-invalid', 'true');
  }, { actual: async () => res });
});

test('TC-NEWS-002 อีเมลผิดรูปแบบ/ว่าง ต้องได้ข้อความ error ที่ผูกกับช่อง', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุกค่า: live region (`role=status`/`aria-live`/`role=alert`) มีข้อความ error ไม่ว่าง และ**ไม่ใช่**ข้อความเดียวกับกรณีสำเร็จใน TC-NEWS-001 · ช่องอีเมล `aria-invalid=\"true\"` · `aria-describedby` ชี้ไปที่ element ที่มีข้อความ error นั้น (ตอนนี้ล้ม: ไม่โชว์ error และไม่ตั้ง `aria-invalid` แม้ `abc` ทำให้ `validity.valid=false`)" },
    { type: 'source', description: "[R] · R200 · Q44 · ความเสี่ยง: ผู้ใช้ไม่รู้ว่ากรอกผิด (WCAG 3.3.1) · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const input = page.getByTestId('newsletter-input');
  let success: string[] = [];
  await test.step('0. (อ้างอิง) ส่งอีเมลถูก qa-news-001@pawpantry.test เพื่อจดข้อความกรณีสำเร็จของ TC-NEWS-001', async () => {
    await page.goto('/');
    await settle(page);
    success = (await submitNewsletter(page, 'qa-news-001@pawpantry.test', 'click')).live;
  });
  const values = ['', '   ', 'abc', 'abc@', '@pawpantry.test', '<script>alert(1)</script>@x.com', '"><img src=x onerror=alert(1)>@x.com'];
  for (const v of values) {
    await test.step(`1–3. เปิด / กรอก ${JSON.stringify(v)} คลิก "สมัคร" อ่าน live region, aria-invalid, aria-describedby`, async () => {
      await page.goto('/');
      await settle(page);
      const res = await submitNewsletter(page, v, 'click');
      await check(page, `${JSON.stringify(v)}: live region มีข้อความ error ไม่ว่าง และไม่ใช่ข้อความสำเร็จ`, page.locator('[role="status"], [role="alert"], [aria-live]'), async () => {
        expect.soft(res.live.length, 'live region ที่มีข้อความ').toBeGreaterThanOrEqual(1);
        for (const t of res.live) expect.soft(success, `ข้อความ "${t}" ซ้ำกับกรณีสำเร็จ`).not.toContain(t);
      }, { actual: async () => ({ ...res, successText: success }) });
      await check(page, `${JSON.stringify(v)}: aria-invalid="true" และ aria-describedby ชี้ไปที่ข้อความ error`, input, async (el) => {
        await expect.soft(el).toHaveAttribute('aria-invalid', 'true', { timeout: 1000 });
        expect.soft(res.describedby, 'aria-describedby').toBeTruthy();
        expect.soft(res.describedText, 'ข้อความของ element ที่ aria-describedby ชี้').not.toBe('');
        expect.soft(
          !!res.describedText && res.live.some((t) => t.includes(res.describedText) || res.describedText.includes(t)),
          'ข้อความที่ aria-describedby ชี้ = ข้อความ error ใน live region',
        ).toBe(true);
      }, { actual: async () => res });
    });
  }
});

test('TC-NEWS-003 กด Enter ในช่องอีเมลส่งได้เหมือนกดปุ่ม', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "อีเมลถูก: live region แสดงข้อความแบบเดียวกับการคลิก \"สมัคร\" ใน TC-NEWS-001 · `abc`: ได้ error และ `aria-invalid=\"true\"` แบบเดียวกับ TC-NEWS-002 (ตอนนี้ล้ม: Enter ไม่มีผล — สาเหตุคือไม่มี `<form>` ห่อ)" },
    { type: 'source', description: "[R] · R201 · Q44 · ความเสี่ยง: ผู้ใช้คีย์บอร์ด/มือถือส่งฟอร์มไม่ได้ · เทคนิค: Happy path · Negative" },
  ],
}, async ({ page }) => {
  const input = page.getByTestId('newsletter-input');
  let viaEnter: Awaited<ReturnType<typeof readNewsletter>> | undefined;
  let viaClick: string[] = [];
  await test.step('1. เปิด / คลิกช่องอีเมลท้ายเว็บ พิมพ์ qa-news-003@pawpantry.test', async () => {
    await page.goto('/');
    await settle(page);
  });
  await test.step('2. กด Enter อ่าน live region', async () => {
    viaEnter = await submitNewsletter(page, 'qa-news-003@pawpantry.test', 'enter');
  });
  await test.step('(อ้างอิง) reload แล้วคลิก "สมัคร" ด้วยอีเมลเดียวกัน เพื่อเทียบข้อความแบบ TC-NEWS-001', async () => {
    await page.reload();
    await settle(page);
    viaClick = (await submitNewsletter(page, 'qa-news-003@pawpantry.test', 'click')).live;
  });
  await check(page, 'อีเมลถูก + Enter: live region แสดงข้อความแบบเดียวกับการคลิก "สมัคร"', page.locator('[role="status"], [aria-live]'), async () => {
    expect.soft(viaEnter!.live.length, 'live region ที่มีข้อความหลัง Enter').toBeGreaterThanOrEqual(1);
    expect.soft(viaEnter!.live, 'ข้อความหลัง Enter = ข้อความหลังคลิก').toEqual(viaClick);
    expect.soft(viaEnter!.ariaInvalid, 'aria-invalid').not.toBe('true');
  }, { actual: async () => ({ enter: viaEnter, click: viaClick }) });
  await test.step('3. reload ทำซ้ำด้วย abc', async () => {
    await page.reload();
    await settle(page);
    const res = await submitNewsletter(page, 'abc', 'enter');
    await check(page, 'abc + Enter: ได้ error และ aria-invalid="true" แบบ TC-NEWS-002', input, async (el) => {
      expect.soft(res.live.length, 'live region ที่มีข้อความ error').toBeGreaterThanOrEqual(1);
      await expect.soft(el).toHaveAttribute('aria-invalid', 'true', { timeout: 1000 });
    }, { actual: async () => res });
  });
});

test('TC-NEWS-004 ความยาวอีเมลขอบ 254/255 ตัว', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "254 ตัว: `value.length` = 254 และได้ข้อความสำเร็จ · 255 และ 315 ตัว: `value.length` ≤ 254 (ถูกตัดด้วย `maxlength=\"254\"`) หรือได้ error + `aria-invalid=\"true\"` · ไม่มีกรณีที่รับค่ายาว > 254 แล้วขึ้นข้อความสำเร็จ (ตอนนี้ล้ม: ไม่มี `maxlength` รับครบ 315 ตัว `validity.valid=true`)" },
    { type: 'source', description: "[R] · R202 · ความเสี่ยง: เก็บอีเมลที่ไม่มีอยู่จริง/ข้อมูลยาวเกิน (RFC 5321) · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const input = page.getByTestId('newsletter-input');
  const r = (c: string, n: number) => c.repeat(n);
  const v254 = `${r('a', 64)}@${r('b', 63)}.${r('c', 63)}.${r('d', 56)}.test`;
  const v255 = `${r('a', 64)}@${r('b', 63)}.${r('c', 63)}.${r('d', 57)}.test`;
  const v315 = `${r('a', 64)}@${r('b', 63)}.${r('c', 63)}.${r('e', 63)}.${r('f', 53)}.test`;
  for (const [n, v] of [
    [254, v254],
    [255, v255],
    [315, v315],
  ] as const) {
    await test.step(`${n === 254 ? 1 : n === 255 ? 2 : 3}. fill() ค่า ${n} ตัว (ตรวจ ${v.length}) อ่าน value.length และ maxLength คลิก "สมัคร"`, async () => {
      await page.goto('/');
      await settle(page);
      await input.fill(v);
      const len = await input.evaluate((e) => (e as HTMLInputElement).value.length);
      const maxLength = await input.evaluate((e) => (e as HTMLInputElement).maxLength);
      await page.getByTestId('newsletter-submit').click();
      await expect.poll(async () => (await liveTexts(page)).length, { timeout: 2000 }).toBeGreaterThan(0).catch(() => {});
      const res = await readNewsletter(page);
      const success = res.live.length > 0 && res.ariaInvalid !== 'true';
      const error = res.live.length > 0 && res.ariaInvalid === 'true';
      if (n === 254) {
        await check(page, '254 ตัว: value.length = 254 และได้ข้อความสำเร็จ', input, async () => {
          expect.soft(len, 'value.length').toBe(254);
          expect.soft(success, 'ได้ข้อความสำเร็จ (live region มีข้อความ และไม่มี aria-invalid="true")').toBe(true);
        }, { actual: async () => ({ len, maxLength, ...res }) });
      } else {
        await check(page, `${n} ตัว: value.length ≤ 254 หรือได้ error + aria-invalid="true" (ไม่รับค่ายาว > 254 แล้วขึ้นสำเร็จ)`, input, async () => {
          expect.soft(len <= 254 || error, `value.length=${len} maxLength=${maxLength} aria-invalid=${res.ariaInvalid} live=${JSON.stringify(res.live)}`).toBe(true);
          expect.soft(len > 254 && success, 'รับค่ายาว > 254 แล้วขึ้นข้อความสำเร็จ').toBe(false);
        }, { actual: async () => ({ len, maxLength, ...res }) });
      }
    });
  }
});

test('TC-NEWS-005 กด "สมัคร" ซ้ำเร็ว ๆ ไม่ได้ข้อความซ้อน', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "จำนวน element ใน `footer` ที่มีข้อความสำเร็จ = 1 และข้อความสำเร็จปรากฏใน `textContent` ของ live region ครั้งเดียว · คลิกที่ 2–3 ไม่ทำให้เกิดข้อความ error และช่องอีเมลไม่มี `aria-invalid=\"true\"` (สมมติฐาน Q44 เพิ่มเติม: กด \"สมัคร\" ซ้ำหลังสำเร็จต้องไม่ขึ้น error ไม่ว่าช่องจะถูกล้างหรือไม่) · ถ้าฟอร์มส่ง request ไป server ต้องมี ≤ 1 request ต่ออีเมลเดียวกัน หรือปุ่มถูก `disabled` ระหว่างส่ง (ตอนนี้ล้ม: ไม่มีข้อความใดเลย)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R200 · Q44 (เพิ่มเติม: ล้างช่อง/กดซ้ำหลังสำเร็จ) · ความเสี่ยง: สมัครซ้ำ/ข้อความซ้ำสับสน · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const input = page.getByTestId('newsletter-input');
  const btn = page.getByTestId('newsletter-submit');
  const email = 'qa-news-005@pawpantry.test';
  const reqs: string[] = [];
  let disabledDuring = false;
  await test.step('1. เปิด / กรอกอีเมลท้ายเว็บ', async () => {
    await page.goto('/');
    await settle(page);
    page.on('request', (r) => {
      if (r.method() !== 'GET' && ((r.postData() || '').includes(email) || /newsletter|subscribe/i.test(r.url())))
        reqs.push(`${r.method()} ${r.url()}`);
    });
    await input.fill(email);
  });
  await test.step('2. dblclick() ที่ "สมัคร" แล้ว click() ซ้ำทันที', async () => {
    await btn.dblclick();
    disabledDuring = await btn.isDisabled();
    await btn.click({ force: disabledDuring });
    await expect.poll(async () => (await liveTexts(page)).length, { timeout: 2000 }).toBeGreaterThan(0).catch(() => {});
    await page.waitForTimeout(500);
  });
  await test.step('3. นับข้อความใน live region และนับ request ที่ฟอร์มนี้ส่ง', async () => {
    const res = await readNewsletter(page);
    const s = res.live[0] ?? '';
    const shown = s
      ? await page.evaluate((txt) => {
          const scope = [...document.querySelectorAll('footer, [role="status"], [role="alert"], [aria-live]')];
          const els = new Set<Element>();
          for (const root of scope)
            for (const e of [root, ...root.querySelectorAll('*')])
              if ((e.textContent || '').includes(txt) && ![...e.children].some((c) => (c.textContent || '').includes(txt))) els.add(e);
          return els.size;
        }, s)
      : 0;
    const occurrences = s ? res.live.join('\n').split(s).length - 1 : 0;
    await check(page, 'ข้อความสำเร็จแสดง 1 element และปรากฏใน live region ครั้งเดียว', page.locator('[role="status"], [aria-live]'), async () => {
      expect.soft(s, 'ข้อความสำเร็จ').not.toBe('');
      expect.soft(shown, 'จำนวน element ที่มีข้อความสำเร็จ').toBe(1);
      expect.soft(occurrences, 'จำนวนครั้งใน textContent ของ live region').toBe(1);
    }, { actual: async () => ({ ...res, shown, occurrences }) });
    await check(page, 'คลิกที่ 2–3 ไม่ทำให้เกิด error และช่องอีเมลไม่มี aria-invalid="true"', input, async (el) => {
      await expect.soft(el).not.toHaveAttribute('aria-invalid', 'true');
      expect.soft(res.live.filter((t) => t !== s), 'ข้อความอื่นที่ไม่ใช่ข้อความสำเร็จ').toEqual([]);
    }, { actual: async () => res });
    await checkApi('request ของฟอร์ม ≤ 1 ต่ออีเมลเดียวกัน หรือปุ่มถูก disabled ระหว่างส่ง', { requests: reqs, disabledDuring }, () => {
      expect.soft(reqs.length <= 1 || disabledDuring, `request ${reqs.length} ครั้ง · disabled=${disabledDuring}`).toBe(true);
    });
  });
});

test('TC-NEWS-006 ใส่สคริปต์ในช่องอีเมลต้องไม่ทำงาน', {
  tag: ['@P1', '@5.8'],
  annotation: [
    { type: 'expected', description: "จำนวน dialog = 0 · จำนวน `script`/`img[src=\"x\"]` ใน footer หลังส่ง = ก่อนส่ง (ไม่มี element ใหม่จากค่าที่กรอก) · ถ้าข้อความแสดงค่าที่กรอก ต้องเป็นตัวอักษรธรรมดา (`textContent` มี `<script>` แต่ `innerHTML` เป็น `&lt;script&gt;`) · (เกณฑ์ error/`aria-invalid` ของ 2 ค่านี้ตรวจใน TC-NEWS-002)" },
    { type: 'source', description: "[R] · R200 · ความเสี่ยง: XSS ผ่านฟอร์มท้ายเว็บที่อยู่ทุกหน้า · เทคนิค: Security · Negative" },
  ],
}, async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    d.dismiss().catch(() => {});
  });
  const input = page.getByTestId('newsletter-input');
  const countEls = () =>
    page.evaluate(() => {
      const roots = [...document.querySelectorAll('footer, [role="status"], [role="alert"], [aria-live]')];
      let script = 0;
      let img = 0;
      for (const r of roots) {
        script += r.querySelectorAll('script').length;
        img += r.querySelectorAll('img[src="x"]').length;
      }
      return { script, img };
    });
  await test.step('1. เปิด / ติด page.on("dialog") นับจำนวน', async () => {
    await page.goto('/');
    await settle(page);
  });
  for (const v of ['<script>alert(1)</script>@x.com', '"><img src=x onerror=alert(1)>@x.com']) {
    await test.step(`2–3. กรอก ${v} คลิก "สมัคร" และกด Enter แล้วนับ script / img[src="x"] ก่อน/หลัง`, async () => {
      const before = await countEls();
      await input.fill(v);
      await page.getByTestId('newsletter-submit').click();
      await input.press('Enter');
      await page.waitForTimeout(1000);
      const after = await countEls();
      const regions = await page.evaluate(() =>
        [...document.querySelectorAll('footer, [role="status"], [role="alert"], [aria-live]')].map((e) => ({
          text: (e.textContent || '').slice(0, 300),
          html: e.innerHTML.slice(0, 3000),
        })),
      );
      await check(page, `${v}: จำนวน script / img[src="x"] ใน footer หลังส่ง = ก่อนส่ง`, page.locator('footer'), async () => {
        expect.soft(after).toEqual(before);
      }, { actual: async () => ({ before, after }) });
      await check(page, `${v}: ถ้าข้อความแสดงค่าที่กรอก ต้องเป็นตัวอักษรธรรมดา (innerHTML เป็น &lt;…&gt;)`, page.locator('[role="status"], [aria-live]'), async () => {
        for (const r of regions) {
          if (r.text.includes('<script>') || r.text.includes('<img')) {
            expect.soft(/<script[\s>]|<img[^>]*src="?x/i.test(r.html), 'innerHTML มีแท็กจริงจากค่าที่กรอก').toBe(false);
            expect.soft(r.html, 'innerHTML escape เป็น &lt;').toContain('&lt;');
          }
        }
      }, { actual: async () => regions.filter((r) => r.text.includes('<')).map((r) => r.html.slice(0, 300)) });
    });
  }
  await check(page, 'จำนวน dialog = 0', null, async () => {
    expect.soft(dialogs).toEqual([]);
  }, { actual: async () => dialogs });
});

// ===========================================================================
// F27 หน้า 404 และ URL (P3)
// ===========================================================================

test('TC-ERR-001 URL ที่ไม่มีจริงตอบ HTTP 404 จริง (ไม่ใช่ soft-404)', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุก URL: status = 404 · H1 = \"อุ๊ย! ไม่พบหน้าที่คุณตามหา\" · `meta[name=robots]` content มี \"noindex\" · รูป/CSS ที่หน้าอ้างถึง (รวม path ลึก `/a/b/c/d/e/f/g/h`) ได้ status 200 ทุกตัว ไม่มี 404 (ไม่นับ `/favicon.ico` ซึ่งตรวจใน TC-A11Y-013) · TC นี้เป็นเจ้าของการตรวจ 404 ของ path ตัวพิมพ์ใหญ่ (`/Products`, `/products/KITTEN-SALMON-DRY`) ตามสมมติฐาน Q6" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R203 · Q6 · ความเสี่ยง: search engine เก็บหน้าเสีย, path ลึกโหลด asset ผิด · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  const urls = [
    '/nope',
    '/orders',
    '/admin',
    '/สินค้า',
    '/Products',
    '/products/no-such-item',
    '/products/ไม่มี',
    '/products/kitten%20salmon',
    '/products/KITTEN-SALMON-DRY',
    '/products/kitten-salmon-dry/extra/deep',
    '/index.html',
    '/a/b/c/d/e/f/g/h',
  ];
  for (const url of urls) {
    await test.step(`1–3. page.goto(${url}) เก็บ status อ่าน H1, meta robots และ response ของรูป/CSS`, async () => {
      const assets: { status: number; url: string }[] = [];
      const onResp = (r: Response) => {
        const t = r.request().resourceType();
        if ((t === 'image' || t === 'stylesheet') && !/\/favicon\.ico(\?|$)/.test(r.url())) assets.push({ status: r.status(), url: r.url() });
      };
      page.on('response', onResp);
      const resp = await page.goto(url);
      await settle(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await settle(page);
      page.off('response', onResp);
      const status = resp?.status() ?? 0;
      const robots = await page.locator('meta[name="robots"]').evaluateAll((ms) => ms.map((m) => m.getAttribute('content') || ''));
      const badAssets = assets.filter((a) => !(a.status === 200 || a.status === 304));
      const h1 = page.locator('h1');
      await check(page, `${url}: status 404 · H1 "${NF_H1}" · robots noindex · รูป/CSS ได้ 200`, h1, async (el) => {
        expect.soft(status, 'HTTP status').toBe(404);
        await expect.soft(el).toHaveText(NF_H1, { timeout: 2000 });
        expect.soft(robots.join(','), 'meta[name=robots] content').toContain('noindex');
        expect.soft(badAssets, 'รูป/CSS ที่ไม่ได้ 200').toEqual([]);
      }, { actual: async () => ({ status, h1: await h1.allInnerTexts(), robots, assets: assets.length, badAssets }) });
    });
  }
});

test('TC-ERR-002 path traversal และ `<script>` ใน path ไม่หลุดไฟล์และไม่รันสคริปต์', {
  tag: ['@P1', '@5.8'],
  annotation: [
    { type: 'expected', description: "`/..%2f..%2fetc%2fpasswd`, `/..%2Fcart`, `/%3Cscript…`: status = 404 และ H1 = \"อุ๊ย! ไม่พบหน้าที่คุณตามหา\" · `/%`: status 400 หรือ 404 (ห้าม 5xx) · body ไม่มีข้อความ \"root:\" · `/..%2Fcart` ไม่แสดงหน้าตะกร้า · dialog = 0 · ไม่มี `script` ที่มี \"alert(1)\" · ถ้า path ถูกแสดงในหน้า ต้องเป็น `&lt;script&gt;` ใน HTML ดิบ" },
    { type: 'source', description: "[R] · R203 · ความเสี่ยง: อ่านไฟล์ระบบ / reflected XSS ผ่าน URL · เทคนิค: Security · Negative" },
  ],
}, async ({ page }) => {
  const dialogs: string[] = [];
  await test.step('1. ติด page.on("dialog")', async () => {
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      d.dismiss().catch(() => {});
    });
  });
  for (const url of ['/..%2f..%2fetc%2fpasswd', '/..%2Fcart', '/%3Cscript%3Ealert(1)%3C%2Fscript%3E', '/%']) {
    await test.step(`2–3. page.goto(${url}) เก็บ status และ response.text() นับ script ที่มี "alert(1)"`, async () => {
      const resp = await page.goto(url);
      await settle(page);
      const status = resp?.status() ?? 0;
      const body = (await resp?.text().catch(() => '')) ?? '';
      // RSC payload ของ Next ใส่ path แบบ URL-encoded (%3Cscript%3Ealert(1)…) ใน <script> เป็นสตริง — ไม่นับ ส่วนนั้นไม่ใช่สคริปต์ที่ถูกฉีด
      const injected = await page.evaluate(() =>
        [...document.querySelectorAll('script')].filter((s) => {
          const t = s.textContent || '';
          const all = t.split('alert(1)').length - 1;
          const enc = t.split('%3Cscript%3Ealert(1)').length - 1;
          return all > enc;
        }).length,
      );
      const h1 = page.locator('h1');
      const h1Text = (await h1.allInnerTexts()).join(' | ');
      await check(page, url === '/%' ? '/%: status 400 หรือ 404 (ห้าม 5xx)' : `${url}: status 404 และ H1 "${NF_H1}"`, h1, async (el) => {
        if (url === '/%') expect.soft([400, 404], `HTTP status ${status}`).toContain(status);
        else {
          expect.soft(status, 'HTTP status').toBe(404);
          await expect.soft(el).toHaveText(NF_H1, { timeout: 2000 });
        }
      }, { actual: async () => ({ status, h1: h1Text }) });
      await check(page, `${url}: body ไม่มี "root:" · ไม่มี script ที่มี "alert(1)" · HTML ดิบไม่มี <script>alert(1)`, null, async () => {
        expect.soft(body.includes('root:'), 'body มี "root:"').toBe(false);
        expect.soft(injected, 'script ที่มี alert(1)').toBe(0);
        expect.soft(body.includes('<script>alert(1)'), 'HTML ดิบมี <script>alert(1) ที่ไม่ escape').toBe(false);
        if (url === '/..%2Fcart') {
          expect.soft(h1Text, 'ไม่แสดงหน้าตะกร้า').not.toMatch(/ตะกร้า/);
          expect.soft(new URL(page.url()).pathname, 'ไม่ไปหน้า /cart').not.toBe('/cart');
        }
      }, { actual: async () => ({ status, injectedScripts: injected, h1: h1Text, url: page.url() }) });
    });
  }
  await check(page, 'จำนวน dialog = 0', null, async () => {
    expect.soft(dialogs).toEqual([]);
  }, { actual: async () => dialogs });
});

test('TC-ERR-003 ปุ่มในหน้า 404 พากลับหน้าที่ใช้ได้ (รวม path ลึก)', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "\"🏠 กลับหน้าแรก\" → URL = `/` และ `page.request.get('/')` = 200 · \"ดูสินค้าทั้งหมด\" → URL = `/products` และ `page.request.get('/products')` = 200 และ H1 ไม่มีคำว่า \"ไม่พบ\" · ทั้งสอง path ไม่ไปเป็น path สัมพัทธ์ เช่น `/a/b/c/d/e/f/g/products`" },
    { type: 'source', description: "[R] · R204 · ความเสี่ยง: ผู้ใช้ติดอยู่ในหน้า 404 · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  for (const [i, path] of (['/a/b/c/d/e/f/g/h', '/nope'] as const).entries()) {
    const n = i === 0 ? 1 : 3;
    await test.step(`${n}. เปิด ${path} คลิก "🏠 กลับหน้าแรก"`, async () => {
      await page.goto(path);
      await settle(page);
      await page.getByTestId('not-found-home').click();
      await page.waitForURL((u) => u.pathname === '/', { timeout: 8000 }).catch(() => {});
      const st = (await page.request.get('/')).status();
      await check(page, `${path}: "🏠 กลับหน้าแรก" → URL = / และ request.get('/') = 200`, null, async () => {
        expect.soft(pathOf(page.url())).toBe('/');
        expect.soft(st).toBe(200);
      }, { actual: async () => ({ url: page.url(), status: st }) });
    });
    await test.step(`${n === 1 ? 2 : 3}. เปิด ${path} อีกครั้ง คลิก "ดูสินค้าทั้งหมด"`, async () => {
      await page.goto(path);
      await settle(page);
      await page.locator('main').getByRole('link', { name: 'ดูสินค้าทั้งหมด' }).click();
      await page.waitForURL((u) => u.pathname === '/products', { timeout: 8000 }).catch(() => {});
      await settle(page);
      const st = (await page.request.get('/products')).status();
      await check(page, `${path}: "ดูสินค้าทั้งหมด" → URL = /products, 200 และ H1 ไม่มี "ไม่พบ" (ไม่เป็น path สัมพัทธ์)`, page.locator('h1'), async (el) => {
        expect.soft(pathOf(page.url())).toBe('/products');
        expect.soft(st).toBe(200);
        await expect.soft(el).not.toContainText('ไม่พบ');
      }, { actual: async () => ({ url: page.url(), status: st, h1: await page.locator('h1').allInnerTexts() }) });
    });
  }
});

test('TC-ERR-004 `<title>` ของหน้า 404 บอกว่าไม่พบ ทั้งใน HTML จาก server และหลังโหลด', {
  tag: ['@P3', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทั้ง HTML ดิบและ `document.title` มีคำว่า \"ไม่พบ\" และต่างจาก \"PawPantry — อาหารแมวและสุนัขคัดพิเศษ\" ทุก URL · 404 สินค้า: title ใน HTML ดิบ = หลังโหลด (เช่น \"ไม่พบสินค้า · PawPantry\") (ตอนนี้ล้ม: `/nope` `/a/b/c` ได้ title หน้าแรกทั้งสองชั้น · 404 สินค้าได้ \"ไม่พบสินค้า · PawPantry\" เฉพาะหลังโหลด HTML จาก server ยังเป็น title หน้าแรก)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R205 · Q8 · ความเสี่ยง: แท็บ/ประวัติ/โปรแกรมอ่านจอบอกผิดหน้า (WCAG 2.4.2) · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  let homeTitle = '';
  const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&middot;/g, '·').trim();
  await test.step('3. (เทียบ) title หน้าแรก', async () => {
    await page.goto('/');
    await settle(page);
    homeTitle = await page.title();
  });
  for (const url of ['/nope', '/a/b/c', '/products/no-such-item', '/products/KITTEN-SALMON-DRY']) {
    await test.step(`1–2. ${url}: request.get ดึง <title> จาก HTML ดิบ แล้ว page.goto รอ networkidle อ่าน document.title`, async () => {
      const html = await (await page.request.get(url)).text();
      const raw = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
      await page.goto(url);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const doc = await page.title();
      await check(page, `${url}: title ทั้ง HTML ดิบและ document.title มี "ไม่พบ" และต่างจาก "${HOME_TITLE}"`, null, async () => {
        expect.soft(raw, 'title ใน HTML ดิบ').toContain('ไม่พบ');
        expect.soft(raw, 'title ใน HTML ดิบ').not.toBe(HOME_TITLE);
        expect.soft(doc, 'document.title').toContain('ไม่พบ');
        expect.soft(doc, 'document.title').not.toBe(HOME_TITLE);
        if (url.startsWith('/products/')) expect.soft(raw, '404 สินค้า: title ใน HTML ดิบ = หลังโหลด').toBe(doc);
      }, { actual: async () => ({ rawTitle: raw, documentTitle: doc, homeTitle }) });
    });
  }
});

// ===========================================================================
// F28 การเข้าถึงและคุณภาพหน้าโดยรวม (P2)
// ===========================================================================

test('TC-A11Y-001 ลิงก์ "ข้ามไปยังเนื้อหา" เป็นโฟกัสแรก มองเห็น และพาไป `main`', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "Tab แรก: `activeElement` = ลิงก์ \"ข้ามไปยังเนื้อหา\" มองเห็นในจอ (box อยู่ใน viewport กว้าง > 0) มีกรอบโฟกัสมองเห็นตามนิยามในข้อตกลงหัวข้อ 5.8 · หลัง Enter: `location.hash` = `#main` และโฟกัสอยู่ที่/ใน `main#main` · Tab ถัดไป = ปุ่ม \"🐾 ทั้งหมด\" · ที่ `/` Tab แรกก็เป็นลิงก์นี้" },
    { type: 'source', description: "[R] · R206 · ความเสี่ยง: ผู้ใช้คีย์บอร์ดต้อง Tab ผ่านหัวเว็บทุกหน้า (WCAG 2.4.1) · เทคนิค: Happy path" },
  ],
}, async ({ page, browserName }) => {
  const tab = tabKey(browserName);
  const focused = page.locator(':focus');
  await test.step('1. เปิด /products กด Tab 1 ครั้ง อ่านข้อความ, boundingBox() และ outline/box-shadow ของ activeElement', async () => {
    await page.goto('/products');
    await settle(page);
    await page.keyboard.press(tab);
    const f = await page.evaluate(focusInfo);
    await check(page, 'Tab แรก = ลิงก์ "ข้ามไปยังเนื้อหา" มองเห็นในจอ (box ใน viewport กว้าง > 0) และมีกรอบโฟกัสมองเห็น', focused, async () => {
      expect.soft(f.name, 'ข้อความของ activeElement').toBe('ข้ามไปยังเนื้อหา');
      expect.soft(f.isLink, 'เป็นลิงก์').toBe(true);
      expect.soft(f.inViewport && f.rect.w > 0, `box ${JSON.stringify(f.rect)}`).toBe(true);
      expect.soft(f.ring, `outline ${f.outlineStyle} ${f.outlineWidth} · box-shadow ${f.boxShadow}`).toBe(true);
    }, { actual: async () => f });
  });
  await test.step('2. กด Enter อ่าน location.hash และ activeElement', async () => {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#main', null, { timeout: 2000 }).catch(() => {});
    const hash = await page.evaluate(() => location.hash);
    const f = await page.evaluate(focusInfo);
    await check(page, 'หลัง Enter: location.hash = #main และโฟกัสอยู่ที่/ใน main#main', page.locator('main#main'), async () => {
      expect.soft(hash).toBe('#main');
      const inMain = await page.evaluate(() => !!document.activeElement?.closest('main#main'));
      expect.soft(inMain, `activeElement = ${f.desc}`).toBe(true);
    }, { actual: async () => ({ hash, active: f.desc }) });
  });
  await test.step('3. กด Tab อีก 1 ครั้ง', async () => {
    await page.keyboard.press(tab);
    const f = await page.evaluate(focusInfo);
    await check(page, 'Tab ถัดไป = ปุ่ม "🐾 ทั้งหมด"', focused, async () => {
      expect.soft(f.id, `activeElement = ${f.desc}`).toBe('filter-pet-all');
      expect.soft(f.name).toContain('ทั้งหมด');
    }, { actual: async () => f.desc });
  });
  await test.step('ที่ / Tab แรกก็เป็นลิงก์ "ข้ามไปยังเนื้อหา"', async () => {
    await page.goto('/');
    await settle(page);
    await page.keyboard.press(tab);
    const f = await page.evaluate(focusInfo);
    await check(page, '/ : Tab แรก = "ข้ามไปยังเนื้อหา"', focused, async () => {
      expect.soft(f.name).toBe('ข้ามไปยังเนื้อหา');
    }, { actual: async () => f.desc });
  });
});

test('TC-A11Y-002 ทุกหน้ามี `main` 1 อัน, H1 1 อัน, `lang="th"`', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุกหน้า: จำนวน `main` = 1 · จำนวน `h1` = 1 · `lang` = \"th\"" },
    { type: 'source', description: "[R] · R207 · ความเสี่ยง: โปรแกรมอ่านจออ่านภาษาผิด/หาเนื้อหาหลักไม่เจอ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await seedStorage(page); // /cart มี tuna-pouch ×1
  for (const url of PAGES11) {
    await test.step(`1–3. เปิด ${url} นับ main และ h1 อ่าน lang`, async () => {
      if (url === '/account') await loginDemo(page);
      await page.goto(url);
      await settle(page);
      const r = await page.evaluate(() => ({
        main: document.querySelectorAll('main, [role="main"]').length,
        h1: document.querySelectorAll('h1').length,
        h1Text: [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim()),
        lang: document.documentElement.lang,
      }));
      await check(page, `${url}: main = 1 · h1 = 1 · lang = "th"`, page.locator('h1'), async () => {
        expect.soft(r.main, 'จำนวน main').toBe(1);
        expect.soft(r.h1, 'จำนวน h1').toBe(1);
        expect.soft(r.lang, 'lang').toBe('th');
      }, { actual: async () => ({ url: page.url(), ...r }) });
    });
  }
});

test('TC-A11Y-003 รูปทุกรูปมี `alt`', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุกหน้า: `img:not([alt])` = 0 · รูปสินค้าบนการ์ดและรูปหลักมี `alt` ไม่ว่าง · `img[alt=\"\"]` ต้องไม่อยู่ในการ์ดสินค้า ไม่ใช่รูปหลักของหน้าสินค้า และไม่ใช่เนื้อหาเดียวของ `a`/`button` (ตอนสำรวจมี 3 รูป: promo, login, register) · axe rule `image-alt` violations = 0" },
    { type: 'source', description: "[R] · R208 · ความเสี่ยง: ผู้ใช้ตาบอดไม่รู้ว่าเป็นสินค้าอะไร (WCAG 1.1.1) · เทคนิค: Happy path · Negative" },
  ],
}, async ({ page }) => {
  await seedStorage(page);
  for (const url of PAGES11) {
    await test.step(`1–3. เปิด ${url} เลื่อนจนสุดให้รูป lazy โหลด นับ img:not([alt]) และรัน axe image-alt`, async () => {
      if (url === '/account') await loginDemo(page);
      await page.goto(url);
      await settle(page);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await settle(page);
      const r = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('img')];
        const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src'));
        const cardImgs = [...document.querySelectorAll('[data-testid="product-card"] img')];
        const cardEmpty = cardImgs.filter((i) => !(i.getAttribute('alt') || '').trim()).map((i) => i.getAttribute('src'));
        const mainImg = [...document.querySelectorAll('[data-testid="product-image"] img')];
        const mainEmpty = mainImg.filter((i) => !(i.getAttribute('alt') || '').trim()).map((i) => i.getAttribute('src'));
        const soleContent = imgs
          .filter((i) => i.getAttribute('alt') === '')
          .filter((i) => {
            const host = i.closest('a, button');
            if (!host) return false;
            if ((host.getAttribute('aria-label') || '').trim() || (host.textContent || '').trim()) return false;
            return ![...host.querySelectorAll('img')].some((x) => (x.getAttribute('alt') || '').trim());
          })
          .map((i) => i.getAttribute('src'));
        return {
          total: imgs.length,
          noAlt,
          cardImgs: cardImgs.length,
          cardEmpty,
          mainImg: mainImg.map((i) => i.getAttribute('alt')),
          mainEmpty,
          emptyAlt: imgs.filter((i) => i.getAttribute('alt') === '').map((i) => i.getAttribute('src')),
          soleContent,
        };
      });
      const v = await axe(page, ['image-alt']);
      await check(page, `${url}: img:not([alt]) = 0 · รูปการ์ด/รูปหลักมี alt ไม่ว่าง · alt="" ไม่ใช่เนื้อหาเดียวของ a/button · axe image-alt = 0`, page.locator('img:not([alt])'), async () => {
        expect.soft(r.noAlt, 'img:not([alt])').toEqual([]);
        expect.soft(r.cardEmpty, 'รูปบนการ์ดสินค้าที่ alt ว่าง').toEqual([]);
        expect.soft(r.mainEmpty, 'รูปหลักของหน้าสินค้าที่ alt ว่าง').toEqual([]);
        expect.soft(r.soleContent, 'img[alt=""] ที่เป็นเนื้อหาเดียวของ a/button').toEqual([]);
        if (url === '/products/kitten-salmon-dry') expect.soft(r.mainImg.length, 'มีรูปหลักของหน้าสินค้า').toBeGreaterThan(0);
        expect.soft(v, 'axe image-alt violations').toEqual([]);
      }, { actual: async () => ({ ...r, axe: v }) });
    });
  }
});

test('TC-A11Y-004 ปุ่ม/ลิงก์ไอคอนล้วนมีชื่อที่อ่านได้', {
  tag: ['@P2', '@5.8', '@mobile-too'],
  annotation: [
    { type: 'expected', description: "violations ของ `button-name` และ `link-name` = 0 ทุกหน้า · หัวใจบนการ์ดมีชื่อที่มีชื่อสินค้าของการ์ดนั้น (เช่น \"นำ … ออกจากรายการโปรด\" ตอนกดแล้ว ตาม R179) · −/+ = \"ลดจำนวน\"/\"เพิ่มจำนวน\" · (ชื่อ ♥/🛒 ตรวจใน TC-NAV-005, ชื่อ ☰ ตรวจใน TC-DRW-002) · ลิงก์รูปบนการ์ด `aria-hidden=\"true\"` และ `tabindex=\"-1\"`" },
    { type: 'source', description: "[R] · R209 · ความเสี่ยง: ปุ่มไม่มีชื่อ ผู้ใช้โปรแกรมอ่านจอไม่รู้ว่ากดอะไร (WCAG 4.1.2) · เทคนิค: Happy path" },
  ],
}, async ({ page, isMobile }) => {
  const part = isMobile ? '@mobile 375×812' : '@desktop 1280×800';
  await seedStorage(page); // ตะกร้ามี tuna-pouch ×1
  for (const url of PAGES10) {
    await test.step(`1. [${part}] รัน axe button-name, link-name ที่ ${url}`, async () => {
      await page.goto(url);
      await settle(page);
      const v = await axe(page, ['button-name', 'link-name']);
      await check(page, `[${part}] ${url}: violations button-name + link-name = 0`, null, async () => {
        expect.soft(v).toEqual([]);
      }, { actual: async () => v });
    });
  }
  await test.step(`2. [${part}] อ่าน accessible name ของหัวใจบนการ์ด`, async () => {
    await page.goto('/products');
    await settle(page);
    const card = page.getByTestId('product-card').first();
    const heart = card.getByTestId('wishlist-toggle');
    const pname = (await card.getByTestId('product-name').innerText()).trim();
    await check(page, `หัวใจบนการ์ดมีชื่อที่มีชื่อสินค้า "${pname}"`, heart, async (el) => {
      await expect.soft(el).toHaveAccessibleName(new RegExp(pname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }, { actual: async () => heart.getAttribute('aria-label') });
    await heart.click();
    await check(page, `กดหัวใจแล้วชื่อเป็น "นำ … ออกจากรายการโปรด" และมี "${pname}"`, heart, async (el) => {
      await expect.soft(el).toHaveAccessibleName(/^นำ .+ ออกจากรายการโปรด$/, { timeout: 2000 });
      await expect.soft(el).toHaveAccessibleName(new RegExp(pname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }, { actual: async () => heart.getAttribute('aria-label') });
  });
  await test.step(`3. [${part}] อ่าน aria-hidden และ tabindex ของลิงก์รูปบนการ์ด`, async () => {
    const links = page.getByTestId('product-card').locator('a:has(img)');
    const r = await links.evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), ariaHidden: a.getAttribute('aria-hidden'), tabindex: a.getAttribute('tabindex') })));
    await check(page, 'ลิงก์รูปบนการ์ด aria-hidden="true" และ tabindex="-1"', links, async () => {
      expect.soft(r.length, 'จำนวนลิงก์รูปบนการ์ด').toBeGreaterThan(0);
      for (const x of r) {
        expect.soft(x.ariaHidden, `${x.href} aria-hidden`).toBe('true');
        expect.soft(x.tabindex, `${x.href} tabindex`).toBe('-1');
      }
    }, { actual: async () => r });
  });
  await test.step(`2. [${part}] อ่าน accessible name ของ −/+ ในหน้าสินค้า`, async () => {
    await page.goto('/products/kitten-salmon-dry');
    await settle(page);
    await check(page, '− = "ลดจำนวน" และ + = "เพิ่มจำนวน"', page.getByTestId('qty-minus').or(page.getByTestId('qty-plus')), async () => {
      await expect.soft(page.getByTestId('qty-minus')).toHaveAccessibleName('ลดจำนวน');
      await expect.soft(page.getByTestId('qty-plus')).toHaveAccessibleName('เพิ่มจำนวน');
    }, { actual: async () => ({ minus: await page.getByTestId('qty-minus').getAttribute('aria-label'), plus: await page.getByTestId('qty-plus').getAttribute('aria-label') }) });
  });
});

test('TC-A11Y-005 ทุกจุดที่ได้โฟกัสมีกรอบโฟกัสที่มองเห็น', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "จำนวน element ที่ได้โฟกัสแต่ไม่มีกรอบโฟกัสมองเห็นตามนิยามในข้อตกลงหัวข้อ 5.8 (`outline-style` ≠ `none` และ `outline-width` ≥ 2px หรือ `box-shadow` ≠ `none`) = 0 · ภาพตอนโฟกัสต่างจากตอนไม่โฟกัสทุกตัว" },
    { type: 'source', description: "[R] · R210 · ความเสี่ยง: ผู้ใช้คีย์บอร์ดไม่รู้ว่าอยู่ตรงไหน (WCAG 2.4.7) (เกณฑ์ 2px: WCAG 2.4.13) · เทคนิค: Happy path" },
  ],
}, async ({ page, browserName }) => {
  test.setTimeout(180_000); // Tab 100 ครั้ง + ถ่ายภาพ 2 สถานะต่อครั้ง
  const tab = tabKey(browserName);
  for (const [url, times] of [
    ['/', 60],
    ['/products/kitten-salmon-dry', 40],
  ] as const) {
    await test.step(`1–3. เปิด ${url} กด Tab ${times} ครั้ง อ่าน outline/box-shadow และถ่ายภาพเทียบตอนไม่โฟกัส`, async () => {
      await page.goto(url);
      await settle(page);
      const noRing: string[] = [];
      const sameShot: string[] = [];
      const log: string[] = [];
      for (let i = 1; i <= times; i++) {
        await page.keyboard.press(tab);
        const f = await page.evaluate(focusInfo);
        if (f.none) {
          log.push(`${i}. (โฟกัสออกนอกหน้า)`);
          continue;
        }
        if (!f.ring) noRing.push(`${i}. ${f.desc} outline=${f.outlineStyle} ${f.outlineWidth} box-shadow=${f.boxShadow}`);
        const vp = page.viewportSize() ?? { width: 1280, height: 800 };
        const pad = 6;
        const x = Math.max(0, f.rect.x - pad);
        const y = Math.max(0, f.rect.y - pad);
        const clip = {
          x,
          y,
          width: Math.max(1, Math.min(vp.width, f.rect.x + f.rect.w + pad) - x),
          height: Math.max(1, Math.min(vp.height, f.rect.y + f.rect.h + pad) - y),
        };
        let diff = 'ถ่ายภาพไม่ได้';
        if (f.inViewport) {
          const a = await page.screenshot({ clip, animations: 'disabled' }).catch(() => null);
          await page.evaluate(() => {
            const w = window as unknown as { __ppFocus?: HTMLElement };
            w.__ppFocus = document.activeElement as HTMLElement;
            w.__ppFocus.blur();
          });
          const b = await page.screenshot({ clip, animations: 'disabled' }).catch(() => null);
          await page.evaluate(() => (window as unknown as { __ppFocus?: HTMLElement }).__ppFocus?.focus({ preventScroll: true }));
          diff = a && b ? (Buffer.compare(a, b) !== 0 ? 'ต่าง' : 'เหมือน') : 'ถ่ายภาพไม่ได้';
        }
        if (diff !== 'ต่าง') sameShot.push(`${i}. ${f.desc} (${diff})`);
        log.push(`${i}. ${f.desc} ring=${f.ring} ภาพ=${diff}`);
      }
      await check(page, `${url}: element ที่ได้โฟกัสแต่ไม่มีกรอบโฟกัสมองเห็น = 0`, null, async () => {
        expect.soft(noRing).toEqual([]);
      }, { actual: async () => ({ ไม่มีกรอบ: noRing, ลำดับ: log }) });
      await check(page, `${url}: ภาพตอนโฟกัสต่างจากตอนไม่โฟกัสทุกตัว`, null, async () => {
        expect.soft(sameShot).toEqual([]);
      }, { actual: async () => sameShot });
    });
  }
});

test('TC-A11Y-006 ลำดับหัวข้อไม่ข้ามระดับ', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ไม่มีคู่หัวข้อติดกันที่ระดับเพิ่มเกิน 1 (เช่น H1 → H3) · มี H2 อย่างน้อย 1 อันก่อน H3 ชื่อสินค้าตัวแรก · `heading-order` violations = 0 (ตอนนี้ล้ม: H1 แล้วกระโดดไป H3 บนการ์ด)" },
    { type: 'source', description: "[R] · R211 · ความเสี่ยง: โครงหน้าสับสนสำหรับโปรแกรมอ่านจอ (WCAG 1.3.1) · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  for (const url of ['/products', '/products?pet=cat']) {
    await test.step(`1. เปิด ${url} เก็บลำดับระดับของ h1–h6 ตามลำดับใน DOM`, async () => {
      await page.goto(url);
      await settle(page);
      const r = await page.evaluate(() => {
        const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')].filter((h) => {
          const cs = getComputedStyle(h);
          return cs.display !== 'none' && cs.visibility !== 'hidden';
        });
        const lv = hs.map((h) => (/^H\d$/.test(h.tagName) ? Number(h.tagName[1]) : Number(h.getAttribute('aria-level') || 2)));
        const jumps: string[] = [];
        for (let i = 1; i < lv.length; i++)
          if (lv[i] - lv[i - 1] > 1) jumps.push(`H${lv[i - 1]} "${(hs[i - 1].textContent || '').trim().slice(0, 20)}" → H${lv[i]} "${(hs[i].textContent || '').trim().slice(0, 20)}"`);
        const firstCardH3 = hs.findIndex((h) => h.tagName === 'H3' && h.closest('[data-testid="product-card"]'));
        const h2Before = firstCardH3 > 0 && lv.slice(0, firstCardH3).includes(2);
        return { levels: lv.join(' '), jumps, firstCardH3, h2Before };
      });
      await check(page, `${url}: ไม่มีคู่หัวข้อติดกันที่ระดับเพิ่มเกิน 1 · มี H2 ก่อน H3 ชื่อสินค้าตัวแรก`, page.locator('h1, h2, h3'), async () => {
        expect.soft(r.jumps, 'คู่หัวข้อที่ข้ามระดับ').toEqual([]);
        expect.soft(r.h2Before, 'มี H2 ก่อน H3 ชื่อสินค้าตัวแรก').toBe(true);
      }, { actual: async () => r });
    });
    await test.step(`2. รัน axe heading-order ที่ ${url}`, async () => {
      const v = await axe(page, ['heading-order']);
      await check(page, `${url}: heading-order violations = 0`, null, async () => {
        expect.soft(v).toEqual([]);
      }, { actual: async () => v });
    });
  }
});

test('TC-A11Y-007 โหมด forced colors ปุ่มยังเห็นขอบ และแยกขนาดที่เลือกได้', {
  tag: ['@P2', '@5.8', '@chromium-only'],
  annotation: [
    { type: 'expected', description: "ทุกปุ่มที่ระบุ: `border-style` ≠ `none` และ `border-width` ≥ 1px (หรือ `outline-style` ≠ `none`) · ปุ่ม \"400 g\" ตอนเลือกกับตอนไม่เลือก ต่างกันอย่างน้อย 1 ค่าใน (`border-width`, `border-style`, `outline-style`, `outline-width`, `font-weight`, `text-decoration-line`) และภาพปุ่มเดียวกัน 2 สถานะไม่เหมือนกัน (`Buffer.compare` ≠ 0) (ตอนนี้ล้ม: ปุ่มพื้นหลังสีเหลือแค่ข้อความ และปุ่มขนาดที่เลือกกับไม่เลือกหน้าตาเหมือนกันทุกอย่าง)" },
    { type: 'source', description: "[R] · R212 · ความเสี่ยง: ผู้ใช้ High Contrast ซื้อผิดขนาด (WCAG 1.4.11) · เทคนิค: Negative" },
  ],
}, async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'จำลอง forced colors ได้แน่นอนเฉพาะ Chromium');
  const styleOf = (loc: Locator) =>
    loc.evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        borderStyle: cs.borderStyle,
        borderWidth: cs.borderWidth,
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        fontWeight: cs.fontWeight,
        textDecorationLine: cs.textDecorationLine,
        ariaPressed: e.getAttribute('aria-pressed'),
      };
    });
  const hasEdge = (s: Awaited<ReturnType<typeof styleOf>>) =>
    (s.borderStyle !== 'none' && parseFloat(s.borderWidth) >= 1) || s.outlineStyle !== 'none';
  await test.step('1. emulateMedia({forcedColors:"active"}) แล้วเปิด /', async () => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await settle(page);
  });
  await test.step('2. อ่าน border/outline ของ "ช้อปอาหารแมว", "ช้อปอาหารหมา"', async () => {
    for (const [name, loc] of [
      ['ช้อปอาหารแมว', page.getByTestId('hero-cta-cat')],
      ['ช้อปอาหารหมา', page.getByTestId('hero-cta-dog')],
    ] as const) {
      const s = await styleOf(loc);
      await check(page, `"${name}": border-style ≠ none และ border-width ≥ 1px (หรือ outline-style ≠ none)`, loc, async () => {
        expect.soft(hasEdge(s), JSON.stringify(s)).toBe(true);
      }, { actual: async () => s });
    }
  });
  await test.step('2. เปิด /products/kitten-salmon-dry อ่าน border/outline ของปุ่มที่ระบุ', async () => {
    await page.goto('/products/kitten-salmon-dry');
    await settle(page);
    const sizes = page.getByTestId('size-option');
    for (const [name, loc] of [
      ['เพิ่มลงตะกร้า', page.getByTestId('add-to-cart')],
      ['เพิ่มทั้งชุดลงตะกร้า', page.getByTestId('add-bundle')],
      ['−', page.getByTestId('qty-minus')],
      ['+', page.getByTestId('qty-plus')],
      ['400 g', sizes.filter({ hasText: '400 g' })],
      ['1.5 kg', sizes.filter({ hasText: '1.5 kg' })],
    ] as const) {
      const s = await styleOf(loc);
      await check(page, `"${name}": border-style ≠ none และ border-width ≥ 1px (หรือ outline-style ≠ none)`, loc, async () => {
        expect.soft(hasEdge(s), JSON.stringify(s)).toBe(true);
      }, { actual: async () => s });
    }
  });
  await test.step('3. ถ่ายภาพ "400 g" ตอนเลือก แล้วคลิก "1.5 kg" ถ่ายภาพ "400 g" อีกครั้ง เทียบ computed style', async () => {
    const s400 = page.getByTestId('size-option').filter({ hasText: '400 g' });
    await s400.scrollIntoViewIfNeeded();
    const selStyle = await styleOf(s400);
    const selShot = await s400.screenshot({ animations: 'disabled' });
    await page.getByTestId('size-option').filter({ hasText: '1.5 kg' }).click();
    await expect.poll(() => s400.getAttribute('aria-pressed'), { timeout: 3000 }).toBe('false').catch(() => {});
    await page.mouse.move(0, 0);
    const unStyle = await styleOf(s400);
    const unShot = await s400.screenshot({ animations: 'disabled' });
    await test.info().attach('400g-selected.png', { body: selShot, contentType: 'image/png' });
    await test.info().attach('400g-unselected.png', { body: unShot, contentType: 'image/png' });
    const keys = ['borderWidth', 'borderStyle', 'outlineStyle', 'outlineWidth', 'fontWeight', 'textDecorationLine'] as const;
    const diffKeys = keys.filter((k) => selStyle[k] !== unStyle[k]);
    await check(page, '"400 g" ตอนเลือกกับไม่เลือก ต่างกัน ≥ 1 ค่า style และภาพไม่เหมือนกัน (Buffer.compare ≠ 0)', s400, async () => {
      expect.soft(selStyle.ariaPressed, 'ตอนเลือก aria-pressed').toBe('true');
      expect.soft(unStyle.ariaPressed, 'ตอนไม่เลือก aria-pressed').toBe('false');
      expect.soft(diffKeys.length, 'จำนวนค่า style ที่ต่างกัน').toBeGreaterThanOrEqual(1);
      expect.soft(Buffer.compare(selShot, unShot), 'Buffer.compare ของภาพ 2 สถานะ').not.toBe(0);
    }, { actual: async () => ({ selected: selStyle, unselected: unStyle, diffKeys, sameImage: Buffer.compare(selShot, unShot) === 0 }) });
  });
});

test('TC-A11Y-008 จอ 320 CSS px ไม่มีเลื่อนแนวนอน', {
  tag: ['@P2', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ทุกหน้า: `scrollWidth` ≤ 320 และ `scrollX` = 0 · ทุก `.trust-item` และทุก `a`/`button` ที่มองเห็นมี `getBoundingClientRect().left` ≥ 0 และ `.right` ≤ 320 (กันการซ่อนส่วนเกินด้วย `overflow-x: hidden`) (ตอนนี้ล้ม: หน้าแรก `scrollWidth` = 347 เลื่อนได้ 27px จาก `.trust-item` 165px × 2 คอลัมน์)" },
    { type: 'source', description: "[R] · R213 · Q46 · ความเสี่ยง: ผู้ใช้ซูม 400%/จอเล็กต้องเลื่อนสองทาง (WCAG 1.4.10) · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await seedStorage(page); // ตะกร้ามี tuna-pouch ×1
  await page.setViewportSize({ width: 320, height: 640 });
  for (const url of ['/', '/products', '/products/kitten-salmon-dry', '/cart', '/register', '/finder', '/login']) {
    await test.step(`1–3. เปิด ${url} ที่ 320×640 อ่าน scrollWidth, scrollTo(100,0) แล้วอ่าน scrollX`, async () => {
      await page.goto(url);
      await settle(page);
      const r = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        window.scrollTo(100, 0);
        const sx = window.scrollX;
        window.scrollTo(0, 0);
        const out = [...document.querySelectorAll('.trust-item, a, button')]
          .filter((e) => {
            const cv = (e as unknown as { checkVisibility?: (o?: object) => boolean }).checkVisibility;
            const r = e.getBoundingClientRect();
            const vis = typeof cv === 'function' ? cv.call(e, { visibilityProperty: true }) : r.width > 0;
            return vis && r.width > 0 && (r.left < 0 || r.right > 320);
          })
          .map((e) => {
            const r = e.getBoundingClientRect();
            return `${e.tagName.toLowerCase()}.${(e as HTMLElement).className} "${(e.textContent || '').trim().slice(0, 20)}" [${Math.round(r.left)}, ${Math.round(r.right)}]`;
          });
        return { scrollWidth: sw, scrollX: sx, outOfBounds: out.slice(0, 20) };
      });
      await check(page, `${url}: scrollWidth ≤ 320 · scrollX = 0 · .trust-item/a/button อยู่ใน 0–320`, null, async () => {
        expect.soft(r.scrollWidth, 'scrollWidth').toBeLessThanOrEqual(320);
        expect.soft(r.scrollX, 'scrollX หลัง scrollTo(100,0)').toBe(0);
        expect.soft(r.outOfBounds, 'element ที่ล้นจอ').toEqual([]);
      }, { actual: async () => r });
    });
  }
});

test('TC-A11Y-009 ความกว้าง 375–1024 px ไม่มีเลื่อนแนวนอน', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ทุกขนาด × ทุกหน้า: `scrollWidth` ≤ ความกว้าง viewport (375, 600, 768, 900, 1024 ตามลำดับ) · รวม 50 ครั้งวัด ผ่าน 50" },
    { type: 'source', description: "[R] · R213 · ความเสี่ยง: เลย์เอาต์พังที่ breakpoint กลาง · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  test.setTimeout(180_000); // 5 ขนาด × 10 หน้า = 50 ครั้งวัด
  await seedStorage(page); // ตะกร้ามี tuna-pouch ×1
  const sizes = [
    [375, 812],
    [600, 800],
    [768, 1024],
    [900, 800],
    [1024, 768],
  ] as const;
  let pass = 0;
  let total = 0;
  for (const [w, h] of sizes) {
    await test.step(`1–2. ตั้ง viewport ${w}×${h} เปิดทีละหน้า อ่าน scrollWidth`, async () => {
      await page.setViewportSize({ width: w, height: h });
      const rows: { url: string; scrollWidth: number; ok: boolean }[] = [];
      for (const url of PAGES10) {
        await page.goto(url);
        await settle(page);
        const sw = await scrollWidthOf(page);
        rows.push({ url, scrollWidth: sw, ok: sw <= w });
        total++;
        if (sw <= w) pass++;
      }
      await check(page, `${w}px: scrollWidth ≤ ${w} ทุกหน้า (10 หน้า)`, null, async () => {
        expect.soft(rows.filter((r) => !r.ok)).toEqual([]);
      }, { actual: async () => rows });
    });
  }
  await check(page, 'รวม 50 ครั้งวัด ผ่าน 50', null, async () => {
    expect.soft(total, 'จำนวนครั้งวัด').toBe(50);
    expect.soft(pass, 'จำนวนที่ผ่าน').toBe(50);
  }, { actual: async () => ({ total, pass }) });
});

test('TC-A11Y-010 contrast ข้อความ ≥ 4.5:1 (ตัวเล็ก) และ ≥ 3:1 (ตัวใหญ่)', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "`color-contrast` violations = 0 ทุกหน้า · จุดเหล่านี้ ≥ 4.5:1 (หรือ ≥ 3:1 ถ้าเป็นตัวใหญ่): ตัวนับ ♥/🛒, ลิงก์ \"สมัครสมาชิก\", ปุ่ม \"ทั้งหมด\", ★ บนการ์ด, ป้าย 🐶, ป้าย 🐱, `PAW10` ใน hero, ข้อความบัญชีทดลองหน้า login, ราคาใต้ปุ่มขนาด (ตอนนี้ล้ม: 1.58:1, 2.82:1 (#FF6B4A บนขาว), 2.82:1, 3.64:1, 3.68:1, 4.23:1, 4.01:1, 3.82:1, 4.32:1 ตามลำดับ)" },
    { type: 'source', description: "[R] · R214 · ความเสี่ยง: ผู้ใช้สายตาเลือนรางอ่านราคา/ตัวนับไม่ออก (WCAG 1.4.3) · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await seedStorage(page, { wishlist: true }); // ตะกร้ามี tuna-pouch ×1 · wishlist มี kitten-salmon-dry
  await test.step('1. รัน axe color-contrast ทุกหน้า', async () => {
    for (const url of ['/', '/products', '/products/kitten-salmon-dry', '/login', '/nope']) {
      await page.goto(url);
      await settle(page);
      const v = await axe(page, ['color-contrast']);
      await check(page, `${url}: color-contrast violations = 0`, null, async () => {
        expect.soft(v).toEqual([]);
      }, { actual: async () => v });
    }
  });
  await test.step('2–3. คำนวณ contrast เองจาก computed color / background-color (ตัวใหญ่ = ≥ 24px หรือ ≥ 18.66px ตัวหนา)', async () => {
    const points: { url: string; name: string; loc: () => Locator }[] = [
      { url: '/', name: 'ตัวนับ ♥', loc: () => page.getByTestId('wishlist-count') },
      { url: '/', name: 'ตัวนับ 🛒', loc: () => page.getByTestId('cart-count') },
      { url: '/', name: '`PAW10` ใน hero', loc: () => page.getByTestId('hero').locator('code, strong, b, span, mark').filter({ hasText: /^PAW10$/ }).first() },
      { url: '/products', name: 'ปุ่ม "ทั้งหมด"', loc: () => page.getByTestId('filter-pet-all') },
      { url: '/products', name: '★ บนการ์ด', loc: () => page.getByTestId('product-card').locator('.card-rating').first() },
      { url: '/products', name: 'ป้าย 🐶', loc: () => page.getByTestId('product-card').locator('.tag-dog').first() },
      { url: '/products', name: 'ป้าย 🐱', loc: () => page.getByTestId('product-card').locator('.tag-cat').first() },
      { url: '/products/kitten-salmon-dry', name: 'ราคาใต้ปุ่มขนาด (400 g)', loc: () => page.getByTestId('size-option').nth(0).locator('small') },
      { url: '/products/kitten-salmon-dry', name: 'ราคาใต้ปุ่มขนาด (1.5 kg)', loc: () => page.getByTestId('size-option').nth(1).locator('small') },
      { url: '/login', name: 'ลิงก์ "สมัครสมาชิก"', loc: () => page.locator('main').getByRole('link', { name: 'สมัครสมาชิก' }) },
      { url: '/login', name: 'ข้อความบัญชีทดลองหน้า login', loc: () => page.locator('main .demo-hint code').first() },
    ];
    let cur = '';
    for (const p of points) {
      if (cur !== p.url) {
        await page.goto(p.url);
        await settle(page);
        cur = p.url;
      }
      const loc = p.loc();
      const c = await loc.evaluate(contrastOf).catch((e: Error) => ({ error: e.message.split('\n')[0] }));
      await check(page, `${p.name} contrast ≥ 4.5:1 (ตัวใหญ่ ≥ 3:1)`, loc, async () => {
        if ('error' in c) expect.soft(c.error, 'หา element ไม่เจอ').toBe('');
        else expect.soft(c.ratio, `${c.fg} บน ${c.bg} (${c.fontSize}px ${c.fontWeight})`).toBeGreaterThanOrEqual(c.need);
      }, { actual: async () => c });
    }
  });
});

test('TC-A11Y-011 เคารพ `prefers-reduced-motion`', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "รอบปกติ: จำนวน animation ที่วิ่ง > 0 (ยืนยันว่าตัววัดใช้ได้) · รอบ reduce: จำนวน animation ที่วิ่ง = 0" },
    { type: 'source', description: "[R] · R215 · ความเสี่ยง: ผู้ใช้ที่ไวต่อการเคลื่อนไหวเวียนหัว (WCAG 2.3.3) · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  await test.step('1. รอบปกติ: เปิด / รอ 1 วินาที นับ animation ที่ playState = running', async () => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const n = await running();
    await check(page, 'รอบปกติ: จำนวน animation ที่วิ่ง > 0 (ตัววัดใช้ได้)', null, async () => {
      expect.soft(n).toBeGreaterThan(0);
    }, { actual: async () => n });
  });
  await test.step('2. รอบ reduce: emulateMedia({reducedMotion:"reduce"}) เปิด / รอ 1 วินาที นับแบบเดียวกัน', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(1000);
    const n = await running();
    await check(page, 'รอบ reduce: จำนวน animation ที่วิ่ง = 0', null, async () => {
      expect.soft(n).toBe(0);
    }, { actual: async () => n });
  });
});

test('TC-A11Y-012 ไม่ปิดการซูม', {
  tag: ['@P2', '@5.8', '@mobile'],
  annotation: [
    { type: 'expected', description: "ทุกหน้ามี `meta[name=viewport]` 1 อัน content มี `width=device-width` และ `initial-scale=1` · ไม่มี `user-scalable=no`/`user-scalable=0` และไม่มี `maximum-scale` < 2 (WCAG 1.4.4 ซูม 200%) · `meta-viewport` violations = 0" },
    { type: 'source', description: "[R] · R216 · ความเสี่ยง: ผู้ใช้มือถือซูมอ่านราคาไม่ได้ (WCAG 1.4.4) · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await seedStorage(page);
  for (const url of PAGES10) {
    await test.step(`1–2. เปิด ${url} อ่าน meta[name=viewport] และรัน axe meta-viewport`, async () => {
      await page.goto(url);
      await settle(page);
      const metas = await page.locator('meta[name="viewport"]').evaluateAll((ms) => ms.map((m) => m.getAttribute('content') || ''));
      const v = await axe(page, ['meta-viewport']);
      const c = (metas[0] || '').toLowerCase().replace(/\s+/g, '');
      const max = c.match(/maximum-scale=([\d.]+)/)?.[1];
      await check(page, `${url}: meta viewport 1 อัน มี width=device-width, initial-scale=1 · ไม่ปิดซูม · meta-viewport = 0`, null, async () => {
        expect.soft(metas.length, 'จำนวน meta[name=viewport]').toBe(1);
        expect.soft(c).toContain('width=device-width');
        expect.soft(c).toContain('initial-scale=1');
        expect.soft(/user-scalable=(no|0)(,|$)/.test(c), 'user-scalable=no/0').toBe(false);
        if (max !== undefined) expect.soft(Number(max), 'maximum-scale').toBeGreaterThanOrEqual(2);
        expect.soft(v, 'axe meta-viewport').toEqual([]);
      }, { actual: async () => ({ metas, axe: v }) });
    });
  }
});

test('TC-A11Y-013 ไม่มี console error/request 4xx และมี favicon ที่ประกาศเอง', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "console error = 0 · pageerror = 0 · response ≥ 400 = 0 (ยกเว้นเอกสาร `/nope` = 404) · `link[rel~=\"icon\"]` ≥ 1 อัน และทุก href ได้ 200 content-type ขึ้นต้น `image/` · `/favicon.ico` status ≠ 404 · (`/robots.txt`, `/sitemap.xml` ไม่บังคับ ไม่นับ) (ตอนนี้ล้ม: `favicon.ico` 404 ตอนโหลดหน้าแรกของ session และไม่มี `<link rel=\"icon\">`)" },
    { type: 'source', description: "[R] · R217 · ความเสี่ยง: ผู้ใช้ใหม่ทุกคนเจอ error, แท็บไม่มีไอคอน, error จริงถูกกลบ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const consoleErr: string[] = [];
  const pageErr: string[] = [];
  const bad: string[] = [];
  let icons: string[] = [];
  await seedStorage(page);
  await test.step('1. ติด page.on("console") type error, page.on("pageerror") และ page.on("response") status ≥ 400', async () => {
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      // แผนยกเว้นเอกสาร /nope ที่ตั้งใจตอบ 404 — Chromium log "Failed to load resource … 404" ของเอกสารนั้นเป็น console error ด้วย จึงยกเว้นเฉพาะข้อความนี้ของ URL /nope
      const src = m.location().url || '';
      const isNopeDoc404 =
        /Failed to load resource.*\b404\b/.test(m.text()) && (() => {
          try {
            return new URL(src || page.url()).pathname === '/nope';
          } catch {
            return false;
          }
        })();
      if (!isNopeDoc404) consoleErr.push(`${page.url()} :: ${m.text().slice(0, 200)}`);
    });
    page.on('pageerror', (e) => pageErr.push(`${page.url()} :: ${e.message.slice(0, 200)}`));
    page.on('response', (r) => {
      if (r.status() < 400) return;
      const isNopeDoc = r.request().resourceType() === 'document' && new URL(r.url()).pathname === '/nope';
      if (!isNopeDoc) bad.push(`${r.status()} ${r.url()}`);
    });
  });
  await test.step('2. เปิดทีละหน้า เริ่มจาก / ใน context ใหม่', async () => {
    for (const url of PAGES11) {
      if (url === '/account') await loginDemo(page);
      await page.goto(url);
      await settle(page);
      if (url === '/') icons = await page.locator('link[rel~="icon"]').evaluateAll((ls) => ls.map((l) => (l as HTMLLinkElement).href));
    }
  });
  await check(page, 'console error = 0 · pageerror = 0', null, async () => {
    expect.soft(consoleErr, 'console error').toEqual([]);
    expect.soft(pageErr, 'pageerror').toEqual([]);
  }, { actual: async () => ({ consoleErr, pageErr }) });
  await check(page, 'response ≥ 400 = 0 (ยกเว้นเอกสาร /nope = 404)', null, async () => {
    expect.soft(bad).toEqual([]);
  }, { actual: async () => bad });
  await test.step('3. นับ link[rel~="icon"] ที่ / แล้ว request.get(href) และ request.get("/favicon.ico")', async () => {
    const res: { href: string; status: number; type: string }[] = [];
    for (const h of icons) {
      const r = await page.request.get(h);
      res.push({ href: h, status: r.status(), type: r.headers()['content-type'] || '' });
    }
    const fav = await page.request.get('/favicon.ico');
    await checkApi('link[rel~="icon"] ≥ 1 อัน และทุก href ได้ 200 content-type ขึ้นต้น image/', res, () => {
      expect.soft(icons.length, 'จำนวน link[rel~="icon"]').toBeGreaterThanOrEqual(1);
      for (const x of res) {
        expect.soft(x.status, x.href).toBe(200);
        expect.soft(x.type, x.href).toMatch(/^image\//);
      }
    });
    await checkApi('/favicon.ico status ≠ 404', { status: fav.status(), type: fav.headers()['content-type'] }, () => {
      expect.soft(fav.status()).not.toBe(404);
    });
  });
});

test('TC-A11Y-014 ธีมมืดของระบบไม่ทำให้อ่านไม่ออก (ไม่บังคับมี dark mode)', {
  tag: ['@P2', '@5.8'],
  annotation: [
    { type: 'expected', description: "ผ่านทั้งกรณีเว็บมีหรือไม่มีธีมมืด · จำนวน `color-contrast` violations ในโหมดมืด ≤ ในโหมดสว่าง · ไม่มีข้อความที่ `color` = สีพื้นหลังจริง (`background-color` ของ ancestor ตัวแรกที่ไม่โปร่งใส) · `scrollWidth` เท่ากันทั้งสองโหมด" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R218 · Q46 · ความเสี่ยง: ถ้าเพิ่มธีมมืดภายหลังแล้วข้อความกลืนพื้น · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const urls = ['/', '/products', '/products/kitten-salmon-dry', '/login'];
  const light: Record<string, { v: number; sw: number }> = {};
  await test.step('1. โหมดสว่าง: emulateMedia({colorScheme:"light"}) รัน axe color-contrast จดจำนวน violations และ scrollWidth', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
    for (const url of urls) {
      await page.goto(url);
      await settle(page);
      const v = await axe(page, ['color-contrast']);
      light[url] = { v: v.reduce((n, x) => n + x.nodes.length, 0), sw: await scrollWidthOf(page) };
    }
  });
  await test.step('2–3. ตั้ง colorScheme:"dark" เปิดหน้าเดิม รัน axe ซ้ำ อ่าน scrollWidth', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const url of urls) {
      await page.goto(url);
      await settle(page);
      const v = await axe(page, ['color-contrast']);
      const dark = { v: v.reduce((n, x) => n + x.nodes.length, 0), sw: await scrollWidthOf(page) };
      const same = await page.evaluate(sameColorText);
      await check(page, `${url}: violations โหมดมืด ≤ โหมดสว่าง · ไม่มีข้อความสีเดียวกับพื้นหลัง · scrollWidth เท่ากัน`, null, async () => {
        expect.soft(dark.v, `color-contrast (จำนวน node) มืด ${dark.v} / สว่าง ${light[url].v}`).toBeLessThanOrEqual(light[url].v);
        expect.soft(same, 'ข้อความที่ color = สีพื้นหลังจริง').toEqual([]);
        expect.soft(dark.sw, 'scrollWidth โหมดมืด = โหมดสว่าง').toBe(light[url].sw);
      }, { actual: async () => ({ light: light[url], dark, sameColor: same, darkViolations: v }) });
    }
  });
});

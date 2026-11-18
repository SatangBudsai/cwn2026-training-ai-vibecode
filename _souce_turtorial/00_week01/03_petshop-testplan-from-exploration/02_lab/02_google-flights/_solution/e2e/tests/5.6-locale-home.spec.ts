/**
 * 5.6 ภาษา สกุลเงิน และหน้าแรก (TC-LOC-01 … TC-LOC-04)
 * ที่มา: plan/5.6-ภาษาสกุลเงินและหน้าแรก.md · TEST-PLAN.md หัวข้อ 2.3 · 6 · 7
 *
 * - ทุก test เริ่มจาก U1 (TC-LOC-04 เริ่มจาก U0) ใน context ใหม่ · เปลี่ยนค่าผ่านปุ่มท้ายหน้าเท่านั้น
 * - ปุ่มท้ายหน้า 3 ปุ่มอ้างตามลำดับ (ภาษา · สถานที่ตั้ง · สกุลเงิน) เพราะป้ายเปลี่ยนตามภาษา (และ R126 ตรวจป้ายเอง)
 * - ทุก test จบที่ hl=th curr=THB (ไม่มี gl) ตามแผน 6.3
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, getU1, U0, SuiteStopError, type GF } from '../support/gf';

const PLAN = 'plan/5.6-ภาษาสกุลเงินและหน้าแรก.md';

// ───────────────────────── regex / ค่าคงที่ ─────────────────────────
const DETAILS_RE = /^(รายละเอียดเที่ยวบิน|Flight details|フライトの詳細)/;
const OK_RE = /^(ตกลง|OK)$/;
const CANCEL_RE = /^(ยกเลิก|Cancel|キャンセル)$/;
const CLASS_RE = /ชั้นประหยัด|Economy|エコノミー/;
const UNIT = {
  THB: /฿|THB|บาท|バーツ|baht/i,
  JPY: /¥|￥|JPY|เยน|円|yen/i,
  USD: /US\$|\$|USD|ดอลลาร์|dollar|米ドル|ドル/i,
};
const PRICE_TOKEN_SRC = String.raw`(?:US\$|฿|\$|¥|￥|THB|USD|JPY)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:บาทไทย|บาท|เยนญี่ปุ่น|เยน|ดอลลาร์สหรัฐ|US dollars|Thai baht|Japanese yen|米ドル|タイ\s?バーツ|バーツ|円)`;
const PRICE_TOKEN_1 = new RegExp(PRICE_TOKEN_SRC);
const priceTokens = (s: string) => s.match(new RegExp(PRICE_TOKEN_SRC, 'g')) || [];
const DATE_RANGE_RE =
  /\d{1,2}\s*[ก-๎]+\.(?:[ก-๎]+\.?)?\s*[-–]\s*\d{1,2}|\d{1,2}月\d{1,2}日\s*[～~〜\-–]|[A-Z][a-z]{2}\s\d{1,2}\s*[–-]/;
/** อักษรไทย (ไม่รวม ฿ U+0E3F ซึ่งเป็นสัญลักษณ์สกุลเงิน) */
const THAI_CHAR = /[ก-ฺเ-๛]/;
/** D-LOC-ADMIN */
const ADMIN_RE = /เทศบาลนคร|เทศบาลเมือง|อำเภอ|เขตบริหารพิเศษ|テーサバーン|アンプー|Thesaban|Amphoe/i;
/** คำสะกดขาดวรรณยุกต์ที่แผนยกตัวอย่าง (R133) */
const MISSPELL: { re: RegExp; right: string }[] = [{ re: /เซี่ยงไฮ(?!้)/, right: 'เซี่ยงไฮ้' }];

/** ความหมายของปุ่มท้ายหน้าแต่ละภาษา (R126) */
type Lang = 'th' | 'en' | 'ja';
const CONCEPT: Record<'lang' | 'loc' | 'cur', Record<Lang, RegExp>> = {
  lang: { th: /ภาษา/, en: /Language/i, ja: /言語/ },
  loc: { th: /สถานที่ตั้ง|ประเทศ|ภูมิภาค|ตำแหน่ง/, en: /Location|Country|Region/i, ja: /国|地域|所在地|ロケーション|場所/ },
  cur: { th: /สกุลเงิน/, en: /Currency/i, ja: /通貨/ },
};

/** ส่วนของชื่อแบรนด์ภาษาอังกฤษ → คำแปล/ทับศัพท์ที่ยอมรับในภาษาไทยและญี่ปุ่น (R125) */
const BRAND: Record<string, { th: RegExp; ja: RegExp }> = {
  thai: { th: /ไทย/, ja: /タイ/ },
  airasia: { th: /แอร์เอเชีย/, ja: /エアアジア/ },
  x: { th: /เอ็กซ์|X/, ja: /X|エックス/ },
  vietjet: { th: /เวียดเจ[็๊]ท/, ja: /ベトジェット/ },
  air: { th: /แอร์/, ja: /エア|航空/ },
  lion: { th: /ไลอ้อน/, ja: /ライオン/ },
  airways: { th: /แอร์เวย์|การบิน/, ja: /航空|エアウェイズ/ },
  airlines: { th: /แอร์ไลน์|สายการบิน|การบิน/, ja: /航空|エアラインズ/ },
  international: { th: /อินเตอร์เนชั่นแนล|นานาชาติ/, ja: /国際/ },
  zipair: { th: /ZIPAIR|ซิปแอร์/i, ja: /ZIPAIR|ジップエア/i },
  tokyo: { th: /Tokyo|โตเกียว/i, ja: /Tokyo|東京/i },
  ana: { th: /ANA|เอเอ็นเอ/i, ja: /ANA|全日空|全日本空輸/ },
  japan: { th: /เจแปน|ญี่ปุ่น|Japan/i, ja: /日本|ジャパン|Japan/i },
  jal: { th: /JAL|เจแปนแอร์ไลน์/i, ja: /JAL|日本航空/ },
  hong: { th: /ฮ่องกง/, ja: /香港/ },
  kong: { th: /ฮ่องกง/, ja: /香港/ },
  express: { th: /เอ็กซ์เพรส/, ja: /エクスプレス/ },
  china: { th: /ไชน่า|ไชนา|จีน/, ja: /中国/ },
  southern: { th: /เซาเทิร์น/, ja: /南方/ },
  eastern: { th: /อีสเทิร์น/, ja: /東方/ },
  cathay: { th: /คาเธ่ย์|คาเธย์/, ja: /キャセイ/ },
  pacific: { th: /แปซิฟิก/, ja: /パシフィック/ },
  singapore: { th: /สิงคโปร์/, ja: /シンガポール/ },
  scoot: { th: /สกู๊ต|สกูต/, ja: /スクート/ },
  nok: { th: /นก/, ja: /ノック/ },
  peach: { th: /พีช/, ja: /ピーチ/ },
  korean: { th: /โคเรียน|เกาหลี/, ja: /大韓|コリアン/ },
  eva: { th: /อีวา|EVA/i, ja: /エバー|EVA/i },
  starlux: { th: /สตาร์ลักซ์|STARLUX/i, ja: /スターラックス|STARLUX/i },
};

// ───────────────────────── ตัวช่วยทั่วไป ─────────────────────────
function note(label: string, data: unknown) {
  test.info().annotations.push({ type: 'ข้อมูล', description: `${label}: ${typeof data === 'string' ? data : JSON.stringify(data)}` });
}
async function snap(page: Page, name: string) {
  const p = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: p }).catch(() => {});
  await test.info().attach(name, { path: p, contentType: 'image/png' }).catch(() => {});
}
function rethrowStop(e: unknown) {
  if (e instanceof SuiteStopError) throw e;
}
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const toNum = (s: string) => Number(s.replace(/[^\d.]/g, ''));

function urlParams(u: string) {
  const url = new URL(u);
  const p: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { p[k] = v; });
  return { path: url.pathname, p };
}
/** รายชื่อพารามิเตอร์ที่ต่างกันระหว่าง 2 URL (รวม path ถ้าต่าง) */
function diffKeys(a: string, b: string): string[] {
  const A = urlParams(a), B = urlParams(b);
  const keys = new Set([...Object.keys(A.p), ...Object.keys(B.p)]);
  const d = [...keys].filter((k) => A.p[k] !== B.p[k]);
  if (A.path !== B.path) d.push('(path)');
  return d.sort();
}

async function ariaName(loc: Locator): Promise<string> {
  const a = await loc.getAttribute('aria-label', { timeout: 5000 }).catch(() => null);
  if (a) return a;
  const s = await loc.ariaSnapshot({ timeout: 5000 }).catch(() => '');
  const m = s.match(/^- [\w-]+ "((?:[^"\\]|\\.)*)"/);
  return m ? m[1] : '';
}
async function fieldVal(loc: Locator): Promise<string> {
  return loc
    .evaluate((el) => ('value' in el ? String((el as HTMLInputElement).value) : el.textContent || ''), undefined, { timeout: 10_000 })
    .catch(() => '(ไม่พบช่อง)');
}

// ───────────────────────── ท้ายหน้า / ป๊อปอัป ─────────────────────────
const footer = (page: Page) => page.getByRole('contentinfo').first();
/** ปุ่มท้ายหน้า: 0 = ภาษา · 1 = สถานที่ตั้ง · 2 = สกุลเงิน */
const footerBtn = (page: Page, i: 0 | 1 | 2) => footer(page).getByRole('button').nth(i);
/**
 * ป้ายปุ่มท้ายหน้าในรูป "ป้าย·ค่า"
 * - textContent จริงคั่นป้ายกับค่าด้วย U+200B (zero-width space) หรือไม่มีตัวคั่นเลย ("·" ที่เห็นบนจอเป็นแค่การแสดงผล)
 *   เช่น "ภาษา\u200Bไทย", "สกุลเงินTHB" → อ่านทีละ text node แล้วตัดที่ตัวคั่นที่มองไม่เห็น ต่อกลับด้วย "·"
 * - ถ้าไม่มีตัวคั่นเลยและลงท้ายด้วยรหัสสกุลเงิน 3 ตัว (เช่น "สกุลเงินTHB") → แยกเป็น "สกุลเงิน·THB"
 */
async function footerLabels(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const i of [0, 1, 2] as const) {
    let s = await footerBtn(page, i)
      .evaluate((el) => {
        const parts: string[] = [];
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          for (const p of (n.nodeValue || '').split(/[\u200B\u200C\u200D\u2060\uFEFF·]/)) {
            const t = p.replace(/\s+/g, ' ').trim();
            if (t) parts.push(t);
          }
        }
        return parts.join('·');
      }, undefined, { timeout: 10_000 })
      .catch(() => '');
    if (s && !s.includes('·')) {
      const m = s.match(/^(.*\S)\s*([A-Z]{3})$/);
      if (m) s = `${m[1]}·${m[2]}`;
    }
    out.push(s);
  }
  return out;
}
/** ตัวคั่นระหว่างป้ายกับค่าบนปุ่มท้ายหน้า: "·" / U+200B / ช่องว่าง / ไม่มีเลย */
const FOOT_SEP = String.raw`[\s\u200B\u200C\u200D\u2060\uFEFF·]*`;
const footRe = (label: string, value: string) => new RegExp(`${label}${FOOT_SEP}${value}`);
const FOOT = {
  langTh: footRe('ภาษา', 'ไทย'),
  locTh: footRe('สถานที่ตั้ง', 'ไทย'),
  curTHB: footRe('สกุลเงิน', 'THB'),
};
const labelKey = (s: string) => s.split(/[·\u200B\u200C\u200D\u2060\uFEFF]/)[0].trim();
const settingDialog = (page: Page) => page.getByRole('dialog').filter({ has: page.getByRole('radio') }).first();

async function clickRobust(gf: GF, target: Locator, opts: { search?: string } = {}) {
  try {
    await gf.click(target, opts);
  } catch (e) {
    rethrowStop(e);
    await gf.click(target, { ...opts, force: true });
  }
}

/** เปิดป๊อปอัปท้ายหน้า → เลือกตัวเลือก → ตกลง (= 1 การค้นหา เพราะหน้าโหลดผลใหม่) */
async function changeSetting(gf: GF, page: Page, idx: 0 | 1 | 2, radioName: RegExp, searchReason: string) {
  await gf.click(footerBtn(page, idx));
  const dlg = settingDialog(page);
  await dlg.waitFor({ state: 'visible', timeout: 15_000 });
  await clickRobust(gf, dlg.getByRole('radio', { name: radioName }).first());
  await gf.click(dlg.getByRole('button', { name: OK_RE }), { search: searchReason });
}

// ───────────────────────── หัวผลลัพธ์ ─────────────────────────
async function expectHeaderTh(page: Page, tag: string) {
  await expect.soft(page.getByRole('combobox', { name: /ประเภทตั๋ว/ }).first(), `${tag}: ประเภทตั๋ว = เที่ยวเดียว`).toContainText('เที่ยวเดียว');
  await expect.soft(page.getByRole('button', { name: /ผู้โดยสาร 1 คน/ }).first(), `${tag}: ผู้โดยสาร 1`).toBeVisible();
  await expect.soft(page.getByRole('combobox', { name: /ชั้นโดยสาร/ }).first(), `${tag}: ชั้นประหยัด`).toContainText('ชั้นประหยัด');
  expect.soft(await fieldVal(page.getByRole('combobox', { name: 'ต้นทาง', exact: true }).first()), `${tag}: ต้นทาง`).toMatch(/กรุงเทพมหานคร/);
  expect.soft(await fieldVal(page.getByRole('combobox', { name: 'ปลายทาง', exact: true }).first()), `${tag}: ปลายทาง`).toMatch(/โตเกียว/);
  expect.soft(await fieldVal(page.getByRole('textbox', { name: 'ขาไป', exact: true }).first()), `${tag}: ขาไป`).toMatch(/อังคาร 15 ธ\.ค\./);
}
async function expectHeaderJa(page: Page, tag: string) {
  await expect.soft(page.getByRole('combobox', { name: /チケット種別/ }).first(), `${tag}: 片道`).toContainText('片道');
  await expect.soft(page.getByRole('button', { name: /1\s*名/ }).first(), `${tag}: 乗客 1 名`).toBeVisible();
  await expect.soft(page.getByRole('combobox', { name: /座席クラス/ }).first(), `${tag}: エコノミー`).toContainText('エコノミー');
  expect.soft(await fieldVal(page.getByRole('combobox', { name: /出発地/ }).first()), `${tag}: 出発地`).toMatch(/バンコク/);
  expect.soft(await fieldVal(page.getByRole('combobox', { name: /目的地/ }).first()), `${tag}: 目的地`).toMatch(/東京/);
  expect.soft(await fieldVal(page.getByRole('textbox', { name: /往路/ }).first()), `${tag}: 往路`).toMatch(/12月15日\s*[(（]火[)）]/);
}

/** เงื่อนไขก่อนเริ่ม: หัวผลลัพธ์ตรง U1 + ท้ายหน้า ไทย / ไทย / THB · ถ้าไม่ใช่ หยุด test และแจ้งผู้คุมชุด */
async function verifyU1Start(gf: GF, page: Page) {
  const st1 = await gf.check('ก่อนเริ่ม: หัวผลลัพธ์ตรงนิยาม U1', page.getByRole('search').first(), async () => {
    await expectHeaderTh(page, 'หัวผลลัพธ์ U1');
  });
  const st2 = await gf.check('ก่อนเริ่ม: ท้ายหน้า ภาษา·ไทย / สถานที่ตั้ง·ไทย / สกุลเงิน·THB', footer(page).getByRole('button').first(), async () => {
    await expectFooterDefault(page, 'ท้ายหน้าหลังเปิด U1');
  });
  if (st1 === 'fail' || st2 === 'fail') {
    throw new Error('เงื่อนไขก่อนเริ่มไม่ผ่าน (หัวผลลัพธ์ไม่ตรง U1 หรือสถานะค้างจาก test ก่อน) → หยุด test และแจ้งผู้คุมชุด');
  }
}
async function expectFooterDefault(page: Page, tag: string) {
  const f = await footerLabels(page);
  note(`${tag} ป้ายท้ายหน้า`, f);
  expect.soft(f[0], `${tag}: ปุ่มภาษา`).toMatch(FOOT.langTh);
  expect.soft(f[1], `${tag}: ปุ่มสถานที่ตั้ง`).toMatch(FOOT.locTh);
  expect.soft(f[2], `${tag}: ปุ่มสกุลเงิน`).toMatch(FOOT.curTHB);
}

// ───────────────────────── แถวผลลัพธ์ ─────────────────────────
type Row = {
  i: number; label: string; text: string; airline: string | null;
  dep: string | null; arr: string | null; plus: number; from: string | null; to: string | null; stops: number | null;
  num: number | null; numRaw: string | null; labelHead: string; vis: string | null;
};
const rowsLoc = (page: Page) =>
  page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('button', { name: DETAILS_RE }) });

function hhmm(h: number, m: string, ap?: string) {
  const H = ap ? (h % 12) + (/PM/i.test(ap) ? 12 : 0) : h;
  return `${String(H).padStart(2, '0')}:${m}`;
}
function parseRow(i: number, label: string, text: string): Row {
  const t = [...text.matchAll(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/gi)];
  const dep = t[0] ? hhmm(+t[0][1], t[0][2], t[0][3]) : null;
  const arr = t[1] ? hhmm(+t[1][1], t[1][2], t[1][3]) : null;
  let plus = 0;
  if (t[1]) {
    const pm = text.slice(t[1].index! + t[1][0].length).match(/^\s*\+(\d)/);
    if (pm) plus = +pm[1];
  }
  const ap = text.match(/\b([A-Z]{3})\s*[–-]\s*([A-Z]{3})\b/);
  let stops: number | null = null;
  if (/บินตรง|Nonstop|直行便/i.test(text)) stops = 0;
  else {
    const s = text.match(/(\d+)\s*(?:ครั้ง|stops?|か所経由)/i);
    if (s) stops = +s[1];
  }
  const am =
    label.match(/กับ\s+(.+?)\s+(?:ดำเนินการโดย[\s\S]*?)?ออกเดินทางจาก/) ||
    label.match(/flight with (.+?)\.\s+(?:Operated by[^.]*\.\s+)?Leaves/i) ||
    label.match(/。\s*(.+?)\s*が運航/);
  const nm = label.match(/\d[\d,]*(?:\.\d+)?/);
  const numRaw = nm ? nm[0] : null;
  const num = numRaw ? Number(numRaw.replace(/,/g, '')) : null;
  const labelHead = nm ? label.slice(0, nm.index! + nm[0].length + 22) : label.slice(0, 60);
  let vis: string | null = null;
  if (num != null) {
    for (const c of [num.toLocaleString('en-US'), String(num)]) {
      const re = new RegExp(`(?<![\\d,.])${c.replace(/[.,]/g, '\\$&')}(?![\\d,])`, 'g');
      const ms = [...text.matchAll(re)];
      if (ms.length) {
        const m = ms[ms.length - 1];
        vis = text.slice(Math.max(0, m.index! - 6), m.index! + c.length + 4).replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }
  return {
    i, label, text, airline: am ? am[1].trim() : null, dep, arr, plus,
    from: ap ? ap[1] : null, to: ap ? ap[2] : null, stops, num, numRaw, labelHead, vis,
  };
}
/** อ่านทุกแถวในรายการชุดแรก (ไม่กด "ดูเที่ยวบินเพิ่มเติม") */
async function readRows(page: Page): Promise<Row[]> {
  const rows = rowsLoc(page);
  await rows.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  const n = await rows.count();
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    out.push(parseRow(i, await ariaName(r.getByRole('link').first()), await r.innerText().catch(() => '')));
  }
  return out;
}
const rowBrief = (r: Row) =>
  `${r.i + 1}. ${r.airline} ${r.from}-${r.to} ${r.dep}–${r.arr}${r.plus ? '+' + r.plus : ''} แวะ${r.stops} · aria=${r.num} · จอ="${r.vis}"`;
const keyCur = (r: Row) => `${r.airline}|${r.dep}|${r.arr}+${r.plus}`;
const keyLang = (r: Row) => `${r.dep}|${r.arr}+${r.plus}|${r.from}-${r.to}|${r.stops}`;
function uniqueBy(rows: Row[], key: (r: Row) => string): Map<string, Row> {
  const cnt = new Map<string, number>();
  rows.forEach((r) => cnt.set(key(r), (cnt.get(key(r)) || 0) + 1));
  const m = new Map<string, Row>();
  rows.forEach((r) => { if (cnt.get(key(r)) === 1) m.set(key(r), r); });
  return m;
}

/** ตรวจหน่วยราคาทุกแถว: aria-label + ราคาบนจอ ต้องมีหน่วย must และไม่มี forbid */
function auditRows(rows: Row[], must: RegExp, forbid: RegExp): string[] {
  const p: string[] = [];
  if (rows.length === 0) p.push('ไม่พบแถวผลลัพธ์');
  for (const r of rows) {
    if (r.num == null) { p.push(`แถว ${r.i + 1}: อ่านราคาจาก aria-label ไม่ได้ ("${r.label.slice(0, 60)}")`); continue; }
    if (!must.test(r.labelHead)) p.push(`แถว ${r.i + 1}: aria-label ไม่มีหน่วยที่ถูก "${r.labelHead}"`);
    if (forbid.test(r.labelHead)) p.push(`แถว ${r.i + 1}: aria-label มีสกุลอื่นหลงเหลือ "${r.labelHead}"`);
    if (r.vis == null) p.push(`แถว ${r.i + 1}: ไม่พบตัวเลขราคา ${r.num} บนจอ`);
    else {
      if (!must.test(r.vis)) p.push(`แถว ${r.i + 1}: ราคาบนจอไม่มีหน่วยที่ถูก/เป็นตัวเลขเปล่า "${r.vis}"`);
      if (forbid.test(r.vis)) p.push(`แถว ${r.i + 1}: ราคาบนจอมีสกุลอื่นหลงเหลือ "${r.vis}"`);
    }
  }
  return p;
}
/** ตรวจหน่วยของราคาในข้อความ (แท็บ ฯลฯ): ทุกตัวเลขต้องเป็นราคาที่มีหน่วย must และไม่มี forbid */
function auditText(where: string, text: string, must: RegExp, forbid: RegExp): string[] {
  const p: string[] = [];
  const tokens = priceTokens(text);
  const nums = text.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  if (nums.length > tokens.length) p.push(`${where}: มีตัวเลขที่ไม่มีหน่วยกำกับ "${text.replace(/\s+/g, ' ')}"`);
  for (const t of tokens) {
    if (!must.test(t)) p.push(`${where}: ราคา "${t}" ไม่ใช่หน่วยที่ตั้งไว้`);
    if (forbid.test(t)) p.push(`${where}: ราคา "${t}" มีสกุลอื่นหลงเหลือ`);
  }
  return p;
}

type Tabs = { bestText: string; bestName: string; cheapText: string; cheapName: string };
async function readTabs(page: Page): Promise<Tabs> {
  const best = page.getByRole('main').getByRole('tab').filter({ hasText: /ดีที่สุด|Best|おすすめ/ }).first();
  const cheap = page.getByRole('main').getByRole('tab', { name: /ถูกที่สุด|Cheapest|最安値/ }).first();
  return {
    bestText: (await best.innerText({ timeout: 10_000 }).catch(() => '')).trim(),
    bestName: await ariaName(best),
    cheapText: (await cheap.innerText({ timeout: 10_000 }).catch(() => '')).trim(),
    cheapName: await ariaName(cheap),
  };
}
const tabsLoc = (page: Page) => page.getByRole('main').getByRole('tablist').first();
function auditTabs(t: Tabs, must: RegExp, forbid: RegExp): string[] {
  return [
    ...auditText('แท็บ "ดีที่สุด" (บนจอ)', t.bestText, must, forbid),
    ...auditText('แท็บ "ถูกที่สุด" (บนจอ)', t.cheapText, must, forbid),
    ...auditText('แท็บ "ถูกที่สุด" (aria-label)', t.cheapName.replace(/ดูข้อมูลเพิ่มเติม.*$/, ''), must, forbid),
  ];
}
/** ค้นทั้งหน้าหาราคาที่ใช้สกุล forbid */
async function scanBody(page: Page, forbid: RegExp): Promise<string[]> {
  const body = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  return [...new Set(priceTokens(body).filter((t) => forbid.test(t)))];
}

// ───────────────────────── ขยายแถว (เลขเที่ยวบิน / ชื่อสายการบินในแถวขยาย) ─────────────────────────
type Expanded = { legs: { airline: string; fn: string }[]; flightNos: string[] };
async function expandRead(gf: GF, page: Page, idx: number): Promise<Expanded> {
  const row = rowsLoc(page).nth(idx);
  const btn = row.getByRole('button', { name: DETAILS_RE }).first();
  await gf.click(btn);
  // รอแถวขยายแสดงบรรทัด "สายการบิน · ชั้น · เครื่องบิน · เลขเที่ยวบิน"
  await row.getByText(CLASS_RE).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  // อ่านจาก DOM: "·" ระหว่างส่วนต่าง ๆ เป็นแค่การแสดงผล (textContent เป็น U+200B หรือว่าง) จึงหา element ชั้นโดยสาร
  // แล้วอ่าน element ก่อนหน้า (= ชื่อสายการบิน) และเลขเที่ยวบินที่ตามหลังใน container เดียวกัน
  const legs: { airline: string; fn: string }[] = await row
    .evaluate((root, src) => {
      const CLS = new RegExp(`^(?:${src})$`);
      const FN = /(?:^|[^A-Za-z0-9])([A-Z][A-Z0-9]|[0-9][A-Z])\s(\d{1,4})(?![0-9])/g;
      const clean = (s: string | null | undefined) => (s || '').replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim();
      const isSep = (s: string) => s.replace(/[·・•\s]/g, '') === '';
      const vis = (e: Element) => (typeof (e as any).checkVisibility === 'function' ? (e as any).checkVisibility() : true);
      const out: { airline: string; fn: string }[] = [];
      const used = new Set<Element>();
      for (const el of Array.from(root.querySelectorAll('*'))) {
        if (!CLS.test(clean(el.textContent))) continue;
        if (Array.from(el.children).some((c) => CLS.test(clean(c.textContent)))) continue;
        if (!vis(el)) continue;
        // ข้อความทีละ text node (คั่นด้วยช่องว่าง) ก่อน/หลัง element หนึ่งภายใน container · span ที่ติดกันจะไม่ถูกต่อเป็นคำเดียว
        const pieces = (box: Element, ref: Element, after: boolean) => {
          const parts: string[] = [];
          const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
          let n: Node | null;
          while ((n = w.nextNode())) {
            if (ref.contains(n)) continue;
            const pos = ref.compareDocumentPosition(n);
            if (after ? pos & Node.DOCUMENT_POSITION_FOLLOWING : pos & Node.DOCUMENT_POSITION_PRECEDING) {
              const t = clean(n.nodeValue);
              if (t && !isSep(t)) parts.push(t);
            }
          }
          return parts;
        };
        let child: Element = el;
        let p: Element | null = el.parentElement;
        let fn: RegExpMatchArray | null = null;
        for (let depth = 0; p && p !== root && depth < 4; depth++) {
          const ms = [...pieces(p, child, true).join(' ').matchAll(FN)];
          if (ms.length) { fn = ms[0]; break; }
          child = p;
          p = p.parentElement;
        }
        if (!fn || !p || used.has(p)) continue;
        used.add(p);
        let airline = '';
        for (let s = child.previousElementSibling; s; s = s.previousElementSibling) {
          const t = clean(s.textContent);
          if (!isSep(t)) { airline = t; break; }
        }
        if (!airline) airline = pieces(p, child, false).pop() || '';
        out.push({ airline, fn: `${fn[1]} ${fn[2]}` });
      }
      return out;
    }, CLASS_RE.source)
    .catch(() => [] as { airline: string; fn: string }[]);
  if (!legs.length) {
    // สำรอง: อ่านจาก innerText (ถ้าตัวคั่นเป็นข้อความจริง)
    const raw = (await row.innerText().catch(() => '')).replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, ' · ');
    const text = raw.replace(/[ \t]*\n?[ \t]*·[ \t]*\n?[ \t]*/g, ' · ');
    for (const line of text.split('\n')) {
      if (!CLASS_RE.test(line)) continue;
      const fns = [...line.matchAll(/(?:^|[\s·])([A-Z][A-Z0-9]|[0-9][A-Z])\s(\d{1,4})(?=$|[\s·])/g)];
      if (!fns.length) continue;
      const f = fns[fns.length - 1];
      legs.push({ airline: line.split(' · ')[0].trim(), fn: `${f[1]} ${f[2]}` });
    }
  }
  try {
    await gf.click(btn); // ยุบแถวกลับ
  } catch (e) { rethrowStop(e); }
  return { legs, flightNos: legs.map((l) => l.fn) };
}
const sameFns = (a: string[], b: string[]) => a.length > 0 && a.join('+') === b.join('+');

// ───────────────────────── R125: ชื่อแบรนด์ ─────────────────────────
function brandParts(en: string): string[] {
  return en.toLowerCase().replace(/[().,]/g, ' ').split(/[\s\-・/]+/).filter(Boolean);
}
function brandMissing(en: string, target: string, lang: 'th' | 'ja') {
  const missing: string[] = [], unknown: string[] = [];
  for (const t of brandParts(en)) {
    const lit = new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (lit.test(target)) continue;
    const d = BRAND[t];
    if (!d) { unknown.push(t); continue; }
    if (!d[lang].test(target)) missing.push(t);
  }
  return { missing, unknown };
}
/** R125 E3: คู่ชื่อที่มีส่วนเดียวกัน ≥ 4 ตัวอักษรฐาน แต่ต่างกันแค่วรรณยุกต์/สระบน-ล่าง */
const TH_MARK = /[ัิ-ฺ็-๎]/;
function clusters(s: string) {
  const out: { base: string; full: string }[] = [];
  for (const ch of s) {
    if (TH_MARK.test(ch) && out.length) out[out.length - 1].full += ch;
    else out.push({ base: ch, full: ch });
  }
  return out;
}
function diacriticConflict(a: string, b: string): string | null {
  const A = clusters(a), B = clusters(b);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      let k = 0;
      while (i + k < A.length && j + k < B.length && A[i + k].base === B[j + k].base && THAI_CHAR.test(A[i + k].base)) k++;
      if (k >= 4) {
        const sa = A.slice(i, i + k).map((c) => c.full).join('');
        const sb = B.slice(j, j + k).map((c) => c.full).join('');
        if (sa !== sb) return `"${a}" (${sa}) ≠ "${b}" (${sb})`;
      }
    }
  }
  return null;
}

// ───────────────────────── การ์ดหน้าแรก ─────────────────────────
type Card = { key: string; city: string; origin: string | null; dates: string; priceTxt: string | null; num: number | null };
const cardsLoc = (page: Page) =>
  page.getByRole('main').getByRole('button').filter({ hasText: DATE_RANGE_RE }).filter({ hasText: PRICE_TOKEN_1 });
async function readCards(page: Page): Promise<Card[]> {
  const cards = cardsLoc(page);
  const n = Math.min(await cards.count(), 30);
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const lines = (await cards.nth(i).innerText().catch(() => '')).split('\n').map((s) => s.trim()).filter((s) => s && s !== '·');
    const di = lines.findIndex((l) => DATE_RANGE_RE.test(l));
    if (di < 0) continue;
    // ชื่อเมืองกับราคาอาจอยู่บรรทัดเดียวกัน (หน้าแรกแบบ landing: "ฮ่องกง ฿5,410") → ตัดราคา/คำว่า "เริ่มต้น" ออกแทนการทิ้งทั้งบรรทัด
    const before = lines
      .slice(0, di)
      .map((l) => l.replace(new RegExp(PRICE_TOKEN_SRC, 'g'), '').replace(/^(เริ่มต้น|ราคาเริ่มต้น|From)\s*$/i, '').replace(/[～~]/g, '').trim())
      .filter((l) => l && !/^(เริ่มต้น|ราคาเริ่มต้น|From)$/i.test(l));
    const city = before[before.length - 1] || '';
    const origin = before.length >= 2 ? before[0] : null;
    const pl = lines.find((l) => PRICE_TOKEN_1.test(l));
    const pt = pl ? (pl.match(PRICE_TOKEN_1) || [null])[0] : null;
    out.push({ key: `${origin ?? ''}>${city}|${lines[di]}`, city, origin, dates: lines[di], priceTxt: pt, num: pt ? toNum(pt.replace(/^US/, '')) : null });
  }
  return out;
}
async function readHomeCities(page: Page, cards: Card[]): Promise<string[]> {
  const set = new Set<string>();
  cards.forEach((c) => { if (c.city) set.add(c.city); if (c.origin) set.add(c.origin); });
  const main = page.getByRole('main');
  const tabs = main.getByRole('tab');
  for (let i = 0, n = await tabs.count(); i < n; i++) {
    const t = (await tabs.nth(i).innerText().catch(() => '')).trim();
    if (t && t.length <= 30 && !t.includes('\n')) set.add(t);
  }
  const links = main.getByRole('link').filter({ has: page.getByRole('img') });
  for (let i = 0, n = Math.min(await links.count(), 30); i < n; i++) {
    const t = (await links.nth(i).innerText().catch(() => '')).trim();
    if (t && t.length <= 30 && !t.includes('\n')) set.add(t);
  }
  return [...set];
}

// ════════════════════════════════════════════════════════════════════════════
test.describe('5.6 ภาษา สกุลเงิน และหน้าแรก', () => {
  // ─────────────────────────────────────────── TC-LOC-01
  test('TC-LOC-01 · เปลี่ยนสกุลเงิน THB → JPY → THB และรีเฟรช', {
    tag: ['@P1', '@5.6'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ข้อ 4) URL-B ต่างจาก URL-A เฉพาะค่า `curr` (THB → JPY) · ค่า `tfs` และ `hl=th` เท่าเดิม' },
      { type: 'คาดหวัง', description: 'E2: (ข้อ 4) หัวผลลัพธ์ยังเป็น เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. และป้ายในหน้ายังเป็นภาษาไทย' },
      { type: 'คาดหวัง', description: 'E3: (ข้อ 4) ทุกราคาในแถว บนแท็บ "ดีที่สุด"/"ถูกที่สุด" และใน aria-label มีหน่วยที่หมายถึงเยน (สัญลักษณ์หรือชื่อสกุลเงิน) ไม่มีราคาที่เป็นตัวเลขเปล่า และไม่มี "฿"/"บาท"/"THB" หลงเหลือในราคาใด · ปุ่มท้ายหน้าแสดงสกุลเงิน JPY' },
      { type: 'คาดหวัง', description: 'E4: (ข้อ 4) ราคา JPY ทุกจุดเป็นจำนวนเต็ม ไม่มีทศนิยม' },
      { type: 'คาดหวัง', description: 'E5: (ข้อ 5) ทุกแถวที่จับคู่ได้ |JPY_i − THB_i × m| ≤ 1 เยน (K-ROUND) และ m > 1 (ตัวเลขเยนต้องมากกว่าตัวเลขบาทเดิม ไม่ใช่เปลี่ยนแค่สัญลักษณ์) · ต้องจับคู่ได้ ≥ 3 แถว ถ้าได้น้อยกว่า = E5 N/A และบันทึกคู่กับ E1-1' },
      { type: 'คาดหวัง', description: 'E6: (ข้อ 5) ลำดับราคาของแถวที่จับคู่ได้คงเดิม: ถ้า THB_i < THB_j แล้ว JPY_i ≤ JPY_j' },
      { type: 'คาดหวัง', description: 'E7: (ข้อ 6) URL-C เท่ากับ URL-B ทุกพารามิเตอร์ · หัวผลลัพธ์เท่ากับ E2 · ป้ายในหน้ายังเป็นภาษาไทย · ทุกราคายังเป็นหน่วยเยนตามเงื่อนไข E3' },
      { type: 'คาดหวัง', description: 'E8: (ข้อ 7) URL-D มี `tfs`, `hl=th` เท่ากับ URL-A และ `curr=THB` · หัวผลลัพธ์เท่ากับ E2' },
      { type: 'คาดหวัง', description: 'E9: (ข้อ 7) ทุกราคามีหน่วยบาท ไม่มีตัวเลขเปล่า ไม่มี "¥"/"เยน"/"JPY" หลงเหลือในราคาใด · ปุ่มท้ายหน้าแสดง THB' },
      { type: 'คาดหวัง', description: 'E10: [O-ยังไม่ยืนยัน] (ข้อ 2, 4, 7) รูปแบบหน่วยในภาษาไทย: THB แสดง "฿" นำหน้าตัวเลขที่มีจุลภาค (เช่น "฿5,900") · JPY แสดง "¥" นำหน้า (เช่น "¥27,636") · aria-label ลงท้ายด้วยชื่อสกุลเงิน (เช่น "เยนญี่ปุ่น")' },
      { type: 'ที่มา', description: `${PLAN} · TC-LOC-01 · R121 R122 R123 R124 R127 · Invariant/Metamorphic · Equivalence partition · State · [O-ยังไม่ยืนยัน] (เฉพาะ E10 · E1–E9 เป็น [R])` },
      { type: 'งบค้นหา', description: '4' },
    ],
  }, async ({ page, gf }) => {
    let urlA = '', urlB = '', urlC = '', urlD = '';
    let tTHB: Row[] = [], tJPY: Row[] = [], tC: Row[] = [], tD: Row[] = [];
    let tabsTHB: Tabs, tabsJPY: Tabs, tabsC: Tabs, tabsD: Tabs;

    await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ตามนิยาม U1 · จด URL เต็มเป็น URL-A', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1' });
      await verifyU1Start(gf, page);
      urlA = page.url();
      note('URL-A', urlA);
    });

    await test.step('2. snapshot: อ่านทุกแถวในรายการชุดแรก จดเป็นตาราง T-THB + ราคาบนแท็บ "ดีที่สุด"/"ถูกที่สุด" + จำนวนแถว · screenshot', async () => {
      tTHB = await readRows(page);
      tabsTHB = await readTabs(page);
      note('T-THB', tTHB.map(rowBrief));
      note('แท็บ (THB)', tabsTHB);
      note('จำนวนแถว THB (ข้อมูล E1-1)', tTHB.length);
      await snap(page, 'step2-T-THB');
    });

    await test.step('3. กดปุ่มท้ายหน้า "สกุลเงิน·THB" → ในป๊อปอัป "เลือกสกุลเงิน" เลือก JPY → กด "ตกลง" (ค้นหาครั้งที่ 2) รอ ≥ 10 วินาที', async () => {
      await changeSetting(gf, page, 2, /JPY$/, 'เปลี่ยนสกุลเงิน THB → JPY');
    });

    await test.step('4. จด URL-B · อ่านหัวผลลัพธ์และปุ่มท้ายหน้า · snapshot อ่านทุกแถวเป็นตาราง T-JPY + แท็บ + จำนวนแถว · ค้นข้อความทั้งหน้าหา "฿", "บาท", "THB" · screenshot', async () => {
      urlB = page.url();
      note('URL-B', urlB);
      tJPY = await readRows(page);
      tabsJPY = await readTabs(page);
      note('T-JPY', tJPY.map(rowBrief));
      note('แท็บ (JPY)', tabsJPY);
      note('จำนวนแถว JPY (ข้อมูล E1-1)', tJPY.length);
      const left = await scanBody(page, /฿|บาท|THB/);
      note('ราคาสกุล THB ที่ค้นพบทั้งหน้า', left);
      await snap(page, 'step4-T-JPY');

      await gf.check('E1 URL-B ต่างจาก URL-A เฉพาะ curr (THB → JPY)', null, async () => {
        expect.soft(diffKeys(urlA, urlB), 'E1: พารามิเตอร์ที่ต่างกัน').toEqual(['curr']);
        expect.soft(urlParams(urlB).p.curr, 'E1: curr ของ URL-B').toBe('JPY');
        expect.soft(urlParams(urlB).p.tfs, 'E1: tfs เท่าเดิม').toBe(urlParams(urlA).p.tfs);
        expect.soft(urlParams(urlB).p.hl, 'E1: hl=th').toBe('th');
      });
      await gf.check('E2 หัวผลลัพธ์คงเดิม และป้ายยังเป็นภาษาไทย', page.getByRole('search').first(), async () => {
        await expectHeaderTh(page, 'E2');
        await expect.soft(page.getByRole('heading', { name: 'ผลการค้นหา' }).first(), 'E2: ป้ายในหน้าเป็นภาษาไทย').toBeVisible();
        expect.soft((await footerLabels(page))[0], 'E2: ปุ่มภาษา').toMatch(FOOT.langTh);
      });
      await gf.check('E3 ทุกราคามีหน่วยเยน ไม่มีตัวเลขเปล่า ไม่มี ฿/บาท/THB · ปุ่มท้ายหน้า JPY', [rowsLoc(page), tabsLoc(page), footerBtn(page, 2)], async () => {
        expect.soft(auditRows(tJPY, UNIT.JPY, /฿|บาท|THB/), 'E3: แถวผลลัพธ์').toEqual([]);
        expect.soft(auditTabs(tabsJPY, UNIT.JPY, /฿|บาท|THB/), 'E3: แท็บดีที่สุด/ถูกที่สุด').toEqual([]);
        expect.soft(left, 'E3: ราคาสกุลบาทที่ค้นพบทั้งหน้า').toEqual([]);
        await expect.soft(footerBtn(page, 2), 'E3: ปุ่มท้ายหน้าสกุลเงิน').toContainText(/JPY/);
      });
      await gf.check('E4 ราคา JPY ทุกจุดเป็นจำนวนเต็ม', rowsLoc(page), async () => {
        const dec = [
          ...tJPY.filter((r) => (r.numRaw && /\./.test(r.numRaw)) || (r.vis && /\d\.\d/.test(r.vis))).map((r) => `แถว ${r.i + 1}: ${r.numRaw} / "${r.vis}"`),
          ...[...priceTokens(tabsJPY.bestText), ...priceTokens(tabsJPY.cheapText), ...priceTokens(tabsJPY.cheapName)].filter((t) => /\d\.\d/.test(t)),
        ];
        expect.soft(dec, 'E4: ราคาที่มีทศนิยม').toEqual([]);
        expect.soft(tJPY.filter((r) => r.num != null).length, 'E4: มีราคา JPY ให้ตรวจ').toBeGreaterThan(0);
      });
    });

    await test.step('5. (ออฟไลน์) จับคู่แถว T-THB กับ T-JPY ด้วย D-LOC-KEY-CUR · คำนวณ r_i = JPY_i ÷ THB_i และ m = มัธยฐาน · ตรวจ |JPY_i − THB_i × m| ≤ 1 · จดแถวที่หาย/เพิ่ม', async () => {
      const A = uniqueBy(tTHB, keyCur), B = uniqueBy(tJPY, keyCur);
      const pairs = [...A.keys()].filter((k) => B.has(k)).map((k) => ({ k, thb: A.get(k)!.num!, jpy: B.get(k)!.num! })).filter((p) => p.thb != null && p.jpy != null && p.thb > 0);
      const lost = [...A.keys()].filter((k) => !B.has(k));
      const added = [...B.keys()].filter((k) => !A.has(k));
      note('E1-1 แถวหาย (THB→JPY)', lost);
      note('E1-1 แถวเพิ่ม (THB→JPY)', added);
      note('E1-1 จำนวนแถว THB/JPY', [tTHB.length, tJPY.length]);
      if (pairs.length < 3) {
        gf.na('E5 อัตราแลกเดียวกันทุกแถว (K-ROUND) และ m > 1', `จับคู่ได้ ${pairs.length} แถว (< 3) · บันทึกคู่กับ E1-1`);
        gf.na('E6 ลำดับราคาของแถวที่จับคู่ได้คงเดิม', `จับคู่ได้ ${pairs.length} แถว (< 3) ตาม E5`);
        return;
      }
      const m = median(pairs.map((p) => p.jpy / p.thb));
      note('E5 m (มัธยฐาน JPY/THB)', m);
      note('E5 คู่ที่จับได้', pairs.map((p) => `${p.k}: ฿${p.thb} → ¥${p.jpy} (r=${(p.jpy / p.thb).toFixed(4)})`));
      await gf.check('E5 ทุกแถวที่จับคู่ได้แปลงด้วยอัตราเดียวกัน (≤ 1 เยน) และ m > 1', rowsLoc(page), async () => {
        const bad = pairs.filter((p) => Math.abs(p.jpy - p.thb * m) > 1).map((p) => `${p.k}: |${p.jpy} − ${p.thb}×${m.toFixed(4)}| = ${Math.abs(p.jpy - p.thb * m).toFixed(2)}`);
        expect.soft(bad, 'E5: คู่ที่เกิน K-ROUND').toEqual([]);
        expect.soft(m, 'E5: m > 1').toBeGreaterThan(1);
      });
      await gf.check('E6 ลำดับราคาของแถวที่จับคู่ได้คงเดิม', rowsLoc(page), async () => {
        const bad: string[] = [];
        for (const a of pairs) for (const b of pairs) if (a.thb < b.thb && a.jpy > b.jpy) bad.push(`${a.k} (฿${a.thb}/¥${a.jpy}) vs ${b.k} (฿${b.thb}/¥${b.jpy})`);
        expect.soft(bad, 'E6: คู่ที่ลำดับกลับ').toEqual([]);
      });
    });

    await test.step('6. กดรีเฟรชหน้า (ค้นหาครั้งที่ 3) รอ ≥ 10 วินาที · จด URL-C · อ่านหัวผลลัพธ์ ปุ่มท้ายหน้า ภาษาของป้าย และหน่วยของทุกราคา', async () => {
      await gf.assertNotBlocked();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await gf.searched('รีเฟรชหน้าผลลัพธ์ (JPY)');
      urlC = page.url();
      note('URL-C', urlC);
      tC = await readRows(page);
      tabsC = await readTabs(page);
      note('T-หลังรีเฟรช', tC.map(rowBrief));
      note('จำนวนแถวหลังรีเฟรช (ข้อมูล E1-1)', tC.length);
      const left = await scanBody(page, /฿|บาท|THB/);
      await gf.check('E7 รีเฟรชแล้ว URL/หัวผลลัพธ์/ภาษา/หน่วยเยนคงอยู่', [page.getByRole('search').first(), rowsLoc(page), footerBtn(page, 2)], async () => {
        expect.soft(diffKeys(urlB, urlC), 'E7: URL-C ต่างจาก URL-B').toEqual([]);
        await expectHeaderTh(page, 'E7');
        await expect.soft(page.getByRole('heading', { name: 'ผลการค้นหา' }).first(), 'E7: ป้ายในหน้าเป็นภาษาไทย').toBeVisible();
        expect.soft((await footerLabels(page))[0], 'E7: ปุ่มภาษา').toMatch(FOOT.langTh);
        expect.soft(auditRows(tC, UNIT.JPY, /฿|บาท|THB/), 'E7: หน่วยราคาแถว (ตาม E3)').toEqual([]);
        expect.soft(auditTabs(tabsC, UNIT.JPY, /฿|บาท|THB/), 'E7: หน่วยราคาแท็บ (ตาม E3)').toEqual([]);
        expect.soft(left, 'E7: ราคาสกุลบาทที่ค้นพบทั้งหน้า').toEqual([]);
        await expect.soft(footerBtn(page, 2), 'E7: ปุ่มท้ายหน้าสกุลเงิน').toContainText(/JPY/);
      });
    });

    await test.step('7. กดปุ่มท้ายหน้า "สกุลเงิน·JPY" → เลือก THB → "ตกลง" (ค้นหาครั้งที่ 4) · จด URL-D · snapshot อ่านราคาทุกแถว ค้นหา "¥", "เยน", "JPY" · screenshot · จบที่ hl=th curr=THB', async () => {
      await changeSetting(gf, page, 2, /THB$/, 'เปลี่ยนสกุลเงิน JPY → THB');
      urlD = page.url();
      note('URL-D', urlD);
      tD = await readRows(page);
      tabsD = await readTabs(page);
      note('T-THB (กลับ)', tD.map(rowBrief));
      note('จำนวนแถว THB กลับ (ข้อมูล E1-1)', tD.length);
      const left = await scanBody(page, /¥|￥|เยน|JPY/);
      await snap(page, 'step7-T-THB-back');

      await gf.check('E8 URL-D tfs/hl=th เท่า URL-A และ curr=THB · หัวผลลัพธ์คงเดิม', page.getByRole('search').first(), async () => {
        const a = urlParams(urlA).p, d = urlParams(urlD).p;
        expect.soft(d.tfs, 'E8: tfs เท่ากับ URL-A').toBe(a.tfs);
        expect.soft(d.hl, 'E8: hl=th').toBe('th');
        expect.soft(d.curr, 'E8: curr=THB').toBe('THB');
        await expectHeaderTh(page, 'E8');
      });
      await gf.check('E9 ทุกราคามีหน่วยบาท ไม่มี ¥/เยน/JPY · ปุ่มท้ายหน้า THB', [rowsLoc(page), tabsLoc(page), footerBtn(page, 2)], async () => {
        expect.soft(auditRows(tD, UNIT.THB, /¥|￥|เยน|JPY/), 'E9: แถวผลลัพธ์').toEqual([]);
        expect.soft(auditTabs(tabsD, UNIT.THB, /¥|￥|เยน|JPY/), 'E9: แท็บ').toEqual([]);
        expect.soft(left, 'E9: ราคาสกุลเยนที่ค้นพบทั้งหน้า').toEqual([]);
        await expect.soft(footerBtn(page, 2), 'E9: ปุ่มท้ายหน้าสกุลเงิน').toContainText(/THB/);
      });
      await gf.check('E10 [O] รูปแบบหน่วยภาษาไทย: ฿5,900 · ¥27,636 · aria-label ลงท้ายชื่อสกุลเงิน', rowsLoc(page), async () => {
        const fmt = (rows: Row[], sym: string, name: string, tag: string) => {
          const p: string[] = [];
          for (const r of rows) {
            if (r.num == null) continue;
            const f = r.num.toLocaleString('en-US');
            if (!r.vis || !r.vis.includes(`${sym}${f}`)) p.push(`${tag} แถว ${r.i + 1}: บนจอ "${r.vis}" ไม่ใช่ "${sym}${f}"`);
            if (!new RegExp(`${r.numRaw}\\s*${name}`).test(r.labelHead)) p.push(`${tag} แถว ${r.i + 1}: aria-label "${r.labelHead}" ไม่ใช่ "<ตัวเลข> ${name}"`);
          }
          return p;
        };
        expect.soft(fmt(tTHB, '฿', 'บาทไทย', 'ข้อ 2'), 'E10: THB ข้อ 2').toEqual([]);
        expect.soft(fmt(tJPY, '¥', 'เยนญี่ปุ่น', 'ข้อ 4'), 'E10: JPY ข้อ 4').toEqual([]);
        expect.soft(fmt(tD, '฿', 'บาทไทย', 'ข้อ 7'), 'E10: THB ข้อ 7').toEqual([]);
      });
    });

    gf.finishNA();
  });

  // ─────────────────────────────────────────── TC-LOC-02
  test('TC-LOC-02 · เปลี่ยนประเทศและภาษาแล้วเงื่อนไขกับสกุลเงินคงเดิม', {
    tag: ['@P1', '@5.6'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ข้อ 2) URL-B มี `gl=JP` เพิ่ม · `tfs`, `hl=th`, `curr=THB` เท่ากับ URL-A' },
      { type: 'คาดหวัง', description: 'E2: (ข้อ 2) หัวผลลัพธ์เท่ากับข้อ 1 (เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.) · ปุ่มสถานที่ตั้งแสดงญี่ปุ่น ปุ่มภาษาแสดงไทย' },
      { type: 'คาดหวัง', description: 'E3: (ข้อ 2) สกุลเงินยังเป็น THB: ปุ่มท้ายหน้าแสดง THB · ทุกราคามีหน่วยบาท ไม่มีตัวเลขเปล่า ไม่มี "¥"/"เยน"/"JPY" (เปลี่ยนประเทศต้องไม่เปลี่ยนสกุลเงินที่ตั้งไว้ใน URL)' },
      { type: 'คาดหวัง', description: 'E4: (ข้อ 3) URL-C ต่างจาก URL-B เฉพาะ `hl` (th → ja) · `tfs`, `curr=THB`, `gl=JP` เท่าเดิม' },
      { type: 'คาดหวัง', description: 'E5: (ข้อ 3) หัวผลลัพธ์/ฟอร์มเป็นภาษาญี่ปุ่นและสื่อเงื่อนไขเดิมครบ 5 อย่าง: เที่ยวเดียว · ผู้โดยสาร 1 · ชั้นประหยัด · กรุงเทพ → โตเกียว · วันอังคาร 15 ธ.ค. · ไม่มีตัวอักษรไทยหลงเหลือในข้อความแถว' },
      { type: 'คาดหวัง', description: 'E6: (ข้อ 3) สกุลเงินยังเป็น THB ทั้งที่ภาษา = 日本語 และประเทศ = ญี่ปุ่น: ปุ่มท้ายหน้าแสดง THB · ทุกราคาและ aria-label มีหน่วยที่หมายถึงบาท ไม่มีตัวเลขเปล่า ไม่มี "¥"/"円"/"JPY"/"$"' },
      { type: 'คาดหวัง', description: 'E7: (ข้อ 3) แถวอ้างอิงที่จับคู่ได้ระหว่างข้อ 2 กับข้อ 3 (ประเทศเดียวกัน ต่างแค่ภาษา) มีตัวเลขราคาเท่ากันทุกแถว · ถ้าจับคู่ได้ < 3 แถว = E7 N/A' },
      { type: 'คาดหวัง', description: 'E8: (ข้อ 4) URL-D ไม่มี `gl` และมี `hl=th`, `curr=THB` · ปุ่มท้ายหน้าแสดง ภาษาไทย / ไทย / THB · หัวผลลัพธ์เท่ากับข้อ 1' },
      { type: 'คาดหวัง', description: 'E9: [O-ยังไม่ยืนยัน] (ข้อ 3) รูปแบบ THB ในภาษา 日本語 เป็น "THB" นำหน้าตัวเลข (เช่น "THB 5,410") ไม่ใช่ "฿"' },
      { type: 'ที่มา', description: `${PLAN} · TC-LOC-02 · R123 R124 · Equivalence partition · State · Invariant/Metamorphic · [O-ยังไม่ยืนยัน] (เฉพาะ E9 · E1–E8 เป็น [R])` },
      { type: 'งบค้นหา', description: '4' },
    ],
  }, async ({ page, gf }) => {
    let urlA = '', urlB = '', urlC = '', urlD = '';
    let tB: Row[] = [], tC: Row[] = [];
    let refs: { r: Row; key: string; fns: string[] | null }[] = [];

    await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ · จด URL-A', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1' });
      await verifyU1Start(gf, page);
      urlA = page.url();
      note('URL-A', urlA);
    });

    await test.step('2. กดปุ่มท้ายหน้า "สถานที่ตั้ง·ไทย" → เลือก ญี่ปุ่น → "ตกลง" (ค้นหาครั้งที่ 2) · จด URL-B · อ่านหัวผลลัพธ์และปุ่มท้ายหน้า · อ่านราคาทุกแถว · เลือกแถวอ้างอิง 5 แถวแรก · screenshot', async () => {
      await changeSetting(gf, page, 1, /^ญี่ปุ่น$/, 'เปลี่ยนสถานที่ตั้ง ไทย → ญี่ปุ่น');
      urlB = page.url();
      note('URL-B', urlB);
      tB = await readRows(page);
      note('แถวข้อ 2 (gl=JP, ไทย)', tB.map(rowBrief));
      // แถวอ้างอิง 5 แถวแรก + D-LOC-KEY-LANG (คีย์ซ้ำ → ขยายแถวเพิ่มเลขเที่ยวบิน)
      const cnt = new Map<string, number>();
      tB.forEach((r) => cnt.set(keyLang(r), (cnt.get(keyLang(r)) || 0) + 1));
      for (const r of tB.slice(0, 5)) {
        const k = keyLang(r);
        const fns = (cnt.get(k) || 0) > 1 ? (await expandRead(gf, page, r.i)).flightNos : null;
        refs.push({ r, key: k, fns });
      }
      note('แถวอ้างอิง (D-LOC-KEY-LANG + ราคา)', refs.map((x) => `${x.key}${x.fns ? ' ' + x.fns.join('+') : ''} = ${x.r.num}`));
      await snap(page, 'step2-gl-JP');

      await gf.check('E1 URL-B มี gl=JP เพิ่ม · tfs/hl=th/curr=THB เท่า URL-A', null, async () => {
        const a = urlParams(urlA).p, b = urlParams(urlB).p;
        expect.soft(b.gl, 'E1: gl=JP').toBe('JP');
        expect.soft(b.tfs, 'E1: tfs').toBe(a.tfs);
        expect.soft(b.hl, 'E1: hl=th').toBe('th');
        expect.soft(b.curr, 'E1: curr=THB').toBe('THB');
      });
      await gf.check('E2 หัวผลลัพธ์เท่าข้อ 1 · ปุ่มสถานที่ตั้ง = ญี่ปุ่น · ปุ่มภาษา = ไทย', [page.getByRole('search').first(), footerBtn(page, 0), footerBtn(page, 1)], async () => {
        await expectHeaderTh(page, 'E2');
        const f = await footerLabels(page);
        note('ป้ายท้ายหน้าข้อ 2', f);
        expect.soft(f[1], 'E2: ปุ่มสถานที่ตั้ง').toMatch(/ญี่ปุ่น/);
        expect.soft(f[0], 'E2: ปุ่มภาษา').toMatch(/ไทย/);
      });
      await gf.check('E3 สกุลเงินยังเป็น THB · ทุกราคามีหน่วยบาท ไม่มี ¥/เยน/JPY', [rowsLoc(page), footerBtn(page, 2)], async () => {
        await expect.soft(footerBtn(page, 2), 'E3: ปุ่มท้ายหน้าสกุลเงิน').toContainText(/THB/);
        expect.soft(auditRows(tB, UNIT.THB, /¥|￥|เยน|JPY/), 'E3: แถวผลลัพธ์').toEqual([]);
        expect.soft(await scanBody(page, /¥|￥|เยน|JPY/), 'E3: ราคาสกุลเยนทั้งหน้า').toEqual([]);
      });
    });

    await test.step('3. กดปุ่มท้ายหน้า "ภาษา·ไทย" → เลือก 日本語 → กดปุ่มยืนยัน (ค้นหาครั้งที่ 3) · จด URL-C · อ่านหัวผลลัพธ์/ฟอร์ม ปุ่มท้ายหน้า ราคาและ aria-label · หาแถวอ้างอิง · ค้นหา "¥", "円", "JPY", "$" และอักษรไทย · screenshot', async () => {
      await changeSetting(gf, page, 0, /^日本語/, 'เปลี่ยนภาษา ไทย → 日本語');
      urlC = page.url();
      note('URL-C', urlC);
      tC = await readRows(page);
      note('แถวข้อ 3 (gl=JP, 日本語)', tC.map(rowBrief));
      // จับคู่แถวอ้างอิง
      const matched: { key: string; b: number; c: number }[] = [];
      const cntC = new Map<string, number>();
      tC.forEach((r) => cntC.set(keyLang(r), (cntC.get(keyLang(r)) || 0) + 1));
      for (const ref of refs) {
        const cands = tC.filter((r) => keyLang(r) === ref.key);
        if (cands.length === 1 && !ref.fns) { matched.push({ key: ref.key, b: ref.r.num!, c: cands[0].num! }); continue; }
        const fnsRef = ref.fns;
        // ข้อ 2 คีย์ไม่ซ้ำแต่ข้อ 3 คีย์ซ้ำ → ไม่มีเลขเที่ยวบินของแถวอ้างอิงให้เทียบ จึงไม่นับเป็นคู่
        if (!fnsRef) { note('E7 แถวอ้างอิงที่คีย์ซ้ำในข้อ 3 (ไม่นับคู่)', ref.key); continue; }
        for (const c of cands.slice(0, 3)) {
          const e = await expandRead(gf, page, c.i);
          if (fnsRef && sameFns(e.flightNos, fnsRef)) { matched.push({ key: `${ref.key} ${fnsRef.join('+')}`, b: ref.r.num!, c: c.num! }); break; }
        }
      }
      note('E7 คู่แถวอ้างอิงที่จับได้', matched);
      const thaiLeft = tC.filter((r) => THAI_CHAR.test(r.text)).map((r) => `แถว ${r.i + 1}: ${(r.text.match(new RegExp(`.{0,10}${THAI_CHAR.source}.{0,10}`)) || [''])[0]}`);
      const bodyTokens = await scanBody(page, /¥|￥|円|JPY|\$/);
      await snap(page, 'step3-ja-gl-JP');

      await gf.check('E4 URL-C ต่างจาก URL-B เฉพาะ hl (th → ja)', null, async () => {
        const b = urlParams(urlB).p, c = urlParams(urlC).p;
        expect.soft(diffKeys(urlB, urlC), 'E4: พารามิเตอร์ที่ต่างกัน').toEqual(['hl']);
        expect.soft(c.hl, 'E4: hl=ja').toBe('ja');
        expect.soft(c.tfs, 'E4: tfs').toBe(b.tfs);
        expect.soft(c.curr, 'E4: curr=THB').toBe('THB');
        expect.soft(c.gl, 'E4: gl=JP').toBe('JP');
      });
      await gf.check('E5 หัวผลลัพธ์ภาษาญี่ปุ่นสื่อเงื่อนไขเดิมครบ 5 อย่าง · ไม่มีอักษรไทยในแถว', [page.getByRole('search').first(), rowsLoc(page)], async () => {
        await expectHeaderJa(page, 'E5');
        expect.soft(thaiLeft, 'E5: แถวที่มีอักษรไทยหลงเหลือ').toEqual([]);
      });
      await gf.check('E6 สกุลเงินยังเป็น THB (ภาษา 日本語 + ประเทศ ญี่ปุ่น) · ไม่มี ¥/円/JPY/$', [rowsLoc(page), footerBtn(page, 2)], async () => {
        await expect.soft(footerBtn(page, 2), 'E6: ปุ่มท้ายหน้าสกุลเงิน').toContainText(/THB/);
        expect.soft(auditRows(tC, UNIT.THB, /¥|￥|円|JPY|\$/), 'E6: ราคาและ aria-label ทุกแถว').toEqual([]);
        expect.soft(bodyTokens, 'E6: ราคาสกุลอื่นทั้งหน้า').toEqual([]);
      });
      if (matched.length < 3) {
        gf.na('E7 แถวอ้างอิงราคาเท่ากันข้ามภาษา', `จับคู่ได้ ${matched.length} แถว (< 3)`);
      } else {
        await gf.check('E7 แถวอ้างอิงที่จับคู่ได้มีตัวเลขราคาเท่ากันทุกแถว', rowsLoc(page), async () => {
          expect.soft(matched.filter((m) => m.b !== m.c).map((m) => `${m.key}: ${m.b} ≠ ${m.c}`), 'E7: คู่ที่ราคาต่าง').toEqual([]);
        });
      }
      await gf.check('E9 [O] THB ในภาษา 日本語 เป็น "THB" นำหน้าตัวเลข ไม่ใช่ "฿"', rowsLoc(page), async () => {
        const bad = tC.filter((r) => r.num != null && (!r.vis || !/THB\s?\d/.test(r.vis) || /฿/.test(r.vis))).map((r) => `แถว ${r.i + 1}: "${r.vis}"`);
        expect.soft(bad, 'E9: แถวที่รูปแบบไม่ใช่ "THB 5,410"').toEqual([]);
      });
    });

    await test.step('4. เปิด U1 (ค้นหาครั้งที่ 4) รอ ≥ 10 วินาที · จด URL-D · อ่านปุ่มท้ายหน้าและหัวผลลัพธ์ · จบ test ที่ hl=th curr=THB', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 เพื่อกลับค่าเดิม' });
      urlD = page.url();
      note('URL-D', urlD);
      await gf.check('E8 URL-D ไม่มี gl · hl=th curr=THB · ท้ายหน้า ไทย/ไทย/THB · หัวผลลัพธ์เท่าข้อ 1', [page.getByRole('search').first(), footer(page).getByRole('button').first()], async () => {
        const d = urlParams(urlD).p;
        expect.soft(d.gl, 'E8: ไม่มี gl').toBeUndefined();
        expect.soft(d.hl, 'E8: hl=th').toBe('th');
        expect.soft(d.curr, 'E8: curr=THB').toBe('THB');
        await expectFooterDefault(page, 'E8');
        await expectHeaderTh(page, 'E8');
      });
    });

    gf.finishNA();
  });

  // ─────────────────────────────────────────── TC-LOC-03
  test('TC-LOC-03 · ⚠️ ชื่อสายการบินข้ามภาษา ป้ายท้ายหน้า และการ์ดหน้าแรก', {
    tag: ['@P1', '@5.6', '@known-defect'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ข้อ 1, 3, 4) R125: ทุกแถวอ้างอิงที่พบครบ 3 ภาษา ชื่อสายการบินภาษาไทยและภาษาญี่ปุ่นเป็นคำแปล/ทับศัพท์ของชื่อภาษาอังกฤษที่ครบทุกส่วนที่แยกแบรนด์ (เช่น ถ้าอังกฤษเป็น "Thai AirAsia X" ชื่อไทยต้องมีส่วนที่หมายถึง "ไทย" "แอร์เอเชีย" และ "เอ็กซ์") ไม่ใช่ชื่อแบรนด์อื่นในเครือเดียวกัน ("แอร์เอเชีย" ≠ "Thai AirAsia X")' },
      { type: 'คาดหวัง', description: 'E2: (ข้อ 1) R125: ในภาษาไทย ชื่อสายการบินในแถวสรุป = ชื่อในแถวขยายของแถวเดียวกัน และแถวอ้างอิงที่เลขเที่ยวบินขึ้นต้นด้วยรหัส 2 ตัวเดียวกันมีชื่อภาษาไทยเหมือนกันทุกตัวอักษร' },
      { type: 'คาดหวัง', description: 'E3: (ข้อ 1) R125: ในรายชื่อสายการบินภาษาไทยของรายการชุดแรก คำที่เป็นชื่อแบรนด์เดียวกันสะกดเหมือนกันทุกชื่อ ไม่มีคู่ที่ต่างกันแค่วรรณยุกต์หรือสระ (เช่น "เจ็ท" กับ "เจ๊ท")' },
      { type: 'คาดหวัง', description: 'E4: (ข้อ 2–4) R126: ในแต่ละภาษา ป้ายปุ่มสถานที่ตั้งท้ายหน้ากับหัวข้อป๊อปอัปที่ปุ่มนั้นเปิดหมายถึงสิ่งเดียวกัน (ประเทศ / ภูมิภาค / สถานที่ตั้ง)' },
      { type: 'คาดหวัง', description: 'E5: (ข้อ 2–4) R126: ป้ายปุ่มท้ายหน้าทั้ง 3 ปุ่มในภาษาอังกฤษและภาษาญี่ปุ่นมีความหมายตรงกับภาษาไทย (ภาษา · สถานที่ตั้ง · สกุลเงิน) ไม่มีปุ่มใดแปลเป็นคำที่หมายถึงสิ่งอื่น (เช่น "แผนที่")' },
      { type: 'คาดหวัง', description: 'E6: (ข้อ 5) R133: ชื่อเมืองในการ์ด/แท็บหน้าแรกเป็นชื่อเมืองที่คนทั่วไปใช้ ไม่มีคำนำหน้าเขตปกครองตาม D-LOC-ADMIN และสะกดครบวรรณยุกต์ (เช่น "เซี่ยงไฮ้" ไม่ใช่ "เซี่ยงไฮ")' },
      { type: 'คาดหวัง', description: 'E7: (ข้อ 6) R128: ทุกการ์ดที่ชื่อเมืองและช่วงวันที่ตรงกันระหว่างข้อ 5 กับข้อ 6: หน่วยเป็นดอลลาร์สหรัฐ ไม่มี "฿" · ตัวเลข USD < ตัวเลข THB เดิม (1 ดอลลาร์มีค่ามากกว่า 1 บาท ตัวเลขต้องไม่เท่าเดิม) · |USD_i − THB_i ÷ m| ≤ 1 เมื่อ m = มัธยฐานของ THB_i ÷ USD_i (K-ROUND ใช้กับการ์ด) · ถ้าจับคู่ได้ 0 การ์ด = E7 N/A' },
      { type: 'คาดหวัง', description: 'E8: (ข้อ 7) ปุ่มท้ายหน้าแสดง ภาษาไทย และ THB · ราคาการ์ดทุกใบมีหน่วยบาท' },
      { type: 'ที่มา', description: `${PLAN} · TC-LOC-03 · R125⚠️ R126⚠️ R128⚠️ R133⚠️ · Equivalence partition · Invariant/Metamorphic · [R] · คาดว่าจะล้ม (TEST-PLAN 6.5)` },
      { type: 'งบค้นหา', description: '4' },
    ],
  }, async ({ page, gf }) => {
    type Ref = {
      dep: string; arr: string; plus: number; from: string; to: string; fns: string[];
      name: Record<Lang, string | null>; legs: Record<Lang, string[] | null>;
    };
    const refs: Ref[] = [];
    let thNames: string[] = [];
    const footers: Partial<Record<Lang, string[]>> = {};
    let cards5: Card[] = [], cards6: Card[] = [];

    /** อ่านหัวข้อป๊อปอัปสถานที่ตั้งแล้วกดยกเลิก + ตรวจ E4 ของภาษานั้น */
    const locPopup = async (lang: Lang) => {
      footers[lang] = await footerLabels(page);
      note(`ป้ายปุ่มท้ายหน้า (${lang})`, footers[lang]);
      await gf.click(footerBtn(page, 1));
      const dlg = settingDialog(page);
      await dlg.waitFor({ state: 'visible', timeout: 15_000 });
      const heading = dlg.getByRole('heading').first();
      const title = (await heading.innerText().catch(() => '')).trim();
      note(`หัวข้อป๊อปอัปสถานที่ตั้ง (${lang})`, title);
      if (lang === 'ja') await snap(page, 'step4-ja-location-popup');
      await gf.check(`E4 (${lang}) ป้ายปุ่มสถานที่ตั้งกับหัวข้อป๊อปอัปหมายถึงสิ่งเดียวกัน`, [heading, footerBtn(page, 1)], async () => {
        const btn = labelKey(footers[lang]![1]);
        expect.soft(btn, `E4 (${lang}): ป้ายปุ่ม "${btn}" หมายถึง ประเทศ/ภูมิภาค/สถานที่ตั้ง`).toMatch(CONCEPT.loc[lang]);
        expect.soft(title, `E4 (${lang}): หัวข้อป๊อปอัป "${title}" หมายถึง ประเทศ/ภูมิภาค/สถานที่ตั้ง`).toMatch(CONCEPT.loc[lang]);
      });
      await gf.click(dlg.getByRole('button', { name: CANCEL_RE }));
    };

    /** หาแถวอ้างอิงเดิมด้วยเวลา (24 ชม.) + สนามบิน แล้วยืนยันด้วยเลขเที่ยวบินในแถวขยาย */
    const findRefs = async (lang: Lang) => {
      const rows = await readRows(page);
      note(`แถวชุดแรก (${lang})`, rows.map(rowBrief));
      for (const ref of refs) {
        const cands = rows.filter((r) => r.dep === ref.dep && r.arr === ref.arr && r.plus === ref.plus && r.from === ref.from && r.to === ref.to).slice(0, 3);
        for (const c of cands) {
          const e = await expandRead(gf, page, c.i);
          if (sameFns(e.flightNos, ref.fns)) { ref.name[lang] = c.airline; ref.legs[lang] = e.legs.map((l) => l.airline); break; }
        }
      }
      note(`แถวอ้างอิง (${lang})`, refs.map((r) => `${r.fns.join('+')}: ${r.name[lang]} / ขยาย: ${r.legs[lang]?.join(', ')}`));
    };

    await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) · ตรวจหัวผลลัพธ์ · เลือกแถวอ้างอิงตาม D-LOC-REF · กด ˅ ขยายแต่ละแถว จดเวลา/รหัสสนามบิน/เลขเที่ยวบิน/ชื่อสายการบิน · จดชื่อสายการบินภาษาไทยทุกชื่อที่ไม่ซ้ำ', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1' });
      await verifyU1Start(gf, page);
      const rows = await readRows(page);
      note('แถวชุดแรก (th)', rows.map(rowBrief));
      thNames = [...new Set(rows.map((r) => r.airline).filter((a): a is string => !!a))];
      note('ชื่อสายการบินภาษาไทยที่ไม่ซ้ำ', thNames);
      // D-LOC-REF: บินตรง ≤ 3 แถว ต่างสายการบิน (DMK 10:25 เป็นแถวแรกถ้ามี) · ไม่ครบ 3 → เติมแถวแวะ 1 ครั้งบนสุดที่เป็นสายการบินอื่น
      const picked: Row[] = [];
      const direct = rows.filter((r) => r.stops === 0);
      const dmk = direct.find((r) => r.from === 'DMK' && r.dep === '10:25');
      if (dmk) picked.push(dmk);
      for (const r of direct) { if (picked.length >= 3) break; if (!picked.includes(r) && !picked.some((p) => p.airline === r.airline)) picked.push(r); }
      for (const r of rows.filter((x) => x.stops === 1)) { if (picked.length >= 3) break; if (!picked.some((p) => p.airline === r.airline)) picked.push(r); }
      for (const r of picked) {
        const e = await expandRead(gf, page, r.i);
        if (!r.dep || !r.arr || !r.from || !r.to || e.flightNos.length === 0) { note('แถวอ้างอิงที่อ่านไม่ครบ (ข้าม)', rowBrief(r)); continue; }
        refs.push({
          dep: r.dep, arr: r.arr, plus: r.plus, from: r.from, to: r.to, fns: e.flightNos,
          name: { th: r.airline, en: null, ja: null }, legs: { th: e.legs.map((l) => l.airline), en: null, ja: null },
        });
      }
      note('แถวอ้างอิง (th)', refs.map((r) => `${r.from}-${r.to} ${r.dep}–${r.arr}+${r.plus} ${r.fns.join('+')}: สรุป "${r.name.th}" / ขยาย "${r.legs.th?.join(', ')}"`));

      await gf.check('E3 ชื่อแบรนด์ภาษาไทยสะกดเหมือนกันทุกชื่อ (ไม่ต่างแค่วรรณยุกต์/สระ)', rowsLoc(page), async () => {
        const bad: string[] = [];
        for (let i = 0; i < thNames.length; i++) for (let j = i + 1; j < thNames.length; j++) {
          const c = diacriticConflict(thNames[i], thNames[j]);
          if (c) bad.push(c);
        }
        expect.soft(bad, 'E3: คู่ชื่อที่สะกดต่างกันแค่วรรณยุกต์/สระ').toEqual([]);
      });
    });

    await test.step('2. กดปุ่มท้ายหน้า "สถานที่ตั้ง·ไทย" อ่านหัวข้อป๊อปอัป แล้วกด "ยกเลิก" · จดป้ายปุ่มท้ายหน้าทั้ง 3 ปุ่ม', async () => {
      await locPopup('th');
    });

    await test.step('3. กดปุ่มท้ายหน้า "ภาษา·ไทย" → English (United States) → "ตกลง" (ค้นหาครั้งที่ 2) · หาแถวอ้างอิงเดิม จดชื่อสายการบิน · อ่านหัวข้อป๊อปอัปสถานที่ตั้งแล้วยกเลิก · จดป้ายปุ่มท้ายหน้า', async () => {
      await changeSetting(gf, page, 0, /^English \(United States\)/, 'เปลี่ยนภาษา ไทย → English (United States)');
      await findRefs('en');
      await locPopup('en');
      await gf.check('E5 (en) ป้ายปุ่มท้ายหน้าทั้ง 3 ปุ่มความหมายตรงกับภาษาไทย', footer(page).getByRole('button').first(), async () => {
        const f = footers.en!;
        expect.soft(labelKey(f[0]), 'E5 (en): ปุ่มภาษา').toMatch(CONCEPT.lang.en);
        expect.soft(labelKey(f[1]), 'E5 (en): ปุ่มสถานที่ตั้ง').toMatch(CONCEPT.loc.en);
        expect.soft(labelKey(f[2]), 'E5 (en): ปุ่มสกุลเงิน').toMatch(CONCEPT.cur.en);
      });
    });

    await test.step('4. กดปุ่มท้ายหน้าภาษา → 日本語 → กดปุ่มยืนยัน (ค้นหาครั้งที่ 3) · ทำแบบข้อ 3 ทุกอย่าง · screenshot ท้ายหน้าและป๊อปอัปสถานที่ตั้ง', async () => {
      await changeSetting(gf, page, 0, /^日本語/, 'เปลี่ยนภาษา English → 日本語');
      await findRefs('ja');
      await footer(page).scrollIntoViewIfNeeded().catch(() => {});
      await snap(page, 'step4-ja-footer');
      await locPopup('ja');
      await gf.check('E5 (ja) ป้ายปุ่มท้ายหน้าทั้ง 3 ปุ่มความหมายตรงกับภาษาไทย', footer(page).getByRole('button').first(), async () => {
        const f = footers.ja!;
        expect.soft(labelKey(f[0]), 'E5 (ja): ปุ่มภาษา').toMatch(CONCEPT.lang.ja);
        expect.soft(labelKey(f[1]), 'E5 (ja): ปุ่มสถานที่ตั้ง (ห้ามเป็นคำที่หมายถึงสิ่งอื่น เช่น 地図 = แผนที่)').toMatch(CONCEPT.loc.ja);
        expect.soft(labelKey(f[2]), 'E5 (ja): ปุ่มสกุลเงิน').toMatch(CONCEPT.cur.ja);
      });

      // E1 E2 (ข้อมูลจากข้อ 1, 3, 4)
      const full = refs.filter((r) => r.name.th && r.name.en && r.name.ja);
      note('แถวอ้างอิงที่พบครบ 3 ภาษา', full.map((r) => `${r.fns.join('+')}: th="${r.name.th}" en="${r.name.en}" ja="${r.name.ja}"`));
      if (full.length === 0) {
        gf.na('E1 ชื่อสายการบินไทย/ญี่ปุ่นครบทุกส่วนของแบรนด์อังกฤษ', 'ไม่มีแถวอ้างอิงใดพบครบ 3 ภาษา');
        gf.na('E2 ชื่อในแถวสรุป = แถวขยาย และรหัสเดียวกันชื่อเดียวกัน', 'ไม่มีแถวอ้างอิงใดพบครบ 3 ภาษา');
      } else {
        await gf.check('E1 ชื่อสายการบินไทย/ญี่ปุ่นเป็นคำแปลครบทุกส่วนของแบรนด์อังกฤษ', rowsLoc(page), async () => {
          const bad: string[] = [], unk: string[] = [];
          for (const r of full) {
            const names: [Lang, string][] = [['th', r.name.th!], ['ja', r.name.ja!]];
            (r.legs.th || []).forEach((n, k) => { const en = r.legs.en?.[k]; if (en) { const m = brandMissing(en, n, 'th'); if (m.missing.length) bad.push(`${r.fns[k]} ขยาย th "${n}" ขาด [${m.missing.join(', ')}] ของ "${en}"`); } });
            for (const [lg, n] of names) {
              const m = brandMissing(r.name.en!, n, lg as 'th' | 'ja');
              if (m.missing.length) bad.push(`${r.fns.join('+')} ${lg} "${n}" ขาดส่วน [${m.missing.join(', ')}] ของ "${r.name.en}"`);
              if (m.unknown.length) unk.push(`${lg} "${n}" ↔ "${r.name.en}": [${m.unknown.join(', ')}]`);
            }
          }
          if (unk.length) note('E1 ส่วนแบรนด์ที่ตัดสินอัตโนมัติไม่ได้ (ตรวจด้วยตาจากภาพ)', unk);
          expect.soft(bad, 'E1: ชื่อที่ขาดส่วนของแบรนด์').toEqual([]);
        });
        await gf.check('E2 (ไทย) ชื่อแถวสรุป = แถวขยาย · รหัส 2 ตัวเดียวกันชื่อเหมือนกันทุกตัวอักษร', rowsLoc(page), async () => {
          const bad: string[] = [];
          const byCode = new Map<string, Set<string>>();
          for (const r of full) {
            for (const n of r.legs.th || []) if (!(r.name.th || '').includes(n)) bad.push(`${r.fns.join('+')}: แถวสรุป "${r.name.th}" ≠ แถวขยาย "${n}"`);
            r.fns.forEach((fn, k) => {
              const code = fn.slice(0, 2);
              const n = r.legs.th?.[k];
              if (n) { if (!byCode.has(code)) byCode.set(code, new Set()); byCode.get(code)!.add(n); }
            });
          }
          for (const [code, set] of byCode) if (set.size > 1) bad.push(`รหัส ${code}: ชื่อไทยไม่ตรงกัน [${[...set].join(' / ')}]`);
          expect.soft(bad, 'E2: ความไม่ตรงกัน').toEqual([]);
        });
      }
    });

    await test.step('5. เปิด U0 (หน้าแรก ไม่นับงบ) · อ่านชื่อเมืองทุกชื่อในการ์ดราคา/แท็บจุดหมาย และจดชุด (ชื่อเมือง · ช่วงวันที่ · ราคา THB) · จดชื่อแท็บ (title) · screenshot', async () => {
      await gf.goto(U0);
      await page.getByRole('main').first().waitFor({ timeout: 30_000 }).catch(() => {});
      cards5 = await readCards(page);
      note('ชื่อแท็บหน้าแรก ข้อ 5 (Q33 Q36)', await page.title());
      note('การ์ดข้อ 5 (THB)', cards5.map((c) => `${c.key} = ${c.priceTxt}`));
      const cities = await readHomeCities(page, cards5);
      note('ชื่อเมืองบนหน้าแรก', cities);
      await snap(page, 'step5-home-THB');
      await gf.check('E6 ชื่อเมืองหน้าแรกไม่มีคำนำหน้าเขตปกครองและสะกดครบวรรณยุกต์', [cardsLoc(page), page.getByRole('main').getByRole('tab')], async () => {
        expect.soft(cities.length, 'E6: มีชื่อเมืองให้ตรวจ').toBeGreaterThan(0);
        expect.soft(cities.filter((c) => ADMIN_RE.test(c)), 'E6: ชื่อที่มีคำนำหน้าเขตปกครอง (D-LOC-ADMIN)').toEqual([]);
        const sp: string[] = [];
        for (const c of cities) for (const m of MISSPELL) if (m.re.test(c)) sp.push(`"${c}" ควรเป็น "${m.right}"`);
        expect.soft(sp, 'E6: ชื่อที่สะกดขาดวรรณยุกต์').toEqual([]);
      });
    });

    await test.step('6. กดปุ่มท้ายหน้า "สกุลเงิน·THB" → เลือก USD → "ตกลง" (ค้นหาครั้งที่ 4) · จดชุด (ชื่อเมือง · ช่วงวันที่ · ราคา) ของทุกการ์ด · จดชื่อแท็บ · screenshot', async () => {
      await changeSetting(gf, page, 2, /USD$/, 'เปลี่ยนสกุลเงินบนหน้าแรก THB → USD (การ์ดโหลดใหม่)');
      cards6 = await readCards(page);
      note('ชื่อแท็บหน้าแรก ข้อ 6 (Q33 Q36)', await page.title());
      note('การ์ดข้อ 6 (USD)', cards6.map((c) => `${c.key} = ${c.priceTxt}`));
      await snap(page, 'step6-home-USD');
      if (cards5.length === 0) {
        gf.na('E7 การ์ดหน้าแรกแปลงเป็น USD ด้วยอัตราเดียวกัน', 'หน้าแรกไม่มีการ์ดราคา');
        return;
      }
      const m6 = new Map(cards6.map((c) => [c.key, c]));
      const pairs = cards5.filter((c) => m6.has(c.key) && c.num != null && m6.get(c.key)!.num != null).map((c) => ({ k: c.key, thb: c.num!, usd: m6.get(c.key)!.num!, usdTxt: m6.get(c.key)!.priceTxt || '' }));
      note('E7 คู่การ์ดที่จับได้', pairs);
      if (pairs.length === 0) {
        gf.na('E7 การ์ดหน้าแรกแปลงเป็น USD ด้วยอัตราเดียวกัน', 'จับคู่การ์ด (ชื่อเมือง + ช่วงวันที่) ได้ 0 การ์ด');
        return;
      }
      await gf.check('E7 การ์ดที่จับคู่ได้: หน่วย USD ไม่มี ฿ · ตัวเลข USD < THB · |USD − THB ÷ m| ≤ 1', cardsLoc(page), async () => {
        const unit = pairs.filter((p) => !UNIT.USD.test(p.usdTxt) || /฿/.test(p.usdTxt)).map((p) => `${p.k}: "${p.usdTxt}"`);
        expect.soft(unit, 'E7: การ์ดที่หน่วยไม่ใช่ดอลลาร์สหรัฐ / มี ฿').toEqual([]);
        expect.soft(pairs.filter((p) => !(p.usd < p.thb)).map((p) => `${p.k}: USD ${p.usd} ≥ THB ${p.thb}`), 'E7: ตัวเลข USD ต้องน้อยกว่าตัวเลข THB เดิม').toEqual([]);
        const m = median(pairs.map((p) => p.thb / p.usd));
        note('E7 m (มัธยฐาน THB/USD)', m);
        expect.soft(pairs.filter((p) => Math.abs(p.usd - p.thb / m) > 1).map((p) => `${p.k}: |${p.usd} − ${p.thb}/${m.toFixed(3)}| = ${Math.abs(p.usd - p.thb / m).toFixed(2)}`), 'E7: การ์ดที่เกิน K-ROUND').toEqual([]);
      });
    });

    await test.step('7. เปิด U0 อีกครั้ง (ไม่นับงบ) เพื่อกลับ hl=th curr=THB · อ่านปุ่มท้ายหน้าและหน่วยราคาการ์ด · จบ test', async () => {
      await gf.goto(U0);
      await page.getByRole('main').first().waitFor({ timeout: 30_000 }).catch(() => {});
      const cards7 = await readCards(page);
      note('การ์ดข้อ 7', cards7.map((c) => `${c.key} = ${c.priceTxt}`));
      await gf.check('E8 ท้ายหน้า ภาษาไทย และ THB · ราคาการ์ดทุกใบมีหน่วยบาท', [footerBtn(page, 0), footerBtn(page, 2), cardsLoc(page)], async () => {
        const f = await footerLabels(page);
        expect.soft(f[0], 'E8: ปุ่มภาษา').toMatch(FOOT.langTh);
        expect.soft(f[2], 'E8: ปุ่มสกุลเงิน').toMatch(/THB/);
        expect.soft(cards7.filter((c) => !c.priceTxt || !UNIT.THB.test(c.priceTxt)).map((c) => `${c.key}: "${c.priceTxt}"`), 'E8: การ์ดที่ไม่มีหน่วยบาท').toEqual([]);
      });
    });

    gf.finishNA();
  });

  // ─────────────────────────────────────────── TC-LOC-04
  test('TC-LOC-04 · หน้าแรก การจำค่าฟอร์ม และ Explore', {
    tag: ['@P3', '@5.6'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ข้อ 1) ไม่มีสิ่งใดบังฟอร์มค้นหาจนต้องปิดก่อนใช้งาน' },
      { type: 'คาดหวัง', description: 'E2: [O-ยังไม่ยืนยัน] (ข้อ 1) R134: ไม่มี dialog/banner คุกกี้หรือความยินยอมในหน้า' },
      { type: 'คาดหวัง', description: 'E3: [O-ยังไม่ยืนยัน] (ข้อ 1, 3) R132: หน้าแรกเป็นแบบใดแบบหนึ่งใน 2 แบบ ("ค้นหาเที่ยวบินราคาถูกทั่วโลกและจองตั๋ว" หรือ "ค้นหาเที่ยวบินราคาถูกจากกรุงเทพมหานคร") และทั้งสองแบบมีฟอร์มค้นหาครบทุกช่อง · จดว่าข้อ 1 และข้อ 3 ได้แบบไหน (ข้อมูลตอบ Q36)' },
      { type: 'คาดหวัง', description: 'E4: (ข้อ 3) R129: ทุกช่องในฟอร์มที่มีค่า ต้องเป็นค่าเดียวกับการค้นหาล่าสุด (เที่ยวเดียว / กรุงเทพมหานคร / อังคาร 15 ธ.ค. / 1 / ชั้นประหยัด) ไม่มีช่องใดแสดงค่าที่ไม่ได้ค้น' },
      { type: 'คาดหวัง', description: 'E5: [O-ยังไม่ยืนยัน] (ข้อ 3) R129: ประเภทตั๋ว ต้นทาง และวันที่ถูกจำไว้ ส่วนช่องปลายทางว่าง' },
      { type: 'คาดหวัง', description: 'E6: [O-ยังไม่ยืนยัน] (ข้อ 3) R02: ขณะปลายทางว่าง ปุ่มหลักใต้ฟอร์มเป็น "สำรวจ" ไม่ใช่ "ค้นหา"' },
      { type: 'คาดหวัง', description: 'E7: (ข้อ 4) R02: กด "สำรวจ" แล้วไปหน้า Explore (URL มี `/travel/explore`) ไม่ใช่หน้าผลลัพธ์เที่ยวบิน' },
      { type: 'คาดหวัง', description: 'E8: (ข้อ 4–5) R131: ฟอร์มใน Explore มีต้นทาง กรุงเทพมหานคร · เที่ยวเดียว · 15 ธ.ค. และผู้โดยสาร/ชั้นเท่าที่แสดงตรงกับ 1 / ชั้นประหยัด · URL มี `hl=th` และ `curr=THB` · ราคาทุกปลายทางมีหน่วยบาท และป้ายในหน้าเป็นภาษาไทย' },
      { type: 'คาดหวัง', description: 'E9: (ข้อ 4) R130: PX = Pref (ราคาโตเกียวใน Explore เท่ากับราคาต่ำสุดในหน้าผลลัพธ์ของเงื่อนไขเดียวกัน) · ถ้าไม่มีแถวโตเกียวในรายการ = E9 N/A' },
      { type: 'ที่มา', description: `${PLAN} · TC-LOC-04 · R134 R132 R129 R02 R131 R130 · State · Invariant/Metamorphic · Happy path · [O-ยังไม่ยืนยัน] (E2 E3 E5 E6 · E1 E4 E7 E8 E9 เป็น [R])` },
      { type: 'งบค้นหา', description: '2' },
    ],
  }, async ({ page, gf }) => {
    const HOME_TITLE_RE = /ค้นหาเที่ยวบินราคาถูกทั่วโลกและจองตั๋ว|ค้นหาเที่ยวบินราคาถูกจากกรุงเทพมหานคร/;
    // ปุ่มหลักใต้ฟอร์มอยู่นอก landmark "search" (เป็นพี่น้องถัดไป: button "สำรวจจุดหมายปลายทาง" / "ค้นหา")
    // → หาในกล่องแม่ของฟอร์ม และเอาตัวแรกตามลำดับ DOM (ก่อน main ที่มีปุ่ม "สำรวจดีลด้วย AI")
    const mainBtn = () =>
      page.getByRole('search').first().getByRole('button', { name: /^(สำรวจ|ค้นหา)/ })
        .or(page.getByRole('search').first().locator('xpath=..').getByRole('button', { name: /^(สำรวจจุดหมายปลายทาง|สำรวจ|ค้นหา(เที่ยวบิน)?)$/ }))
        .first();
    const formFields = () => ({
      ticket: page.getByRole('combobox', { name: /ประเภทตั๋ว/ }).first(),
      pax: page.getByRole('button', { name: /ผู้โดยสาร/ }).first(),
      cls: page.getByRole('combobox', { name: /ชั้นโดยสาร/ }).first(),
      origin: page.getByRole('combobox', { name: 'ต้นทาง', exact: true }).first(),
      dest: page.getByRole('combobox', { name: 'ปลายทาง', exact: true }).first(),
      date: page.getByRole('textbox', { name: 'ขาไป', exact: true }).first(),
    });
    const expectFormComplete = async (tag: string) => {
      const f = formFields();
      for (const [k, loc] of Object.entries(f)) await expect.soft(loc, `${tag}: ช่อง ${k}`).toBeVisible();
      await expect.soft(mainBtn(), `${tag}: ปุ่มหลักใต้ฟอร์ม`).toBeVisible();
    };
    let title1 = '', title3 = '', P: number | null = null, Pmin: number | null = null, Pref: number | null = null;

    await test.step('1. เปิด U0 (ไม่นับงบ) รอโหลดเสร็จ · snapshot + screenshot: หา dialog/banner คุกกี้/ความยินยอม · จดชื่อแท็บและหัวข้อหลัก · ตรวจว่ามีช่องฟอร์มค้นหาครบ', async () => {
      await gf.goto(U0);
      await page.getByRole('search').first().waitFor({ timeout: 30_000 }).catch(() => {});
      title1 = await page.title();
      note('ชื่อแท็บข้อ 1', title1);
      note('หัวข้อหลักข้อ 1', await page.getByRole('heading', { level: 1 }).allInnerTexts().catch(() => []));
      await snap(page, 'step1-home');
      await test.step('เงื่อนไขก่อนเริ่ม: ท้ายหน้าแสดง ไทย / ไทย / THB', async () => {
        const f = await footerLabels(page);
        note('ป้ายท้ายหน้าหลังเปิด U0', f);
        if (!FOOT.langTh.test(f[0]) || !FOOT.locTh.test(f[1]) || !/THB/.test(f[2])) {
          throw new Error(`เงื่อนไขก่อนเริ่มไม่ผ่าน: ท้ายหน้า ${JSON.stringify(f)} (มีค่า hl/curr/gl ค้าง) → หยุด test และแจ้งผู้คุมชุด`);
        }
      });
      const origin = formFields().origin;
      await gf.check('E1 ไม่มีสิ่งใดบังฟอร์มค้นหา', page.getByRole('search').first(), async () => {
        await expect.soft(page.getByRole('dialog').or(page.getByRole('alertdialog')), 'E1: ไม่มี dialog เปิดค้าง').toHaveCount(0);
        await expect.soft(origin, 'E1: ช่องต้นทางมองเห็นได้').toBeVisible();
        // ใช้ element ของ landmark "search" จริง (อาจไม่ใช่ [role=search] แต่เป็น <search>/<form>) เป็นขอบเขตฟอร์ม
        const formEl = await page.getByRole('search').first().elementHandle({ timeout: 10_000 }).catch(() => null);
        const cover = await origin.evaluate((el, formArg) => {
          el.scrollIntoView({ block: 'center' });
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const form = (formArg as Element | null) || el.closest('[role="search"], search, form') || el.parentElement;
          if (top && form && (form.contains(top) || top.contains(el))) return '';
          return top ? (top as HTMLElement).outerHTML.slice(0, 160) : '(ไม่พบ element)';
        }, formEl, { timeout: 10_000 }).catch((e) => String(e));
        await formEl?.dispose().catch(() => {});
        expect.soft(cover, 'E1: element ที่ทับช่องต้นทาง').toBe('');
      });
      await gf.check('E2 [O] ไม่มี dialog/banner คุกกี้หรือความยินยอม', page.locator('body'), async () => {
        const COOKIE = /คุกกี้|cookie|ยอมรับ|ปฏิเสธ|ความยินยอม/i;
        await expect.soft(page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ hasText: COOKIE }), 'E2: dialog คุกกี้').toHaveCount(0);
        await expect.soft(page.getByRole('banner').or(page.getByRole('region')).filter({ hasText: /คุกกี้|cookie|ความยินยอม/i }), 'E2: banner คุกกี้').toHaveCount(0);
        await expect.soft(page.getByRole('button', { name: /ยอมรับทั้งหมด|ปฏิเสธทั้งหมด|Accept all|Reject all/i }), 'E2: ปุ่มยอมรับ/ปฏิเสธคุกกี้').toHaveCount(0);
      });
      await gf.check('E3 [O] (ข้อ 1) หน้าแรกเป็น 1 ใน 2 แบบ และฟอร์มค้นหาครบทุกช่อง', page.getByRole('search').first(), async () => {
        expect.soft(title1, 'E3: ชื่อแท็บข้อ 1').toMatch(HOME_TITLE_RE);
        await expectFormComplete('E3 ข้อ 1');
      });
    });

    await test.step('2. เปิด U1 (ค้นหาครั้งที่ 1) รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ · จดราคาแท็บ "ถูกที่สุด" = P และราคาต่ำสุดในรายการชุดแรก = Pmin (aria-label) · Pref = ค่าที่น้อยกว่า', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1' });
      const st = await gf.check('ก่อนเริ่ม: หัวผลลัพธ์ตรงนิยาม U1', page.getByRole('search').first(), async () => {
        await expectHeaderTh(page, 'หัวผลลัพธ์ U1');
      });
      if (st === 'fail') throw new Error('หัวผลลัพธ์ไม่ตรงนิยาม U1 → หยุด test และแจ้งผู้คุมชุด');
      const tabs = await readTabs(page);
      const pm = tabs.cheapName.match(/\d[\d,]*/);
      P = pm ? toNum(pm[0]) : null;
      const rows = await readRows(page);
      const nums = rows.map((r) => r.num).filter((n): n is number => n != null);
      Pmin = nums.length ? Math.min(...nums) : null;
      const cand = [P, Pmin].filter((n): n is number => n != null);
      Pref = cand.length ? Math.min(...cand) : null;
      note('P / Pmin / Pref (เวลา)', { P, Pmin, Pref, at: new Date().toISOString() });
    });

    await test.step('3. กดแท็บ "เที่ยวบิน" ด้านบน (กลับหน้าแรก ไม่นับงบ) · snapshot ฟอร์ม · ป้ายปุ่มหลัก · จดชื่อแท็บ · ถ้าช่องปลายทางไม่ว่าง ให้ล้างก่อนทำข้อ 4', async () => {
      await gf.click(page.getByRole('banner').getByRole('link', { name: 'เที่ยวบิน', exact: true }).first());
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.getByRole('search').first().waitFor({ timeout: 30_000 }).catch(() => {});
      await gf.pause();
      title3 = await page.title();
      note('ชื่อแท็บข้อ 3', title3);
      const f = formFields();
      const vals = {
        ticket: (await f.ticket.textContent({ timeout: 10_000 }).catch(() => '')) || '',
        pax: await ariaName(f.pax),
        cls: (await f.cls.textContent({ timeout: 10_000 }).catch(() => '')) || '',
        origin: await fieldVal(f.origin),
        dest: await fieldVal(f.dest),
        date: await fieldVal(f.date),
        mainBtn: (await mainBtn().innerText({ timeout: 10_000 }).catch(() => '')).trim(),
      };
      note('ค่าในฟอร์มหน้าแรกข้อ 3', vals);
      await snap(page, 'step3-home-after-search');
      await gf.check('E3 [O] (ข้อ 3) หน้าแรกเป็น 1 ใน 2 แบบ และฟอร์มค้นหาครบทุกช่อง', page.getByRole('search').first(), async () => {
        expect.soft(title3, 'E3: ชื่อแท็บข้อ 3').toMatch(HOME_TITLE_RE);
        await expectFormComplete('E3 ข้อ 3');
      });
      await gf.check('E4 ทุกช่องที่มีค่าตรงกับการค้นหาล่าสุด', page.getByRole('search').first(), async () => {
        if (vals.ticket.trim()) expect.soft(vals.ticket, 'E4: ประเภทตั๋ว').toMatch(/เที่ยวเดียว/);
        if (vals.origin.trim()) expect.soft(vals.origin, 'E4: ต้นทาง').toMatch(/กรุงเทพมหานคร/);
        if (vals.dest.trim()) expect.soft(vals.dest, 'E4: ปลายทาง (ถ้ามีค่า)').toMatch(/โตเกียว/);
        if (vals.date.trim()) expect.soft(vals.date, 'E4: ขาไป').toMatch(/อังคาร 15 ธ\.ค\./);
        if (vals.pax.trim()) expect.soft(vals.pax, 'E4: ผู้โดยสาร').toMatch(/ผู้โดยสาร 1 คน/);
        if (vals.cls.trim()) expect.soft(vals.cls, 'E4: ชั้นโดยสาร').toMatch(/ชั้นประหยัด/);
      });
      await gf.check('E5 [O] ประเภทตั๋ว ต้นทาง วันที่ถูกจำไว้ ส่วนปลายทางว่าง', page.getByRole('search').first(), async () => {
        expect.soft(vals.ticket, 'E5: ประเภทตั๋ว').toMatch(/เที่ยวเดียว/);
        expect.soft(vals.origin, 'E5: ต้นทาง').toMatch(/กรุงเทพมหานคร/);
        expect.soft(vals.date, 'E5: ขาไป').toMatch(/อังคาร 15 ธ\.ค\./);
        expect.soft(vals.dest.trim(), 'E5: ปลายทางว่าง').toBe('');
      });
      if (vals.dest.trim()) {
        // ล้างช่องปลายทางก่อนทำข้อ 4 (ตามแผน)
        await gf.click(f.dest);
        await gf.press('Control+A');
        await gf.press('Backspace');
        await gf.press('Escape');
        note('ล้างช่องปลายทาง', `ค่าเดิม "${vals.dest}"`);
      }
      await gf.check('E6 [O] ขณะปลายทางว่าง ปุ่มหลักเป็น "สำรวจ" ไม่ใช่ "ค้นหา"', mainBtn(), async () => {
        const t = `${(await mainBtn().innerText().catch(() => '')).trim()} | ${await ariaName(mainBtn())}`;
        note('ป้ายปุ่มหลัก', t);
        await expect.soft(mainBtn(), 'E6: ปุ่มหลัก').toContainText('สำรวจ');
        expect.soft((await mainBtn().innerText().catch(() => '')).trim(), 'E6: ไม่ใช่ "ค้นหา"').not.toMatch(/ค้นหา/);
      });
    });

    let urlX = '';
    await test.step('4. กดปุ่ม "สำรวจ" (ค้นหาครั้งที่ 2) รอ ≥ 10 วินาที · จด URL · snapshot ฟอร์มใน Explore และรายการปลายทาง · หาแถว "โตเกียว" อ่านราคา = PX (เลื่อนรายการถ้าไม่เห็น) · screenshot', async () => {
      await gf.click(mainBtn(), { search: 'กด "สำรวจ" → หน้า Explore' });
      urlX = page.url();
      note('URL Explore', urlX);
      const main = page.getByRole('main').first();
      // การ์ดปลายทางเป็นปุ่มซ้อนปุ่ม (ปุ่มนอกไม่มีชื่อ · ปุ่มในมีชื่อ) → เอาเฉพาะปุ่มในสุด ไม่ให้นับซ้ำ
      const h3 = () => page.getByRole('heading', { level: 3 });
      const dests = main.getByRole('button').filter({ has: h3() }).filter({ hasNot: page.getByRole('button').filter({ has: h3() }) });
      await dests.first().waitFor({ timeout: 30_000 }).catch(() => {});
      // ปุ่มในสุดของการ์ดโตเกียว (ปุ่มนอกที่ห่อไว้อาจได้ชื่อจากเนื้อหาเดียวกัน)
      const tokyoLoc = () => main.getByRole('button', { name: /^\s*โตเกียว\s/ }).filter({ hasNot: page.getByRole('button').filter({ has: h3() }) }).first();
      let tokyo = tokyoLoc();
      for (let k = 0; k < 5 && (await tokyo.count()) === 0; k++) {
        await dests.last().hover({ timeout: 5000 }).catch(() => {});
        await page.mouse.wheel(0, 700);
        await gf.pause();
        tokyo = tokyoLoc();
      }
      const destTexts = await dests.allInnerTexts().catch(() => [] as string[]);
      note('รายการปลายทาง Explore', destTexts.map((s) => s.replace(/\s+/g, ' ')));
      await snap(page, 'step4-explore');

      await gf.check('E7 กด "สำรวจ" แล้วไปหน้า Explore (/travel/explore)', null, async () => {
        expect.soft(new URL(urlX).pathname, 'E7: path').toMatch(/\/travel\/explore/);
        expect.soft(new URL(urlX).pathname, 'E7: ไม่ใช่หน้าผลลัพธ์เที่ยวบิน').not.toMatch(/\/travel\/flights\/search/);
      });

      const ex = {
        ticket: page.getByRole('combobox', { name: /ประเภทตั๋ว/ }).first(),
        pax: page.getByRole('button', { name: /ผู้โดยสาร/ }).first(),
        cls: page.getByRole('combobox', { name: /ชั้นโดยสาร/ }).first(),
        origin: page.getByRole('combobox', { name: /ต้นทาง|จากที่ใด/ }).first(),
        date: page.getByRole('textbox', { name: /ขาไป/ }).first(),
      };
      await gf.check('E8 ฟอร์ม Explore รับเงื่อนไขครบ · hl=th curr=THB · ราคาทุกปลายทางเป็นบาท · ป้ายภาษาไทย', [ex.origin, ex.ticket, ex.date, dests], async () => {
        expect.soft(await fieldVal(ex.origin), 'E8: ต้นทาง').toMatch(/กรุงเทพมหานคร/);
        await expect.soft(ex.ticket, 'E8: ประเภทตั๋ว').toContainText('เที่ยวเดียว');
        expect.soft(await fieldVal(ex.date), 'E8: วันที่').toMatch(/15 ธ\.ค\./);
        if ((await ex.pax.count()) > 0) expect.soft(await ariaName(ex.pax), 'E8: ผู้โดยสาร (ที่แสดง)').toMatch(/1/);
        else note('E8 ผู้โดยสาร', 'หน้า Explore ไม่แสดงช่องผู้โดยสาร');
        if ((await ex.cls.count()) > 0) await expect.soft(ex.cls, 'E8: ชั้นโดยสาร (ที่แสดง)').toContainText('ชั้นประหยัด');
        else note('E8 ชั้นโดยสาร', 'หน้า Explore ไม่แสดงช่องชั้นโดยสาร');
        const p = urlParams(urlX).p;
        expect.soft(p.hl, 'E8: hl=th').toBe('th');
        expect.soft(p.curr, 'E8: curr=THB').toBe('THB');
        expect.soft(destTexts.length, 'E8: มีรายการปลายทาง').toBeGreaterThan(0);
        const unitBad = destTexts.flatMap((t, k) => auditText(`ปลายทาง ${k + 1}`, t.replace(/\d+\s*ชม\.|\d+\s*นาที|\d+\s*ครั้ง/g, ''), UNIT.THB, /¥|￥|円|JPY|\$/));
        expect.soft(unitBad, 'E8: ราคาปลายทางที่ไม่มีหน่วยบาท').toEqual([]);
        expect.soft(await page.locator('html').getAttribute('lang'), 'E8: ภาษาของหน้า').toMatch(/^th/);
        const h3 = await main.getByRole('heading', { level: 3 }).allInnerTexts().catch(() => [] as string[]);
        expect.soft(h3.some((h) => THAI_CHAR.test(h)), `E8: ป้ายปลายทางเป็นภาษาไทย (${h3.slice(0, 5).join(', ')})`).toBe(true);
      });

      if ((await tokyo.count()) === 0) {
        gf.na('E9 PX = Pref (ราคาโตเกียวใน Explore = ราคาต่ำสุดหน้าผลลัพธ์)', 'ไม่มีแถวโตเกียวในรายการ Explore');
      } else {
        const name = await ariaName(tokyo);
        const txt = await tokyo.innerText().catch(() => '');
        const m = name.match(/(\d[\d,]*)\s*บาท/) || txt.match(/฿\s?(\d[\d,]*)/) || (name + ' ' + txt).match(PRICE_TOKEN_1);
        const PX = m ? toNum((m[1] ?? m[0]).replace(/^US/, '')) : null;
        note('PX (เวลา)', { PX, Pref, label: name, at: new Date().toISOString() });
        await gf.check('E9 PX = Pref (ราคาโตเกียวใน Explore = ราคาต่ำสุดในหน้าผลลัพธ์)', tokyo, async () => {
          expect.soft(PX, 'E9: อ่าน PX ได้').not.toBeNull();
          expect.soft(Pref, 'E9: มี Pref จากข้อ 2').not.toBeNull();
          expect.soft(PX, `E9: PX (${PX}) = Pref (${Pref})`).toBe(Pref);
        });
      }
    });

    await test.step('5. ตรวจว่า URL หน้า Explore มี hl=th และ curr=THB · ถ้าไม่มี ให้เปิด U0 เพื่อกลับค่าเดิม (ไม่นับงบ) · จบ test', async () => {
      const p = urlParams(page.url()).p;
      if (p.hl !== 'th' || p.curr !== 'THB' || p.gl) {
        await gf.goto(U0);
        note('กลับค่าเดิม', 'เปิด U0 เพราะ URL Explore ไม่มี hl=th/curr=THB');
      }
    });

    gf.finishNA();
  });
});

// node loop/aria-lock.mjs <BASE_URL> [--write]
// ล็อกโครงสร้างของขั้นที่ 1 ให้ตัวกันของขั้นที่ 2 ใช้
// เปิดหน้าผลค้นหาแบบเดียวกับ kit/capture.mjs (rulers/lib.mjs: open + standardRoute · 1366×900 · scroll บนสุด · fonts.ready + 1 วินาที)
// แล้วเอา ariaSnapshot() ของ body + SHA-256
//   (ข้อความของ alert ตัวประกาศเส้นทางของ Next.js ถูกตัดออกก่อน hash เพราะไม่คงที่)
//   ไม่ใส่ --write : เทียบกับ loop/structure.lock → exit 0 ตรง · 1 ไม่ตรง (พิมพ์บรรทัดแรกที่ต่าง) · 2 เปิดหน้าไม่ได้
//   --write        : บันทึก loop/structure.lock (hash + snapshot)
//                    loop/size-baseline.json   (กว้าง×สูงของทุก element ที่มีข้อความหรือกดได้)
//                    loop/visual-baseline.json (ตำแหน่งแถวเที่ยวบินแรก · สีของตัวแปร --c-text* · ข้อความในช่องกรอก)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { open, standardRoute, isGoogle } from '../rulers/lib.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/ms-playwright';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const write = args.includes('--write');
const base = args.find(a => !a.startsWith('--'));
if (!base || isGoogle(base)) { console.error('ใช้: node loop/aria-lock.mjs <BASE_URL ของโคลน> [--write]'); process.exit(2); }

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
// ตัวประกาศเส้นทางของ Next.js (alert) ใส่ชื่อหน้าตามจังหวะโหลด ไม่คงที่ → ตัดข้อความออกก่อนคิด hash (ยังเก็บว่ามี alert)
const normalize = y => y.replace(/^(\s*- alert)(?::.*)?$/m, '$1');
const LOCK = path.join(HERE, 'structure.lock');

const { browser, page } = await open();
let snapshot, sizes, visual, url;
try {
  try { url = await standardRoute(page, base, 1); } catch (e) { console.error('เปิดหน้าผลค้นหาไม่ได้:', e.message); process.exit(2); }
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1000);
  snapshot = normalize(await page.locator('body').ariaSnapshot()) + '\n';

  if (write) {
    sizes = await page.evaluate(() => {
      const INTERACTIVE = 'a[href],button,input,select,textarea,[role=button],[role=link],[role=tab],[role=switch],[role=slider],[role=combobox],[role=checkbox],[role=radio],[tabindex]:not([tabindex="-1"])';
      const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
      const out = [];
      const seen = new Map();
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        const interactive = el.matches(INTERACTIVE);
        const text = ownText(el);
        if (!interactive && !text) continue;
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const label = el.getAttribute('aria-label') || text || el.getAttribute('placeholder') || el.value || '';
        const id = `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}|${label.slice(0, 80)}`;
        const n = (seen.get(id) || 0) + 1; seen.set(id, n);
        out.push({ key: n > 1 ? `${id}#${n}` : id, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });
      }
      return out;
    });
    visual = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const vars = {};
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules) {
          if (!rule.style) continue;
          for (const p of rule.style) if (/^--c(olor)?-text/.test(p)) vars[p] = root.getPropertyValue(p).trim();
        }
      }
      const link = [...document.querySelectorAll('a[aria-label^="ราคาเริ่มต้นที่"]')][0];
      const row = link?.closest('li') || link;
      const r = row?.getBoundingClientRect();
      const inputs = [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=range]),select,textarea,[role=combobox]')]
        .map(el => ({ name: el.getAttribute('aria-label') || el.name || el.id || '', value: el.value ?? el.textContent.trim() }));
      return {
        firstRow: r ? { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, name: link.getAttribute('aria-label').slice(0, 60) } : null,
        textColorVars: vars,
        textColorVarsNote: 'tokens.css ไม่มีตัวแปร --c-text* จึงเก็บ --color-text* (ตัวแปรสีข้อความที่มีจริง) ด้วยรูปแบบ /^--c(olor)?-text/',
        inputs,
      };
    });
  }
} finally { await browser.close(); }

const hash = sha(snapshot);
if (write) {
  const at = new Date().toISOString();
  fs.writeFileSync(LOCK, JSON.stringify({ base, url, at, viewport: '1366x900', sha256: hash, snapshot }, null, 2) + '\n');
  fs.writeFileSync(path.join(HERE, 'size-baseline.json'), JSON.stringify({ base, url, at, count: sizes.length, elements: sizes }, null, 2) + '\n');
  fs.writeFileSync(path.join(HERE, 'visual-baseline.json'), JSON.stringify({ base, url, at, ...visual }, null, 2) + '\n');
  console.log(`เขียน structure.lock · sha256 ${hash} · size-baseline ${sizes.length} element · visual-baseline`);
  process.exit(0);
}
if (!fs.existsSync(LOCK)) { console.error('ยังไม่มี loop/structure.lock — รันด้วย --write ก่อน'); process.exit(2); }
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
if (lock.sha256 === hash) { console.log(`ตรง · sha256 ${hash}`); process.exit(0); }
const a = lock.snapshot.split('\n'), b = snapshot.split('\n');
const i = a.findIndex((l, k) => l !== b[k]);
console.log(`ไม่ตรง · lock ${lock.sha256} · ตอนนี้ ${hash}`);
console.log(`บรรทัด ${i + 1}:\n  lock: ${a[i] ?? '(ไม่มี)'}\n  now : ${b[i] ?? '(ไม่มี)'}`);
process.exit(1);

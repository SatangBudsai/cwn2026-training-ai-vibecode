import fs from 'fs';
import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize, BASE } from './lib.mjs';
const sc = process.argv[2];
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
const openF = async n => { await page.getByRole('button', { name: new RegExp('^' + n + ', ') }).click(); await page.waitForTimeout(1500); return page.getByRole('dialog').filter({ visible: true }).last(); };
const close = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(3000); };
const slide = async (dlg, name, key, times) => { const s = dlg.getByRole('slider', { name }); await s.focus(); for (let i = 0; i < times; i++) { await page.keyboard.press(key); await page.waitForTimeout(60); } await page.waitForTimeout(2500); return s.getAttribute('aria-valuetext').catch(()=>null).then(async vt => vt + ' / value=' + await s.getAttribute('aria-valuenow')); };
let note = '';
// chip label may change after apply (e.g. "กระเป๋าถือขึ้นเครื่อง 1 ใบ, สัมภาระ, เลือกแล้ว"), so match by the ", <filter name>, " part
const openF2 = async n => { await page.getByRole('button', { name: new RegExp('(^|, )' + n + ', (ไม่ได้)?เลือก') }).first().click({ position: { x: 12, y: 12 } }); await page.waitForTimeout(1500); return page.getByRole('dialog').filter({ visible: true }).last(); };
const dlgOpen = async () => (await page.getByRole('dialog').filter({ visible: true }).count()) > 0;
const slideTo = async (n, sname, key, done) => { let v; for (let i = 0; i < 400; i++) { if (!(await dlgOpen())) { note += ' [dialog closed at step ' + i + ']'; await openF2(n); } const s = page.getByRole('dialog').filter({ visible: true }).last().getByRole('slider', { name: sname }); await s.focus(); await page.keyboard.press(key); await page.waitForTimeout(80); v = await s.getAttribute('aria-valuenow').catch(() => null); if (v !== null && done(+v)) break; } await page.waitForTimeout(2500); const open = await dlgOpen(); note += ` slider ${sname}=${v} dlgOpenAfter=${open}`; if (open) note += ' txt=' + (await page.getByRole('dialog').filter({ visible: true }).last().innerText()).replace(/\n/g, ' / ').slice(0, 200); };
const setR = async (n, sname, val) => { const d = await openF(n); const sl = d.getByRole('slider', { name: sname, exact: true }); note += ` [${sname} range ${await sl.getAttribute('min')}..${await sl.getAttribute('max')} step ${await sl.getAttribute('step')}]`; await sl.fill(String(val)); await page.waitForTimeout(3500); const open = await dlgOpen(); note += ` set ${sname}=${val} dlgOpenAfter=${open}`; if (!open) await openF2(n); const d2 = page.getByRole('dialog').filter({ visible: true }).last(); note += ' txt=' + (await d2.innerText()).replace(/\n/g, ' / ').slice(0, 160) + ' valuetext=' + await d2.getByRole('slider', { name: sname, exact: true }).getAttribute('aria-valuetext'); await shot(page, `10-slider-${sc}`); await close(); };
const S = {
  dep12: async () => setR('เวลา', 'เวลาออกเดินทางที่ช้าที่สุด', 12),
  price30kReload: async () => { await setR('ราคา', 'ราคาสูงสุด', 30000); note += ' errBeforeReload=' + await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count(); await shot(page, '10-price-error'); await snap(page, '10-price-error', '[role=main]').catch(()=>{}); if (await page.getByRole('button', { name: 'โหลดซ้ำ' }).count()) { await page.getByRole('button', { name: 'โหลดซ้ำ' }).click(); await page.waitForTimeout(8000); note += ' errAfterโหลดซ้ำ=' + await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count(); } if (await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count()) { await page.reload(); await page.waitForTimeout(9000); note += ' errAfterReload=' + await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count(); } },
  price20k: async () => setR('ราคา', 'ราคาสูงสุด', 20000),
  price10kB: async () => setR('ราคา', 'ราคาสูงสุด', 10000),
  dep0612: async () => { await setR('เวลา', 'เวลาออกเดินทางที่เร็วที่สุด', 6); await setR('เวลา', 'เวลาออกเดินทางที่ช้าที่สุด', 12); },
  arr18: async () => setR('เวลา', 'เวลาถึงที่เร็วที่สุด', 18),
  dur8: async () => setR('ระยะเวลา', 'ระยะเวลา', 8),
  dur6: async () => setR('ระยะเวลา', 'ระยะเวลา', 6),
  lay180: async () => setR('สนามบินสำหรับต่อเครื่อง', 'ระยะเวลาแวะพักสูงสุด', 180),

  nonstop: async () => { const d = await openF('จำนวนครั้งที่แวะพัก'); await d.getByRole('radio', { name: 'บินตรงเท่านั้น' }).click(); await page.waitForTimeout(3000); await close(); },
  stop1: async () => { const d = await openF('จำนวนครั้งที่แวะพัก'); await d.getByRole('radio', { name: 'แวะพัก 1 ครั้งหรือน้อยกว่า' }).click(); await page.waitForTimeout(3000); await close(); },
  stop2: async () => { const d = await openF('จำนวนครั้งที่แวะพัก'); await d.getByRole('radio', { name: 'แวะพัก 2 ครั้งหรือน้อยกว่า' }).click(); await page.waitForTimeout(3000); await close(); },
  thai: async () => { const d = await openF('สายการบิน'); await d.getByRole('checkbox', { name: 'การบินไทย', exact: true }).hover(); await page.waitForTimeout(800);
    const ob = d.getByText('เท่านั้น', { exact: true }).filter({ visible: true });
    note += ' onlyBtn=' + JSON.stringify(await ob.evaluateAll(e => e.map(x => (x.closest('button,[role=button]')?.getAttribute('aria-label')) + '|' + x.innerText)));
    await d.locator('[aria-label="การบินไทย เท่านั้น"]').click(); await page.waitForTimeout(3000); note += ' dlgOpenAfter=' + await dlgOpen();
    const d2 = await openF2('สายการบิน'); await shot(page, '10-airlines-thai-only-dialog'); fs.writeFileSync(`${BASE}/snapshots/10-airlines-thai-only.yml`, (await d2.ariaSnapshot()).slice(0, 3000)); await close(); },
  star: async () => { const d = await openF('สายการบิน'); await d.getByRole('checkbox', { name: 'Star Alliance' }).click(); await page.waitForTimeout(3000); note += ' dlgOpenAfter=' + await dlgOpen(); if (!(await dlgOpen())) await openF2('สายการบิน'); const d2 = page.getByRole('dialog').filter({ visible: true }).last(); note += ' checked=' + JSON.stringify(await d2.getByRole('checkbox', { checked: true }).evaluateAll(e => e.map(x => x.getAttribute('aria-label')))); await close(); },
  bag1: async () => { const d = await openF('สัมภาระ'); await d.getByRole('button', { name: 'เพิ่มกระเป๋าถือขึ้นเครื่อง' }).click(); await page.waitForTimeout(3000); note += ' dlgOpenAfter=' + await dlgOpen(); const d2 = await openF2('สัมภาระ'); note += ' txt=' + (await d2.innerText()).replace(/\n/g, ' / ') + ' addDisabled=' + await d2.getByRole('button', { name: 'เพิ่มกระเป๋าถือขึ้นเครื่อง' }).isDisabled(); await shot(page, '10-bag-dialog-1'); await close(); },
  price10k: async () => { await openF('ราคา'); await slideTo('ราคา', 'ราคาสูงสุด', 'ArrowLeft', v => v <= 10000); await shot(page, '10-price-slider'); await close(); },
  depMorning: async () => { await openF('เวลา'); await slideTo('เวลา', 'เวลาออกเดินทางที่ช้าที่สุด', 'ArrowLeft', v => v <= 12); await shot(page, '10-time-slider'); await close(); },
  arrEvening: async () => { await openF('เวลา'); await slideTo('เวลา', 'เวลาถึงที่เร็วที่สุด', 'ArrowRight', v => v >= 18); await close(); },
  lowco2: async () => { const d = await openF('การปล่อยก๊าซ'); await d.getByRole('radio', { name: 'การปล่อยก๊าซต่ำเท่านั้น' }).click(); await page.waitForTimeout(3000); await close(); },
  tpeOnly: async () => { const d = await openF('สนามบินสำหรับต่อเครื่อง'); const li = d.getByRole('listitem').filter({ has: page.getByRole('checkbox', { name: 'ไทเป (TPE)' }) }); await li.hover(); await page.waitForTimeout(500); await d.getByRole('button', { name: 'ไทเป (TPE) เท่านั้น' }).click(); await page.waitForTimeout(3000); await close(); },
  layoverMax3h: async () => { await openF('สนามบินสำหรับต่อเครื่อง'); await slideTo('สนามบินสำหรับต่อเครื่อง', 'ระยะเวลาแวะพักสูงสุด', 'ArrowLeft', v => v <= 180); await close(); },
  dur8h: async () => { await openF('ระยะเวลา'); await slideTo('ระยะเวลา', 'ระยะเวลา', 'ArrowLeft', v => v <= 8); await shot(page, '10-duration-slider'); await close(); },
  hideSelf: async () => { await page.getByRole('button', { name: 'ตัวกรองทั้งหมด' }).click(); await page.waitForTimeout(1500); const d = page.getByRole('dialog').filter({ visible: true }).last(); await d.getByRole('radio', { name: 'ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง' }).click(); await page.waitForTimeout(3000); await close(); },
};
await S[sc]();
const chips = await page.getByRole('search').getByRole('button').evaluateAll(e => e.map(x => x.getAttribute('aria-label') || x.innerText).filter(t => t && /เลือก|ล้าง|ตัวกรอง/.test(t) && !/ไม่ได้เลือก/.test(t)));
const err = await page.getByText('มีบางอย่างผิดพลาด').count();
const noRes = await page.locator('[role=main]').innerText().then(t => (t.match(/ไม่พบ[^\n]*/g) || []).join(' ; '));
let r = await rows(page);
const tabs = await page.getByRole('tab').evaluateAll(e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
log(`[filter=${sc}] err=${err} chips=${JSON.stringify(chips)} tabs=${JSON.stringify(tabs)} noRes="${noRes}"${note}`);
log(`[filter=${sc}] visible`, JSON.stringify(summarize(r)));
await shot(page, `10-filter-${sc}`);
const mb = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
if (await mb.count()) { await mb.click(); await page.waitForTimeout(5000); r = await rows(page); }
log(`[filter=${sc}] all(after more) errVisible=${await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count()} moreBtnStill=${await mb.count()}`, JSON.stringify(summarize(r)));
if (!r.length && await page.getByRole('button', { name: 'โหลดซ้ำ' }).count()) { await shot(page, `10-filter-${sc}-after-more-error`); await page.getByRole('button', { name: 'โหลดซ้ำ' }).click(); await page.waitForTimeout(8000); r = await rows(page); log(`[filter=${sc}] after โหลดซ้ำ errVisible=${await page.getByText('มีบางอย่างผิดพลาด').filter({visible:true}).count()}`, JSON.stringify(summarize(r))); }
fs.writeFileSync(`${BASE}/logs/rows-filter-${sc}.json`, JSON.stringify(r.map(x => x.text), null, 0));
log(`[filter=${sc}] url`, page.url());
await browser.close();

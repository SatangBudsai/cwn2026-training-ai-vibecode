import { open, home, shot, snap, log, setPlace, setTripType } from './lib.mjs';
import fs from 'fs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
try {
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  await S().getByRole('textbox', { name: 'ขาไป' }).click();
  await page.waitForTimeout(4000);
  await shot(page, '27-calendar-oneway');
  const y = await snap(page, '27-calendar-oneway', D());
  console.log(y.split('\n').slice(0, 60).join('\n'));
  // gridcells info
  const cells = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] [role=gridcell]')].filter(c => c.offsetParent).map(c => ({ l: c.getAttribute('aria-label'), dis: c.getAttribute('aria-disabled'), sel: c.getAttribute('aria-selected'), t: c.innerText.replace(/\s+/g, ' ') })));
  log('visible cells', cells.length); console.log(JSON.stringify(cells.slice(0, 8), null, 0)); console.log(JSON.stringify(cells.slice(-3)));
  fs.writeFileSync('logs/06-cells-initial.json', JSON.stringify(cells, null, 1));
  // count months reachable via next
  const next = D().getByRole('button', { name: /ถัดไป|next/i });
  log('next btn count', await next.count(), 'labels of all dialog buttons:', JSON.stringify(await D().getByRole('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label') || b.innerText))));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-06'); }
finally { await browser.close(); }

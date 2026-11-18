async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const dump = async () => page.evaluate(() => [...document.querySelectorAll('main [data-testid]')].filter(e => e.offsetParent !== null).map(e => e.tagName + ':' + e.dataset.testid + (e.children.length === 0 ? '=' + e.textContent.trim().slice(0, 90) : '')).join('\n'));
  await page.goto('http://localhost:3000/th/booking?service=S01&party=1');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await t('booking-step1-next').click();
  await page.waitForTimeout(400);
  const a = (await dump()).split('\n').filter(l => !/booking-date-chip/.test(l)).join('\n');
  await t('booking-date').fill('2026-07-09');
  await page.waitForTimeout(800);
  const b = (await dump()).split('\n').filter(l => /slot/.test(l)).slice(0, 6).join('\n');
  const slot = t('booking-slot-14-00');
  const dis = await slot.isDisabled().catch(e => 'x');
  await slot.click();
  await page.waitForTimeout(200);
  await t('booking-step2-next').click();
  await page.waitForTimeout(900);
  const c = await dump();
  await page.screenshot({ path: 'booking-screen3.png', fullPage: true });
  return [a, '---', b, dis, '---', c].join('\n');
}

async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const before = await page.evaluate(() => document.querySelector('[data-testid=booking-screen-3]')?.innerText.slice(0, 900));
  await t('booking-toggle-shuttle').click();
  await page.waitForTimeout(500);
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid=booking-extra-shuttle] [data-testid]')].map(e => e.tagName + ':' + e.dataset.testid).join(' ; '));
  await page.screenshot({ path: 'p01-toggled.png' });
  return before + '\n=====\n' + ids;
}

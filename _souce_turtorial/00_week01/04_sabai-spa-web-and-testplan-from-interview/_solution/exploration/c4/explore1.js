async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const dump = async () => page.evaluate(() => [...document.querySelectorAll('main [data-testid]')].filter(e => e.offsetParent !== null).map(e => e.tagName + ':' + e.dataset.testid + (e.children.length === 0 ? '=' + e.textContent.trim().slice(0, 80) : '')).join('\n'));
  await page.goto('http://localhost:3000/th/booking?service=S01&party=1');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.waitForTimeout(500);
  const a = await dump();
  return a;
}

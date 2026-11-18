process.env.PLAYWRIGHT_BROWSERS_PATH='/ms-playwright';
const L = require('./lib');
(async () => {
  const { browser, page } = await L.open();
  await page.goto(L.URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  if (await L.captcha(page)) { await L.shot(page, '00-captcha'); await browser.close(); return; }
  await L.shot(page, '00-probe');
  await L.snap(page, '00-probe');
  await browser.close();
})();

import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
try {
  log('url', await home(page));
  await shot(page, '01-home-top');
  await shot(page, '01-home-full', { fullPage: true });
  const y = await snap(page, '01-home');
  console.log(y);
} finally { await browser.close(); }

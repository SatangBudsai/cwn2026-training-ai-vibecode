// usage: node cap.mjs <scenes.json>  — scenes: [{name,user|admin:true,steps:[{goto,hold,shot,full,click,scroll}]}]
import { createRequire } from 'node:module';
const require = createRequire('C:/t/pwcli/');
const { chromium } = require('playwright');
import { readFileSync, renameSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('C:/t/org05/novatech/.env', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.trim().split('=')));
const BASE = 'http://localhost:3300', OUT = 'C:/t/org05/capture/out';
const scenes = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch({ channel: 'chrome' });
for (const s of scenes) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, locale: 'th-TH',
    recordVideo: s.video === false ? undefined : { dir: OUT, size: { width: 1280, height: 760 } } });
  const page = await ctx.newPage();
  const [u, p] = s.admin ? [env.ADMIN_USER, env.ADMIN_PASSWORD] : [s.user, env.LAB_PASSWORD];
  await page.goto(`${BASE}/user/login`);
  await page.fill('#user_name', u); await page.fill('#password', p);
  await page.click('form.ui.form button.ui.primary.button'); await page.waitForLoadState('load');
  for (const st of s.steps) {
    if (st.goto) { await page.goto(BASE + st.goto); await page.waitForLoadState('load'); }
    if (st.click) { await page.click(st.click); await page.waitForLoadState('load'); }
    if (st.scroll) await page.mouse.wheel(0, st.scroll);
    await page.waitForTimeout(st.hold ?? 2500);
    if (st.shot) await page.screenshot({ path: `${OUT}/${st.shot}.png`, fullPage: !!st.full });
  }
  const v = page.video(); await ctx.close();
  if (v) renameSync(await v.path(), `${OUT}/${s.name}.webm`);
  console.log('scene', s.name);
}
await browser.close();

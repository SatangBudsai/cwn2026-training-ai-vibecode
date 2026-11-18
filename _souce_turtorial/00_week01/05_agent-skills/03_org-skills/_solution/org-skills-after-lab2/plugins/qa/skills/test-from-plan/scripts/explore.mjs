#!/usr/bin/env node
// สำรวจหน้าเว็บแบบ headless (black-box): พิมพ์ aria snapshot และรายการ data-testid ของแต่ละหน้า
// ใช้: node explore.mjs "" "products?pet=cat" "cart" [--testids] [--main] [--base http://host:port]
//   path ไม่ต้องขึ้นต้นด้วย / (Git Bash แปลง "/x" เป็น path ของ Windows) · "" = หน้าแรก
import { loadPlan, playwright, arg } from './_lib.mjs';

const plan = loadPlan();
const base = arg('--base', plan.baseURL);
const argv = process.argv.slice(2);
const paths = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--base');
const { chromium } = playwright();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
for (const u of paths.length ? paths : ['']) {
  const res = await p.goto(new URL(u.replace(/^\/+/, ''), base + '/').href, { waitUntil: 'networkidle' });
  console.log(`==== ${u || '(home)'} -> ${p.url()} [${res?.status()}]`);
  console.log(await p.locator(argv.includes('--main') ? 'main' : 'body').first().ariaSnapshot());
  if (argv.includes('--testids')) {
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-testid]')]
      .map(e => `${e.dataset.testid} = ${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)}`));
    console.log('--- data-testid\n' + ids.join('\n'));
  }
}
await b.close();

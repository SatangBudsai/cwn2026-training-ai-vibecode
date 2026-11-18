async (page) => {
  const out = [];
  const sleep = (ms) => page.waitForTimeout(ms);
  const tid = (t) => page.locator(`[data-testid="${t}"]`);
  const ready = () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const lines = async (label) => {
    await sleep(500);
    const s = await page.evaluate(() => [...document.querySelectorAll('[data-testid^=booking-line],[data-testid=booking-pay-at-shop],[data-testid=booking-points-value],[data-testid=booking-points-balance],[data-testid=booking-points-none],[data-testid=booking-giftcard-info],[data-testid=booking-points-earned],[data-testid=booking-quote-stale],[data-testid=booking-birthday-reason],[data-testid=booking-birthday-result],[data-testid=booking-use-birthday],[data-testid^=error-]')].map(e => e.dataset.testid.replace('booking-', '') + '=' + e.textContent.trim()).join(' | ') + ' || inc.disabled=' + document.querySelector('[data-testid=booking-points-inc]')?.disabled + ' confirm.disabled=' + document.querySelector('[data-testid=booking-confirm]')?.disabled);
    out.push(`[${label}] ${s}`);
  };
  const login = async (email, pw) => {
    await page.evaluate(async ([email, pw]) => { await fetch('/api/auth/logout', { method: 'POST' }); await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) }); }, [email, pw]);
  };
  const flow = async (svc, party, date) => {
    await page.goto(`http://localhost:3000/th/booking?service=${svc}`); await ready();
    await tid(`booking-party-${party}`).click();
    await tid('booking-step1-next').click();
    await tid('booking-date').fill(date);
    await tid('booking-slot-10-00').click({ timeout: 5000 });
    await tid('booking-step2-next').click();
    await tid('booking-screen-3').waitFor();
    await sleep(500);
  };
  const open = async (x) => { const t = tid(`booking-toggle-${x}`); if (await t.count()) await t.click(); };

  // --- U11 read-only: cap and stale state
  await page.goto('http://localhost:3000/th/login'); await ready();
  await login('por@sabai.test', 'Por#2026');
  await flow('S05', 1, '2026-06-17');
  await open('points'); await open('birthday');
  await lines('U11 S05 เริ่ม');
  await tid('booking-points-max').click(); await lines('U11 S05 แลกสูงสุด E101');
  await page.screenshot({ path: 'e101-u11-16sets.png', fullPage: true });
  const inc = tid('booking-points-inc');
  if (await inc.isEnabled()) { await inc.click(); await lines('U11 กด + เกิน 16'); }
  const bd = tid('booking-use-birthday');
  out.push('birthday control count=' + await bd.count());
  if (await bd.count()) { await bd.click(); await lines('U11 16 ชุดแล้วติ๊กเดือนเกิด (เพดานเหลือ 12)'); await page.screenshot({ path: 'u11-16sets-then-birthday.png', fullPage: true }); await bd.click(); await lines('U11 เอาเดือนเกิดออก'); }
  await tid('booking-toggle-shuttle').click();
  await tid('booking-shuttle-toggle').check();
  await tid('booking-shuttle-hotel').selectOption('H04');
  await lines('U11 16 ชุด + รถ H04 E103');

  // back and shrink/change service while points kept
  await tid('booking-step3-back').click(); await sleep(200);
  await tid('booking-step2-back').click(); await sleep(200);
  await tid('booking-party-3').click(); await tid('booking-step1-next').click(); await sleep(300);
  await tid('booking-slot-10-00').click({ timeout: 5000 }).catch(() => out.push('slot10 not present after back'));
  await tid('booking-step2-next').click(); await sleep(500);
  await lines('U11 ย้อนเป็น 3 คน');

  await flow('S05', 3, '2026-06-17');
  await open('points');
  await tid('booking-points-max').click(); await lines('U11 S05 3 คน 17 ชุด');
  await tid('booking-step3-back').click(); await sleep(200);
  await tid('booking-step2-back').click(); await sleep(200);
  await tid('booking-party-1').click(); await tid('booking-step1-next').click(); await sleep(300);
  await tid('booking-slot-10-00').click({ timeout: 5000 }).catch(() => out.push('slot10 not present after back'));
  await tid('booking-step2-next').click(); await sleep(500);
  await lines('U11 จาก 3 คน 17 ชุด ย้อนเป็น 1 คน (เกินเพดาน?)');
  await page.screenshot({ path: 'u11-17sets-shrink-to-1.png', fullPage: true });

  // --- U02 read-only
  await login('ton@sabai.test', 'Ton#2026');
  await flow('S01', 4, '2026-06-17');
  await open('birthday'); await open('points');
  await lines('U02 S01 4 คน E139');
  if (await bd.count()) { await bd.click(); await lines('U02 S01 4 คน เดือนเกิด E140'); }
  await page.screenshot({ path: 'e140-u02.png', fullPage: true });
  await flow('S01', 1, '2026-06-30');
  await open('birthday');
  await lines('U02 S01 30 มิ.ย. ก่อนติ๊ก');
  if (await bd.count()) { await bd.click(); await lines('U02 S01 30 มิ.ย. ติ๊กเดือนเกิด'); }
  await flow('S01', 1, '2026-07-01');
  await open('birthday');
  await lines('U02 S01 1 ก.ค.');
  await page.goto('http://localhost:3000/th/booking?service=P01'); await ready();
  await tid('booking-party-1').click(); await tid('booking-step1-next').click();
  await tid('booking-date').fill('2026-06-17');
  await tid('booking-slot-10-00').click({ timeout: 5000 });
  await tid('booking-step2-next').click(); await sleep(600);
  out.push('P01 toggles: ' + await page.evaluate(() => [...document.querySelectorAll('[data-testid^=booking-toggle],[data-testid^=booking-extra],[data-testid=booking-use-birthday],[data-testid=booking-birthday-reason],[data-testid=booking-quote-need-input]')].map(e => e.dataset.testid + '=' + e.textContent.trim().slice(0, 60)).join(' | ')));
  await lines('U02 P01 ก่อนเลือกรถ');
  await page.screenshot({ path: 'e130-u02-p01.png', fullPage: true });
  await page.goto('http://localhost:3000/th/wallet'); await ready(); await sleep(500);
  const buy = tid('wallet-buy-course');
  if (await buy.count()) { await buy.click(); await sleep(300); }
  out.push('wallet K01 panel: ' + await page.evaluate(() => (document.querySelector('[data-testid=wallet-buy-panel]')?.innerText || 'no panel').slice(0, 300) + ' || birthday-in-panel=' + /เดือนเกิด/.test(document.querySelector('[data-testid=wallet-buy-panel]')?.innerText || '')));
  await page.screenshot({ path: 'e131-u02-k01.png', fullPage: true });
  return out.join('\n');
}

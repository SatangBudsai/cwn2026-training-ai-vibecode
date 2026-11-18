async page => {
  const out = [];
  const t = id => page.locator(`[data-testid="${id}"]`);
  await page.goto('http://localhost:3000/th/shuttle');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const read = async () => {
    await page.waitForTimeout(350);
    return await page.evaluate(() => {
      const c = document.querySelector('[data-testid="shuttle-calc-section"]');
      const r = document.querySelector('[data-testid="shuttle-result"]');
      const errs = [...c.querySelectorAll('[data-testid^="error-"]')].map(e => e.dataset.testid + '=' + e.textContent.trim());
      const aside = c.querySelector('aside');
      return { result: r ? r.textContent.trim().replace(/\s+/g, ' ') : null, cars: document.querySelector('[data-testid="shuttle-result-cars"]')?.textContent.trim(), fee: document.querySelector('[data-testid="shuttle-result-fee"]')?.textContent.trim(), errs, aside: aside?.textContent.trim().replace(/\s+/g, ' ') };
    });
  };
  const cases = [
    ['d', '4.9', 1], ['d', '5.0', 1], ['d', '5', 1], ['d', '5.1', 1], ['d', '14.9', 1], ['d', '15.0', 1], ['d', '15', 1], ['d', '15.1', 1],
    ['d', '12', 3], ['d', '12', 4], ['d', '12', 5], ['d', '12', 6], ['d', '5.0', 5], ['d', '12', 8], ['d', '12', 9],
    ['d', '-0.1', 1], ['d', '0.0', 1], ['d', '0', 1], ['d', '5.05', 1], ['d', 'abc', 1], ['d', '', 1], ['d', ' 5.0 ', 1], ['d', '5,0', 1], ['d', '1e1', 1], ['d', '.5', 1], ['d', '5.', 1], ['d', '+5', 1], ['d', '٥', 1], ['d', '๕', 1], ['d', '5.00', 1], ['d', '00012', 1], ['d', '15.0000', 1], ['d', 'Infinity', 1], ['d', '-0', 1],
    ['d', '12', 0], ['d', '12', -1], ['d', '12', 1.5], ['d', '12', ''], ['d', '12', 7], ['d', '12', 1000],
    ['h', 'H01', 1], ['h', 'H02', 1], ['h', 'H03', 1], ['h', 'H04', 1], ['h', 'H05', 1], ['h', 'H06', 1], ['h', 'H03', 5], ['h', 'H05', 6], ['h', 'H02', 5], ['h', 'H06', 5], ['h', '', 1],
  ];
  for (const [m, v, p] of cases) {
    if (m === 'd') { await t('shuttle-mode-distance').check(); await t('shuttle-distance').fill(String(v)); }
    else { await t('shuttle-mode-hotel').check(); await t('shuttle-hotel').selectOption(v ? { value: v } : { index: 0 }).catch(async () => { await t('shuttle-hotel').selectOption({ index: Number(v.slice(1)) }); }); }
    await t('shuttle-party').fill(String(p));
    await t('shuttle-calc-submit').click();
    const r = await read();
    out.push(`${m}=${JSON.stringify(v)} p=${JSON.stringify(p)} -> cars=${r.cars} fee=${r.fee} errs=${r.errs.join('|')} aside=${r.aside}`);
  }
  await page.screenshot({ path: 'calc-last.png', fullPage: false });
  return out.join('\n');
}

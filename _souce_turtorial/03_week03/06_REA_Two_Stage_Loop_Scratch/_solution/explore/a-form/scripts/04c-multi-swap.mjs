import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
const val = async () => ({ o: await S().getByRole('combobox', { name: 'ต้นทาง' }).first().inputValue(), d: await S().getByRole('combobox', { name: 'ปลายทาง' }).first().inputValue() });
try {
  await home(page);
  // multi-select on origin
  await S().getByRole('combobox', { name: 'ต้นทาง' }).first().click(); await page.waitForTimeout(800);
  await D().getByRole('button', { name: /เลือกสนามบินหลายแห่ง/ }).click(); await page.waitForTimeout(1000);
  await shot(page, '20-origin-multiselect');
  console.log(await snap(page, '20-origin-multiselect', D()));
  // add DMK only? try typing another city in multi mode
  const inp = D().getByRole('combobox').first();
  log('multi input label:', await inp.getAttribute('aria-label'), 'val:', await inp.inputValue());
  await inp.pressSequentially('ภูเก็ต', { delay: 60 }); await page.waitForTimeout(1800);
  await shot(page, '21-origin-multiselect-typed');
  console.log(await D().ariaSnapshot());
  // click first option (checkbox?) 
  const opt = D().getByRole('checkbox', { name: 'ภูเก็ต', exact: true });
  if (await opt.count()) { await opt.click(); await page.waitForTimeout(1000); }
  await shot(page, '22-origin-multiselect-added');
  console.log(await snap(page, '22-origin-multiselect-added', D()));
  const done = D().getByRole('button', { name: /เสร็จ/ });
  if (await done.count()) { await done.click(); await page.waitForTimeout(800); }
  else { await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
  log('after multi:', JSON.stringify(await val()), 'aria:', await S().getByRole('combobox', { name: /ต้นทาง/ }).first().getAttribute('aria-label'));
  await shot(page, '23-origin-multi-result');
  console.log(await snap(page, '23-origin-multi-result', S()));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-04c'); }
finally { await browser.close(); }

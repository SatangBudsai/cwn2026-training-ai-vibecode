import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
try {
  await home(page);
  // ticket type
  await page.getByRole('combobox', { name: /เปลี่ยนประเภทตั๋ว/ }).click();
  await page.waitForTimeout(800);
  await shot(page, '02-tickettype-open');
  console.log(await snap(page, '02-tickettype-open', page.getByRole('listbox').first()));
  await page.keyboard.press('Escape');
  // class
  await page.getByRole('combobox', { name: /เปลี่ยนชั้นโดยสาร/ }).click();
  await page.waitForTimeout(800);
  await shot(page, '03-class-open');
  console.log(await snap(page, '03-class-open', page.getByRole('listbox').last()));
  await page.keyboard.press('Escape');
  // pax
  await page.getByRole('button', { name: /เปลี่ยนจำนวนผู้โดยสาร/ }).click();
  await page.waitForTimeout(800);
  await shot(page, '04-pax-open');
  console.log(await snap(page, '04-pax-open', page.getByRole('dialog').first()));
  // multi-city
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: /เปลี่ยนประเภทตั๋ว/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: 'หลายเมือง' }).click();
  await page.waitForTimeout(1000);
  await shot(page, '05-multicity');
  console.log(await snap(page, '05-multicity', page.getByRole('search').first()));
  await page.getByRole('combobox', { name: /เปลี่ยนประเภทตั๋ว/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: 'เที่ยวเดียว' }).click();
  await page.waitForTimeout(1000);
  await shot(page, '06-oneway');
  console.log(await snap(page, '06-oneway', page.getByRole('search').first()));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-02'); }
finally { await browser.close(); }

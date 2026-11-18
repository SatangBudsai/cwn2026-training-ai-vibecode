// เส้นทางมาตรฐาน: กรุงเทพ → โตเกียว · เที่ยวเดียว · อา. 15 พ.ย. 2026 · ผู้ใหญ่ 1 · ชั้นประหยัด
// ใช้: PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node scripts/standard-route.mjs
import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const S = page.getByRole('search', { name: 'เที่ยวบิน' });
try {
  await home(page);                                                             // 1 เปิด START URL
  await S.getByRole('combobox', { name: /^เปลี่ยนประเภทตั๋ว/ }).click();          // 2 ประเภทตั๋ว
  await page.getByRole('listbox', { name: 'เลือกประเภทตั๋ว' }).getByRole('option', { name: 'เที่ยวเดียว', exact: true }).click();
  // 3 ผู้โดยสาร: ค่าเริ่มต้น 1 (ตรวจเท่านั้น) · 4 ชั้นโดยสาร: ค่าเริ่มต้น ชั้นประหยัด (ตรวจเท่านั้น)
  if (!/ผู้โดยสาร 1 คน/.test(await S.getByRole('button', { name: /^ผู้โดยสาร/ }).getAttribute('aria-label'))) throw new Error('pax != 1');
  await S.getByRole('combobox', { name: 'เปลี่ยนชั้นโดยสาร ชั้นประหยัด' }).waitFor();
  // 5 ต้นทาง
  await S.getByRole('combobox', { name: /^ต้นทาง/ }).click();
  let dlg = page.getByRole('dialog', { name: 'ป้อนต้นทาง' });
  await dlg.getByRole('combobox', { name: 'มีต้นทางอื่นอีกไหม' }).fill('กรุงเทพ');
  await dlg.getByRole('option', { name: 'กรุงเทพมหานคร', exact: true }).click();
  // 6 ปลายทาง
  await S.getByRole('combobox', { name: /^ปลายทาง/ }).click();
  dlg = page.getByRole('dialog').filter({ visible: true }).first();
  await dlg.getByRole('combobox').first().fill('โตเกียว');
  await dlg.getByRole('option', { name: 'โตเกียว ญี่ปุ่น', exact: true }).click();
  // 7 วันที่
  await S.getByRole('textbox', { name: 'ขาไป' }).click();
  dlg = page.getByRole('dialog').filter({ visible: true }).first();
  const day = dlg.getByRole('button', { name: /^วันอาทิตย์ที่ 15 พฤศจิกายน ค\.ศ\. 2026/ });
  await day.waitFor();
  await page.waitForFunction(el => /฿/.test(el.innerText), await day.elementHandle(), { timeout: 8000 }).catch(() => {}); // รอราคา (ไม่บังคับ)
  log('ราคาในปฏิทิน 15 พ.ย.:', (await day.innerText()).replace(/\s+/g, ' '));
  await day.click();
  await dlg.getByRole('button', { name: /^เสร็จ/ }).click();
  const v = { o: await S.getByRole('combobox', { name: /^ต้นทาง/ }).inputValue(), d: await S.getByRole('combobox', { name: /^ปลายทาง/ }).inputValue(), dep: await S.getByRole('textbox', { name: 'ขาไป' }).inputValue() };
  log('form:', JSON.stringify(v));
  await shot(page, '90-standard-form-ready');
  await snap(page, '90-standard-form-ready', S);
  // 8 ค้นหา
  await S.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await page.waitForURL(/\/travel\/flights\/search\?/, { timeout: 30000 });
  if (/sorry/.test(page.url())) throw new Error('CAPTCHA');
  // 9 รอผล: ถ้าเจอ "อ๊ะ มีบางอย่างผิดพลาด" ให้กด "โหลดซ้ำ" (สูงสุด 2 ครั้ง)
  const ok = page.getByRole('heading', { name: 'เที่ยวบินยอดนิยม' }).or(page.getByRole('heading', { name: 'เที่ยวบินทั้งหมด' }));
  const oops = page.getByText('อ๊ะ มีบางอย่างผิดพลาด');
  for (let tries = 0; tries < 3; tries++) {
    await ok.or(oops).first().waitFor({ timeout: 30000 });
    if (!(await oops.isVisible())) break;
    log('เจอ "อ๊ะ มีบางอย่างผิดพลาด" → กด "โหลดซ้ำ"', tries + 1);
    await shot(page, '92-results-oops');
    await page.waitForTimeout(5000 * (tries + 1));
    await page.getByRole('button', { name: 'โหลดซ้ำ' }).click();
    await page.waitForTimeout(2000);
  }
  await ok.first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  log('results url:', page.url());
  const h = await page.getByRole('heading').allInnerTexts();
  log('headings on results:', JSON.stringify(h.slice(0, 10)));
  await shot(page, '91-standard-results');
  await snap(page, '91-standard-results-top', page.getByRole('main'));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-standard'); process.exitCode = 1; }
finally { await browser.close(); }

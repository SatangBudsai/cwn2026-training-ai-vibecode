// สถานการณ์ differential: แต่ละตัวเริ่มจากหน้าผลค้นหาสด (เส้นทางมาตรฐาน) แล้วทำตามที่ผู้ใช้ทำ
// ตัวดึงผลอ่านจากชื่อที่ผู้ใช้เห็น (link "ราคาเริ่มต้นที่ …", ปุ่ม/ชิป/slider ตามชื่อบนจอ) จึงใช้กับต้นฉบับและโคลนได้เหมือนกัน
import fs from 'node:fs';
import { parseRow, rows, resultCount, showAll, waitStable, recover, openChip, closeChip, slideTo, log } from '../lib.mjs';

// ผลมาตรฐานของรายการ: จำนวน · ลำดับราคา · สายการบิน · เวลาออก · จำนวนแวะพัก
export async function listResult(page, extra = {}) {
  const r = await rows(page);
  return {
    count: r.length,
    resultText: await resultCount(page),
    prices: r.map(x => x.price),
    airlines: r.map(x => x.airline),
    deps: r.map(x => x.dep),
    stops: r.map(x => x.stops),
    ...extra,
  };
}

export const SCENARIOS = [
  { id: 'initial', title: 'รายการเริ่มต้น', run: async page => listResult(page) },

  { id: 'cheapest-tab', title: 'แท็บถูกที่สุด', run: async page => {
    await page.getByRole('tab', { name: /^ถูกที่สุด/ }).filter({ visible: true }).first().click();
    await page.waitForTimeout(1500); await recover(page); await waitStable(page);
    return listResult(page);
  } },

  { id: 'more', title: 'ดูเที่ยวบินเพิ่มเติม', run: async page => {
    const clicks = await showAll(page);
    return listResult(page, { moreClicks: clicks });
  } },

  { id: 'nonstop', title: 'บินตรง', run: async page => {
    const d = await openChip(page, 'จำนวนครั้งที่แวะพัก');
    await d.getByRole('radio', { name: 'บินตรงเท่านั้น' }).click();
    await page.waitForTimeout(1500); await closeChip(page); await showAll(page);
    return listResult(page);
  } },

  { id: 'thai-only', title: 'สายการบินเดียว (การบินไทย)', run: async page => {
    const d = await openChip(page, 'สายการบิน');
    await d.getByRole('checkbox', { name: 'การบินไทย', exact: true }).hover();
    await page.waitForTimeout(600);
    // ปุ่ม "เท่านั้น" โผล่เมื่อชี้เมาส์ · ชื่อที่ผู้ใช้ได้ยิน (aria-label) = "การบินไทย เท่านั้น"
    await d.getByRole('button', { name: 'การบินไทย เท่านั้น' }).or(d.getByLabel('การบินไทย เท่านั้น', { exact: true })).first().click();
    await page.waitForTimeout(1500); await closeChip(page); await showAll(page);
    return listResult(page);
  } },

  { id: 'price-max-10000', title: 'ราคาไม่เกิน ฿10,000', run: async page => {
    await openChip(page, 'ราคา');
    const v = await slideTo(page, 'ราคา', 'ราคาสูงสุด', 'ArrowLeft', v => v <= 10000);
    await closeChip(page); await showAll(page);
    return listResult(page, { sliderValue: v });
  } },

  { id: 'depart-23-24', title: 'ออกเดินทาง 23:00–24:00', run: async page => {
    await openChip(page, 'เวลา');
    const v = await slideTo(page, 'เวลา', 'เวลาออกเดินทางที่เร็วที่สุด', 'ArrowRight', v => v >= 23);
    await closeChip(page); await showAll(page);
    return listResult(page, { sliderValue: v });
  } },

  { id: 'layover-details', title: 'รายละเอียดเที่ยวบินที่แวะพัก', run: async page => {
    // แถวแรกในรายการเริ่มต้นที่ไม่ใช่บินตรง → กดปุ่ม "รายละเอียดเที่ยวบิน …" ของแถวนั้น
    const item = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^ราคาเริ่มต้นที่ \d+ บาทไทย เดินทางด้วยเที่ยวบินแบบแวะพัก/ }) }).filter({ visible: true }).first();
    await item.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).click();
    await page.waitForTimeout(2000);
    const y = await item.ariaSnapshot();
    const txt = y.replace(/\s+/g, ' ');
    const name = (y.match(/link "(ราคาเริ่มต้นที่ [^"]*)"/) || [])[1];
    return {
      row: name ? parseRow(name) : null,
      flightNumbers: [...txt.matchAll(/\b([A-Z][A-Z0-9]|[0-9][A-Z]) (\d{1,4})\b(?! (?:กก|ซม|นาที|ชม))/g)].map(m => `${m[1]} ${m[2]}`),
      legTimes: [...txt.matchAll(/(\d{1,2}:\d{2})·([^"(]+?) \(([A-Z]{3})\)/g)].map(m => `${m[1]} ${m[3]}`),
      layovers: [...txt.matchAll(/หยุดพักนาน ([^·"]+?)·([^"(]+?) \(([A-Z]{3})\)/g)].map(m => ({ duration: m[1].trim(), city: m[2].trim(), code: m[3] })),
      hasSelectButton: /button "เลือกเที่ยวบิน"/.test(y),
    };
  } },
];

// รันทุกสถานการณ์ · start(page) = พาไปหน้าผลค้นหาสถานะเริ่มต้น
export async function runAll(newPage, start, only, { onResult, shotsDir } = {}) {
  const out = {};
  for (const s of SCENARIOS) {
    if (only && !only.includes(s.id)) continue;
    const page = await newPage();
    try {
      await start(page);
      out[s.id] = { title: s.title, ...(await s.run(page)) };
      log('✓', s.id, JSON.stringify(out[s.id]).slice(0, 160));
    } catch (e) {
      out[s.id] = { title: s.title, error: e.message.split('\n')[0] };
      log('✗', s.id, e.message.split('\n')[0]);
    } finally {
      if (shotsDir) {   // หลักฐานของแต่ละสถานการณ์: ภาพเต็มหน้า + ariaSnapshot
        await page.screenshot({ path: `${shotsDir}/${s.id}.png`, fullPage: true }).catch(() => {});
        await page.locator('body').ariaSnapshot().then(y => fs.writeFileSync(`${shotsDir}/${s.id}.yml`, y)).catch(() => {});
      }
      await page.close().catch(() => {});
      if (onResult) onResult(s.id, out[s.id]);
    }
  }
  return out;
}

// node flights/count.mjs <BASE_URL>
// → จำนวนแถวเที่ยวบินตอนแรก และหลังกด "ดูเที่ยวบินเพิ่มเติม" (นับ link "ราคาเริ่มต้นที่ …" ที่ผู้ใช้เห็น)
// ค่าเป้าหมาย: หลังกด = count ใน spec/data/flights-all.json · ตอนแรก = รายการเริ่มต้นของต้นฉบับ (diff/expected.json → initial.count)
import fs from 'node:fs';
import { open, standardRoute, rows, resultCount, showAll } from '../lib.mjs';

const base = process.argv[2];
if (!base) { console.error('ใช้: node flights/count.mjs <BASE_URL>'); process.exit(2); }
const D = new URL('.', import.meta.url).pathname;
const data = JSON.parse(fs.readFileSync(D + '../../spec/data/flights-all.json', 'utf8'));
const exp = JSON.parse(fs.readFileSync(D + '../diff/expected.json', 'utf8')).scenarios;
const target = { initial: exp.initial?.count ?? null, afterMore: data.count ?? data.flights.length };

const { browser, page } = await open();
try {
  await standardRoute(page, base);
  const initial = (await rows(page)).length, initialText = await resultCount(page);
  const clicks = await showAll(page);
  const afterMore = (await rows(page)).length, afterMoreText = await resultCount(page);
  const out = { base, initial, initialText, clicks, afterMore, afterMoreText, target,
    pass: { initial: initial === target.initial, afterMore: afterMore === target.afterMore } };
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = out.pass.initial && out.pass.afterMore ? 0 : 1;
} finally { await browser.close(); }

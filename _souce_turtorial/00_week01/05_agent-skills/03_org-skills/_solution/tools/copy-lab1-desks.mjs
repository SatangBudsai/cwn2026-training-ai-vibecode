// ข้าม LAB 1 บางโต๊ะ: คัดลอก skill + work จากผลรันจริง (_solution/desks-after-lab1) ไปไว้ที่โต๊ะใน novatech/desks
// เฉพาะโต๊ะที่ยังไม่มี skill ของตัวเอง (โต๊ะที่ทำเองแล้วไม่ถูกทับ)
// ใช้: เปิด terminal ที่ novatech/ แล้วรัน  node ../_solution/tools/copy-lab1-desks.mjs
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = join(here, '..', 'desks-after-lab1');
const desks = join(here, '..', '..', 'novatech', 'desks');

for (const user of readdirSync(src)) {
  const mine = join(desks, user, '.claude', 'skills');
  if (existsSync(mine) && readdirSync(mine).length) { console.log(`ข้าม  ${user} (มี skill ของตัวเองแล้ว)`); continue; }
  cpSync(join(src, user, 'skills'), mine, { recursive: true });
  if (existsSync(join(src, user, 'work'))) cpSync(join(src, user, 'work'), join(desks, user, 'work'), { recursive: true, force: false });
  console.log(`คัดลอก ${user} → ${readdirSync(mine).join(', ')}`);
}

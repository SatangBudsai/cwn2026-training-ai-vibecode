import { gif } from './kit.mjs';
import { OUT, brand, lesson, port, bg, head, foot, arrow, varrow } from './parts.mjs';
const only = process.argv[2];
const go = async (n, o) => { if (!only || n.includes(only)) await gif(`${OUT}/${n}.gif`, o); };

// ภาพรวมบท
const phases = [['🟢', 'ฟังร้าน', 'LAB 1–4', 'User Story · FR/BR/NFR · System Design · ข้อมูลทดสอบ', 'c-listen'], ['🟡', 'สร้างเว็บ', 'LAB 5–6', 'BUILD-PROMPT · agent 16 ตัว · Next.js + PostgreSQL', 'c-build'], ['🔵', 'สำรวจ', 'LAB 7–9', 'Charter · agent สำรวจขนาน · รวมผล + ผู้ตัดสินความเสี่ยง', 'c-parallel'], ['🟠', 'เขียนแผน', 'LAB 10–11', 'TEST-PLAN ละเอียด · รีวิวโดยคนที่ไม่ได้เขียน', 'c-writers'], ['🟣', 'พิสูจน์', 'LAB 12–13', 'Playwright ขนาน · GIF หลักฐาน · ล่าบั๊กปริศนา', 'c-bughunt']];
await go('overview-5-phases', { dur: 16, html: `${bg(brand('shop/hero-dusk'), 'full')}${head('ภาพรวมบท', 'จากบันทึกสัมภาษณ์ 1 ชุด สู่เว็บและรายงานทดสอบ')}
  ${phases.map((p, i) => { const x = 40 + i * 243, d = .8 + i * 2; return `<div class="abs pop" style="--d:${d}s;left:${x}px;top:150px;width:228px"><img class="ph" style="width:228px;height:150px;border-radius:14px 14px 0 0" src="${lesson(p[4])}"><div class="card" style="border-radius:0 0 14px 14px;padding:10px 12px;min-height:212px"><div style="font:700 25px Serif;color:var(--leaf)">${p[1]}</div><div style="font-size:18px;font-weight:700;color:#7b5d17">${p[2]}</div><p style="font-size:18px;line-height:1.35;margin-top:6px">${p[3]}</p></div></div>${i < 4 ? arrow(x + 228, 300, 14, d + 1.2, 'var(--gold2)', false, .3) : ''}`; }).join('')}
  <div class="abs in" style="--d:11s;left:40px;right:40px;top:560px;text-align:center;font:700 34px Serif;color:var(--gold2)">ร้านขอ ≠ AI บอกว่าทำแล้ว ≠ เว็บทำจริง</div>
  ${foot('งานของ tester คือพิสูจน์ ไม่ใช่เชื่อ', 13)}` });

// ฟัง 3 ทาง
await go('oracle-badges', { dur: 13, html: `${bg(lesson('c-oracle-scale'), 'full')}${head('หัวใจของบท', 'ผลที่คาดหวังมาจากไหน เชื่อได้แค่ไหน')}
  ${[['D', 'ร้าน', 'เจ้าของร้านพูดเอง: USER-STORIES · REQUIREMENTS · TEST-DATA', 'สูงสุด', 100, 'var(--green)'], ['R', 'กฎทั่วไป', 'คณิตศาสตร์ สามัญสำนึก ต้องเขียนเหตุผล', 'ดี', 76, '#b58a1f'], ['A', 'AI ผู้สร้าง', 'web/SPEC.md และรายงานท้าย LAB 6 คนสร้างตรวจงานตัวเอง', 'ต่ำ', 42, 'var(--amber)'], ['O', 'หน้าจอ', 'สิ่งที่เห็นตอนสำรวจ เว็บอาจผิดอยู่แล้ว', 'ต่ำสุด', 18, 'var(--red)']].map((r, i) => { const y = 140 + i * 96, d = 1 + i * 1.8; return `<div class="abs left" style="--d:${d}s;left:48px;top:${y}px;width:690px"><div class="card" style="display:flex;gap:14px;align-items:center;padding:10px 16px"><span class="tag ${r[0]}" style="font-size:28px;padding:4px 16px">[${r[0]}]</span><div><h3 style="font-size:24px">${r[1]}</h3><p style="font-size:18px;line-height:1.3">${r[2]}</p></div></div></div><div class="abs" style="left:760px;top:${y + 22}px;width:360px;height:30px;background:rgba(255,255,255,.14);border-radius:15px"><div class="grow" style="--d:${d + .5}s;--t:.9s;height:30px;width:${r[4]}%;background:${r[5]};border-radius:15px"></div></div><div class="abs in" style="--d:${d + .9}s;left:1132px;top:${y + 16}px;font-size:24px;font-weight:700">${r[3]}</div>`; }).join('')}
  ${foot('ทุกข้อต้องมี [D] หรือ [R] · ถ้ามีแค่ [A] หรือ [O] ติด [O-ยังไม่ยืนยัน] แล้วถามร้าน', 9)}` });

await go('bake-bug', { dur: 12, html: `${bg(lesson('c-bake'), 'lite')}
  <div class="abs" style="left:48px;top:26px"><div class="kick in">กับดักที่ต้องจำ</div><h1 class="in" style="--d:.2s;font-size:42px">อย่าอบบั๊กลงในผลที่คาดหวัง</h1></div>
  <div class="abs card left" style="--d:1.5s;left:48px;top:430px;width:380px;border:3px solid var(--red)"><h3 style="color:var(--red)">ลอกจากหน้าจอ</h3><p>เว็บคิดผิด ฿3,810</p><p>expect = ฿3,810</p><p class="in" style="--d:3.5s;font-weight:700;color:var(--red)">test ผ่านตลอดไป ทั้งที่ผิด</p></div>
  <div class="abs card right" style="--d:5s;left:852px;top:430px;width:380px;border:3px solid var(--green)"><h3 style="color:var(--green)">คิดจากกฎร้านก่อน</h3><p>฿4,000 − 10% − ฿100 + ฿300</p><p>expect = ฿3,800</p><p class="in" style="--d:7s;font-weight:700;color:var(--green)">เว็บ ฿3,810 → test ล้ม จับบั๊กได้</p></div>
  ${foot('ตัวเลขเงิน คิดจาก [D] + [R] ก่อนเปิดเว็บเสมอ', 9)}` });

// LAB 4
const rows = [['E05', 'นวดไทย 60 นาที รอบ 20:30', '20:30 + 60 นาที = 21:30', '✓ จองได้'], ['E88', 'คุณเมย์ S04 รถ 12 กม. ร้านกดเสร็จ', '฿2,000 + รถ ฿300 = จ่าย ฿2,300 · ฐานแต้ม ฿2,000', '20 แต้ม'], ['E135', 'คุณต้น นวดเท้า เลือกเดือนเกิด', '฿800 − 20% (฿160)', '฿640']];
await go('lab4-test-data', { dur: 14, html: `${bg(lesson('c-stamp'))}${head('LAB 4 · ข้อมูลทดสอบ', 'ชุดเดียวใช้ทั้งเว็บ และเป็นผลที่คาดหวังของ test')}
  ${rows.map((r, i) => `<div class="abs left" style="--d:${1 + i * 1.6}s;left:48px;top:${150 + i * 104}px;width:760px"><div class="card" style="padding:10px 16px"><div style="display:flex;justify-content:space-between;align-items:center"><b class="mono" style="font-size:22px;color:#7b5d17">${r[0]}</b><span class="tag D">[D+R]</span></div><p style="font-weight:600;font-size:21px">${r[1]}</p><p style="font-size:19px">${r[2]} → <b style="color:var(--green)">${r[3]}</b></p></div></div>`).join('')}
  <div class="abs right" style="--d:6.2s;left:840px;top:150px;width:396px"><div class="card dark" style="text-align:center"><p>subagent ตัวใหม่คิดเงินซ้ำ<br>โดยไม่เห็นคำตอบ</p><div style="font:700 62px Serif;color:#9be3b6">137/137</div><p>แถว ตรงทั้งหมด</p></div></div>
  <div class="abs right" style="--d:8.2s;left:840px;top:390px;width:396px"><div class="card dark" style="text-align:center"><div style="font:700 50px Serif;color:var(--gold2)">E01–E253</div><p>ค่าขอบครบทุก BR<br>เว็บ 227 · unit test 26</p></div></div>
  ${foot('ผลจริง: ข้อมูลทดสอบ 452 แถว · ผู้ใช้ 12 บัญชี · สมมติฐาน ⚠️ 20 ข้อ แยกไว้ชัดเจน', 10.4)}` });

// LAB 5
await go('lab5-meta-prompt', { dur: 12, html: `${bg(lesson('c-meta'))}${head('LAB 5 · พรอมต์ที่เขียนพรอมต์', 'ให้ Claude เขียนใบสั่งงาน แล้วเราอ่านตรวจก่อนใช้')}
  ${[['อ่านเอกสาร 3 ไฟล์', 'REQUIREMENTS · DESIGN · TEST-DATA + brand-kit'], ['เขียนใบสั่งงาน', 'BUILD-PROMPT.md 127 บรรทัด ยังไม่มีโค้ด'], ['คนอ่านตรวจ', 'ตัวเลข รูป บั๊กลับ และการแบ่ง agent ตรงไหม'], ['เปิดหน้าต่างใหม่แล้ววาง', 'Claude ตัวใหม่ไม่มีความจำเดิม พิสูจน์ว่าใบสั่งครบจริง']].map((s, i) => `<div class="abs left" style="--d:${1 + i * 1.9}s;left:48px;top:${140 + i * 104}px;width:760px"><div class="card" style="display:flex;gap:16px;align-items:center;padding:12px 18px"><div style="width:54px;height:54px;border-radius:50%;background:var(--leaf);color:var(--gold2);font:700 28px Serif;display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</div><div><h3 style="font-size:25px">${s[0]}</h3><p style="font-size:20px">${s[1]}</p></div></div></div>`).join('')}
  ${foot('ใบสั่งงานใช้ซ้ำได้ ถ้าเว็บพังก็สร้างใหม่ได้จากไฟล์เดียว', 9.4)}` });

// LAB 6
const A = ['A1 จอง ยกเลิก', 'A2 ราคา แต้ม', 'A3 สมาชิก', 'A4 คอร์ส บัตร', 'A5 บริการ แชต'];
const F = ['F1 หน้าแรก', 'F2 บริการ', 'F3 ทีมงาน', 'F4 หน้าจอง', 'F5 บัญชี', 'F6 Wallet', 'F7 บัตร รถ', 'F8 แชต ผิว 360°'];
const chip = (t, x, y, d, c) => `<div class="abs pop" style="--d:${d}s;left:${x}px;top:${y}px;width:148px;background:${c};border:1.5px solid var(--gold2);border-radius:10px;padding:6px 4px;text-align:center;font-size:18px;font-weight:700;color:#fff">${t}</div>`;
await go('lab6-multi-agent', { dur: 16, html: `${bg(lesson('c-build'), 'full')}${head('LAB 6 · สร้างเว็บแบบ multi-agent', 'หัวหน้าเขียนสัญญากลางก่อน ลูกทีมจึงแยกกันทำได้')}
  <div class="abs in" style="--d:1s;left:40px;top:136px;width:300px"><div class="card"><h3>ช่วง A · หัวหน้า</h3><p style="font-size:19px">โครงโปรเจกต์ · db/ · type กลาง · i18n · design system</p><p style="font-size:20px;font-weight:700;color:var(--red);margin-top:6px">API-CONTRACT.md<br>ตารางเจ้าของไฟล์</p></div></div>
  ${arrow(342, 250, 30, 3.2)}
  <div class="abs in" style="--d:3.4s;left:386px;top:128px;font:700 24px Serif;color:var(--gold2)">ช่วง B · 13 ตัวทำพร้อมกัน</div>
  ${A.map((t, i) => chip(t, 386 + (i % 3) * 156, 168 + Math.floor(i / 3) * 44, 3.8 + i * .18, '#245a92')).join('')}
  ${F.map((t, i) => chip(t, 386 + (i % 3) * 156, 268 + Math.floor(i / 3) * 44, 4.8 + i * .18, '#7b5d17')).join('')}
  <div class="abs in" style="--d:6.6s;left:386px;top:406px;width:470px;font-size:20px;line-height:1.35;font-weight:600">แก้ได้เฉพาะไฟล์ของตัวเอง · สัญญาขาดให้จดโน้ต ไม่แก้ไฟล์กลาง · ห้ามรู้เรื่องบั๊กลับ</div>
  ${arrow(858, 250, 26, 8)}
  <div class="abs in" style="--d:8.2s;left:900px;top:136px;width:340px"><div class="card"><h3>ช่วง C · รวมงาน</h3><p style="font-size:19px">หัวหน้าแก้จุดต่อ · ฝังบั๊กลับ · เขียน SPEC · build Docker</p></div></div>
  <div class="abs in" style="--d:10s;left:900px;top:304px;width:340px"><div class="card dark"><h3>ตรวจ 2 ตัว</h3><p style="font-size:19px"><b>V1</b> เปิดทุกหน้า แก้ดีไซน์<br><b>V2</b> ยิงตารางค่าขอบ แก้กฎ</p></div></div>
  <div class="abs in" style="--d:11.6s;left:40px;top:330px;width:300px"><div class="card dark"><p style="font-size:20px;line-height:1.35">หน้าเว็บกับ API ทำพร้อมกันได้ เพราะทุกคนยึดสัญญาเดียวกัน</p></div></div>
  ${foot('แยกงานตามไฟล์ที่ไม่ทับกัน ไม่ใช่แบ่งตามจำนวน agent', 13)}` });

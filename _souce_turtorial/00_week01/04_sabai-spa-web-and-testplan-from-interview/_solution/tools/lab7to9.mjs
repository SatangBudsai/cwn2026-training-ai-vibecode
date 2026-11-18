import { gif } from './kit.mjs';
import { OUT, brand, lesson, port, bg, head, foot, arrow, varrow } from './parts.mjs';
import { readFileSync } from 'node:fs';
const only = process.argv[2];
const go = async (n, o) => { if (!only || n.includes(only)) await gif(`${OUT}/${n}.gif`, o); };

// LAB 7 · ฟัง 3 ทาง
const col = (x, tag, title, img, items, d, c) => `<div class="abs left" style="--d:${d}s;left:${x}px;top:128px;width:388px"><div class="card" style="padding:12px 16px;min-height:330px;border:2.5px solid ${c}"><div style="display:flex;gap:10px;align-items:center">${img}<div><span class="tag ${tag}">[${tag}]</span><h3 style="font-size:24px">${title}</h3></div></div>${items.map((t, i) => `<p class="in" style="--d:${d + .8 + i * .7}s;font-size:19px;line-height:1.35;margin-top:9px">• ${t}</p>`).join('')}</div></div>`;
await go('lab7-three-voices', { dur: 14, html: `${bg(lesson('c-three-voices'), 'full')}${head('LAB 7 · ฟัง 3 ทาง', 'ฟังร้านก่อน ฟัง AI แล้วค่อยเปิดเว็บ')}
  ${col(40, 'D', 'ร้านบอก', `<img class="port" style="width:64px;height:64px" src="${brand('people/owner-chan')}">`, ['เมนู 9 รายการ · นักบำบัด 6 คน', 'จองได้พรุ่งนี้ถึง +30 วัน', 'คิดราคา 5 ขั้น · Gold 5%'], .8, 'var(--green)')}
  ${col(446, 'A', 'AI อ้าง', `<img class="port" style="width:64px;height:64px" src="${lesson('robot-ref')}">`, ['SPEC มี 19 แถวหน้า · 3 ภาษา', 'จอง "3 หน้าจอ (ระบบ 4 ขั้น)"', 'ตรวจกฎผ่าน 227/227'], 3.2, 'var(--amber)')}
  ${col(852, 'O', 'เว็บจริง', `<img class="ph" style="width:64px;height:64px;border-radius:50%" src="${lesson('c-recon')}">`, ['ทุกหน้าตอบ 200 รูปไม่เสีย', 'data-bug-mode="0"', 'นาฬิกาล็อก 15 มิ.ย. 2026 10:00'], 5.6, 'var(--red)')}
  <div class="abs pop" style="--d:8.6s;left:150px;right:150px;top:480px"><div class="card dark" style="text-align:center;padding:14px"><p style="font-size:24px;font-weight:700;color:var(--gold2)">ลองเทียบดู: หน้าแรกเขียน "บริการ 9" แต่หน้าจองเลือกได้ 8</p><p class="in" style="--d:9.8s">ยังไม่ใช่บั๊ก แต่เป็นเบาะแสให้ส่งต่อ charter ที่รับผิดชอบ</p></div></div>
  ${foot('เรียงลำดับนี้เพื่อไม่ให้หน้าจอชักนำความคิดของเรา', 11.4)}` });

// LAB 7 · แจก charter
const ch = [['C1', 'รอบเวลา ปฏิทิน นักบำบัด', 8, 'P1'], ['C2', 'จองคู่ จองกลุ่ม', 8, 'P1'], ['C3', 'ราคา ส่วนลด แต้ม', 10, 'P1'], ['C4', 'รถรับส่ง Bangkok Relax', 6, 'P2'], ['C5', 'คอร์ส Wallet Gift Card', 8, 'P1'], ['C6', 'ภาษา แชต ตัวช่วย สิทธิ์', 1, 'P2'], ['ปิดท้าย', 'ยกเลิก กดเสร็จ reset นาฬิกา', 9, 'P1']];
await go('lab7-charters', { dur: 14, html: `${bg(lesson('c-charter'))}${head('LAB 7 · Charter', 'BR ทุกข้อมีเจ้าของ 1 ภารกิจ')}
  <div class="abs in" style="--d:.8s;left:48px;top:122px;width:800px;font-size:23px;font-weight:600">สำรวจ <span style="color:var(--gold2)">&lt;ส่วนของเว็บ&gt;</span> ด้วย <span style="color:var(--gold2)">&lt;ข้อมูล&gt;</span> เพื่อหา <span style="color:var(--gold2)">&lt;กฎ ความเสี่ยง&gt;</span></div>
  ${ch.map((c, i) => `<div class="abs left" style="--d:${1.6 + i * .95}s;left:48px;top:${168 + i * 62}px;width:760px"><div class="card" style="padding:7px 14px;display:flex;align-items:center;gap:14px"><b style="font:700 24px Serif;color:var(--leaf);width:92px">${c[0]}</b><span style="flex:1;font-size:21px;font-weight:600">${c[1]}</span><span style="font-size:19px;font-weight:700;color:#7b5d17">BR ${c[2]} ข้อ</span><span class="tag ${c[3]}">${c[3]}</span></div></div>`).join('')}
  <div class="abs pop" style="--d:9s;left:840px;top:200px;width:390px"><div class="card dark" style="text-align:center"><div style="font:700 66px Serif;color:var(--gold2)">50/50</div><p>BR มีเจ้าของครบ</p></div></div>
  ${foot('ถ้าไม่มีเจ้าของ กฎข้อนั้นจะหายไปเงียบ ๆ ระหว่าง agent หลายตัว', 11)}` });

// LAB 7 · กติกากันชน
const days = [['17', 'C3'], ['19', 'C5·C2'], ['20', 'C5·C2'], ['21', 'C5'], ['22', 'C1'], ['27', 'C6'], ['2–3 ก.ค.', 'C1'], ['4–5 ก.ค.', 'C2'], ['6–8 ก.ค.', 'C3'], ['9–10 ก.ค.', 'C4'], ['11–13 ก.ค.', 'C5'], ['14 ก.ค.', 'C1']];
const cc = { C1: '#245a92', C2: '#7b5d17', C3: '#2c6a4d', C4: '#7a3e8c', C5: '#a0472f', C6: '#3f6f73' };
await go('lab7-collision', { dur: 14, html: `${bg(lesson('c-collision'))}${head('LAB 7 · กติกากันชนกัน', 'ทุก agent ใช้เว็บเดียวกัน ของกลางจึงต้องมีเจ้าของ')}
  <div class="abs left" style="--d:.9s;left:48px;top:130px;width:360px"><div class="card" style="border:3px solid var(--red)"><h3 style="color:var(--red)">reset = ล้างทั้งเว็บ</h3><p>ถ้า agent ตัวหนึ่งกด ข้อมูลของทุกตัวหาย และนาฬิกาเปลี่ยน</p><p style="font-weight:700;margin-top:6px">ผู้ประสานงานกดครั้งเดียวก่อนเริ่ม</p></div></div>
  <div class="abs left" style="--d:3s;left:48px;top:340px;width:360px"><div class="card"><h3>Couple Suite มีห้องเดียว</h3><p>C2 เป็นเจ้าของ</p><h3 style="margin-top:8px">บัญชีตัวอย่าง</h3><p>คุณนิดา: C5 เขียน · C6 อ่าน</p></div></div>
  <div class="abs in" style="--d:4.8s;left:440px;top:128px;font:700 26px Serif;color:var(--gold2)">แบ่งวันนัดให้แต่ละ charter (จริงจาก CHARTERS.md)</div>
  <div class="abs" style="left:440px;top:172px;width:800px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${days.map((d, i) => { const k = d[1].split('·')[0]; return `<div class="pop" style="--d:${5.2 + i * .27}s;background:${cc[k]};border:1.5px solid var(--gold2);border-radius:12px;text-align:center;padding:9px 2px;color:#fff"><div style="font-size:21px;font-weight:700">${/ก\.ค\./.test(d[0]) ? d[0] : d[0] + ' มิ.ย.'}</div><div style="font-size:23px">${d[1]}</div></div>`; }).join('')}</div>
  <div class="abs in" style="--d:9.2s;left:440px;top:452px;width:800px"><div class="card dark"><p>เรื่องที่ต้องเลื่อนนาฬิกาหรือ reset รวมไว้ที่ <b style="color:var(--gold2)">charter ปิดท้าย</b> ทำคนเดียวหลังตัวอื่นจบ</p></div></div>
  ${foot('เบราว์เซอร์แยกกันแล้วยังไม่พอ ข้อมูลกลางบนเว็บก็ต้องแบ่งด้วย', 11)}` });

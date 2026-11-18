import { gif } from './kit.mjs';
import { OUT, lesson, bg, head, foot, arrow } from './parts.mjs';
const only = process.argv[2];
const go = async (n, o) => { if (!only || n.includes(only)) await gif(`${OUT}/${n}.gif`, o); };
const S = ['5.1 จองคิว', '5.2 คู่ กลุ่ม', '5.3 ราคา แต้ม', '5.4 รถ แพ็กเกจ', '5.5 คอร์ส', '5.6 Gift Card', '5.7 ยกเลิก สิทธิ์', '5.8 แชต ภาษา'];
await go('lab12-shards', { dur: 14, html: `${bg(lesson('c-test-run'), 'full')}${head('LAB 12 · test ขนานแบบแยกเว็บ', 'reset ล้างทั้งเว็บ จึงให้แต่ละชุดมีเว็บของตัวเอง')}
  <div class="abs left" style="--d:.8s;left:48px;top:128px;width:1184px"><div class="card" style="border:3px solid var(--red);padding:8px 18px"><p style="font-weight:600">ถ้าใช้เว็บเดียวกัน: test A กำลังจอง → test B กด reset → ข้อมูลของ A หาย → ล้มทั้งที่เว็บไม่ได้ผิด</p></div></div>
  ${S.map((s, i) => { const x = 48 + (i % 4) * 298, y = 215 + Math.floor(i / 4) * 170, d = 2.2 + i * .55; return `<div class="abs pop" style="--d:${d}s;left:${x}px;top:${y}px;width:286px"><div class="card dark" style="padding:9px 12px"><b style="color:var(--gold2);font-size:22px">${s}</b><div style="display:flex;gap:6px;margin-top:8px"><span style="flex:1;background:#7b5d17;border-radius:8px;text-align:center;font-size:16px;padding:4px 0">sabai-web-${i + 1}<br>:31${i + 1}0</span><span style="flex:1;background:#245a92;border-radius:8px;text-align:center;font-size:16px;padding:4px 0">sabai-db-${i + 1}<br>ข้อมูลของตัวเอง</span></div></div></div>`; }).join('')}
  ${foot('เริ่ม 4 ชุด ดู CPU/RAM แล้วค่อยเพิ่มถึง 8 ชุด · ในแต่ละชุดยังรันทีละ test', 8.2)}` });
const W = [['เว็บผิด', 'ตัวเลขหรือการจองผิดจากกฎร้าน [D] หรือกฎทั่วไป [R]', 'เขียนรายงานบั๊ก ส่งคนสร้างเว็บ', 'var(--red)'], ['test เขียนผิด', 'test หาปุ่มผิด หรือรอไม่พอ', 'แก้ test ได้ แต่ห้ามเปลี่ยนผลที่คาดหวัง', 'var(--amber)'], ['แผนผิด / กฎไม่ชัด', 'ทั้งเว็บและ test ถูกคนละแบบ', 'ถามร้าน แล้วแก้เอกสารก่อน · ยังนับเป็นล้ม', 'var(--blue)']];
await go('lab12-who-wrong', { dur: 12, html: `${bg(lesson('c-who-wrong'))}${head('LAB 12 · test ล้ม ผิดที่ไหน', 'ดูภาพกรอบแดงและ GIF ก่อนเสมอ แล้วเลือก 1 ใน 3 ทาง')}
  ${W.map((w, i) => `<div class="abs left" style="--d:${1 + i * 2.2}s;left:48px;top:${148 + i * 142}px;width:900px"><div class="card" style="border-left:12px solid ${w[3]}"><h3 style="font-size:28px">${w[0]}</h3><p>เห็นว่า: ${w[1]}</p><p style="font-weight:700">ทำต่อ: ${w[2]}</p></div></div>`).join('')}
  ${foot('ห้ามแก้ผลที่คาดหวังให้ผ่านเฉย ๆ', 8.6)}` });
await go('lab12-false-pass', { dur: 11, html: `${bg(lesson('c-bughunt'))}${head('LAB 12 · test ผ่านแบบหลอก', 'test ผ่าน ไม่ได้แปลว่าเว็บถูกเสมอ')}
  <div class="abs left" style="--d:1s;left:48px;top:150px;width:560px"><div class="card" style="border:3px solid var(--red)"><h3 style="color:var(--red)">dblclick()</h3><p>ส่งคำขอครั้งเดียว บั๊กกดซ้ำจึงไม่โผล่</p><p style="font-weight:700;color:var(--red)">test ผ่าน ทั้งที่กด 2 ครั้งได้ 2 นัด</p></div></div>
  <div class="abs right" style="--d:3.4s;left:640px;top:150px;width:590px"><div class="card" style="border:3px solid var(--green)"><h3 style="color:var(--green)">คลิก 2 ครั้งติดกันจริง</h3><p>แล้วนับจำนวนนัดในระบบ</p><p style="font-weight:700;color:var(--green)">ได้ 2 นัด → test ล้ม จับบั๊กได้</p></div></div>
  <div class="abs pop" style="--d:6s;left:48px;right:48px;top:385px"><div class="card dark" style="text-align:center"><h3>กันด้วยการเทียบกับตอนสำรวจ</h3><p>กฎที่ตอนสำรวจติด ❌ ต้องมี test ที่ล้มตรงกัน ถ้า test ผ่าน ให้ตรวจจนรู้สาเหตุ</p></div></div>
  ${foot('บทเรียนนี้มาจากบท 04 รุ่นก่อน ที่บั๊ก P1 เคยหลุดเพราะ dblclick()', 8.4)}` });

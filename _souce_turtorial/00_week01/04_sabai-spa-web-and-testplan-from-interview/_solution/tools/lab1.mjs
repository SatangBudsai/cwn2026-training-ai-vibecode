import { gif, photo } from './kit.mjs';
const P = 'C:/t/spa04/sabai/brand-kit';
const OUT = process.env.OUT || 'C:/t/spa04/out/img';
const port = (n, s = 96, d = 0) => `<img class="port pop" style="--d:${d}s;width:${s}px;height:${s}px" src="${photo(P + '/people/' + n + '.jpg')}">`;

await gif(`${OUT}/lab1-interview-to-story.gif`, {
  dur: 12,
  html: `<div class="bg" style="background-image:url(${photo(P + '/shop/owner-interview.jpg')})"></div><div class="shade"></div>
  <div class="abs" style="left:54px;top:36px"><div class="kick in">LAB 1 · ฟังร้าน</div><h1 class="in" style="--d:.2s">คำพูดของคนจริง กลายเป็น User Story</h1></div>
  <div class="abs left" style="--d:.8s;left:54px;top:170px;width:470px;display:flex;gap:18px;align-items:flex-start">
    ${port('owner-chan', 110, .8)}
    <div class="card" style="flex:1"><p style="font-size:17px;color:#6b5a2e;font-weight:600">คุณจันทร์ เจ้าของร้าน</p><p style="font-size:24px;line-height:1.4">"นักบำบัด 1 คนรับได้ทีละคิว ห้ามจองเวลาทับกัน"</p></div>
  </div>
  <div class="abs left" style="--d:1.8s;left:54px;top:360px;width:470px;display:flex;gap:18px;align-items:flex-start">
    ${port('cust-may', 110, 1.8)}
    <div class="card" style="flex:1"><p style="font-size:17px;color:#6b5a2e;font-weight:600">คุณเมย์ ลูกค้าออฟฟิศ</p><p style="font-size:24px;line-height:1.4">"เลิกงาน 19:00 อยากจองรอบ 20:00 จากมือถือ"</p></div>
  </div>
  <div class="abs grow" style="--d:3s;left:548px;top:330px;width:86px;height:7px;background:var(--gold)"></div>
  <div class="abs pop" style="--d:3.6s;left:622px;top:315px;width:0;height:0;border-left:26px solid var(--gold);border-top:18px solid transparent;border-bottom:18px solid transparent"></div>
  <div class="abs card right" style="--d:3.8s;left:668px;top:160px;width:565px">
    <div style="display:flex;justify-content:space-between;align-items:center"><h3>US-03 · ห้ามจองเวลาทับกัน</h3><span class="tag P1 pop" style="--d:8.6s">Must</span></div>
    <p class="in" style="--d:4.5s;margin-top:10px"><b>ในฐานะ</b> เจ้าของร้าน</p>
    <p class="in" style="--d:5.2s"><b>ฉันอยาก</b> ให้นักบำบัด 1 คนรับได้ทีละคิว</p>
    <p class="in" style="--d:5.9s"><b>เพื่อ</b> ไม่ให้ลูกค้ามาแล้วต้องรอ</p>
    <div class="grow" style="--d:6.6s;height:2px;background:var(--gold);margin:12px 0"></div>
    <p class="in" style="--d:6.8s;font-weight:700;color:#7b5d17">เกณฑ์ยอมรับ (ตรวจได้จริง)</p>
    <p class="in" style="--d:7.4s">คิว 14:00–15:00 แล้วจอง 14:30 → ขึ้น "เวลานี้ถูกจองแล้ว"</p>
    <p class="in" style="--d:8s">จอง 15:00 พอดี → จองได้</p>
  </div>
  <div class="abs in" style="--d:9.4s;left:668px;top:590px;width:565px;font-size:24px;font-weight:600;color:var(--gold2)">ตรวจได้ = มีตัวเลขหรือข้อความชัด ๆ ไม่ใช่ "จองง่าย"</div>`,
});

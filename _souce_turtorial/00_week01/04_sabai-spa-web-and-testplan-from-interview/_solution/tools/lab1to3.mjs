import { gif } from './kit.mjs';
import { P, OUT, brand, lesson, port, bg, head, foot, arrow, varrow, sequence } from './parts.mjs';
const only = process.argv[2];
const go = async (n, o) => { if (!only || n.includes(only)) await gif(`${OUT}/${n}.gif`, o); };

// LAB 1 · คำขอจากทุกกลุ่ม
const ppl = [
  ['owner-chan', 'คุณจันทร์', 'เจ้าของร้าน', 'กฎร้าน ราคา แต้ม ยกเลิก 24 ชม.'],
  ['cust-may', 'คุณเมย์', 'พนักงานออฟฟิศ', 'จองรอบ 20:00 จากมือถือ'],
  ['cust-liwei', 'Mr. Li Wei', 'นักท่องเที่ยวจีน', 'เว็บจีน แชต รู้ค่ารถก่อนจ่าย'],
  ['cust-tonfon', 'คุณต้น &amp; คุณฝน', 'คู่รัก', 'ห้อง Couple Suite เดือนเกิด'],
  ['cust-nida', 'คุณนิดา', 'ลูกค้าคอร์ส', 'Wallet กราฟรอบเอว ยกเลิกเอง'],
  ['cust-prae', 'น้องแพร', 'สาวรักผิว', 'วิเคราะห์ผิว แต่ไม่เก็บรูป'],
];
await go('lab1-six-voices', { dur: 11, html: `${bg(lesson('c-story-wall'), 'full')}${head('LAB 1 · ฟังร้าน', 'ฟังครบ 6 กลุ่ม ก่อนเขียนโค้ดบรรทัดแรก')}
  <div class="abs" style="left:48px;top:140px;width:1184px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
  ${ppl.map((p, i) => `<div class="card pop" style="--d:${.7 + i * .8}s;display:flex;gap:14px;align-items:center;padding:12px"><img class="port" style="width:92px;height:92px;flex:none" src="${brand('people/' + p[0])}"><div><h3 style="font-size:23px">${p[1]}</h3><p style="font-size:16px;color:#7b5d17;font-weight:600">${p[2]}</p><p style="font-size:19px;line-height:1.3">${p[3]}</p></div></div>`).join('')}</div>
  <div class="abs in" style="--d:6s;left:48px;right:48px;top:480px;display:flex;gap:18px;justify-content:center">
    <div class="card dark" style="text-align:center;width:330px"><div style="font:700 56px Serif;color:var(--gold2)">39</div><p>User Story รอบแรก</p></div>
    <div class="card dark" style="text-align:center;width:330px"><div style="font:700 56px Serif;color:var(--gold2)">21</div><p>คำถามกลับถึงร้าน</p></div>
    <div class="card dark" style="text-align:center;width:330px"><div style="font:700 56px Serif;color:#f2a79e">11</div><p>เรื่องที่พูดขัดกันเอง</p></div>
  </div>${foot('สิ่งที่ขัดกันไม่ตัดทิ้ง ให้จดแล้วถามร้าน', 8)}` });

// LAB 2 · ร้านตอบกลับ
await go('lab2-owner-answers', { dur: 13, html: `${bg(lesson('c-questions'))}${head('LAB 2 · ร้านตอบกลับ', 'คำถามที่เคยต้องเดา ได้คำตอบจากร้านจริง')}
  ${[['Q · ซื้อคอร์ส ฿15,000 แต่ยอดสะสมแค่ ฿12,400 นับไหม?', 'นับเฉพาะค่าบริการที่จ่ายจริง ไม่นับคอร์สและ Gift Card', 1], ['Q · โรงแรมห่าง 5 กม. พอดี ฟรีหรือ ฿300?', '5.0 กม. พอดีฟรี · 15.0 กม. พอดี ฿300', 4], ['Q · เหลือ 24 ชม. พอดี ยกเลิกเองได้ไหม?', 'ได้ · น้อยกว่านั้นให้โทรร้าน 02-123-4567', 7]].map((q, i) => `
    <div class="abs left" style="--d:${q[2]}s;left:48px;top:${140 + i * 150}px;width:560px"><div class="card dark"><p style="font-weight:600">${q[0]}</p></div></div>
    ${arrow(622, 180 + i * 150, 50, q[2] + .8)}
    <div class="abs right" style="--d:${q[2] + 1.1}s;left:700px;top:${128 + i * 150}px;width:530px;display:flex;gap:12px;align-items:center"><img class="port" style="width:78px;height:78px;flex:none" src="${brand('people/owner-chan')}"><div class="card" style="flex:1"><p style="font-weight:600">${q[1]}</p></div><span class="tag D stamp" style="--d:${q[2] + 1.9}s;position:absolute;right:-8px;top:-12px">[D]</span></div>`).join('')}
  ${foot('[D] = ร้านพูดเอง · ถ้าร้านยังไม่ตอบ ให้ติด ⚠️ ห้ามเดาเงียบ ๆ', 10.2)}` });

// LAB 2 · แยก 3 แบบ
const trays = [
  ['FR', 'ระบบทำอะไรได้', 'var(--green)', 'FR-12', 'สมัครสมาชิกด้วยอีเมลและรหัสผ่าน และเข้าสู่ระบบได้', 80],
  ['BR', 'กฎร้าน มีตัวเลข', '#b58a1f', 'BR-15', 'ทุก ฿100 ได้ 1 แต้ม เศษปัดทิ้ง · ฿99 ได้ 0 · ฿100 ได้ 1 · ฿199 ได้ 1', 50],
  ['NFR', 'ดีแค่ไหน วัดได้', 'var(--blue)', 'NFR-03', 'จองรอบ 20:00 จบภายใน 3 ขั้น วัดด้วย Playwright นับหน้าจอ', 19],
];
await go('lab2-fr-br-nfr', { dur: 12, html: `${bg(lesson('c-three-trays'), 'full')}${head('LAB 2 · แยกคำขอเป็น 3 แบบ', 'ทุกข้อมีรหัส ตรวจได้ และโยงกลับ User Story')}
  ${trays.map((t, i) => { const x = 48 + i * 402; return `<div class="abs in" style="--d:${.8 + i * 2.6}s;left:${x}px;top:150px;width:380px"><div style="background:${t[2]};border-radius:18px 18px 0 0;padding:12px 18px"><div style="font:700 42px Serif;color:#fff">${t[0]}</div><div style="font-size:21px;font-weight:600;color:#fff">${t[1]}</div></div><div class="card" style="border-radius:0 0 18px 18px;min-height:230px"><span class="tag pop" style="--d:${1.5 + i * 2.6}s;background:${t[2]}">${t[3]}</span><p class="in" style="--d:${1.9 + i * 2.6}s;margin-top:10px;font-size:23px">${t[4]}</p></div><div class="pop" style="--d:${8.4 + i * .3}s;text-align:center;font:700 54px Serif;color:var(--gold2);margin-top:12px">${t[5]} ข้อ</div></div>`; }).join('')}
  ${foot('ผลจริง: FR 80 · BR 50 · NFR 19 และ User Story ทุกข้อมี FR หรือ BR รองรับ', 9.8)}` });

// LAB 2 · ค่าขอบ
const slot = (t, ok, d, x, note) => `<div class="abs pop" style="--d:${d}s;left:${x}px;top:330px;width:190px"><div class="card" style="text-align:center;padding:12px;border:3px solid ${ok ? 'var(--green)' : 'var(--red)'}"><div style="font:700 36px Serif;color:${ok ? 'var(--green)' : 'var(--red)'}">${t}</div><p style="font-size:18px;line-height:1.25">${note}</p><div style="font-size:30px;font-weight:700;color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? '✓ จองได้' : '✗ ไม่มีรอบ'}</div></div></div>`;
await go('lab2-boundary', { dur: 12, html: `${bg(lesson('c-boundary'), 'full')}${head('LAB 2 · ค่าขอบ 3 ค่า', 'บั๊กชอบซ่อนตรง "พอดีเส้น"', 'BR-02 · นวดไทย 60 นาที ต้องจบไม่เกิน 22:00')}
  <div class="abs grow" style="--d:.8s;--t:1s;left:120px;top:260px;width:1040px;height:8px;background:var(--cream);border-radius:4px"></div>
  <div class="abs in" style="--d:1.2s;left:920px;top:210px;font:700 28px Serif;color:#f2a79e">ปิดร้าน 22:00</div>
  <div class="abs growv" style="--d:1.2s;left:985px;top:245px;width:6px;height:60px;background:var(--red)"></div>
  ${slot('20:30', true, 2.4, 130, 'ต่ำกว่า · จบ 21:30')}${slot('21:00', true, 4.6, 520, 'ที่ขอบ · จบ 22:00 พอดี')}${slot('21:30', false, 6.8, 900, 'เกินขอบ · จบ 22:30')}
  ${arrow(330, 400, 170, 3.8)}${arrow(720, 400, 165, 6)}
  <div class="abs in" style="--d:8.2s;left:100px;right:100px;top:560px;text-align:center;font-size:27px;font-weight:600">ตัวอย่างเดียวกันในกฎอื่น: ฿9,999 / ฿10,000 · 5.0 / 5.1 กม. · 23:59 / 24:00 ชม.</div>
  ${foot('BR ทั้ง 50 ข้อมีคอลัมน์ ต่ำกว่า / ที่ขอบ / เกินขอบ', 9.6)}` });

// LAB 3 · Architecture
const box = (x, y, w, h, t, s, c, d) => `<div class="abs pop" style="--d:${d}s;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${c};border:2px solid var(--gold2);border-radius:14px;padding:8px 12px;box-shadow:0 8px 22px rgba(0,0,0,.4)"><div style="font-weight:700;font-size:23px;color:#fff;line-height:1.2">${t}</div><div style="font-size:17.5px;line-height:1.3;color:#f1ecdc">${s}</div></div>`;
await go('lab3-architecture', { dur: 15, html: `${bg(lesson('c-architecture'), 'full')}${head('LAB 3 · System Architecture', 'คำขอ 1 ครั้งเดินทางผ่านกล่องไหนบ้าง')}
  <div class="abs in" style="--d:.6s;left:40px;top:128px;width:290px;height:440px;border:2px dashed #9bd0b1;border-radius:18px;padding:8px;font-weight:700;font-size:20px;color:#9bd0b1;text-align:center">เครื่องของเรา</div>
  <div class="abs in" style="--d:.9s;left:380px;top:128px;width:510px;height:440px;border:2px dashed var(--gold2);border-radius:18px;padding:8px;font-weight:700;font-size:20px;color:var(--gold2);text-align:center">Docker · sabai-web พอร์ต 3000</div>
  <div class="abs in" style="--d:1.2s;left:940px;top:128px;width:300px;height:440px;border:2px dashed #8fb8e6;border-radius:18px;padding:8px;font-weight:700;font-size:20px;color:#8fb8e6;text-align:center">Docker · sabai-db แยกโปรเจกต์</div>
  ${box(60, 175, 250, 100, 'เบราว์เซอร์ + Playwright', 'เปิด localhost:3000', '#2c6a4d', 1.5)}
  ${box(60, 310, 250, 100, 'วิเคราะห์ผิว · ทัวร์ 360°', 'ทำในเครื่อง รูปไม่ออกไปไหน', '#2c6a4d', 2)}
  ${box(400, 175, 220, 95, 'หน้าเว็บ', 'Server Components 3 ภาษา', '#7b5d17', 2.5)}
  ${box(650, 175, 220, 95, 'API', 'ตรวจสิทธิ์ เปิด transaction', '#7b5d17', 3)}
  ${box(400, 330, 220, 95, 'lib/rules กฎร้าน', 'ราคา รอบ แต้ม ยกเลิก', '#7b5d17', 3.5)}
  ${box(650, 330, 220, 95, 'lib/db + lib/clock', 'SQL และนาฬิกาที่ล็อกได้', '#7b5d17', 4)}
  ${box(960, 230, 260, 150, 'PostgreSQL 16', '18 ตาราง · ด่านสุดท้ายกันจองทับ EXCLUDE · UNIQUE · CHECK', '#245a92', 4.5)}
  ${arrow(312, 222, 84, 5.4)}<div class="abs in" style="--d:5.6s;left:300px;top:190px;font-size:17px;font-weight:700;color:var(--gold2);background:rgba(13,31,23,.9);padding:0 5px">:3000</div>
  ${arrow(622, 222, 24, 6.2)}${varrow(760, 272, 54, 6.8)}${arrow(872, 370, 84, 7.6)}
  <div class="abs in" style="--d:7.8s;left:838px;top:398px;font-size:18px;font-weight:700;color:#8fb8e6;background:rgba(13,31,23,.9);padding:0 6px;border-radius:6px">sabai-db:5432 ผ่าน sabai-net</div>
  <div class="abs right" style="--d:9s;left:940px;top:590px;width:300px;font-size:20px;font-weight:700;color:#f2a79e">5433 ใช้จากเครื่องเราเท่านั้น<br>web ใช้ 5432 ใน network</div>
  <div class="abs left" style="--d:10.4s;left:40px;top:590px;width:840px;font-size:24px;font-weight:600;line-height:1.35">กฎอยู่ใน <span style="color:var(--gold2)">lib/rules</span> เป็นฟังก์ชันล้วน จึงทดสอบเงินได้โดยไม่ต้องเปิดหน้าเว็บ<br>เวลาอ่านจาก <span style="color:var(--gold2)">lib/clock</span> จึงล็อกวันทดสอบได้</div>` });

// LAB 3 · Use Case
const uc = [['cust-may', 'คุณเมย์', 'จองคิว · เลือกอารมณ์ · ดูรีวิว'], ['cust-liwei', 'Mr. Li Wei', 'ใช้เว็บจีน · ถามแชต · ดูค่ารถ'], ['cust-tonfon', 'คุณต้น &amp; ฝน', 'จองคู่ · ดูทัวร์ 360° · ซื้อ Gift Card'], ['cust-nida', 'คุณนิดา', 'ดู Wallet · กราฟรอบเอว · ยกเลิกนัด'], ['cust-prae', 'น้องแพร', 'วิเคราะห์ผิว · ดูสมุนไพร'], ['owner-chan', 'คุณจันทร์', 'ดูตารางคิว · กด "ใช้บริการเสร็จ"']];
await go('lab3-use-case', { dur: 12, html: `${bg(brand('shop/lobby'), 'full')}${head('LAB 3 · Use Case', 'ใครทำอะไรกับระบบได้บ้าง และโยงกับ FR ข้อไหน')}
  ${uc.map((u, i) => { const y = 132 + i * 86, d = .8 + i * 1.3; return `<div class="abs left" style="--d:${d}s;left:60px;top:${y}px;width:300px;display:flex;align-items:center;gap:12px"><img class="port" style="width:72px;height:72px" src="${brand('people/' + u[0])}"><b style="font-size:23px">${u[1]}</b></div>${arrow(360, y + 36, 110, d + .4)}<div class="abs right" style="--d:${d + .7}s;left:486px;top:${y + 3}px;width:730px"><div class="card" style="padding:12px 20px"><p style="font-size:23px;font-weight:600">${u[2]}</p></div></div>`; }).join('')}
  ${foot('แต่ละ use case ใน DESIGN.md มีรหัส FR กำกับ ใช้ตรวจว่าไม่มีคนถูกลืม', 9)}` });

// LAB 3 · ลำดับคิดเงิน
const steps = [['ราคาเต็ม', 'นวดไทย ฿1,000 × 4 คน', '฿4,000', 'BR-31'], ['ส่วนลด % มากสุด 1 อัน', 'กลุ่ม 4 คนขึ้นไป 10%', '฿3,600', 'BR-29'], ['หักแต้ม', 'แลก 200 แต้ม = ฿100', '฿3,500', 'BR-19'], ['บวกค่ารถ', 'โรงแรม 12 กม. 4 คน 1 คัน', '฿3,800', 'BR-35'], ['หัก Gift Card', 'ไม่ได้ใช้ในตัวอย่างนี้', '฿3,800', 'BR-31']];
await go('lab3-flow-price', { dur: 13, html: `${bg(brand('shop/hero-ritual'), 'full')}${head('LAB 3 · Flowchart คิดราคา', 'ลำดับต่างกัน ยอดเงินต่างกัน')}
  ${steps.map((s, i) => { const y = 132 + i * 88, d = 1 + i * 1.7; return `<div class="abs left" style="--d:${d}s;left:60px;top:${y}px;width:800px"><div class="card" style="display:flex;align-items:center;gap:16px;padding:11px 20px"><div style="width:48px;height:48px;border-radius:50%;background:var(--leaf);color:var(--gold2);font:700 26px Serif;display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</div><div style="flex:1"><h3 style="font-size:24px">${s[0]}</h3><p style="font-size:19px">${s[1]}</p></div><span class="tag R">${s[3]}</span></div></div><div class="abs pop" style="--d:${d + .7}s;left:890px;top:${y + 8}px;font:700 44px Serif;color:${i == 3 ? 'var(--gold2)' : '#fff'}">${s[2]}</div>`; }).join('')}
  ${foot('ลูกค้าจ่าย ฿3,800 · ถ้าหักแต้มก่อนคิด % จะได้ ฿3,810 ซึ่งผิด', 10)}` });

// LAB 3 · ERD
const T = (x, y, name, cols, d, c = '#f8f3e6') => `<div class="abs pop" style="--d:${d}s;left:${x}px;top:${y}px;width:212px;background:${c};color:var(--ink);border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.45);overflow:hidden;border:1.5px solid var(--gold)"><div style="background:var(--leaf2);color:var(--gold2);font-weight:700;font-size:20px;padding:4px 10px" class="mono">${name}</div><div style="padding:4px 10px;font-size:16px;line-height:1.28" class="mono">${cols.map((k) => `<div>${k}</div>`).join('')}</div></div>`;
await go('lab3-erd', { dur: 15, html: `${bg(lesson('c-erd'), 'full')}${head('LAB 3 · ERD', 'โครงฐานข้อมูลของการจอง 1 ครั้ง')}
  ${T(50, 130, 'users', ['id PK', 'email UK', 'lifetime_spend NUMERIC', 'points_balance INT'], 1)}
  ${T(50, 330, 'therapists', ['id PK', 'name', 'photo'], 2.2)}
  ${T(50, 490, 'therapist_reviews', ['therapist_id FK', 'stars'], 2.6)}
  ${T(350, 130, 'bookings', ['id PK', 'booking_code UK', 'user_id FK (ว่างได้)', 'service_id FK', 'period TSTZRANGE', 'status'], 3.4, '#fff7dc')}
  ${T(350, 400, 'booking_items', ['booking_id FK', 'therapist_id FK', 'period TSTZRANGE', 'slot_active'], 4.6, '#fff7dc')}
  ${T(650, 130, 'services', ['id PK', 'minutes', 'price NUMERIC'], 5.6)}
  ${T(650, 290, 'herbs', ['id PK', 'name'], 6)}
  ${T(650, 420, 'course_purchases', ['user_id FK', 'total_sessions', 'used_sessions', 'reserved_sessions', 'expires_on'], 6.6)}
  ${arrow(264, 180, 84, 3.8)}${arrow(562, 180, 86, 5.8)}${varrow(450, 318, 80, 5)}${arrow(264, 440, 84, 5.2)}
  <div class="abs right" style="--d:8s;left:920px;top:130px;width:330px"><div class="card dark"><h3>เงินใช้ NUMERIC</h3><p style="font-size:19px">ไม่ใช้ float เพราะเลขทศนิยมลอยตัวปัดเศษเพี้ยนได้</p></div></div>
  <div class="abs right" style="--d:10s;left:920px;top:310px;width:330px"><div class="card" style="border:3px solid var(--red)"><h3 style="color:var(--red)">กันจองทับที่ฐานข้อมูล</h3><p class="mono" style="font-size:16px;line-height:1.35">EXCLUDE USING gist (therapist_id WITH =, period WITH &amp;&amp;)</p><p style="font-size:18px">14:00–15:00 กับ 15:00–16:00 ไม่นับว่าทับกัน</p></div></div>
  ${foot('ผลจริง: ERD 18 ตาราง · ทุกกฎห้ามทับถูกบังคับในฐานข้อมูล ไม่ใช่แค่หน้าเว็บ', 12)}` });

// LAB 3 · Sequence จอง
const c1 = [{ name: 'คุณเมย์', x: 120 }, { name: 'เบราว์เซอร์', x: 400 }, { name: 'API + กฎร้าน', x: 760, color: '#7b5d17' }, { name: 'PostgreSQL', x: 1120, color: '#245a92' }];
await go('lab3-seq-booking', { dur: 15, html: `${bg(brand('shop/lobby'), 'full')}${head('LAB 3 · Sequence', 'ลูกค้าจองคิว 1 ครั้ง คุยกันกี่รอบ')}
  ${sequence(c1, [{ from: 0, to: 1, text: 'เลือกนวดไทย พรุ่งนี้' }, { from: 1, to: 2, text: 'GET /api/availability' }, { from: 2, to: 3, text: 'อ่านนักบำบัดและคิว' }, { from: 2, text: 'สร้างรอบ BR-01, BR-02 หาคนว่าง' }, { from: 2, to: 1, text: 'รอบ 20:00 ว่าง', ret: 1 }, { from: 0, to: 1, text: 'เลือก 20:00' }, { from: 1, to: 2, text: 'POST /api/quote' }, { from: 2, to: 1, text: 'บรรทัดราคา', ret: 1 }, { from: 1, to: 2, text: 'POST /api/bookings' }, { from: 2, to: 3, text: 'BEGIN + INSERT' }, { from: 2, to: 1, text: '201 รหัสการจอง', ret: 1, color: '#7fd6a0' }], { top: 170, step: 41, start: 1, gap: 1 })}
  ${foot('คิดราคาที่เซิร์ฟเวอร์ซ้ำตอนยืนยัน ถ้ายอดไม่ตรงกับที่ลูกค้าเห็น ตอบ 409', 12.4)}` });

// LAB 3 · แย่งรอบ
const c2 = [{ name: 'คุณเมย์', x: 100 }, { name: 'น้องแพร', x: 320 }, { name: 'API', x: 680, color: '#7b5d17' }, { name: 'PostgreSQL', x: 1100, color: '#245a92' }];
await go('lab3-seq-race', { dur: 14, html: `${bg(lesson('c-race'), 'full')}${head('LAB 3 · Sequence', '2 คนกดจองพี่ศรี 20:00 พร้อมกัน ใครได้?')}
  ${port('cust-may', 66, .4, 'position:absolute;left:67px;top:108px')}${port('cust-prae', 66, .5, 'position:absolute;left:287px;top:108px')}
  ${sequence(c2, [{ from: 0, to: 2, text: 'POST /api/bookings', t: 1.4 }, { from: 1, to: 2, text: 'POST /api/bookings', t: 1.8, color: '#f7c9a0' }, { from: 2, to: 3, text: 'Tx เมย์: INSERT', t: 3 }, { from: 2, to: 3, text: 'Tx แพร: INSERT → รอ', t: 4, color: '#f7c9a0' }, { from: 2, to: 3, text: 'Tx เมย์: COMMIT', t: 5.5 }, { from: 2, to: 0, text: '201 พี่ศรี 20:00', ret: 1, t: 6.5, color: '#7fd6a0' }, { from: 3, to: 2, text: 'Tx แพร: 23P01 conflicting key', ret: 1, t: 8, color: '#f2a79e' }, { from: 2, to: 1, text: '409 เวลานี้ถูกจองแล้ว', ret: 1, t: 9.2, color: '#f2a79e' }], { top: 222, step: 42 })}
  ${foot('ฐานข้อมูลตัดสิน ไม่ใช่ความเร็วของหน้าเว็บ · แพรเลือกรอบใหม่ได้ ค่าที่เลือกไม่หาย', 11)}` });

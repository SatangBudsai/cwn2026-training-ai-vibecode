# BUG-HUNT · ผลพิสูจน์ว่า test จับบั๊กได้ (BUG_MODE B01–B12)

วิธีรัน: เริ่มเซิร์ฟเวอร์ใหม่ทุกรอบด้วย `TEST_MODE=1 BUG_MODE=Bxx` (พอร์ต 3100) แล้วรันชุดเต็ม `npx playwright test --timeout=30000 --reporter=line` (61 test จาก 51 TC) โดยตั้ง `E2E_NOHOOK_URL=http://localhost:3101` ให้ TC-NFR-03B รันจริง (ไม่ถูก skip) ตัวเลขทั้งหมดมาจากการรันจริง

## ตารางผล

| บั๊ก | คำอธิบาย | TC ที่ต้องล้ม | ล้มจริง ✅/❌ | TC อื่นที่ล้มด้วย | หมายเหตุ |
|---|---|---|---|---|---|
| B01 | SV-03 พื้นที่ 101 คิด ฿1,000 | TC-FEE-01 | ✅ | – | 1 failed · 60 passed · `fee-total` expected `฿1,010` received `฿1,000` |
| B02 | ไฟล์ 5,242,880 ไบต์ถูกปฏิเสธ | TC-UPLOAD-01 | ✅ | – | 1 failed · 60 passed · ก่อนแก้ test ล้มเพราะ `file-item` count timeout (ไม่ใช่ค่าต่าง) ดูหัวข้อสิ่งที่แก้ |
| B03 | SLA ไม่ข้ามวันหยุดในตาราง | TC-SLA-01 · TC-SLA-02 | ✅ | TC-SLA-03 · TC-RBAC-04 (BUGS.md อนุญาต) · **TC-NOTI-02** (ไม่อยู่ในตาราง) | 11 failed · 50 passed (TC-SLA-01 ล้ม 7 แถว: c–i) · TC-NOTI-02 ล้ม `expected 10 received 9` เพราะระดับ `ใกล้ครบกำหนด` ที่ใช้ส่งแจ้งเตือนคำนวณจาก `countBiz` ตัวเดียวกับ TC-SLA-03 (ผลข้างเคียงจากฟังก์ชันวันทำการร่วม) |
| B04 | SLA ไม่หยุดนับตอนรอแก้ไข | TC-SLA-02 | ✅ | – | 1 failed · 60 passed · `dueAt` expected `8 ธ.ค. 2569 16:30` received `4 ธ.ค. 2569 16:30` |
| B05 | QR อายุ 15:00 พอดียังจ่ายได้ | TC-PAY-01 | ✅ | – | 1 failed · 60 passed · expected 410 received 200 |
| B06 | IDOR: ประชาชนเปิดคำขอคนอื่น | TC-RBAC-01 | ✅ | – | 1 failed · 60 passed · expected 404 received 200 |
| B07 | เจ้าหน้าที่อนุมัติ SV-02 เองผ่าน API | TC-RBAC-02 | ✅ | TC-WORKFLOW-01 (BUGS.md อนุญาต) | 2 failed · 59 passed |
| B08 | claim ข้ามการตรวจผู้ถือแล้ว | TC-QUEUE-02 | ✅ | – | 1 failed · 60 passed · expected 1 loser received 0 |
| B09 | API คิวส่งเลขบัตรเต็ม | TC-PDPA-02 | ✅ | – | 1 failed · 60 passed · พบ `idNo` 13 หลักใน `/api/officer/queue` |
| B10 | ทันกำหนด % หารด้วย "รับเรื่อง" | TC-DASH-02 | ✅ | TC-DASH-01 · TC-DASH-03 (BUGS.md อนุญาต) | 3 failed · 58 passed · expected `–` received `0.0%` |
| B11 | unmask ไม่บันทึก Audit | TC-PDPA-03 · TC-AUDIT-01 | ✅ | – | 2 failed · 59 passed · ทั้งสอง TC ล้ม (เช่น expected `16` received `15`) |
| B12 | ตีกลับครั้งที่ 3 ได้ | TC-WORKFLOW-04 | ✅ | – | 1 failed · 60 passed · expected 409 received 200 |

**จับได้ 12 จาก 12** (TC ที่ต้องล้มล้มครบทุกบั๊ก ไม่มี TC ที่ควรล้มแต่ผ่าน)
ข้อสังเกตที่ยังค้าง: B03 ทำให้ TC-NOTI-02 ล้มเพิ่ม ซึ่งไม่ได้อยู่ในรายการ "อาจล้มด้วย" ของ BUGS.md สาเหตุคือฟังก์ชันวันทำการตัวเดียวกัน (`isBiz`/`countBiz`) ถูกใช้คำนวณระดับ SLA ที่ขับการแจ้งเตือน จึงถือเป็นผลข้างเคียงที่อธิบายได้ ไม่ใช่บั๊กรั่นเกินจุด แต่ควรแจ้งผู้สอน

## ทดสอบรวมบั๊ก

| BUG_MODE | ผล | TC ที่ล้ม |
|---|---|---|
| B03,B07 | 13 failed · 48 passed | TC-SLA-01 (7 แถว) · TC-SLA-02 · TC-SLA-03 · TC-RBAC-04 · TC-NOTI-02 · TC-RBAC-02 · TC-WORKFLOW-01 = union ของ B03 (11) + B07 (2) พอดี |
| B01,B05,B09 | 3 failed · 58 passed | TC-FEE-01 · TC-PAY-01 · TC-PDPA-02 = union พอดี |

## สิ่งที่แก้ใน app / test และเหตุผล

app (ทุกอย่างเปิดเฉพาะเมื่อ `BUG_MODE` มีรหัสนั้น ไม่ตั้ง = พฤติกรรมเดิม):
- `app/src/store.js` `resubmitCase`: เพิ่ม B04 (`k = 0` คือไม่เลื่อน `dueAt` ตามวันทำการที่รอแก้)
- `app/src/store.js` `queueItem`: เพิ่ม B09 (ใส่ `idNo` เต็มใน response ของคิว; หน้าจอยังใช้ `idMasked`)
- `app/src/routes.js` `GET /api/cases/:no`: เพิ่ม B06 (ประชาชนข้ามการตรวจเจ้าของ)
- B01, B02, B03, B05, B07, B08, B10, B11, B12 มี call site อยู่แล้ว ตรวจแล้วทำงานตรงตาม BUGS.md จากผลรันข้างบน ไม่ต้องแก้

test:
- `e2e/tests/upload.spec.js` TC-UPLOAD-01 (ส่วนขนาดผ่าน UI): เดิมเมื่อเปิด B02 ล้มด้วย timeout ของ `toHaveCount` (ไม่บอกค่าต่าง ขัด BUGS.md ขั้น 4) จึงเพิ่มการรอให้ `file-item` หรือ `upload-error` ปรากฏ แล้วตรวจว่า `upload-error` ว่าง พร้อมข้อความ `size 5242880 must be accepted` ไม่ได้ลดความเข้มของ expectation ใดเลย (เพิ่มอย่างเดียว) รันซ้ำกับ B02 แล้วยังล้ม (1 failed · 60 passed) ด้วยข้อความใหม่

## ผลรันปกติรอบสุดท้าย (ไม่ตั้ง BUG_MODE)

`TEST_MODE=1` ไม่มี `BUG_MODE`: **61 passed (1.9m)** ไม่มี skipped/failed (log เซิร์ฟเวอร์พิมพ์ `BUG_MODE=` ว่าง) เซิร์ฟเวอร์พอร์ต 3100 ค้างไว้ในโหมดนี้ และเซิร์ฟเวอร์พอร์ต 3101 (ไม่มี TEST_MODE) ยังรันอยู่

หมายเหตุ: ไม่ได้รัน "รันซ้ำทันทีโดยไม่ restart" ในรอบนี้ (ทำไว้ก่อนหน้า ผลอยู่ใน `e2e/run1-3.txt`) และ log ดิบของแต่ละบั๊กอยู่ในโฟลเดอร์ scratchpad ของ session ไม่ได้ commit

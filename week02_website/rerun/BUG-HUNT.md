# BUG-HUNT: ผลรัน BUG_MODE B01-B12 กับชุด Playwright 61 TC (รันจริง)

รูปแบบตามตาราง triage ใน BUGS.md · ผลดิบอยู่ที่ `run-B01.txt` ... `run-B12.txt`, `run-all.txt` และ `e2e/test-report/results-Bxx.json`

| บั๊ก | TC ที่ต้องล้ม | ล้มจริง | TC อื่นที่ล้มเพิ่ม | หมายเหตุ |
|---|---|---|---|---|
| B01 | TC-FEE-01 | ✅ | – | 1 failed / 60 passed |
| B02 | TC-UPLOAD-01 | ✅ | – | 1 failed / 60 passed (รอบแรกมี TC-NFR-01 ล้ม เป็น flake ของเว็บ/test ไม่เกี่ยวกับบั๊ก ดูหมายเหตุท้าย) |
| B03 | TC-SLA-01 · TC-SLA-02 | ✅ | TC-SLA-03 · TC-RBAC-04 · TC-NOTI-02 | 11 failed / 50 passed · SLA-01 ล้มแถว c-i (7 แถว), a-b ผ่านเพราะไม่เกี่ยวข้องวันหยุด · SLA-03 และ RBAC-04 อยู่ในรายการ "อาจล้มด้วย" · NOTI-02 เป็นผลข้างเคียงจากฟังก์ชันวันทำการตัวเดียวกัน (ระดับเตือนเปลี่ยน จึงนับแจ้งเตือนต่างไป) ไม่อยู่ในรายการของ BUGS.md |
| B04 | TC-SLA-02 | ✅ | – | 1 failed / 60 passed |
| B05 | TC-PAY-01 | ✅ | – | 1 failed / 60 passed |
| B06 | TC-RBAC-01 | ✅ | – | 1 failed / 60 passed |
| B07 | TC-RBAC-02 | ✅ | TC-WORKFLOW-01 | 2 failed / 59 passed · WORKFLOW-01 อยู่ในรายการ "อาจล้มด้วย" |
| B08 | TC-QUEUE-02 | ✅ | – | 1 failed / 60 passed (รอบแรกมี TC-PAY-03 ล้มจาก worker crash ดูหมายเหตุท้าย) |
| B09 | TC-PDPA-02 | ✅ | – | 1 failed / 60 passed |
| B10 | TC-DASH-02 | ✅ | TC-DASH-01 · TC-DASH-03 | 3 failed / 58 passed · ทั้งสองอยู่ในรายการ "อาจล้มด้วย" |
| B11 | TC-PDPA-03 · TC-AUDIT-01 | ✅ | – | 2 failed / 59 passed |
| B12 | TC-WORKFLOW-04 | ✅ | – | 1 failed / 60 passed |
| (ปิดโหมด) | – | – | – | 61 passed (run-all.txt) |

**สรุป: จับได้ 12 จาก 12 ตัว** (TC ที่ต้องล้มล้มครบทุกตัว) · ปิด BUG_MODE แล้วผ่าน 61/61

## สิ่งที่ฝังเพิ่มในเว็บ (ตัวที่ยังไม่มี)
- B03: `app/src/mod-sla.js` `isWorkday` ไม่ตรวจตารางวันหยุดเมื่อ `bug('B03')` (ยังข้ามเสาร์-อาทิตย์)
- B04: `app/src/mod-sla.js` `extendDue` คืนกำหนดเดิมเมื่อ `bug('B04')` (ไม่เลื่อนวันหลังส่งแก้)
- B11: `app/src/mod-vault.js` ข้ามการบันทึก Audit `UNMASK` เมื่อ `bug('B11')`
- ตัวอื่น (B01 B02 B05-B10 B12) มีอยู่แล้วตรงตาม BUGS.md ไม่ต้องแก้

## ปัญหาที่พบระหว่างรันและการแก้
1. Flake ที่ไม่เกี่ยวกับบั๊ก (เกิดเองแม้ปิด BUG_MODE ราว 2 ใน 5 รอบ): TC-NFR-01 และ TC-PAY-04 ล้มที่ `file-item` count 0 · สาเหตุ: `setInputFiles` ยิงก่อนที่หน้า wizard จะสร้างร่างเสร็จ `handleFiles` เห็น `state.draftId` ว่างแล้ว return เงียบ ๆ (บั๊กจริงของเว็บ ผู้ใช้เร็ว ๆ ก็เจอ) · แก้ที่ `app/public/js/wizard.js` ให้รอการสร้างร่างที่กำลังทำอยู่ก่อน (`state.pending`) ไม่ได้แก้หรือผ่อน test · หลังแก้ ทดสอบซ้ำ 5 รอบ ผ่านทั้งหมดในส่วนนี้
2. TC-PAY-03 ล้มเป็นบางรอบด้วย `worker process exited unexpectedly (code=3221226505)` (Playwright worker crash บน Windows ตอนยิง 6 คำขอพร้อมกัน) เกิดในรอบ B08 รอบแรกและในรอบทดสอบแยกปิดโหมด 1 ใน 10 ครั้ง · ไม่ใช่ความผิดของบั๊กหรือ assert · ยังไม่ได้แก้ (ดูคำถามถึง TA)
3. ไม่ได้แก้ test ใด ๆ (ทุกบั๊กถูกจับได้โดย assert เดิม)

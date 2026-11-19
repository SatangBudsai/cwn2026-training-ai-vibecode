# BUG-HUNT · X01 · ผล triage BUG_MODE B01–B12

วิธีรัน: `bash e2e/run-bugs.sh "" B01 ... B12` (restart container ด้วย `TEST_MODE=1 BUG_MODE=Bxx` แล้วรันชุดเต็ม 79 test = 51 TC)
ล็อกดิบ: `e2e/bug-results/*.txt` · สรุป: `e2e/bug-results/summary.txt`

## สรุป: **จับได้ 12/12** (ทุกตัวล้มตรง TC ที่ต้องล้ม ไม่มีผ่านหลอก ไม่มี TC นอกตารางล้ม)

| บั๊ก | TC ที่คาดว่าล้ม | TC ที่ล้มจริง (จำนวน test) | เกินที่คาด | ควรล้มแต่ผ่าน | ผล |
|---|---|---|---|---|---|
| (ปกติ ×2: ก่อนและหลังรวมบั๊ก) | – | – | – | – | 79/79 ✅ |
| B01 | TC-FEE-01 | TC-FEE-01 (1) · expected ฿1,010 received ฿1,000 | – | – | ✅ |
| B02 | TC-UPLOAD-01 | TC-UPLOAD-01 (1) · expected 1 received 0 (ไฟล์ 5,242,880 ไม่ถูกรับ) | – | – | ✅ |
| B03 | TC-SLA-01 · TC-SLA-02 | TC-SLA-01 แถว c–i (7) · TC-SLA-02 ส่วน 1 · TC-RBAC-04 (รวม 9) · เช่น expected 2026-12-08T16:30 received 2026-12-07T16:30 | TC-RBAC-04 (ผลข้างเคียงที่ยอมรับ) | – (TC-SLA-03 ไม่ล้ม ซึ่ง "อาจ" ล้ม) | ✅ |
| B04 | TC-SLA-02 | TC-SLA-02 ส่วน 1, 2, 3, 5 (4) · expected 2026-12-08T16:30 received 2026-12-04T16:30; seed 17 expected 12-01 received 11-27 | – | – | ✅ |
| B05 | TC-PAY-01 | TC-PAY-01 รอบ 3 (09:10:00) (1) · expected 410 received 200 | – | – | ✅ |
| B06 | TC-RBAC-01 | TC-RBAC-01 (1) · expected 404 received 200 | – | – | ✅ |
| B07 | TC-RBAC-02 | TC-RBAC-02 (1) · expected 403 received 200 | – | – | ✅ |
| B08 | TC-QUEUE-02 | TC-QUEUE-02 ส่วน 1, 2, 3 (3) · API 10 ครั้งได้ 200 ทั้ง 10 (expected 1) | – | – | ✅ |
| B09 | TC-PDPA-02 | TC-PDPA-02 (1) · JSON มีเลข 13 หลัก (not /\d{13}/) | – | – | ✅ |
| B10 | TC-DASH-02 | TC-DASH-01 · 02 · 03 (3) · expected 85.7% received 23.1% | TC-DASH-01 · 03 (ยอมรับได้ ใช้สูตรเดียวกัน) | – | ✅ |
| B11 | TC-PDPA-03 · TC-AUDIT-01 | ทั้งสอง (2) · audit-count expected 1 received 0 | – | – | ✅ |
| B12 | TC-WORKFLOW-04 | TC-WORKFLOW-04 ส่วน A, B (2) · expected 409 received 200 | – | – | ✅ |

## รวมบั๊ก (ขั้น 5)
| BUG_MODE | ผล |
|---|---|
| B03,B07 | 10 ล้ม = union ของ B03 (9) + B07 (1) ✅ |
| B01,B05,B09 | 3 ล้ม (TC-FEE-01 · TC-PAY-01 · TC-PDPA-02) = union ✅ |

## ขั้นอื่นของ BUGS.md §3
- ขั้น 1–2: ปกติ 79/79 ผ่านติดกันหลายรอบโดยไม่ restart (รอบแรกของ B01 + ก่อน B02 + หลังรวมบั๊ก) ✅
- ขั้น 4: ทุกบั๊กล้มด้วยข้อความ expected/received ที่ต่างค่า ไม่ใช่ timeout
- ขั้น 6: ปิดบั๊กทั้งหมดแล้วรันซ้ำ → 79/79 ✅
- ไม่ต้องแก้โค้ดหรือ test ใด ๆ ในบล็อกนี้ (เพิ่มเฉพาะ `e2e/run-bugs.sh`)

# Loop Trace — Expense Claim Requirement + Web UI Mockup

## Iteration 1

### Requirement coverage ก่อนสร้าง

| กลุ่ม Requirement | ผลงาน | วิธีตรวจ |
| --- | --- | --- |
| ผู้เกี่ยวข้อง, FR/NFR/BR | output.md §3–§6 | ตรวจหัวข้อและย้อนที่มาจาก S01–S09 |
| Use Case, ERD, Sequence, State | output.md §7–§10 | ตรวจ syntax และชื่อข้อมูลข้ามแผนภาพ |
| Traceability, Open Issues | output.md §11, §13 | ตรวจครบ 9 ประโยคและข้อขัดแย้ง/ข้อมูลที่ขาด |
| Web UI Mockup | mockup.html | เปิดใน Chromium และตรวจสามส่วนกับข้อความนโยบาย |
| Pain Point → หน้าจอ | output.md §12 | ตรวจว่าทุกหน้ามี FR/BR รองรับ |

### GENERATOR

สร้าง `output.md` ครบหัวข้อและแผนภาพตามโจทย์ และสร้าง `mockup.html` เป็น Web UI Mockup สามส่วน ได้แก่ ยื่นเบิก ติดตามใบเบิก และตรวจ/อนุมัติ ใช้ข้อมูลจำลองและไม่ทำธุรกรรมจริง

### CRITIC

| เกณฑ์ | ผล | หลักฐาน | สิ่งที่ต้องแก้ |
| --- | --- | --- | --- |
| C1 — เอกสารและ Mockup ครบ | PASS | output.md มี Actor, FR, NFR, BR, Use Case, ERD, Sequence, State, Traceability, Open Issues; mockup.html มี `#submit`, `#tracking`, `#review` | ไม่มี |
| C2 — ย้อนถึงต้นทางและไม่แต่งนโยบาย | PASS | Traceability มี S01–S09 ครบ; BR-02/BR-03 และ Open Issue เก็บ 5,000/10,000; BR-08 ไม่ใส่วงเงินจริง | ไม่มี |
| C3 — แบบจำลองและ Mockup สอดคล้อง | PASS | ชื่อ CLAIM, RECEIPT, APPROVAL, PAYMENT และ owner/status สอดคล้องข้าม ERD/Sequence/State; Chromium เปิด Mockup ได้ 3 ส่วน; policy แสดงรอยืนยัน; Mermaid 4 บล็อก render ด้วย Mermaid 11 ใน Chromium ได้ | ไม่มี |

### หลักฐานการเปิด Mockup

- Chromium เปิด `mockup.html` จากดิสก์สำเร็จ
- พบ 3 ส่วน: ยื่นเบิก, ติดตามใบเบิก, ตรวจและอนุมัติ
- console errors = 0, page errors = 0, network requests = 0
- ปุ่มและฟอร์มเป็นภาพจำลองตามขอบเขต ไม่ทดสอบธุรกรรม
- `output-preview.html` render Mermaid 4 บล็อกสำเร็จใน Chromium โดยไม่มี console หรือ page error

### คำตัดสินและเงื่อนไขหยุด

ทุกเกณฑ์ PASS ใน Iteration 1 จึงหยุดตาม Loop Template ไม่มี Iteration ถัดไป ข้อจำกัดที่เหลือคือ Mockup ไม่ใช่ระบบทำงานจริงตามโจทย์

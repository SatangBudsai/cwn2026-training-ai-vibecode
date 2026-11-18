# สรุปงานทีม — ทำความสะอาด ticket ทีม Support

- run_id: `20261110-080445-cipb` (run directory `/workspace/.agent-team/20261110-080445-cipb`)
- ใช้สกิล `agent-team` (`team.py run --workers yolo1,yolo2,cyolo1`) ใช้เฉพาะ 3 บัญชีนี้ ไม่มีบัญชีอื่นถูกเรียก
- ตัวเลขทั้งหมดมาจาก `ledger.jsonl` ของ run นี้ (ผลจริงจาก CLI ของแต่ละบัญชี)

## ตารางสรุป

| บัญชี | งาน | รุ่น | เวลา (วินาที) | input tokens | output tokens | สำเร็จ/ล้ม |
|---|---|---|---:|---:|---:|---|
| yolo1 | clean_time.py (fan-out) | claude-opus-5-5 (high) | 49.80 | 10 (+ cache read 133,253 · cache write 20,923) | 5,401 | สำเร็จ |
| yolo2 | clean_order.py (fan-out) | claude-opus-5-5 (high) | 90.13 | 18 (+ cache read 301,136 · cache write 35,343) | 8,795 | สำเร็จ |
| cyolo1 | clean_code.py (fan-out) | gpt-6.1-sol (high) | 197.34 | 306,088 (ในนั้น cached 270,208) | 7,156 | สำเร็จ |
| yolo1 | clean.py + report.md (fan-in) | claude-opus-5-5 (high) | 46.42 | 14 (+ cache read 223,429 · cache write 27,634) | 4,840 | สำเร็จ |

หมายเหตุ: Claude รายงาน input ที่ไม่ผ่าน cache แยกจาก cache read/write ส่วน Codex รายงาน input รวมที่นับ cached ไว้ด้วย
fan-out 3 งานรันพร้อมกัน (08:04:51) ช่วงนี้ใช้เวลาจริง 197.3 วินาที ส่วน fan-in เริ่ม 08:08:09 และจบ 08:08:55

## โควตาที่เหลือ (ดึงด้วย `team.py quota` หลังงานเสร็จ)

| บัญชี | session ใช้ไป | week ใช้ไป → เหลือ | reset | เวลาของข้อมูล |
|---|---|---|---|---|
| yolo1 | - (ไม่มี session ที่เปิดอยู่) | 30% → เหลือ 70% | week: Nov 12, 6am | 2026-11-10T08:09:41 (+07) |
| yolo2 | 2% → เหลือ 98% | 7% → เหลือ 93% | session: Nov 10, 12:39pm · week: Nov 16, 12:59pm | 2026-11-10T08:09:45 (+07) |
| cyolo1 | - | 6% → เหลือ 94% | week: 2026-11-14 12:21 | 2026-11-10T06:55:26 (+07) (ข้อมูลเก่า มาจาก rollout ล่าสุดที่มีข้อมูล rate limit ยังไม่รวมงานนี้) |

## ผลงาน

- ไฟล์: `clean_time.py`, `clean_order.py`, `clean_code.py`, `clean.py`, `report.md` ใน `/workspace/team-demo`
- `python3 clean.py data/tickets.csv` ได้ JSON ครบ 1000 ใบ · null: time 0, order_id 0, error_code 974
- ตรวจไขว้ด้วย parser แยกอีกตัว: ตรงกันทั้ง 1000 ใบ (0 ใบต่าง) · ไม่มี id/เลขออเดอร์/รหัสของข้อมูลชุดนี้ hardcode อยู่ในโค้ด
- ทดสอบรูปแบบที่ไม่มีในชุดนี้ (ข้ามปี, เลขไทยทั้งสตริง, zero-width, NBSP, fullwidth, ERROR 404, TK-/เบอร์โทรที่ไม่ใช่ออเดอร์) ผ่านทุกกรณี

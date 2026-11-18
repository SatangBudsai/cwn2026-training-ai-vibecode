# monthly-kpi.csv — อ่านอย่างไร

รูปแบบ: `metric,unit,<YYYY-MM>,<YYYY-MM>,...,target_monthly,note` (1 แถว = 1 KPI, เดือนใหม่เพิ่มเป็นคอลัมน์)
- `target_monthly` ว่าง = ไม่มีเป้า → แสดงเป็นสีปกติ (Ink) ห้ามใส่ Teal/Orange
- `note` = สาเหตุ/บริบทจากเจ้าของตัวเลข — ใช้เขียน bullet "ทำไม" เสมอ

| metric | หน่วย | ทิศทางดี | สไลด์ | หมายเหตุการตีความ |
|---|---|---|---|---|
| revenue | THB | มากดี | 3 การเงิน | แสดงเป็นล้านบาท 2 ตำแหน่ง, ระบุไม่รวม VAT; ถ้า note บอกว่ายังไม่ออกใบแจ้งหนี้ = เงินสดยังไม่เข้า |
| gross_margin | pct | มากดี | 3 | เป้าบริษัท 30%; เทียบเดือนก่อนเป็น "จุด" ไม่ใช่ % |
| pipeline_value | THB | มากดี | 4 Pipeline | note มักบอกดีลใหญ่ที่รวมอยู่ |
| deals_won / deals_lost | count | won มากดี / lost น้อยดี | 4 | |
| win_rate | pct | มากดี | 4 | = won/(won+lost) ในเดือน — จำนวนดีลน้อย ผันผวนสูง ควรบอกฐาน (เช่น 1 จาก 3) |
| projects_active / projects_on_time | count | on_time/active สูงดี | 5 ส่งมอบ | แสดงเป็น "7/10"; on-time = ไม่เลื่อน milestone เกิน 1 สัปดาห์ |
| incidents_sev1 / incidents_sev2 | count | **น้อยดี** | 5 | sev1 เป้า 0 |
| customer_nps | score | มากดี | 5 | สำรวจรายไตรมาส ใช้ค่าล่าสุด |
| headcount | people | - | 6 คน | |
| open_positions | count | - | 6 | note บอกตำแหน่งที่เปิดเพิ่ม |
| attrition | people | **น้อยดี** | 6 | |

## กติกาสี
- ผ่านเป้า → Teal, ต่ำกว่าเป้า → Spark Orange **เฉพาะตัวแรกของหน้า** ตัวต่อไปเป็น Ink + ป้าย "ต่ำกว่าเป้า" ขอบเทา
- `build_deck.py` ทำให้อัตโนมัติ (ตัวที่น้อยดีกำหนดไว้ใน `LOWER_IS_BETTER`)

## ดีลที่รออนุมัติ (สไลด์ 4 และ 7)
ดึงจากสรุปดีลที่ส่งถึง MD: รหัสดีล, ลูกค้า, มูลค่า (ไม่รวม VAT), margin, เส้นตาย
เกณฑ์อนุมัติ (margin-rules v2026.1): margin ≥ 25% หัวหน้าทีมขายอนุมัติ · 15–<25% ต้อง MD · < 15% ปฏิเสธ · ส่วนลด > 10% MD เท่านั้น

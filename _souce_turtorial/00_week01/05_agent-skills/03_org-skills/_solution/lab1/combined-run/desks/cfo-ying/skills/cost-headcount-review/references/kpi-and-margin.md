# KPI รายเดือน + กฎกำไร (สรุปจาก company-kit)

> ต้นทาง: `company-kit/monthly-kpi.csv` และ `company-kit/margin-rules.md` v2026.1 (ผู้ดูแล `fin-joy`, มีผล 2026-01-01) · ถ้าต้นทางเปลี่ยนเวอร์ชัน ให้อัปเดตไฟล์นี้

## โครง monthly-kpi.csv

คอลัมน์: `metric,unit,<YYYY-MM>...,target_monthly,note` — ตัวเลขทั้งบริษัท (ไม่ใช่เฉพาะทีมในแล็บ)

| metric | unit | ใช้ทำอะไรในรีวิวนี้ |
|---|---|---|
| revenue | THB | รายได้ (ไม่รวม VAT) เป้า 9,000,000/เดือน |
| gross_margin | pct | margin ขั้นต้น เป้า 30% |
| pipeline_value | THB | รายได้ในอนาคต (ยังไม่เซ็น) |
| deals_won / deals_lost / win_rate | count / pct | win_rate = won/(won+lost) ในเดือน เป้า 50% |
| projects_active / projects_on_time | count | on-time = ไม่เลื่อน milestone เกิน 1 สัปดาห์ → สัญญาณทีมตึง |
| headcount | people | พนักงานสิ้นเดือน |
| open_positions | count | ตำแหน่งว่างที่เปิดอยู่ |
| attrition | people | ลาออกในเดือน |
| note | ข้อความ | **อ่านทุกแถว** บอกเหตุผล/รายได้ที่ยังไม่เป็นเงินสด |

ตัวเลขอ้างอิง ต.ค. 2026: รายได้ 9.12M, margin 27.1%, headcount 88, ตำแหน่งว่าง 6, pipeline 38.9M, win rate 33.3%

## สูตรที่ใช้ (อนุพันธ์จาก KPI)

```
กำไรขั้นต้น      = revenue × gross_margin / 100
ต้นทุนขาย        = revenue − กำไรขั้นต้น
ต่อหัว           = (รายได้ | ต้นทุนขาย | กำไรขั้นต้น) / headcount
on-time %        = projects_on_time / projects_active × 100
ราคาของ margin ที่ขาด = revenue × (30 − gross_margin) / 100
รายได้ที่ต้องเพิ่มต่อค่าคน 1 บาท = 100 / gross_margin
```

สูตรต้นทางระดับดีล: `Gross margin (%) = (ราคาขายรวม − ต้นทุนรวม) / ราคาขายรวม × 100` คิดหลังหักส่วนลดเสมอ

## เกณฑ์กำไร

| Gross margin | ความหมาย |
|---|---|
| ≥ 30% | ถึงเป้าเฉลี่ยทั้งบริษัทปี 2026 |
| ≥ 25% | ดีลผ่าน (หัวหน้าทีมขายอนุมัติ) |
| 15% – < 25% | ต้องให้ MD อนุมัติพร้อมเหตุผลเชิงกลยุทธ์ |
| < 15% | ปฏิเสธ ห้ามขอยกเว้น |

- งาน fixed-price ต้องมี **risk buffer 10% ของ man-day** อยู่ในแผน → ถ้าโปรเจกต์เกินแผน ให้ถามว่าใส่ buffer หรือยัง
- ราคาทุกตัวไม่รวม VAT (7%)
- **ห้ามแสดงต้นทุนและ margin ในเอกสารที่ส่งลูกค้า**

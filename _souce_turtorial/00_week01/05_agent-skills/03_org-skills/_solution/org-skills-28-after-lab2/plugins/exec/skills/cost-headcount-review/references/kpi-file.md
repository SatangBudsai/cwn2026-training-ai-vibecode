# รูปแบบไฟล์ KPI รายเดือน (`monthly-kpi.csv`)

> ต้นทาง: `company-kit/monthly-kpi.csv` (ตัวเลขทั้งบริษัท ต.ค. 2026 = 88 คน)

คอลัมน์: `metric, unit, <YYYY-MM>..., target_monthly, note` — เพิ่มคอลัมน์เดือนใหม่ทางขวาทุกเดือน

| metric | unit | ใช้ทำอะไรในรายงาน |
|---|---|---|
| revenue | THB | รายได้ที่รับรู้ในเดือน (ไม่ใช่เงินสด) |
| gross_margin | pct | คูณรายได้ = กำไรขั้นต้น · เป้า 30 |
| pipeline_value | THB | งานในอนาคต · เป้า 35M |
| deals_won / deals_lost | count | |
| win_rate | pct | won/(won+lost) ในเดือน · เป้า 50 |
| projects_active / projects_on_time | count | ตรงเวลา % = สัญญาณทีมตึง |
| incidents_sev1 / incidents_sev2 | count | (สาย CTO — ใส่เฉพาะถ้ามีผลต่อต้นทุน/ค่าปรับ) |
| headcount | people | |
| open_positions | count | หมายเหตุบอกตำแหน่งที่เพิ่ม |
| attrition | people | คนลาออก |
| customer_nps | score | รายไตรมาส |

ช่อง `note` สำคัญที่สุด: อธิบายตัวเลขผิดปกติ (งวดใบแจ้งหนี้, โปรเจกต์เกินแผน, ตำแหน่งที่เปิดใหม่)

ตัวอย่างค่า (ใช้ตรวจว่าสคริปต์ทำงานถูก): ต.ค. 2026 revenue 9,120,000 · gross_margin 27.1 → กำไรขั้นต้น 2,471,520

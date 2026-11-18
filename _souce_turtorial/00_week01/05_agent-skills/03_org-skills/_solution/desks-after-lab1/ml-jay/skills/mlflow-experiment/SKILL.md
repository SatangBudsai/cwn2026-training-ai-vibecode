---
name: mlflow-experiment
description: จัดระเบียบและบันทึกผลการทดลองโมเดล ML ให้เทียบกันได้ (ข้อมูล, พารามิเตอร์, metric, เหตุผลที่เลือก) แล้วทำรายงานรายสัปดาห์ + แผนรอบถัดไป ใช้เมื่อผู้ใช้พิมพ์ "บันทึกผลการทดลองรอบนี้", "เทียบโมเดลทั้งสามรอบ", "วางแผนทดลองโมเดลพยากรณ์", ขอสรุป experiment-results.csv หรือเตรียมลง MLflow (ไม่ใช่การปล่อยโมเดลขึ้นจริง ซึ่งเป็นงานของ model-release)
metadata:
  owner: ml-jay
  layer: personal
  version: 0.1.0
  uses: [customer-data-policy]
  follows: [req-to-spec]
  next: [model-release]
---

# mlflow-experiment — บันทึกการทดลองให้เทียบกันได้

ผลลัพธ์คือ **ทะเบียน run 1 ไฟล์ (CSV)** และ **รายงานประจำสัปดาห์ 1 ไฟล์ (Markdown)** ที่บอกว่า run ไหนดีที่สุด, เทียบกันแฟร์หรือยัง, ขาดอะไรอยู่ และรอบหน้าจะทดลองอะไร

## ขั้นตอน

1. **หาวัตถุดิบ** — ไฟล์ผลการทดลอง (เช่น `experiment-results.csv`) + โน้ตของ DS + เกณฑ์ความแม่นยำจาก spec/TOR
   ถ้าเป็นโปรเจกต์พยากรณ์คิวสาขา ใช้บริบทใน [references/queue-forecast-context.md](references/queue-forecast-context.md) ได้เลย
2. **รันสคริปต์เทียบ** (Python stdlib ไม่ต้องลงอะไรเพิ่ม)
   ```
   python scripts/compare_runs.py <results.csv> --target-mape 20
   ```
   ได้ตาราง metric + ส่วนต่าง, กลุ่มที่เทียบกันแฟร์ได้, ช่องที่ขาด
3. **อ่านโน้ตเพิ่มสิ่งที่ CSV ไม่มี** — ข้อมูลเปลี่ยนอะไร, seed, ผล tune ที่ไม่ได้จด, artifact อยู่ไหน, ปัญหาที่ metric รวมไม่สะท้อน
4. **ทำทะเบียน run** — คอลัมน์ตาม [references/run-record-standard.md](references/run-record-standard.md) (ไม่รู้ค่าให้เขียนว่าไม่รู้ ห้ามเดา) + ใส่ `status`/`decision`/`reason` ทุกแถว + แถว `planned` ของรอบหน้า
5. **เขียนรายงาน** ตาม [assets/weekly-report-template.md](assets/weekly-report-template.md): สรุป 4 บรรทัด → ตาราง → การ์ด run → ข้อสังเกต → แผนรอบหน้า → ส่งต่อ model-release → งานค้าง
6. บันทึกไว้ที่ `work/<YYYY>-W<ww>-<project>-experiments.md` และ `work/experiment-registry.csv`

## กติกาที่ห้ามข้าม
- **ห้ามประกาศว่า run ไหน "ชนะ" ถ้ายังเทียบไม่แฟร์** (data_version / n_branches / ช่วง train-test ต่างกัน หรือเปลี่ยนหลายอย่างพร้อมกัน) ให้สถานะเป็น `candidate` แล้วเสนอ run ที่ต้องรันเพิ่ม
- run ที่ไม่ได้ fix seed หรือไม่มี artifact = ยังรันซ้ำไม่ได้ ต้องเขียนเป็นงานค้าง
- แผนรอบหน้า: **เปลี่ยนทีละอย่าง** และเขียนเกณฑ์ตัดสินไว้ก่อนรัน
- ดู metric แยกส่วนที่ธุรกิจเจ็บด้วย ไม่ดูแค่ค่ารวม (เช่น payday, วันหยุด, ช่วงเที่ยง, ทิศทาง under/over)
- รายงานต้องไม่มีข้อมูลส่วนบุคคล — สรุปกติกาไว้ใน [references/data-policy-summary.md](references/data-policy-summary.md)
- สคริปต์นี้ไม่เรียก MLflow เอง ถ้ามี MLflow ให้ใช้ทะเบียน run เป็นแหล่ง backfill (ชื่อ experiment/tag ตาม run-record-standard)

## ส่งต่อ
- ได้ candidate ที่เทียบแฟร์และรันซ้ำได้แล้ว → ส่ง `model-release` (`ml-pim`) พร้อม run id ของ candidate + baseline สำหรับ rollback + ข้อเสนอเกณฑ์ถอยกลับ

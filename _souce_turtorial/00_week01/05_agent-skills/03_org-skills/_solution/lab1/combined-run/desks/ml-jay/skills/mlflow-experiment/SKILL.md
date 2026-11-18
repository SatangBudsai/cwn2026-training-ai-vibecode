---
name: mlflow-experiment
description: |
  จัดระเบียบผลการทดลองโมเดล ML ประจำสัปดาห์ให้เทียบกันได้ (ข้อมูล, พารามิเตอร์, metric, เหตุผลที่เลือก)
  อ่าน experiment-results.csv + notes ของ DS แล้วได้ทะเบียนรอบทดลอง ตารางเทียบทุกรอบ จุดที่เทียบไม่แฟร์ เทียบเกณฑ์ลูกค้า และงานรอบถัดไป
  ใช้เมื่อผู้ใช้พูดว่า "บันทึกผลการทดลองรอบนี้", "เทียบโมเดลทั้งสามรอบ", "วางแผนทดลองโมเดลพยากรณ์" หรือ /mlflow-experiment
metadata:
  owner: ml-jay
  layer: personal
  version: 0.1.0
  uses: [customer-data-policy]
  next: [model-release]
  follows: [req-to-spec]
---

# บันทึก/เทียบผลการทดลอง ML (mlflow-experiment)

โฟกัสเรื่องเดียว: **ทำให้ทุกรอบทดลองเทียบกันได้และตรวจย้อนได้** ไม่ทำ release/rollback (นั่นคือ `model-release`) ไม่เทรนโมเดลเอง

`SKILL_DIR` = โฟลเดอร์ของ skill นี้ · ใช้ Python 3.8+ (stdlib อย่างเดียว)

## Input ที่ต้องมี
- CSV ผลการทดลอง (หนึ่งแถวต่อหนึ่งรอบ) เช่น `company-kit/ml-queue-forecast/experiment-results.csv`
- โน้ตของคนทดลอง (เหตุผล, สิ่งที่เปลี่ยน, ปัญหา) เช่น `company-kit/ml-queue-forecast/notes.md`
- เกณฑ์ยอมรับของลูกค้า/TOR ถ้ามี — ถ้าหาไฟล์ไม่เจอ ใช้สรุปใน `references/queue-forecast-context.md`

## ขั้นตอน
1. **อ่านกติกา** `references/experiment-record-standard.md` (ฟิลด์บังคับ, กติกาเทียบแฟร์, metric ที่ต้องมี)
2. **รันสคริปต์เทียบ**
   ```bash
   python $SKILL_DIR/scripts/compare_runs.py --csv <csv> --out work/compare-runs.md --metric MAPE_pct --threshold 20 --baseline r01
   ```
   ได้: ตารางทุกรอบ, ส่วนต่างเทียบ baseline/รอบก่อน, ผ่านเกณฑ์ไหม, คู่ไหนไม่แฟร์, คอลัมน์ที่ขาด
3. **อ่านโน้ตแล้วจับสิ่งที่ CSV ไม่บอก**: เปลี่ยนหลายอย่างพร้อมกันไหม, data version เปลี่ยนเพราะอะไร, seed, ผลจูนที่ไม่ได้จด, artifact อยู่ไหน, ความเสี่ยงที่ metric รวมกลบ (เช่น under-forecast บางช่วง)
4. **เขียน `work/run-registry.csv`** ตามคอลัมน์ใน standard (เติม `status`, `comparable_with`, `reason`; ไม่รู้ให้ใส่ `UNKNOWN` ห้ามเดา) และเพิ่มแถว `PLANNED` สำหรับรอบที่ต้องรันเพื่อให้เทียบแฟร์
5. **เขียนรายงาน `work/<YYYY>-W<ww>-<project>-experiments.md`** ตามโครงใน standard หัวข้อ "โครงรายงานประจำสัปดาห์"
6. **ตรวจข้อมูลลูกค้า** ก่อนส่งต่อ: ห้ามมีข้อมูลระบุตัวตน (ใช้กติกาของ `customer-data-policy` ถ้าติดตั้งไว้) ชื่อธนาคารลูกค้าใช้ได้ในเอกสารภายใน
7. ถ้ามีรอบที่ควรปล่อย → ส่งต่อ `model-release` พร้อม run_id, artifact, เกณฑ์ที่ใช้ อย่าตัดสินเกณฑ์ rollback เอง

## กติกาที่ห้ามพลาด
- **ไม่แฟร์ = ห้ามสรุปว่าอะไรทำให้ดีขึ้น** (data_version / สาขา / ช่วง train-test ต่างกัน หรือเปลี่ยนหลายอย่างพร้อมกัน) ให้เสนอรอบที่ต้องรันเพิ่มแทน
- ส่วนต่างเล็กกว่า noise ของ seed (ไม่ fix seed ≈ ±0.5 จุด MAPE) ไม่นับเป็นการชนะ
- ผ่านเกณฑ์แบบเฉียด (< 1 จุด) ให้ติดป้าย "เฉียด"
- ตัวเลขจากข้อมูลต้นแบบ ≠ คำสัญญากับลูกค้าใหม่ ให้เขียนเงื่อนไขกำกับเสมอ
- ห้ามแก้ไฟล์ต้นทางใน company-kit เขียนผลที่ `work/` เท่านั้น

## Output สุดท้าย
`work/compare-runs.md` · `work/run-registry.csv` · `work/<YYYY>-W<ww>-<project>-experiments.md` และสรุปในแชต 3–5 บรรทัด: รอบที่ดีที่สุด, เทียบแฟร์ไหม, ผ่านเกณฑ์ไหม, งานที่ต้องทำต่อ

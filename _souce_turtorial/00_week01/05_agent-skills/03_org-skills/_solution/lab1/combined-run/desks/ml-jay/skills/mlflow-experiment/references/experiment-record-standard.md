# มาตรฐานบันทึกการทดลอง ML (ทีม ML / MLOps โนวาเทค)

## 1. ฟิลด์ต่อหนึ่งรอบ (หนึ่งแถวใน CSV = หนึ่ง MLflow run)

| ฟิลด์ | บังคับ | MLflow | หมายเหตุ |
|---|---|---|---|
| run_id, run_name | ✅ | tag / run name | run_id เรียงตามลำดับ r01, r02, ... |
| date, author | ✅ | tag | |
| model, features, params | ✅ | params | params ทั้งชุด ไม่ใช่เฉพาะตัวที่เปลี่ยน |
| data_version, n_branches | ✅ | params / dataset | เปลี่ยนเวอร์ชันข้อมูลต้องจดว่าเปลี่ยนอะไร |
| train_period, test_period | ✅ | params | |
| metric หลัก + metric ย่อย | ✅ | metrics | ดูข้อ 3 |
| git_commit | ✅ | tag `mlflow.source.git.commit` | |
| seed | แนะนำ | params | ไม่ fix = เทียบส่วนต่างเล็ก ๆ ไม่ได้ |
| data_hash | แนะนำ | dataset digest | |
| artifact_uri, mlflow_run_id | แนะนำ | artifacts | ห้ามอยู่บน laptop คนเดียว |
| reason | แนะนำ | description | เปลี่ยนอะไร เพราะอะไร |
| status | ใน registry | tag | production / candidate / rejected / PLANNED |
| comparable_with | ใน registry | — | run ที่เทียบแฟร์ได้ |

ค่าที่ไม่รู้ให้ใส่ `UNKNOWN` · ยังไม่อยู่ใน MLflow ใส่ `NOT_LOGGED` · ห้ามเดา

## 2. กติกาเทียบแฟร์

สองรอบเทียบแฟร์ได้เมื่อ **data_version, ชุดสาขา, train_period, test_period เหมือนกัน** และต่างกัน **ทีละเรื่อง** (โมเดล หรือ feature หรือ params)
- เปลี่ยนข้อมูล + feature พร้อมกัน → ต้องมีรอบ "โมเดลเดิมบนข้อมูลใหม่" ก่อนจะสรุปผลของ feature
- ช่วง test มีหน่วยที่ปิด/ผิดปกติ (เช่นสาขาปิดปรับปรุง) → MAPE ของรอบที่ยังรวมหน่วยนั้นจะสูงเกินจริง
- ไม่ fix seed → รัน ≥ 3 seeds รายงาน mean ± sd ก่อนสรุปส่วนต่าง < 1 จุด

## 3. metric ที่ต้องมี (งานพยากรณ์จำนวนคน)

- MAPE (ตรงกับภาษาสัญญา) **คู่กับ** MAE/RMSE เสมอ — MAPE แกว่งเมื่อค่าจริงน้อย
- MAPE แยกช่วงที่ลูกค้าสนใจ: วันเงินเดือนออก, สัปดาห์มีวันหยุด
- **bias แยกช่วงเสี่ยง** เช่น under-forecast ช่วงเที่ยงสาขาย่านออฟฟิศ (พยากรณ์ต่ำ = จัดคนไม่พอ อันตรายกว่าพยากรณ์เกิน)
- กลุ่ม cold-start (หน่วยใหม่ไม่มี lag) แยกต่างหาก
- เวลาเทรน (ต้องเทรนทุกคืนได้)

## 4. โครงรายงานประจำสัปดาห์

1. สรุปสั้น 3–4 ข้อ: รอบที่ดีสุด, แฟร์ไหม, ผ่านเกณฑ์ไหม, ทำซ้ำได้ไหม
2. ทะเบียนรอบทดลอง (รวมคอลัมน์ "สิ่งที่เปลี่ยนจากรอบก่อน" และแถว PLANNED)
3. ตารางเทียบทุกคู่ + คอลัมน์ "แฟร์?" + "อ่านผลได้ว่า"
4. เทียบเกณฑ์ลูกค้า/TOR ทีละข้อ
5. ความเสี่ยงที่ metric รวมไม่บอก
6. ข้อมูลที่ขาด (seed, ผลจูน, artifact, MLflow)
7. action items (งาน / ใคร / เพื่อ)
8. ข้อเสนอการตัดสินใจ — เสนอ ไม่ตัดสินแทน · เรื่อง release/rollback ส่งต่อ `model-release`

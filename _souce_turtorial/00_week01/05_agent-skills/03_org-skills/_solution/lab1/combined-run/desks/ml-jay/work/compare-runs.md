# เทียบผลการทดลอง (3 รอบ) · metric หลัก `MAPE_pct`

baseline = `r01` (baseline-ma4w) · เกณฑ์ผ่าน: `MAPE_pct` <= 20

## 1. ทุกรอบ

| run | date | model | data | สาขา | MAE | MAPE_pct | RMSE | MAPE_payday_pct | MAPE_holiday_week_pct | train_time_min |
|---|---|---|---|---|---|---|---|---|---|---|
| `r01` baseline-ma4w | 2026-10-05 | moving_average | qdata-v3 | 40 | 4.8 | 31.5 | 6.9 | 44.2 | 52.8 | 0.1 |
| `r02` gbm-base | 2026-10-12 | LightGBM | qdata-v3 | 40 | 3.1 | 19.8 | 4.5 | 27.6 | 38.9 | 6.5 |
| `r03` gbm-holiday ⭐ | 2026-10-19 | LightGBM | qdata-v4 | 38 | 2.6 | 15.2 | 3.9 | 17.4 | 19.6 | 8.2 |

## 2. ส่วนต่าง `MAPE_pct` (ติดลบ = ดีขึ้น)

| run | เทียบ baseline | เทียบรอบก่อน | ผ่านเกณฑ์? |
|---|---|---|---|
| `r01` | — | — | ❌ ไม่ผ่าน |
| `r02` | -11.7 (-37%) | -11.7 (-37%) | ✅ ผ่าน (เฉียด < 1 จุด) |
| `r03` | -16.3 (-52%) | -4.6 (-23%) | ✅ ผ่าน |

## 3. คู่ไหนเทียบกันได้แฟร์ (ข้อมูล/ช่วงเวลาเดียวกัน)

| คู่ | แฟร์? | ต่างกันที่ |
|---|---|---|
| `r01` vs `r02` | ✅ | - |
| `r01` vs `r03` | ⚠️ ไม่แฟร์ | data_version: qdata-v3 → qdata-v4; n_branches: 40 → 38 |
| `r02` vs `r03` | ⚠️ ไม่แฟร์ | data_version: qdata-v3 → qdata-v4; n_branches: 40 → 38 |

## 4. ช่องที่ขาด (ทำซ้ำ/ตรวจย้อนไม่ได้)

- คอลัมน์บังคับที่ไม่มี: ไม่มี ✅
- คอลัมน์แนะนำที่ไม่มี: seed, data_hash, artifact_uri, mlflow_run_id, reason
- ช่องว่าง: ไม่มี ✅

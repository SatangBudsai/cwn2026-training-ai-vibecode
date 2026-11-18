# มาตรฐาน run record (ทะเบียนการทดลอง)

1 แถว = 1 run · ไม่รู้ค่า → เขียนว่า "ไม่รู้"/"ไม่ได้ fix" ห้ามเว้นว่างแบบเงียบ ๆ และห้ามเดา

## คอลัมน์

| กลุ่ม | คอลัมน์ | ระดับ | หมายเหตุ |
|---|---|---|---|
| ตัวตน | run_id, run_name, date, author | ต้องมี | run_id เรียงต่อกัน r01, r02… · รันซ้ำ/แก้นิดเดียวใช้ suffix r02b |
| โมเดล | model, features, params | ต้องมี | params แบบ `k=v;k=v` · features ใช้ "rXX features + ..." ได้ |
| ความรันซ้ำได้ | seed, git_commit, artifact_uri | git_commit ต้องมี · seed/artifact ควรมี | model ที่ deterministic ให้เขียนว่า seed "n/a" |
| ข้อมูล | data_version, n_branches (หรือจำนวนหน่วย), train_period, test_period | ต้องมี | **4 ช่องนี้ต้องเหมือนกันถึงจะเทียบกันตรง ๆ ได้** |
| metric | MAE, MAPE_pct, RMSE | ต้องมี | ยิ่งต่ำยิ่งดี |
| metric แยกส่วน | MAPE_payday_pct, MAPE_holiday_week_pct, MAPE_lunch_11_13_pct, bias_lunch_pct, MAPE_new_branch_pct | ควรมี | bias = (พยากรณ์−จริง)/จริง ติดลบ = พยากรณ์ต่ำ (อันตรายกว่า เพราะสาขาจัดคนไม่พอ) |
| ต้นทุน | train_time_min | ควรมี | |
| MLflow | mlflow_run_id | ควรมี | |
| การตัดสิน | status, decision, reason | ต้องมีในทะเบียน | status: planned / running / candidate / superseded / rejected / production |

## กติกาเทียบแฟร์
1. เทียบได้ตรง ๆ เฉพาะ run ที่ data_version + จำนวนหน่วย + train/test period เหมือนกัน
2. ระหว่าง 2 run ที่เทียบกัน ควรเปลี่ยนแค่อย่างเดียว ถ้าเปลี่ยนหลายอย่าง (feature + params + ข้อมูล) ให้เพิ่ม run คั่นกลาง
3. ข้อมูลเปลี่ยนเวอร์ชัน → ให้รัน run ที่ดีที่สุดของเวอร์ชันเก่าบนข้อมูลใหม่ (เช่น r02 → r02b)
4. model สุ่มได้ → fix seed และควรรันอย่างน้อย 3 seed ก่อนสรุปว่าต่างกันจริง (ต่าง < ~0.5 จุด MAPE ถือว่าใกล้เคียง)
5. เขียนเกณฑ์ตัดสินไว้ก่อนรัน

## ตั้งชื่อใน MLflow (ใช้ตอน backfill/รันใหม่)
- experiment = ชื่อโปรเจกต์ เช่น `queue-forecast`
- run name = `<run_id>-<run_name>` เช่น `r03-gbm-holiday`
- params = คอลัมน์ params แยกเป็นคีย์ + `features`, `seed`
- metrics = คอลัมน์ metric ทั้งหมด
- tags = `data_version`, `n_branches`, `git_commit`, `author`, `status`
- artifacts = ไฟล์ model, รายการ feature, notebook/script ที่ใช้รัน

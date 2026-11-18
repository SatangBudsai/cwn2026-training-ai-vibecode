# Checklist ขึ้นระบบจริง · รอบ <เวอร์ชัน>

> เจ้าของ: <deploy lead> · ทำเมื่อ <วันที่> · อ้างอิง deploy runbook
> `[ ___ ]` = ยังไม่มีข้อมูล · ✋ = ต้องตัดสินใจ

## สรุปรอบนี้

| หัวข้อ | ค่า |
|---|---|
| เวอร์ชัน / image tag ใหม่ | |
| ระบบ / ลูกค้า (ธนาคาร?) | |
| วัน-เวลา (เสนอ) + วันสำรอง | |
| Downtime ที่แจ้งลูกค้า | |
| Deploy lead / Verifier / Comms | |
| On-call (2 ชม.หลัง + เช้าวันถัดไป 08:00–10:00) | |

**ทำไมเป็นวันนี้:** <นับ 3 วันทำการจากวันส่งประกาศ, อังคาร–พฤหัส, ช่วงห้าม>

## 1. เตรียมล่วงหน้า (T−3 ถึง T−1 วัน)
- [ ] ส่งประกาศลูกค้า (≥ 3 วันทำการ, `NOTICE-maintenance`, เบอร์ on-call กลาง)
- [ ] Release notes ครบ (ticket · migration · flag · ความเสี่ยง)
- [ ] UAT ผ่าน + ลูกค้าเซ็นรับเป็นลายลักษณ์อักษร
- [ ] Migration dry-run staging · เวลา `[ ___ ]` (> 5 นาที / lock ตารางใหญ่ → แยกรอบ)
- [ ] Migration ย้อนกลับได้ / expand อย่างเดียว
- [ ] ฟีเจอร์เสี่ยงอยู่หลัง flag ปิดไว้ · รายชื่อ flag
- [ ] TLS cert > 21 วัน ทุกโดเมน รวม api / webhook / payment + cert ที่ upload มือ
- [ ] จอง on-call

## 2. วัน deploy — ก่อนกด (T−30 นาที)
- [ ] bridge call + โพสต์ `#deploy` (เวอร์ชัน, release notes, 3 บทบาท)
- [ ] dashboard ปกติ (ป่วย → เลื่อน)
- [ ] DB snapshot → `available` → จดชื่อ `[ ___ ]`
- [ ] จด image tag ปัจจุบัน `[ ___ ]`
- [ ] ปิด cron/batch ที่ชน migration `[ ___ ]`

## 3. Deploy
- [ ] เปิดหน้า maintenance (ถ้ามี downtime)
- [ ] `prisma migrate deploy` (> 2 เท่าของ dry-run → หยุดคิด)
- [ ] rolling ทีละ instance, `/readyz` ผ่านทุกตัว
- [ ] ปิดหน้า maintenance

## 4. Smoke test (Verifier ภายใน 15 นาที)
- [ ] login / logout / refresh token
- [ ] flow หลัก 1 รอบเต็ม `[ ___ ]`
- [ ] webhook ภายนอกเข้าได้
- [ ] คิวไม่ค้าง · error < 1% · p95 แย่ลง ≤ 20%
- [ ] เปิด flag ทีละตัว + ทดสอบ flow หลักซ้ำ

## 5. แผน rollback
**Rollback ทันทีถ้า:** smoke test ไม่ผ่านและแก้ไม่ได้ใน 15 นาที · error > 5% นาน 5 นาที · ข้อมูลผิดแม้รายการเดียว
1. [ ] ปิด flag ที่เพิ่งเปิด
2. [ ] deploy image tag เดิม
3. [ ] restore snapshot (deploy lead + หัวหน้าทีม dev ตกลงร่วมกัน)
4. [ ] แจ้งลูกค้าภายใน 30 นาที

## 6. หลัง deploy
- [ ] แจ้งลูกค้าว่าเสร็จ + สิ่งที่เปลี่ยน (ภาษาผู้ใช้)
- [ ] เปิด cron/batch กลับ
- [ ] on-call เฝ้า · เกิดเหตุ → postmortem ใน 3 วันทำการ
- [ ] ปิด ticket · tag release · CHANGELOG

## ✋ จุดที่ต้องตัดสินใจ / ข้อมูลที่ยังขาด
1.

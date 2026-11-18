# สรุป Production Deploy Runbook ของโนวาเทค

> สรุปจาก `company-kit/deploy-runbook.md` (ผู้ดูแล `ops-art`, ปรับปรุง 2026-10-01) · ถ้า runbook ต้นฉบับเปลี่ยน ให้อัปเดตไฟล์นี้และขึ้น version ของ skill

## บทบาท (ทุกรอบต้องมีครบ · คนเดียวถือไม่เกิน 2)
- **Deploy lead** — กดปุ่ม, ตัดสินใจ rollback
- **Verifier** — QA หรือ dev ที่ **ไม่ได้เขียนฟีเจอร์นั้น** ทำ smoke test
- **Comms** — คุยกับลูกค้า, อัปเดตช่อง `#deploy`

## ช่วงเวลา
- ปกติ: **อังคาร–พฤหัส 21:00–23:00 น.**
- ห้าม: วันศุกร์ · ก่อนวันหยุดยาว · **วันที่ 25–สิ้นเดือน สำหรับลูกค้าธนาคาร** (เงินเดือนออก) — ยกเว้น hotfix Sev 1

## 1. เตรียมล่วงหน้า (T−3 ถึง T−1 วัน)
1. Release notes: ticket, migration, feature flag, ความเสี่ยง
2. UAT ผ่าน + ลูกค้าเซ็นรับเป็นลายลักษณ์อักษร (อีเมลได้) — ไม่มี = ไม่ deploy
3. แจ้งลูกค้า **≥ 3 วันทำการ** (SLA): วัน เวลา ผลกระทบ/downtime ช่องทางติดต่อ · แม่แบบ `NOTICE-maintenance` · ใช้เบอร์ on-call กลาง ห้ามเบอร์มือถือส่วนตัว
4. Migration dry-run บน staging ขนาดใกล้ production (ข้อมูลปิดบัง) จดเวลา — **> 5 นาที หรือ lock ตารางใหญ่ → แยกรอบ/ทำ online**
5. Migration ต้องย้อนกลับได้ หรือเป็น expand อย่างเดียว · ลบ/เปลี่ยนชื่อคอลัมน์ = 2 รอบปล่อย (expand → contract) · ใช้ Prisma migration เท่านั้น ห้ามแก้ DB มือ
6. ฟีเจอร์เสี่ยงอยู่หลัง feature flag ปิดไว้ เปิดหลัง deploy ผ่าน
7. TLS cert ทุกโดเมนที่เกี่ยวข้อง **เหลือ > 21 วัน**
8. จอง on-call 2 ชม.หลัง deploy + เช้าวันถัดไป 08:00–10:00

## 2. วัน deploy ก่อนกด (T−30 นาที)
1. เปิด bridge call + โพสต์ `#deploy` (เวอร์ชัน, ลิงก์ release notes, ชื่อ 3 บทบาท)
2. ดู dashboard error rate/latency/queue — ระบบป่วยอยู่แล้ว → เลื่อน
3. **Backup DB snapshot** ทันที → สถานะ `available` → จดชื่อ snapshot ในช่อง
4. จด image tag ปัจจุบัน (สำหรับ rollback)
5. ปิด cron/batch ที่เขียนชน migration (เช่น batch พยากรณ์รอบคืน)

## 3. Deploy
1. เปิดหน้า maintenance ถ้ามี downtime ตามที่แจ้ง
2. `prisma migrate deploy` — เวลา **> 2 เท่าของ dry-run ให้หยุดคิด**
3. Rolling ทีละ instance, `/readyz` ผ่านทุกตัว
4. ปิดหน้า maintenance

## 4. Smoke test (Verifier, ภายใน 15 นาที)
1. login / logout / refresh token
2. flow หลัก 1 รอบเต็ม (เช่น จองคิว → ยกเลิก / สั่งซื้อ → จ่ายด้วยบัตรทดสอบ)
3. webhook ภายนอกเข้าได้ (log มี event ใหม่)
4. คิวไม่ค้าง · error rate **< 1%** · latency p95 แย่ลง **≤ 20%**
5. เปิด feature flag ทีละตัว ทดสอบ flow หลักซ้ำทุกครั้ง

## 5. Rollback
**ตัดสินทันทีถ้า:** smoke test ไม่ผ่านและแก้ไม่ได้ใน **15 นาที** · error rate **> 5% นาน 5 นาที** · ข้อมูลผิดแม้ **รายการเดียว**
1. ปิด feature flag ที่เพิ่งเปิด (เร็วสุด)
2. deploy image tag เดิม (จากขั้น 2.4)
3. migration ใช้กับโค้ดเก่าไม่ได้ → restore snapshot (2.3) — **deploy lead + หัวหน้าทีม dev ต้องตกลงร่วมกัน** เพราะข้อมูลหลัง snapshot หาย
4. Comms แจ้งลูกค้า **ภายใน 30 นาที** ว่าถอยแล้ว + ผลกระทบ

## 6. หลัง deploy
1. แจ้งลูกค้าว่าเสร็จ + สิ่งที่เปลี่ยน (ภาษาผู้ใช้ ไม่ใช่ ticket)
2. เปิด cron/batch ที่ปิดไว้
3. On-call เฝ้า 2 ชม. + เช้าวันถัดไป · เกิดเหตุ → postmortem ภายใน 3 วันทำการ
4. ปิด ticket, tag release ใน git, อัปเดต CHANGELOG

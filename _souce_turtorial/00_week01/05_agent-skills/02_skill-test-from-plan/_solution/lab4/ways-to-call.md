# ทดลองเรียก skill test-from-plan แบบต่าง ๆ (รันจริง 3 พ.ย. 2026)

รันในสำเนาบท 02 (`C:/t/skill05/01_petshop`, skill v4) ด้วย Claude Code (Opus 5.5) แชตใหม่ทุกครั้ง
หยุดหลังขั้นแรก (`--max-turns 1`) เพราะต้องการดูแค่ว่า "หยิบ skill ไหม" ไม่ได้รันทดสอบเต็มรอบ

| # | พิมพ์ว่า | ขั้นแรกของ Claude |
|---|---|---|
| 1 | `ทดสอบเว็บตามแผนให้หน่อย` | `Skill: test-from-plan` |
| 2 | `ช่วยเช็กเว็บนี้ตาม TEST-PLAN.md ทีว่าพังตรงไหนบ้าง` | `Skill: test-from-plan` |
| 3 | `ใช้ skill test-from-plan ทดสอบเฉพาะโมดูลตะกร้า` | `Skill: test-from-plan` + args `ทดสอบเฉพาะโมดูลตะกร้า` → ต่อท้าย skill เป็น `ARGUMENTS: ทดสอบเฉพาะโมดูลตะกร้า` |
| 4 | `/test-from-plan` | เนื้อหา skill ถูกโหลดทันที คำสั่งแรกคือขั้นแรกของ SKILL.md (`date +%T` + ดูไฟล์ใน skill) |
| 5 | `/test-from-plan BUG_MODE=1 ทดสอบเฉพาะโมดูลตะกร้าและคูปอง` | เหมือนข้อ 4 (`date +%T` + อ่าน `references/decisions.md`) |
| 6 | `TEST-PLAN.md มี test ทั้งหมดกี่ข้อ` | ไม่หยิบ skill → `cat` แผนทั้งไฟล์ (รวมหัวข้อเฉลย) |

การส่งคำสั่งเพิ่มหลัง `/ชื่อ skill` ยืนยันด้วย skill ทดลองเล็ก ๆ ที่ให้ทวนข้อความกลับ:
`/echo-plan BUG_MODE=1 ทดสอบเฉพาะโมดูลตะกร้า` → skill ได้รับ `ARGUMENTS: ... BUG_MODE=1 ทดสอบเฉพาะโมดูลตะกร้า`
ตรงกับเอกสาร Claude Code: ถ้าใน SKILL.md ไม่มี `$ARGUMENTS` ข้อความที่พิมพ์ต่อท้ายจะถูกต่อท้าย skill เป็น `ARGUMENTS: <ข้อความ>`

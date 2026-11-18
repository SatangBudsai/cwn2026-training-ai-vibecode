---
name: decided-vs-pending
tags: [minutes]
runs: 3
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---
ทำ minutes จากแชตประชุมนี้ให้หน่อย ไม่ต้องเขียนไฟล์ ขอดูฉบับภายในในคำตอบ

ประชุม DevOps + Dev เรื่องย้าย DB — พุธ 4 พ.ย. 2026 14:00-14:30 (Teams)
ops-art (หัวหน้า DevOps): ตกลงย้ายขึ้น PostgreSQL 16 แน่นอน ผมอนุมัติ
dev-pond: งั้น window ย้ายน่าจะเสาร์ 21 พ.ย. นะ เดี๋ยวดูอีกที
ops-fon: แล้ว backup ต้องเก็บกี่วัน ใครรู้บ้าง
dev-pond: ผมจะเขียน migration script ให้เสร็จภายในศุกร์ 13 พ.ย.
ops-art: เรื่อง read replica ไว้ค่อยคุยกัน

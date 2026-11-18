# Plan v2

เหตุผล: NEW INFORMATION: เพิ่มความยินยอมและการจองเองผ่าน LINE OA หลังเฟสแรกผ่าน

สิ่งที่เปลี่ยน: เพิ่ม T1-v2, T3-v2, T4-v2, T5-v2; เก็บ T1–T5 เฟสแรกและใช้ T2 เดิม

Impact: contract/To-Be/Data Model/Mockup/Mapping/ผลตรวจรวม

Reuse: T2 As-Is, CSV และ Findings, normalization, Mockup สามส่วนเดิม

| งาน | คำอธิบาย | Dependency | สถานะ |
| --- | --- | --- | --- |
| T1 | ตรวจคุณภาพข้อมูลและระบุรายการรอยืนยัน | - | DONE |
| T2 | อธิบาย As-Is | T1 | DONE |
| T3 | ออกแบบ To-Be/Data Model/Mockup | T1 | DONE |
| T4 | ทำ Data Mapping และแผน Migration | T1 | DONE |
| T5 | รวม Gap/Roll-out และตรวจ C1–C3 | T2, T3, T4 | DONE |
| T1-v2 | เพิ่มข้อกำหนดและข้อมูลความยินยอม/LINE | T1 | DONE |
| T3-v2 | ปรับ To-Be/แบบจำลอง/Mockup เพิ่มสองส่วน | T1-v2 | DONE |
| T4-v2 | เพิ่ม Mapping และเงื่อนไขย้ายข้อมูลใหม่ | T1-v2 | DONE |
| T5-v2 | รวมผล ตรวจ C1–C3 และขอบเขตใหม่ | T2, T3-v2, T4-v2 | DONE |

# Execution Trace — Graph

วิธีรัน: Codex ในบทสนทนาเดียวจำลองบทบาทตามลำดับ Node และสร้างไฟล์แยก ใช้ dependency gate ก่อนบันทึกผล ไม่ได้แยกบริบทหรือรันขนานจริง จึงยังไม่พิสูจน์ความเป็นอิสระของ N2–N4 เก็บผลทดสอบเครื่องมือใหม่ทั้งหมด

## N1 — DONE

Dependency: ไม่มี

ผลลัพธ์: nodes/N1-findings.md, nodes/N1-contract.json, nodes/N1-source.csv

สมมติฐาน/ข้อจำกัด: แบบจำลองและผู้รับผิดชอบเป็นข้อเสนอ ต้องยืนยันก่อนใช้งาน

## N2 — DONE

Dependency: N1

ผลลัพธ์: nodes/N2-as-is.md

## N3 — DONE

Dependency: N1

ผลลัพธ์: nodes/N3-to-be.md, nodes/N3-mockup.html

## N4 — DONE

Dependency: N1

ผลลัพธ์: nodes/N4-migration.md

## N5 — กำลังตรวจ

N2/N3/N4 DONE ครบแล้ว รวมตามข้อมูลกลางที่ N1 กำหนด เพิ่ม Gap/Roll-out/Plan v1 และตรวจ Mockup เทียบ Findings; รอบแรกไม่เรียก N1b เพราะเป็นความกำกวมของข้อมูลที่คงรอยืนยัน ไม่ใช่ข้อกำหนดธุรกิจขัดกัน

## N5 — DONE

Dependency: N2, N3, N4

ผลลัพธ์: nodes/N5-review.md

สมมติฐาน/ข้อจำกัด: การตรวจความหมายโดย Codex ในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ

# ผล N5 — คลินิกเฟสแรก
C1 PASS: เอกสารหกส่วนและ Mockup ตารางนัด จอง/แก้ไข และคิวตรวจครบ
C2 PASS: อ่าน Findings เก้าประเภทเทียบ R1–R5 ครบทั้งแถว หลักฐาน และผลกระทบ คงความกำกวมวันเดือน/ปี/ตัวตน/เวลาหมอ ไม่มีการสรุปวันที่ตามประเทศอย่างเดียว ผล Python ยืนยันวันที่ R5 สองแบบไม่ตรงวันพุธ
C3 PASS: Mapping ปรับชื่อ NFC/trim/casefold และเบอร์ก่อนจับคู่ โดยให้คนยืนยัน R1/R2/R5, R3 และ R4; แผนภาพสามบล็อก render ได้; UI แสดง SourceRow รอตรวจ ไม่แสดงเป็นนัดจริง และตรง ReviewIssue/ข้อมูลของ N1 เปิดจริงทั้ง 1440 และ 390
สมมติฐาน: โครงสร้างข้อมูล ผู้รับผิดชอบ ขั้นตอนและสถานะเป็นข้อเสนอที่ต้องให้คลินิกยืนยัน ไม่ย้ายข้อมูลจริง

หยุดเฟสแรกเมื่อ N5 DONE พร้อม C1–C3 PASS

## เฟสสอง — ประเมิน Change Request

C1 ของ baseline ยังขาดความยินยอมและ LINE OA ในเอกสารและ Mockup จึงต้องปรับ N1 contract, N3 To-Be/model/UI, N4 Mapping/Migration และ N5 รวม/ตรวจ ส่วน N2 As-Is ใช้ต่อเพราะข้อกำหนดใหม่เป็นระบบอนาคตไม่เปลี่ยนกระบวนการเดิม

## N1-v2 — DONE

Dependency: N1

ผลลัพธ์: nodes/N1-v2-contract.json

สมมติฐาน/ข้อจำกัด: คง Findings และ raw เดิม ข้อกำหนดใหม่ไม่แก้ความกำกวมของข้อมูล

## N3-v2 — DONE

Dependency: N1-v2

ผลลัพธ์: nodes/N3-v2-to-be.md, nodes/N3-v2-mockup.html

## N4-v2 — DONE

Dependency: N1-v2

ผลลัพธ์: nodes/N4-v2-migration.md

## N5-v2 — DONE

Dependency: N2, N3-v2, N4-v2

ผลลัพธ์: nodes/N5-v2-review.md

สมมติฐาน/ข้อจำกัด: ใช้ N2 เดิมตาม Impact/Reuse

# ผล N5-v2 — คลินิกหลัง Change Request
C1 PASS: เพิ่มความยินยอมและ LINE OA ทั้งเอกสารและ Mockup พร้อม Impact/Reuse และ Plan v2
C2 PASS: คง raw และ Findings จากเฟสแรก ความกำกวมเดิมยังระบุครบ ไม่มีข้อมูลใหม่ไปยืนยันวันที่หรือตัวตนแทนเจ้าของข้อมูล
C3 PASS: render Mermaid ห้าบล็อกใหม่จริง เปิด UI ห้าส่วนทั้ง 1440/390 ไม่มี console/page error หรือหน้าล้นแนวนอน ช่องยินยอมไม่เลือกล่วงหน้า และ LINE ติดป้ายจำลอง
อ่านความสอดคล้อง: ConsentRecord ตรงช่องวัตถุประสงค์/รุ่นข้อความ/การตัดสินใจ/เวลา; LineIdentity แยกตัวตนบัญชีจาก Patient; BookingRequest เกิดก่อน Appointment ยืนยันแล้ว คง normalization และกรณีให้คนยืนยันเดิม
N2 ใช้ไฟล์เดิมและ hash เดิม ไม่ทำใหม่ ส่วน N1-v2, N3-v2, N4-v2 ทำตามผลกระทบก่อน N5-v2
ข้อจำกัด: การจำลองบทบาทในบทสนทนาเดียว ไม่มีการแยกบริบทหรือรันขนาน; ไม่ทดสอบธุรกรรมหรือ API จริงและไม่รับรองตามกฎหมาย

หยุดเฟสสองเมื่อ N5-v2 DONE

## ตารางสรุป

| Node | Dependency | สถานะ | ผลลัพธ์ |
| --- | --- | --- | --- |
| N1 | — | DONE | nodes/N1-findings.md, nodes/N1-contract.json, nodes/N1-source.csv |
| N2 | N1 | DONE | nodes/N2-as-is.md |
| N3 | N1 | DONE | nodes/N3-to-be.md, nodes/N3-mockup.html |
| N4 | N1 | DONE | nodes/N4-migration.md |
| N5 | N2, N3, N4 | DONE | nodes/N5-review.md |
| N1-v2 | N1 | DONE | nodes/N1-v2-contract.json |
| N3-v2 | N1-v2 | DONE | nodes/N3-v2-to-be.md, nodes/N3-v2-mockup.html |
| N4-v2 | N1-v2 | DONE | nodes/N4-v2-migration.md |
| N5-v2 | N2, N3-v2, N4-v2 | DONE | nodes/N5-v2-review.md |

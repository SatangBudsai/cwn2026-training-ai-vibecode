# สรุปผล Graph

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

# ผล N5-v2 — คลินิกหลัง Change Request
C1 PASS: เพิ่มความยินยอมและ LINE OA ทั้งเอกสารและ Mockup พร้อม Impact/Reuse และ Plan v2
C2 PASS: คง raw และ Findings จากเฟสแรก ความกำกวมเดิมยังระบุครบ ไม่มีข้อมูลใหม่ไปยืนยันวันที่หรือตัวตนแทนเจ้าของข้อมูล
C3 PASS: render Mermaid ห้าบล็อกใหม่จริง เปิด UI ห้าส่วนทั้ง 1440/390 ไม่มี console/page error หรือหน้าล้นแนวนอน ช่องยินยอมไม่เลือกล่วงหน้า และ LINE ติดป้ายจำลอง
อ่านความสอดคล้อง: ConsentRecord ตรงช่องวัตถุประสงค์/รุ่นข้อความ/การตัดสินใจ/เวลา; LineIdentity แยกตัวตนบัญชีจาก Patient; BookingRequest เกิดก่อน Appointment ยืนยันแล้ว คง normalization และกรณีให้คนยืนยันเดิม
N2 ใช้ไฟล์เดิมและ hash เดิม ไม่ทำใหม่ ส่วน N1-v2, N3-v2, N4-v2 ทำตามผลกระทบก่อน N5-v2
ข้อจำกัด: การจำลองบทบาทในบทสนทนาเดียว ไม่มีการแยกบริบทหรือรันขนาน; ไม่ทดสอบธุรกรรมหรือ API จริงและไม่รับรองตามกฎหมาย

หลักฐาน: verification.json, trace.md และ events.jsonl

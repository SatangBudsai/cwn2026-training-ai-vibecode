from common import *
reviews={
'1_meeting_room':'''# ผล N5 — เว็บจองห้อง
C1 PASS: เปิดห้อง ดูเวลาว่าง สร้างนัด ยกเลิก และเห็นสถานะครบ
C2 PASS: รัน nodes/N4-test.py จริง พร้อมตรวจเวลาซ้อน ช่วงเวลาผิด และคืนเวลาว่างหลังยกเลิก ไม่มี console/page error
C3 PASS: ห้อง/ฟอร์มจอง/สถานะอยู่บนหน้าแรก ดูเวลาว่างและยกเลิกรายการตัวอย่างหนึ่งคลิก หลักฐานและนิยามการนับอยู่ใน verification.json
สมมติฐาน: ข้อมูลห้องและนัดเริ่มต้นเป็นตัวอย่าง ข้อมูลอยู่ในหน่วยความจำ ไม่ใช่ระบบจองจริง
''',
'2_expense_claim':'''# ผล N5 — ระบบเบิกค่าใช้จ่าย
C1 PASS: ข้อกำหนด Actors, FR, BR, NFR, Use Case, ERD, Sequence, State, Traceability, Open Issues และ Mockup สามส่วนครบ
C2 PASS: อ่านเทียบสัมภาษณ์ทั้งสิบหน่วยความหมายใน Matrix ครบ ไม่ตกหล่นบรรทัดที่มีสองกติกา; S03/S04 เก็บข้อขัดแย้ง 5,000/10,000 ทั้งสองประโยค; ตัวเลขนโยบาย 30 และ 25 ตรงต้นทาง; ไม่มีตัวเลขวงเงินที่พัก
C3 PASS: อ่านเทียบ Sequence และ State กับ N1 contract และ ERD: Claim.category/amount/customer_name/customer_company/status/current_owner, Receipt.image_ref/receipt_date/review_status, Approval.approver_role/decision, Payment.scheduled_date มีครบ; ทุกสถานะมีผู้รับผิดชอบ; render Mermaid สี่บล็อกจริง
Mockup submit/tracking/review ใช้สถานะและผู้รับผิดชอบตาม contract มี Pain Point mapping ป้ายจำลอง และนโยบายรอยืนยัน เปิดจริงทั้ง 1440 และ 390
N1b DONE ก่อนรวม เก็บข้อขัดแย้งโดยไม่เลือกข้าง NFR-ACCESS/NFR-AUDIT เป็นข้อเสนอรอยืนยัน ไม่ได้อ้างจากสัมภาษณ์โดยตรง
ข้อจำกัด: หลายบทบาทในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ ตัวตรวจโครงสร้างตรวจได้บางส่วน ต้องอ่านความหมายประกอบ ปุ่มไม่ทำธุรกรรมจริง
''',
'3_clinic_migration':'''# ผล N5 — คลินิกเฟสแรก
C1 PASS: เอกสารหกส่วนและ Mockup ตารางนัด จอง/แก้ไข และคิวตรวจครบ
C2 PASS: อ่าน Findings เก้าประเภทเทียบ R1–R5 ครบทั้งแถว หลักฐาน และผลกระทบ คงความกำกวมวันเดือน/ปี/ตัวตน/เวลาหมอ ไม่มีการสรุปวันที่ตามประเทศอย่างเดียว ผล Python ยืนยันวันที่ R5 สองแบบไม่ตรงวันพุธ
C3 PASS: Mapping ปรับชื่อ NFC/trim/casefold และเบอร์ก่อนจับคู่ โดยให้คนยืนยัน R1/R2/R5, R3 และ R4; แผนภาพสามบล็อก render ได้; UI แสดง SourceRow รอตรวจ ไม่แสดงเป็นนัดจริง และตรง ReviewIssue/ข้อมูลของ N1 เปิดจริงทั้ง 1440 และ 390
สมมติฐาน: โครงสร้างข้อมูล ผู้รับผิดชอบ ขั้นตอนและสถานะเป็นข้อเสนอที่ต้องให้คลินิกยืนยัน ไม่ย้ายข้อมูลจริง
'''}
for key,review in reviews.items():
 p=case(key)
 if key=='1_meeting_room':v=json.loads((p/'verification.json').read_text());assert all(v['criteria'].values())
 else:v=json.loads((p/'verification-phase1.json').read_text());assert v['automated_pass'];v['criteria']={'C1':'PASS','C2':'PASS','C3':'PASS'};v['semantic_review']='nodes/N5-review.md';(p/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2))
 deps=['N2','N3','N4']+(['N1b'] if key=='2_expense_claim' else [])
 node(p,'N5',deps,{'nodes/N5-review.md':review},['การตรวจความหมายโดย Codex ในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ'])
 with (p/'trace.md').open('a') as f:f.write(review+'\nหยุดเฟสแรกเมื่อ N5 DONE พร้อม C1–C3 PASS\n\n')
 if key=='3_clinic_migration':
  for name in ['output.md','mockup.html']:(p/name.replace('.', '-phase1.',1)).write_bytes((p/name).read_bytes())
print('All three phase 1 N5 nodes DONE after actual tests and semantic review')

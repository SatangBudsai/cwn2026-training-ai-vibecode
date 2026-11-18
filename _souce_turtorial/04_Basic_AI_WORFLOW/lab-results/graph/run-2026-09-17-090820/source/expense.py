from common import *
p=case('2_expense_claim')
sources=[('S01','อยากถ่ายรูปใบเสร็จแล้วเบิกได้เลย ไม่อยากกรอกเยอะ','FR-01'),('S02','ส่วนใหญ่เบิกค่าน้ำมัน ค่าที่พัก ค่ารับรองลูกค้า','FR-02'),('S03','ผมต้องอนุมัติทุกใบ ถ้าเกิน 5,000 บาทต้องให้ผู้จัดการฝ่ายอนุมัติอีกชั้น','FR-03 / BR-01'),('S04','อะไรเกิน 10,000 ค่อยส่งมาผม ต่ำกว่านั้นหัวหน้าทีมจบได้เลย','FR-03 / BR-01'),('S05','ต้องตรวจใบเสร็จซ้ำ เคยมีคนเบิกใบเดียวสองรอบ','FR-04'),('S06','ต้องเบิกภายใน 30 วันนับจากวันที่ในใบเสร็จ','BR-02'),('S07','จ่ายเงินรอบวันที่ 25 ของเดือน','FR-05 / BR-03'),('S08','ค่ารับรองลูกค้าต้องระบุชื่อลูกค้าและชื่อบริษัท','FR-06 / BR-04'),('S09','พนักงานแต่ละระดับมีวงเงินค่าที่พักต่อคืนไม่เท่ากัน','FR-07 / BR-05'),('S10','อยากเห็นว่าใบเบิกของเราค้างอยู่ที่ใคร','FR-08')]
req='''# ข้อกำหนดระบบเบิกค่าใช้จ่าย — Graph

## Actor / Stakeholder
พนักงานฝ่ายขายยื่นและติดตามใบเบิก หัวหน้าทีมอนุมัติทุกใบ ผู้จัดการฝ่ายอนุมัติตามเกณฑ์ที่ต้องยืนยัน ฝ่ายบัญชีตรวจเอกสารและจ่ายเงิน HR ให้ข้อมูลระดับพนักงานและวงเงินที่พัก

## Functional Requirements (FR)
| รหัส | ความสามารถ | ที่มา |
| --- | --- | --- |
| FR-01 | แนบรูปใบเสร็จและกรอกใบเบิกให้ง่าย โดยยังไม่สรุปว่าต้องมี OCR | S01 |
| FR-02 | รองรับค่าน้ำมัน ค่าที่พัก และค่ารับรอง ไม่สรุปว่ามีได้เฉพาะประเภทเหล่านี้ | S02 |
| FR-03 | ส่งให้หัวหน้าทีมและผู้จัดการฝ่ายตามนโยบายที่ยืนยัน เก็บกรณีวงเงินขัดกันรอตัดสิน | S03,S04 |
| FR-04 | ช่วยบัญชีตรวจรายการที่อาจใช้ใบเสร็จซ้ำ โดยให้คนยืนยันก่อนตัดสิน | S05 |
| FR-05 | แสดงรายการรอจ่ายและบันทึกผลการจ่ายตามรอบ | S07 |
| FR-06 | รับชื่อลูกค้าและบริษัทเมื่อเป็นค่ารับรอง | S08 |
| FR-07 | รองรับระดับพนักงานและนโยบายค่าที่พักที่ HR ยืนยัน | S09 |
| FR-08 | แสดงสถานะและผู้รับผิดชอบปัจจุบันของใบเบิก | S10 |

## Business Rules (BR)
| รหัส | กติกา | สถานะ |
| --- | --- | --- |
| BR-01 | หัวหน้าทีมระบุเกิน 5,000 ให้ผู้จัดการอนุมัติอีกชั้น แต่ผู้จัดการระบุเกิน 10,000 | ขัดแย้ง ยังไม่เลือกเกณฑ์ รวมถึงกรณีเท่ากับวงเงินต้องถามเพิ่ม |
| BR-02 | เบิกภายใน 30 วันนับจากวันที่ในใบเสร็จ | มีในสัมภาษณ์ วิธีนับวันต้องยืนยัน |
| BR-03 | จ่ายเงินรอบวันที่ 25 ของเดือน | มีในสัมภาษณ์ วันตัดรอบและวันหยุดยังไม่ทราบ |
| BR-04 | ค่ารับรองต้องระบุชื่อลูกค้าและชื่อบริษัท | ยืนยันจากสัมภาษณ์ |
| BR-05 | วงเงินค่าที่พักต่อคืนแตกต่างตามระดับพนักงาน | รอ HR ให้ตัวเลข ไม่สร้างวงเงินเอง |

## Non-functional Requirements (NFR)
| รหัส | คุณภาพที่ต้องพิจารณา | หลักฐาน / สถานะ |
| --- | --- | --- |
| NFR-UX | แบบฟอร์มควรใช้ง่ายและลดการกรอก | S01; วิธีวัดต้องยืนยัน ไม่ตั้งเวลาและจำนวนคลิกเอง |
| NFR-ACCESS | สิทธิ์เข้าถึงใบเสร็จและข้อมูลใบเบิกตามหน้าที่ | ข้อเสนอออกแบบ ต้องยืนยันเพิ่มเติม |
| NFR-AUDIT | ตรวจย้อนการเปลี่ยนสถานะและผู้อนุมัติได้ | ข้อเสนอเพื่อรองรับการติดตาม ต้องยืนยันวิธีเก็บ |
'''
entities={'Employee':['employee_id','level'],'Claim':['claim_id','employee_id','category','amount','status','current_owner','customer_name','customer_company'],'Receipt':['receipt_id','claim_id','image_ref','receipt_date','review_status'],'Approval':['approval_id','claim_id','approver_role','decision'],'Payment':['payment_id','claim_id','scheduled_date','status'],'LodgingPolicy':['level','nightly_limit','policy_status']}
contract={'entities':entities,'states':{'ร่าง':'พนักงาน','รอตรวจเอกสาร':'บัญชี','รอหัวหน้าอนุมัติ':'หัวหน้าทีม','รอยืนยันนโยบาย':'หัวหน้าทีม','รอผู้จัดการอนุมัติ':'ผู้จัดการฝ่าย','รอจ่าย':'บัญชี','จ่ายแล้ว':'บัญชี'},'screens':['submit','tracking','review'],'assumptions':['ขั้นตอนบัญชีตรวจเอกสารก่อนหัวหน้าเป็นข้อเสนอ ต้องยืนยัน','ชื่อ Entity/Attribute และสถานะเป็นแบบจำลองเสนอ ไม่ใช่ข้อมูลสัมภาษณ์โดยตรง']}
node(p,'N1',[],{'nodes/N1-requirements.md':req,'nodes/N1-contract.json':json.dumps(contract,ensure_ascii=False,indent=2),'nodes/N1-sources.json':json.dumps(sources,ensure_ascii=False,indent=2)},contract['assumptions'])
issues='''## Open Issues

| ประเด็น | หลักฐาน / คำถาม |
| --- | --- |
| วงเงินส่งต่อขัดกัน | S03: “ผมต้องอนุมัติทุกใบ ถ้าเกิน 5,000 บาทต้องให้ผู้จัดการฝ่ายอนุมัติอีกชั้น”; S04: “อะไรเกิน 10,000 ค่อยส่งมาผม ต่ำกว่านั้นหัวหน้าทีมจบได้เลย” ต้องให้เจ้าของนโยบายตกลง ไม่เลือกข้าง |
| วงเงินที่พัก | S09 ไม่มีตัวเลข รอ HR ยืนยันระดับและวงเงินต่อคืน |
| วันยื่นและวันจ่าย | ยืนยันวิธีนับ 30 วัน วันตัดรอบ และการจัดการวันที่ 25 ตรงวันหยุด |
| ขั้นตอนและสิทธิ์ | การให้บัญชีตรวจก่อนหัวหน้า การส่งกลับ และสถานะที่เสนอ ต้องยืนยันกับผู้ใช้ |
| ใบเสร็จซ้ำ | ยืนยันเกณฑ์ตรวจและผู้ตัดสิน ห้ามถือคำเตือนว่าเป็นการทุจริตที่ยืนยันแล้ว |
'''
node(p,'N1b',['N1'],{'nodes/N1b-open-issues.md':issues},['ยังไม่เลือกวงเงินส่งต่อและไม่กำหนดวงเงินที่พัก'])
models='''## Use Case Diagram
```mermaid
flowchart LR
 E[พนักงาน] --> U1([UC-01 ยื่นใบเบิกและแนบใบเสร็จ])
 E --> U2([UC-02 ติดตามสถานะและผู้รับผิดชอบ])
 A[บัญชี] --> U3([UC-03 ตรวจใบเสร็จและรายการอาจซ้ำ])
 T[หัวหน้าทีม] --> U4([UC-04 อนุมัติตามนโยบาย])
 M[ผู้จัดการฝ่าย] --> U4
 A --> U5([UC-05 จัดรอบและบันทึกการจ่าย])
 H[HR] --> U6([UC-06 ยืนยันนโยบายค่าที่พัก])
```
Use Case แสดงด้วย Mermaid flowchart เพื่อสื่อผู้ใช้กับงาน ไม่ใช่ UML renderer เฉพาะทาง

## Sequence Diagram
```mermaid
sequenceDiagram
 actor Employee as พนักงาน
 participant Claim as ใบเบิก
 participant Receipt as ใบเสร็จ
 actor Accountant as บัญชี
 participant Approval as การอนุมัติ
 actor TeamLead as หัวหน้าทีม
 actor Manager as ผู้จัดการฝ่าย
 participant Payment as การจ่าย
 Employee->>Claim: กรอก category amount customer_name customer_company
 Employee->>Receipt: แนบ image_ref และ receipt_date
 Claim->>Accountant: status รอตรวจเอกสาร และ current_owner บัญชี
 Accountant->>Receipt: ตรวจ review_status และรายการอาจซ้ำ
 Accountant->>Approval: สร้างรายการรอหัวหน้า
 Approval->>TeamLead: ตรวจและบันทึก decision
 alt นโยบายยังไม่ยืนยัน
 TeamLead->>Claim: status รอยืนยันนโยบาย และ current_owner หัวหน้าทีม
 else ต้องส่งผู้จัดการตามนโยบายที่ยืนยัน
 TeamLead->>Manager: ส่งผ่าน Approval.approver_role
 Manager->>Approval: บันทึก decision
 Approval->>Claim: status รอจ่าย และ current_owner บัญชี
 else หัวหน้าอนุมัติจบตามนโยบายที่ยืนยัน
 Approval->>Claim: status รอจ่าย และ current_owner บัญชี
 end
 opt ใบเบิกอนุมัติครบแล้วเท่านั้น
 Accountant->>Payment: กำหนด scheduled_date ตามรอบวันที่ 25
 Payment->>Claim: เมื่อจ่ายสำเร็จตั้ง status จ่ายแล้ว และ current_owner บัญชี
 end
```
การตรวจบัญชีก่อนอนุมัติเป็นข้อเสนอ ไม่อนุมานว่าสัมภาษณ์ยืนยันลำดับนี้ เส้นทางจ่ายใช้เฉพาะรายการที่อนุมัติครบ ไม่ข้ามสถานะรอยืนยันนโยบาย

## State Diagram
```mermaid
stateDiagram-v2
 state "ร่าง — พนักงาน" as Draft
 state "รอตรวจเอกสาร — บัญชี" as Review
 state "รอหัวหน้าอนุมัติ — หัวหน้าทีม" as Team
 state "รอยืนยันนโยบาย — หัวหน้าทีม" as Hold
 state "รอผู้จัดการอนุมัติ — ผู้จัดการฝ่าย" as Manager
 state "รอจ่าย — บัญชี" as Pay
 state "จ่ายแล้ว — บัญชี" as Paid
 [*] --> Draft
 Draft --> Review: ยื่นใบเบิก
 Review --> Team: ตรวจเอกสารแล้ว
 Team --> Hold: นโยบายยังไม่ชัด
 Hold --> Team: ยืนยันนโยบายแล้ว
 Team --> Manager: เข้าเงื่อนไขส่งต่อตามนโยบายที่ยืนยัน
 Team --> Pay: หัวหน้าอนุมัติจบตามนโยบายที่ยืนยัน
 Manager --> Pay: อนุมัติแล้ว
 Pay --> Paid: จ่ายสำเร็จ
 Paid --> [*]
```
ทุกสถานะเก็บใน Claim.status และ Claim.current_owner ตาม contract สถานะเป็นข้อเสนอสำหรับการสื่อสารแบบ ไม่ใช่นโยบายที่รับรองแล้ว
'''
node(p,'N2',['N1'],{'nodes/N2-models.md':models},['แบบจำลองและขั้นตอนต้องให้ผู้ใช้ยืนยัน'])
erd='## ERD\n```mermaid\nerDiagram\n Employee ||--o{ Claim : submits\n Claim ||--o{ Receipt : contains\n Claim ||--o{ Approval : routes\n Claim ||--o| Payment : settles\n LodgingPolicy ||--o{ Employee : applies_to\n'
for ent,attrs in entities.items():
 erd+=' '+ent+' {\n'+''.join('  '+('decimal' if a in ['amount','nightly_limit'] else 'date' if a in ['receipt_date','scheduled_date'] else 'string')+' '+a+'\n' for a in attrs)+' }\n'
erd+='```\n\nLodgingPolicy.nightly_limit ยังว่างจน HR ยืนยัน ไม่ใส่ตัวเลขตัวอย่าง การจ่ายอาจยังไม่มีจนใบเบิกผ่านอนุมัติ ชื่อข้อมูลเป็นข้อเสนอจาก N1\n'
node(p,'N3',['N1'],{'nodes/N3-erd.md':erd})
body='''<section id="submit"><span class="tag">01 · ยื่นเบิก</span><h2>เตรียมใบเบิกของคุณ</h2><div class="form-grid"><label>ประเภทค่าใช้จ่าย<select><option>ค่ารับรองลูกค้า</option><option>ค่าน้ำมัน</option><option>ค่าที่พัก</option></select></label><label>ยอดเงิน<input placeholder="กรอกยอดตามใบเสร็จ"></label><label>ชื่อลูกค้า<input placeholder="ต้องระบุเมื่อเป็นค่ารับรอง"></label><label>บริษัทลูกค้า<input placeholder="ต้องระบุเมื่อเป็นค่ารับรอง"></label><label>วันที่ใบเสร็จ<input type="date"></label><div class="card">พื้นที่รูปใบเสร็จจำลอง<br><span class="muted">ไม่ได้อัปโหลดหรือทำ OCR จริง</span></div></div><p class="warn">ยื่นภายใน 30 วันจากวันที่ใบเสร็จ · วงเงินที่พักรอ HR ยืนยัน</p><button disabled>ยื่นใบเบิก — ปุ่มจำลอง</button></section>
<section id="tracking"><span class="tag">02 · ติดตาม</span><h2>ใบเบิกค้างอยู่ที่ใคร</h2><p class="muted">สถานะตัวอย่างตามแบบจำลอง ยังไม่ใช่รายการจริง</p><div class="table-wrap"><table><thead><tr><th>ใบเบิกจำลอง</th><th>สถานะ</th><th>ผู้รับผิดชอบ</th><th>ขั้นตอนถัดไป</th></tr></thead><tbody><tr><td>ค่ารับรองตัวอย่าง</td><td>รอยืนยันนโยบาย</td><td>หัวหน้าทีม</td><td>ยืนยันเกณฑ์ส่งต่อผู้จัดการ</td></tr><tr><td>ค่าน้ำมันตัวอย่าง</td><td>รอจ่าย</td><td>บัญชี</td><td>จัดรอบวันที่ 25 เมื่อข้อมูลพร้อม</td></tr><tr><td>ค่าที่พักตัวอย่าง</td><td>ร่าง</td><td>พนักงาน</td><td>รอนโยบายวงเงินจาก HR</td></tr></tbody></table></div></section>
<section id="review"><span class="tag">03 · ตรวจและอนุมัติ</span><h2>ตรวจหลักฐานก่อนตัดสินใจ</h2><div class="grid"><div class="card"><h3>ใบเสร็จอาจซ้ำ</h3><p>ตัวอย่างคำเตือนเพื่อให้บัญชีตรวจ ยังไม่ถือว่าเบิกซ้ำจริง</p></div><div class="card"><h3>นโยบายส่งต่อรอยืนยัน</h3><p>หัวหน้าทีม: เกิน 5,000<br>ผู้จัดการ: เกิน 10,000<br>ยังไม่เลือกเกณฑ์</p></div><div class="card"><h3>ค่าที่พัก</h3><p>ต่างตามระดับพนักงาน<br>รอ HR ยืนยันวงเงินต่อคืน</p></div></div><p class="warn">สถานะจำลอง: รอยืนยันนโยบาย · ผู้รับผิดชอบ: หัวหน้าทีม</p><button disabled>อนุมัติ — ปุ่มจำลอง</button></section>'''
mapping='''## Pain Point → FR/BR → หน้าจอ
| ปัญหา | ข้อกำหนด | หน้าจอ / เหตุผล |
| --- | --- | --- |
| ไม่อยากกรอกเยอะและอยากใช้รูป | FR-01, FR-02 | submit: ภาพใบเสร็จและข้อมูลเท่าที่สื่อโจทย์ |
| กติกาค่ารับรองและวันยื่น | FR-06, BR-02, BR-04 | submit: ลูกค้า/บริษัทและข้อความวันยื่น |
| ไม่รู้ค้างที่ใคร | FR-08 | tracking: สถานะ ผู้รับผิดชอบ และขั้นถัดไป |
| ใบเสร็จอาจซ้ำ | FR-04 | review: คำเตือนให้บัญชีตรวจ |
| วงเงินขัดกันหรือขาด | FR-03, FR-07, BR-01, BR-05 | review: เก็บทั้งสองเกณฑ์และป้ายรอ HR |
| รอบจ่าย | FR-05, BR-03 | tracking: แสดงขั้นตอนรอบจ่าย |
'''
node(p,'N4',['N1'],{'nodes/N4-mockup.html':page('เบิกค่าใช้จ่ายอย่างเป็นขั้นตอน','จากใบเสร็จสู่การติดตามและตรวจอนุมัติ · Mockup ไม่ทำธุรกรรมจริง',body), 'nodes/N4-screen-map.md':mapping})
trace='## Traceability Matrix\n| ต้นทาง | ข้อความสัมภาษณ์ | FR/BR | Use Case | Entity |\n| --- | --- | --- | --- | --- |\n'
ucs=['UC-01','UC-01','UC-04','UC-04','UC-03','UC-01','UC-05','UC-01','UC-06','UC-02'];ens=['Receipt / Claim','Claim','Approval / Claim','Approval / Claim','Receipt','Receipt','Payment','Claim','LodgingPolicy / Employee','Claim']
for (sid,quote,fr),uc,en in zip(sources,ucs,ens):trace+=f'| {sid} | {quote} | {fr} | {uc} | {en} |\n'
(p/'output.md').write_text(req+'\n'+models+'\n'+erd+'\n'+trace+'\n'+mapping+'\n'+issues+'\n## ข้อจำกัด\nMockup ใช้ข้อมูลและสถานะจำลอง ปุ่มไม่ทำงานจริง ไม่เชื่อมระบบเบิกหรือจ่ายเงิน การ render แผนภาพไม่แทนการตรวจความหมาย\n')
(p/'mockup.html').write_text((p/'nodes/N4-mockup.html').read_text())
with (p/'trace.md').open('a') as f:f.write('## N5 — กำลังตรวจ\n\nรับ N2/N3/N4 และ N1b หลัง DONE ครบ รวมข้อกำหนด แผนภาพ ตารางและ Mockup โดยคงเกณฑ์วงเงินทั้งสองฝั่ง รอ render และตรวจความสอดคล้องจริงก่อนตัดสิน DONE\n\n')
print('Expense nodes and conditional N1b generated; N5 awaits verification')

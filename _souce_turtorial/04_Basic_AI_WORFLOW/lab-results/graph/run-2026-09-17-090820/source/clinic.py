from common import *
import csv,io
p=case('3_clinic_migration');params=(p/'input-used.md').read_text();raw=params.split('```csv\n',1)[1].split('```',1)[0];rows=list(csv.DictReader(io.StringIO(raw)))
fields={'Patient':['patient_id','name_raw','name_key','phone_raw','phone_key'],'Appointment':['appointment_id','patient_id','branch_id','doctor_id','service_id','starts_at','ends_at','status'],'Branch':['branch_id','name'],'Doctor':['doctor_id','name'],'Service':['service_id','name','duration_minutes'],'SourceRow':['source_row_id','source_sheet','raw_payload','date_candidates','disposition','appointment_id'],'ReviewIssue':['issue_id','source_row_id','kind','owner','decision','evidence']}
findings='''# แผนระบบนัดหมายคลินิก — Graph

ข้อมูลตัวอย่าง R1–R5 จากโจทย์ ไม่มีการนำเข้าข้อมูลคนไข้จริง สถานะและโครงสร้างข้อมูลเป็นข้อเสนอออกแบบ

## Data Quality Findings (ข้อค้นพบปัญหาคุณภาพข้อมูล)
| ประเภท | แถวและหลักฐาน | ผลกระทบ | วิธีจัดการ |
| --- | --- | --- | --- |
| วันที่หลายรูปแบบและวันเดือนกำกวม | R1,R4: 03/09/2026; R5: 09/03/2026 เทียบ R2: 2026-09-03 | เสี่ยงนัดผิดเดือน | เก็บต้นฉบับและทางเลือก DMY/MDY ขอรูปแบบชีตแต่ละสาขา |
| ปีสองหลักไม่ระบุศักราช | R3: 3 ก.ย. 69 | เสี่ยงผิดปี | เดือนกันยายนชัด แต่ปีต้องยืนยัน; พ.ศ. 2569 เป็น candidate จากบริบท R2 ไม่ใช่ข้อสรุป |
| เบอร์รูปแบบต่างกัน | R1/R2/R5 มีขีด ช่องว่าง และเลขติดกัน | จับคู่ไม่พบ | ปรับเป็น 0812345678 เพื่อค้นหาโดยยังไม่รวมตัวตน |
| ช่องทางติดต่อขาด | R3 ไม่มีเบอร์ มีเพียงหมายเหตุติดต่อ LINE | ติดต่อหรือยืนยันคนไม่ได้ | ให้สาขายืนยัน ห้ามแต่งเบอร์หรือรหัส LINE |
| นัดอาจซ้ำ | R1/R2 ชื่อ เบอร์ หมอ เวลา และบริการตรงกัน; R2 ระบุจองซ้ำทางไลน์ | จัดคิวหรือแจ้งเตือนซ้ำ | รอวัน R1 และตัวตนยืนยันก่อนรวม เก็บ raw ทั้งสอง |
| ชื่อข้ามภาษาและคำนำหน้า | R5 Somchai Jaidee เทียบ R1/R2 สมชาย ใจดี; R3 คุณมาลี | เสี่ยงรวมคนผิด | ใช้ชื่อปรับรูปเป็น candidate ให้คนยืนยัน ไม่ยึดคำทับศัพท์เป็นข้อพิสูจน์ |
| ตารางหมออาจชน | R3/R4 หมอบี 13:30 ที่บางนา | เสี่ยงนัดเกินความพร้อมหากวันเดียวกัน | ยังไม่สรุปว่าชน ขอวันและระยะเวลาบริการก่อน |
| หมายเหตุวันหมอไม่ตรงวันที่ทั้งสองแบบ | R5 ระบุทุกวันพุธ แต่ 2026-03-09 เป็นจันทร์ และ 2026-09-03 เป็นพฤหัสบดี | ใช้หมายเหตุเลือกวันไม่ได้ | ให้สาขายืนยันทั้งวันและหมายเหตุ |
| รหัสและระยะเวลาบริการไม่มี | R1–R5 ไม่มีรหัสคนไข้/นัดถาวรและระยะเวลาสิ้นสุด | จับคู่และตรวจเวลาซ้อนเต็มช่วงไม่ได้ | เก็บรหัสแถวต้นทาง ขอ master และระยะเวลาก่อนสร้างนัดจริง |

### ข้อมูลที่ยังต้องยืนยัน
R1/R4: วันที่อาจเป็น 3 กันยายนหรือ 9 มีนาคม; R2 ชี้เดือนกันยายนเฉพาะแถวนั้น ไม่พิสูจน์ทุกสาขา
R3: กันยายนแน่จากคำย่อ แต่ปี 69 ไม่กำหนดศักราช/ศตวรรษ และตัวตน/ช่องทางติดต่อยังขาด
R5: วันที่สองแบบไม่ตรงหมายเหตุวันพุธทั้งคู่ จึงไม่เลือกแทนเจ้าของข้อมูล
R1/R2/R5: เบอร์ตรงกันและชื่อคล้ายกัน ไม่เพียงพอให้รวมคนไข้โดยอัตโนมัติ
'''
contract={'entities':fields,'ui_sections':['appointments','booking','review'],'states':{'SourceRow.disposition':['รอยืนยัน','พร้อมนำเข้า','คงแถวอ้างอิงหลังยืนยันซ้ำ'],'Appointment.status':['ยืนยันแล้ว','ยกเลิกแล้ว']},'rules':['ทุก R1–R5 ยังเป็นข้อมูลรอตรวจ ไม่แสดงเป็น Appointment ที่ยืนยันแล้ว','SourceRow.appointment_id ว่างจนตรวจผ่าน','ห้ามแต่ง duration, timezone หรือวันที่ยืนยัน','คนรับผิดชอบ ReviewIssue คือเจ้าหน้าที่สาขาต้นทาง; เป็นข้อเสนอรอยืนยัน']}
node(p,'N1',[],{'nodes/N1-findings.md':findings,'nodes/N1-contract.json':json.dumps(contract,ensure_ascii=False,indent=2),'nodes/N1-source.csv':raw},['แบบจำลองและผู้รับผิดชอบเป็นข้อเสนอ ต้องยืนยันก่อนใช้งาน'])
asis='''## As-Is Process (กระบวนการทำงานปัจจุบัน)
```mermaid
flowchart LR
 P[คนไข้ติดต่อ LINE หรือสาขา] --> B[เจ้าหน้าที่ตรวจชีตของสาขา]
 B --> S[บันทึกนัดใน Google Sheet]
 S --> C[แจ้งผลกับคนไข้]
 S -. ต้องสำรวจเพิ่มเติม .-> Q[วิธีตรวจหมอข้ามสาขาและตรวจซ้ำ]
```
ข้อมูลยืนยันคือชีตแยกสามสาขาและช่องทาง LINE ลำดับงานเจ้าหน้าที่ในภาพเป็นข้อเสนอสำหรับสัมภาษณ์ต่อ ไม่สรุปว่าระบบเดิมไม่ตรวจซ้ำ
'''
node(p,'N2',['N1'],{'nodes/N2-as-is.md':asis})
tobe='''## To-Be Process (กระบวนการทำงานที่ต้องการในอนาคต)
```mermaid
flowchart TD
 A[รับแถวจากชีตแต่ละสาขา] --> B[เก็บ raw และรหัสต้นทาง]
 B --> C[ปรับชื่อ เบอร์ และเสนอวันที่]
 C --> D{ข้อมูลและตัวตนยืนยันแล้วหรือไม่}
 D -- ยัง --> H[เจ้าหน้าที่สาขาตรวจพร้อมหลักฐาน]
 H --> C
 D -- แล้ว --> E[ตรวจนัดซ้ำและทรัพยากรหมอข้ามสาขา]
 E --> F{วันและเวลาพร้อมหรือไม่}
 F -- ไม่พร้อม --> H
 F -- พร้อม --> G[สร้างนัดกลางและบันทึกการเปลี่ยนแปลง]
```

## Data Model (แบบจำลองข้อมูล)
```mermaid
erDiagram
 Patient ||--o{ Appointment : books
 Branch ||--o{ Appointment : hosts
 Doctor ||--o{ Appointment : attends
 Service ||--o{ Appointment : defines
 SourceRow }o--o| Appointment : maps_to
 SourceRow ||--o{ ReviewIssue : raises
'''
for ent,attrs in fields.items():tobe+=' '+ent+' {\n'+''.join('  '+('datetime' if a in ['starts_at','ends_at'] else 'int' if a=='duration_minutes' else 'string')+' '+a+'\n' for a in attrs)+' }\n'
tobe+='```\n\nSourceRow.appointment_id ว่างได้ก่อนตรวจเสร็จ; duration_minutes และ timezone ต้องยืนยันก่อนคำนวณ ends_at ข้อมูลรอยืนยันอยู่ใน SourceRow ไม่ปะปนกับนัดที่ยืนยันแล้ว\n'
trs=''
for i,r in enumerate(rows,1):trs+='<tr>'+''.join('<td>'+escape(v)+'</td>' for v in [f'R{i}',r['สาขา'],r['วันที่'],r['เวลา'],r['หมอ'],r['บริการ'],'รอยืนยัน'])+'</tr>'
body='''<section id="appointments"><span class="tag">01 · ตารางกลาง</span><h2>นัดหมายจากทั้งสามสาขา</h2><p class="warn">ข้อมูลจำลอง R1–R5 ยังอยู่ระหว่างตรวจ ไม่ใช่นัดที่ยืนยันแล้ว</p><div class="table-wrap"><table><thead><tr><th>แถว</th><th>สาขา</th><th>วันที่ raw</th><th>เวลา</th><th>หมอ</th><th>บริการ</th><th>สถานะข้อมูล</th></tr></thead><tbody>'''+trs+'''</tbody></table></div></section><section id="booking"><span class="tag">02 · จอง / แก้ไข</span><h2>เตรียมนัดหมายใหม่</h2><div class="form-grid"><label>คนไข้<input placeholder="เลือกหลังยืนยันตัวตน"></label><label>สาขา<select><option>บางนา</option><option>ลาดกระบัง</option><option>อ่อนนุช</option></select></label><label>หมอ<select><option>หมอบี</option><option>หมอเอ</option></select></label><label>บริการ<select><option>จัดฟัน</option><option>อุดฟัน</option></select></label><label>วัน<input placeholder="รอยืนยันวันและรูปแบบ"></label><label>เวลา<input value="13:30" readonly></label></div><p class="warn">R3/R4 อาจใช้เวลาหมอชนกัน ต้องยืนยันวันและระยะเวลาบริการก่อน ห้ามสรุปว่าชนจริง</p><button disabled>บันทึก — ปุ่มจำลอง</button></section><section id="review"><span class="tag">03 · ตรวจข้อมูลก่อนย้าย</span><h2>รายการรอคนยืนยัน</h2><div class="table-wrap"><table><thead><tr><th>แถว</th><th>ปัญหา</th><th>ผู้ยืนยัน / การจัดการ</th></tr></thead><tbody><tr><td>R1/R2</td><td>นัดอาจซ้ำ วันที่ R1 กำกวม</td><td>เจ้าหน้าที่ลาดกระบังยืนยันวันและนัดก่อนรวม</td></tr><tr><td>R3</td><td>ไม่มีเบอร์ ปี 69 ไม่ระบุศักราช</td><td>สาขาบางนายืนยันปี ตัวตนและช่องทางติดต่อ</td></tr><tr><td>R4</td><td>วันกำกวมและอาจชนกับ R3</td><td>สาขาบางนายืนยันวันและระยะเวลาบริการ</td></tr><tr><td>R5</td><td>วันพุธไม่ตรง 9 มีนาคมหรือ 3 กันยายน</td><td>สาขาอ่อนนุชยืนยันวันและตารางหมอ</td></tr><tr><td>R1/R2/R5</td><td>เบอร์ปรับรูปตรงกัน ชื่อข้ามภาษา</td><td>รอคนไข้และเจ้าหน้าที่ ห้ามรวมตัวตนอัตโนมัติ</td></tr></tbody></table></div><p class="warn">เก็บต้นฉบับทุกแถว ไม่ลบรายการที่สงสัยซ้ำหรือย้ายข้อมูลจริง</p></section>'''
mock=page('คลินิกเดียวกัน ข้อมูลชุดเดียว','แบบจำลองระบบนัดหมายกลาง · วันและตัวตนที่ยังไม่ชัดต้องให้คนยืนยัน',body)
node(p,'N3',['N1'],{'nodes/N3-to-be.md':tobe,'nodes/N3-mockup.html':mock})
migration='''## Data Mapping (การจับคู่ข้อมูลต้นทางกับปลายทาง) และ Migration (การย้ายข้อมูลและระบบ)
| ข้อมูลต้นทาง | ปลายทางตาม contract ของ N1 | วิธีแปลง / เงื่อนไข |
| --- | --- | --- |
| สาขา | Branch.name / branch_id | จับคู่ master ที่เจ้าของข้อมูลยืนยัน |
| วันที่และเวลา | SourceRow.date_candidates → Appointment.starts_at | เก็บ raw เสมอ แยก parser ตาม metadata ชีต; ค่ากำกวมเข้าคิว ไม่เลือกเอง |
| ชื่อ | Patient.name_raw / name_key | Unicode NFC, trim, ยุบช่องว่าง และ casefold อังกฤษ แยกคำนำหน้าเพื่อค้นหา ไม่ทำลาย raw |
| เบอร์ | Patient.phone_raw / phone_key | ตัดขีดและช่องว่างก่อนจับคู่ รักษาศูนย์นำหน้า ยืนยันประเทศก่อนแปลง country code; ห้ามเติมเบอร์ที่ขาด |
| หมอ | Doctor.name / doctor_id | ให้สาขายืนยัน master และตารางข้ามสาขา |
| บริการ | Service.name / service_id / duration_minutes | ยืนยันชื่อบริการและระยะเวลา ไม่กำหนดตัวเลขเอง |
| หมายเหตุ | SourceRow.raw_payload / ReviewIssue | เก็บต้นฉบับและเหตุผลที่ต้องตรวจ |
| แหล่งข้อมูลและแถว | SourceRow.source_sheet / source_row_id | ใช้กุญแจต้นทางและตรวจนำเข้าซ้ำ |

### จับคู่ตัวตนและกรณีให้มนุษย์ยืนยัน
- ปรับชื่อและเบอร์ก่อนสร้าง candidate จากหลายหลักฐาน ไม่ใช้เบอร์เดียวหรือคำทับศัพท์เป็นคำตอบสุดท้าย
- R1/R2: ชื่อ เบอร์ หมอ เวลา บริการ และหมายเหตุสนับสนุนนัดซ้ำ แต่ต้องยืนยันวัน R1 และตัวตนก่อนรวม
- R5: เบอร์ตรง R1/R2 แต่ชื่อภาษาอื่น วัน/สาขา/บริการต่าง ให้เจ้าหน้าที่และคนไข้ยืนยัน
- R3: ไม่มีเบอร์และชื่อไม่ครบ ให้สาขาหาช่องทางติดต่อที่ยืนยันแล้ว ห้ามเดารหัส LINE
- R4: ยังไม่พบหลักฐานคนซ้ำ แต่วันและเวลาหมอต้องยืนยัน
- บันทึก ReviewIssue.decision, evidence และ owner ก่อนผูก SourceRow.appointment_id; คงทุกแถวแม้ยืนยันว่าเป็นนัดเดียวกัน

### ขั้นย้ายและเงื่อนไขหยุด
สำรอง snapshot และตรวจจำนวน raw → นำเข้า staging พร้อมกุญแจต้นทาง → ปรับรูปและตรวจ candidate → เจ้าของข้อมูลยืนยัน → dry run และตรวจยอด disposition ของทุกแถว → ตรวจ foreign key และเวลาหมอ → ลงนามตรวจรับ → cutover ตามเวลาที่ตกลง

ระหว่าง cutover ควบคุมการแก้ชีต เก็บ delta หลัง snapshot และกระทบยอดใหม่ หากยอดผิด ตัวตนผิด หรือทรัพยากรยังไม่ยืนยันให้หยุด ย้อนกลับไปชีตที่รวม delta ที่ตรวจแล้ว ห้ามทิ้งนัดใหม่ที่เกิดหลัง snapshot
'''
node(p,'N4',['N1'],{'nodes/N4-migration.md':migration})
end='''## Gap Analysis (การวิเคราะห์สิ่งที่ยังขาดเพื่อไปสู่ระบบใหม่) และ Roll-out Plan (แผนทยอยนำระบบไปใช้งาน)
| สิ่งที่ขาด | งานที่ต้องทำ | ผู้ยืนยัน |
| --- | --- | --- |
| วันที่และรหัสกลาง | เก็บ metadata และ master ของแต่ละสาขา | เจ้าของชีตและหัวหน้าสาขา |
| ตัวตนที่เชื่อถือได้ | คิวตรวจและจับคู่พร้อมหลักฐาน | เจ้าหน้าที่และคนไข้ |
| ตารางหมอและระยะเวลา | ตารางทรัพยากรกลาง | ผู้ดูแลตารางหมอ |
| ขั้นตอนทำงานร่วมกัน | ฝึกใช้หน้าจอและทดสอบการย้อนกลับ | ผู้จัดการคลินิก |

ลำดับ: ยืนยันข้อมูลหลัก → dry run → นำร่องสาขาที่คลินิกเลือก → ตรวจผลและ rollback → ขยายเมื่อเจ้าของงานรับรอง ไม่กำหนดวันจริงหรือสาขานำร่องเอง

## Plan Version Log (บันทึกการเปลี่ยนแปลงแผน)
| แผน | เหตุผล | งาน | ผลงานเดิมที่ใช้ต่อ |
| --- | --- | --- | --- |
| v1 | เริ่มจากข้อมูลโจทย์ | N1 ข้อค้นพบ/contract → N2/N3/N4 → N5 รวมและตรวจ พร้อม Mockup | ไม่มีผลรันเก่ามาใช้แทนหลักฐานรอบนี้ |

## ความสอดคล้องของ Mockup
appointments แสดง SourceRow.disposition รอยืนยัน ไม่แสดงเป็น Appointment ยืนยันแล้ว; booking ใช้ Patient/Branch/Doctor/Service และตัวเตือน R3/R4; review แสดง ReviewIssue ของ R1–R5 พร้อมผู้ยืนยัน

## ข้อจำกัด
ข้อมูลและหน้าจอเป็นตัวอย่าง ปุ่มไม่ทำธุรกรรม ไม่ย้ายข้อมูลจริง ต้องยืนยันวันที่ ปี ตัวตน ช่องทางติดต่อ ระยะเวลา timezone และนโยบายก่อนใช้จริง
'''
(p/'output.md').write_text(findings+'\n'+asis+'\n'+tobe+'\n'+migration+'\n'+end);(p/'mockup.html').write_text(mock)
(p/'nodes/N5-plan.md').write_text(end)
with (p/'trace.md').open('a') as f:f.write('## N5 — กำลังตรวจ\n\nN2/N3/N4 DONE ครบแล้ว รวมตามข้อมูลกลางที่ N1 กำหนด เพิ่ม Gap/Roll-out/Plan v1 และตรวจ Mockup เทียบ Findings; รอบแรกไม่เรียก N1b เพราะเป็นความกำกวมของข้อมูลที่คงรอยืนยัน ไม่ใช่ข้อกำหนดธุรกิจขัดกัน\n\n')
print('Clinic phase 1 nodes generated; N5 awaits verification')

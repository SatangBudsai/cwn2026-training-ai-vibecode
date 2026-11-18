from common import *
p=case('3_clinic_migration'); assert (p/'output-phase1.md').exists()
(p/'prompt-phase2.md').write_text('''# ข้อมูลใหม่หลังเฟสแรก
เจ้าของคลินิกต้องการเก็บความยินยอมของคนไข้และให้จองคิวเองผ่าน LINE OA เพิ่มสองข้อนี้ใน C1 และใน mockup.html ตรวจผลกระทบผ่าน Dependency ระบุ Node ที่ต้องทำใหม่และผลเดิมที่ใช้ต่อ รวมผลให้ครบพร้อม Plan v2 ตรวจ C1–C3 อีกครั้ง เก็บ baseline และ Trace เดิมไว้ ไม่เชื่อมบริการจริง
''')
with (p/'trace.md').open('a') as f:f.write('## เฟสสอง — ประเมิน Change Request\n\nC1 ของ baseline ยังขาดความยินยอมและ LINE OA ในเอกสารและ Mockup จึงต้องปรับ N1 contract, N3 To-Be/model/UI, N4 Mapping/Migration และ N5 รวม/ตรวจ ส่วน N2 As-Is ใช้ต่อเพราะข้อกำหนดใหม่เป็นระบบอนาคตไม่เปลี่ยนกระบวนการเดิม\n\n')
contract=json.loads((p/'nodes/N1-contract.json').read_text());contract['entities'].update({'ConsentRecord':['consent_id','patient_id','purpose','notice_version','decision','recorded_at','withdrawn_at','evidence_ref'],'LineIdentity':['line_identity_id','patient_id','provider_subject','verification_status'],'BookingRequest':['request_id','line_identity_id','appointment_id','idempotency_key','status']});contract['ui_sections']+=['consent','line-booking'];contract['new_information']=['ความยินยอมตามโจทย์','จองเองผ่าน LINE OA'];contract['policy_note']='ต้องยืนยันวัตถุประสงค์ ข้อความ ผลของการให้/ไม่ให้/ถอน และวิธียืนยันตัวตน ไม่อ้างว่าการออกแบบรับรองตามกฎหมาย'
node(p,'N1-v2',['N1'],{'nodes/N1-v2-contract.json':json.dumps(contract,ensure_ascii=False,indent=2)},['คง Findings และ raw เดิม ข้อกำหนดใหม่ไม่แก้ความกำกวมของข้อมูล'])
extra='''## To-Be ส่วนเพิ่มหลัง Change Request (updated: change request)
```mermaid
flowchart TD
 L[เปิดหน้าจองจาก LINE OA] --> I[ยืนยันบัญชีกับตัวตน Patient]
 I --> Q{ยืนยันตัวตนแล้วหรือไม่}
 Q -- ยัง --> H[เจ้าหน้าที่ช่วยยืนยัน ห้ามผูกจากชื่ออย่างเดียว]
 Q -- แล้ว --> C[แสดงข้อมูลและบันทึกการตัดสินใจตามวัตถุประสงค์ที่ยืนยัน]
 C --> S[เลือกสาขา บริการ และเวลา]
 S --> V[ตรวจทรัพยากรกลางและคำขอซ้ำ]
 V --> F{ยังว่างหรือไม่}
 F -- ไม่ --> S
 F -- ว่าง --> A[ยืนยันนัดและบันทึกผลคำขอ]
```
ตัวเลือกความยินยอมต้องไม่ถูกเลือกไว้ล่วงหน้า ไม่ถือว่าข้อมูลเก่าคือความยินยอม ให้ผู้รับผิดชอบยืนยันวัตถุประสงค์ ฐานการประมวลผล ข้อความ การเก็บรักษา และผลของการให้/ไม่ให้/ถอนก่อนใช้จริง ไม่ตั้งเงื่อนไขปฏิเสธการรักษาเอง

## Data Model ส่วนเพิ่ม (updated: change request)
```mermaid
erDiagram
 Patient ||--o{ ConsentRecord : records
 Patient ||--o{ LineIdentity : links
 LineIdentity ||--o{ BookingRequest : initiates
 Appointment |o--o{ BookingRequest : fulfills
'''
for e in ['ConsentRecord','LineIdentity','BookingRequest']:extra+=' '+e+' {\n'+''.join('  '+('datetime' if a.endswith('_at') else 'string')+' '+a+'\n' for a in contract['entities'][e])+' }\n'
extra+='```\n\nBookingRequest.appointment_id ว่างก่อนยืนยันนัดได้ คำขอซ้ำใช้ idempotency_key เดิม ไม่ใช้ชื่อแสดงผล LINE ตัดสิน Patient และไม่อนุมานบัญชีจากหมายเหตุ R3\n'
ui='''<section id="consent"><span class="tag">04 · เพิ่มหลัง Change Request</span><h2>ความยินยอมของคนไข้</h2><p class="muted">ConsentRecord · ข้อมูลจำลองและข้อความรอยืนยัน</p><div class="form-grid"><div class="card"><h3>วัตถุประสงค์</h3><p>รอเจ้าของนโยบายยืนยัน<br>รุ่นข้อความ: รอยืนยัน</p></div><div class="card"><h3>การตัดสินใจ</h3><p>ยังไม่บันทึก<br>เวลาบันทึก / ถอน: —</p></div></div><p><label><input type="checkbox" id="consent-choice"> ตัวอย่างตัวเลือกความยินยอม — ยังไม่เลือก</label></p><p class="warn">ต้องยืนยันข้อความและผลของการให้ ไม่ให้ หรือถอนก่อนใช้จริง ข้อมูลเก่าไม่เท่ากับยินยอมแล้ว</p><button disabled>บันทึกการตัดสินใจ — จำลอง</button></section><section id="line-booking"><span class="tag">05 · เพิ่มหลัง Change Request</span><h2>จองคิวเองผ่าน LINE OA</h2><p class="muted">ไม่เชื่อม LINE จริง · หน้าจอและข้อมูลจำลอง</p><div class="card" style="max-width:430px;margin:auto"><h3>เลือกนัดหมายของคุณ</h3><p class="warn">ตัวตนบัญชี: รอยืนยันกับคนไข้<br>ไม่ผูกบัญชีจากชื่อแสดงผลอย่างเดียว</p><label>สาขา<select><option>เลือกสาขา</option><option>บางนา</option><option>ลาดกระบัง</option><option>อ่อนนุช</option></select></label><label>บริการ<select><option>เลือกบริการ</option><option>ตรวจฟัน</option></select></label><label>วันและเวลา<input placeholder="เลือกหลังยืนยันตัวตน"></label><p>คำขอ: ยังไม่ส่ง<br>นัดหมาย: ยังไม่ยืนยัน</p><button disabled>ส่งคำขอ — จำลอง</button><p>ต้องตรวจเวลาว่างและคำขอซ้ำก่อนยืนยัน</p></div></section>'''
mock=(p/'nodes/N3-mockup.html').read_text().replace('</main>',ui+'</main>')
node(p,'N3-v2',['N1-v2'],{'nodes/N3-v2-to-be.md':(p/'nodes/N3-to-be.md').read_text()+'\n'+extra,'nodes/N3-v2-mockup.html':mock})
mapextra='''## Data Mapping / Migration ส่วนเพิ่ม (updated: change request)
| ต้นทาง | ปลายทาง | กติกา |
| --- | --- | --- |
| การตัดสินใจพร้อมหลักฐาน | ConsentRecord | เก็บ purpose, notice_version, decision, recorded_at, withdrawn_at และ evidence_ref ไม่มีหลักฐานเดิมห้ามสร้างว่าให้ยินยอม |
| บัญชี LINE ที่พิสูจน์แล้ว | LineIdentity | เก็บ provider_subject และ verification_status หลังยืนยันกับ Patient ไม่เดาจากชื่อหรือเบอร์ |
| คำขอจองเอง | BookingRequest | ผูกกับบัญชีที่ยืนยันแล้ว ใช้ idempotency_key ป้องกันคำขอซ้ำ และตรวจทรัพยากรก่อนสร้าง Appointment |

ก่อนเปิดใช้ให้ยืนยันนโยบายและวิธีพิสูจน์ตัวตน ทดสอบการให้/ไม่ให้/ถอน การจองซ้ำและคำขอพร้อมกันในสภาพแวดล้อมทดสอบ การแจ้งเตือนล้มเหลวต้องไม่สร้างนัดซ้ำ รอบนี้เป็นแบบจำลองไม่ได้เชื่อม API จริง
'''
node(p,'N4-v2',['N1-v2'],{'nodes/N4-v2-migration.md':(p/'nodes/N4-migration.md').read_text()+'\n'+mapextra})
impact='''## Impact Analysis (การวิเคราะห์ผลกระทบ) / Reuse (การใช้ผลงานเดิมต่อ)
| Node | ผลกระทบ | การตัดสินใจ |
| --- | --- | --- |
| N1 | มีข้อกำหนดและข้อมูลกลางเพิ่ม | ทำ N1-v2 เพิ่ม ConsentRecord/LineIdentity/BookingRequest; คง raw และ Findings |
| N2 | As-Is ไม่ได้รับผลกระทบจากช่องทางอนาคต | ใช้ผลเดิม ไม่ทำใหม่ |
| N3 | To-Be, Data Model และหน้าจอต้องรองรับสองข้อใหม่ | ทำ N3-v2 เพิ่มกระบวนการ แบบจำลอง และ Mockup สองส่วน |
| N4 | การย้ายต้องตรวจหลักฐานยินยอมและบัญชี | ทำ N4-v2 เพิ่ม Mapping และเงื่อนไขนำเข้า |
| N5 | ต้องรวมและตรวจความสอดคล้องอีกครั้ง | ทำ N5-v2 หลัง N2 เดิมและ N3-v2/N4-v2 DONE |

## Plan Version Log ส่วนเพิ่ม (updated: change request)
| แผน | เหตุผล | สิ่งที่เปลี่ยน | Reuse |
| --- | --- | --- | --- |
| v1 | เฟสแรก | N1 → N2/N3/N4 → N5 | เก็บ output-phase1.md / mockup-phase1.html |
| v2 | เพิ่มความยินยอมและ LINE OA | N1-v2 → N3-v2/N4-v2 → N5-v2; N5-v2 รอ N2 เดิมด้วย | N2, raw, Findings, normalization และสามส่วน UI เดิม |

Gap/Roll-out ส่วนเพิ่ม: ยืนยันผู้รับผิดชอบนโยบายและการเชื่อมบัญชี → ทดสอบสิทธิ์/การถอน/คำขอซ้ำ/จองพร้อมกัน → นำร่องตามที่คลินิกเลือก → ขยายเมื่อเจ้าของงานตรวจรับ หากต้องย้อนกลับให้หยุดช่องทางจองเองแต่คงนัดที่ยืนยันแล้ว ประวัติคำขอ และหลักฐานความยินยอม
'''
(p/'output.md').write_text((p/'nodes/N1-findings.md').read_text()+'\n'+(p/'nodes/N2-as-is.md').read_text()+'\n'+(p/'nodes/N3-v2-to-be.md').read_text()+'\n'+(p/'nodes/N4-v2-migration.md').read_text()+'\n'+(p/'nodes/N5-plan.md').read_text()+'\n'+impact)
(p/'mockup.html').write_text(mock);(p/'nodes/N5-v2-impact.md').write_text(impact);(p/'phase2-active').write_text('Change Request active\n')
print('Clinic Change Request routed through N1-v2/N3-v2/N4-v2; N2 reused; N5-v2 awaits tests')

## To-Be Process (กระบวนการทำงานที่ต้องการในอนาคต)
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
 Patient {
  string patient_id
  string name_raw
  string name_key
  string phone_raw
  string phone_key
 }
 Appointment {
  string appointment_id
  string patient_id
  string branch_id
  string doctor_id
  string service_id
  datetime starts_at
  datetime ends_at
  string status
 }
 Branch {
  string branch_id
  string name
 }
 Doctor {
  string doctor_id
  string name
 }
 Service {
  string service_id
  string name
  int duration_minutes
 }
 SourceRow {
  string source_row_id
  string source_sheet
  string raw_payload
  string date_candidates
  string disposition
  string appointment_id
 }
 ReviewIssue {
  string issue_id
  string source_row_id
  string kind
  string owner
  string decision
  string evidence
 }
```

SourceRow.appointment_id ว่างได้ก่อนตรวจเสร็จ; duration_minutes และ timezone ต้องยืนยันก่อนคำนวณ ends_at ข้อมูลรอยืนยันอยู่ใน SourceRow ไม่ปะปนกับนัดที่ยืนยันแล้ว

## To-Be ส่วนเพิ่มหลัง Change Request (updated: change request)
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
 ConsentRecord {
  string consent_id
  string patient_id
  string purpose
  string notice_version
  string decision
  datetime recorded_at
  datetime withdrawn_at
  string evidence_ref
 }
 LineIdentity {
  string line_identity_id
  string patient_id
  string provider_subject
  string verification_status
 }
 BookingRequest {
  string request_id
  string line_identity_id
  string appointment_id
  string idempotency_key
  string status
 }
```

BookingRequest.appointment_id ว่างก่อนยืนยันนัดได้ คำขอซ้ำใช้ idempotency_key เดิม ไม่ใช้ชื่อแสดงผล LINE ตัดสิน Patient และไม่อนุมานบัญชีจากหมายเหตุ R3

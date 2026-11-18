## Use Case Diagram
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

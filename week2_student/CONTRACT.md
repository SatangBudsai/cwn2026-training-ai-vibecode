# CONTRACT · สัญญาที่ทุกเว็บต้องทำตาม

> ใช้ stack อะไรก็ได้ แต่ **ทุกข้อในไฟล์นี้ต้องตรง** ไม่เช่นนั้น `TEST-PLAN.md` กลางใช้กับเว็บของกลุ่มไม่ได้
> ข้อความที่ test จะ assert ตรงตัวอักษร (รวมช่องว่าง, เครื่องหมาย `–` ขีดกลาง en dash U+2013 ในคำว่า "1–5", "1–500" และค่า `–` ของทันกำหนด %) ถูกกำหนดในตาราง 5 (เป็นข้อกำหนดของ TA ⚠️A-38)
> ที่มา: ตัวเลข/กฎ = REQUIREMENTS · ชื่อ/รูปแบบ = ข้อกำหนดของ TA ⚠️A-38

## 0. หลักการ

| ข้อ | หลักการ |
|---|---|
| 1 | ทุกองค์ประกอบที่ test ใช้มี `data-testid` ตามตารางต่อไปนี้ (kebab-case) · ถ้ามีหลายรายการ (แถว) ใช้ `data-testid` ซ้ำได้ และ test จะกรองด้วยแอตทริบิวต์ `data-*` ที่ระบุ |
| 2 | ข้อความบนจอเป็นภาษาไทยตามที่ระบุ · วันที่ `4 ธ.ค. 2569 16:30` · เงิน `฿1,010` (A-04) |
| 3 | องค์ประกอบวันเวลาต้องมี `data-iso="2026-12-04T16:30:00+07:00"` ด้วย (A-51) |
| 4 | สถานะ/ระดับมีทั้งข้อความไทยและ `data-status` / `data-level` เป็นรหัสอังกฤษ (ตาราง 4) |
| 5 | ปุ่มที่ "ต้องไม่มี" ในบางสถานะ = ไม่ render ในหน้า (test ตรวจ `count() == 0`) ส่วนปุ่มที่ "ใช้ไม่ได้" = `disabled` |
| 6 | API ตอบ JSON เป็นหลัก ข้อผิดพลาดรูปแบบ `{"code":"...","message":"..."}` (A-38) · ใช้ session cookie (HttpOnly) หลังล็อกอิน |
| 7 | ทุกคำขอ HTTP ยกเว้น `/api/test/*` ต้องประเมินแจ้งเตือน SLA ตามนาฬิกาปัจจุบัน (A-30) และอัปเดตสถานะยกเลิกอัตโนมัติที่เลยเวลา (A-46) |
| 8 | `TEST_MODE=1` เปิด `/api/test/*` · ไม่ตั้ง → `/api/test/*` ตอบ 404 · `BUG_MODE` ดู `BUGS.md` |
| 9 | **`POST /api/test/reset` ล้าง session/cookie ของทุกคน** รวมตัวนับ OTP ผิด การล็อก แจ้งเตือน audit และไฟล์ที่อัปโหลดใหม่ → **ทุก TC ต้องล็อกอินใหม่หลัง reset ทุกครั้ง** (cookie/`request` context เก่าใช้ไม่ได้) |
| 10 | เซิร์ฟเวอร์ต้องรับ request body ได้อย่างน้อย **6 MB** เพื่อให้ไฟล์ 5,242,881 ไบต์ได้ `400 FILE_TOO_LARGE` พร้อมข้อความ `ไฟล์ใหญ่เกิน 5 MB` (ไม่ใช่ 413 จากเฟรมเวิร์ก) และไฟล์ 5,242,880 ไบต์พร้อมส่วนหัว multipart ไม่ถูกตัด |
| 11 | ตัวแปร `DB_PATH` ชี้ไฟล์ฐานข้อมูล (ถ้าใช้ฐานข้อมูลไฟล์) เพื่อให้ TC-NFR-04 ตรวจแบบ inspection ได้ |

## 1. Route ของทุกหน้า

| Route | บทบาทที่เข้าได้ | หน้าที่ | ถ้าไม่มีสิทธิ์ |
|---|---|---|---|
| `/` | ทุกคน | redirect: ยังไม่ล็อกอิน → `/login` · ล็อกอินแล้ว → หน้าตั้งต้นของบทบาท | – |
| `/login` | ทุกคน | ล็อกอินประชาชน (ThaiD จำลอง) / เจ้าหน้าที่ (SSO จำลอง) | – |
| `/register` | citizen ที่เข้าครั้งแรก | ลงทะเบียน | redirect |
| `/citizen` | citizen | รายการคำขอ/ร่างของฉัน + เริ่มบริการ | 403 |
| `/citizen/new/:service` | citizen | ขั้นตอนยื่น 3 ขั้น (`:service` = `SV-01` `SV-02` `SV-03` · query `?draft=DR-0003` เปิดร่างเดิม) | 403 |
| `/citizen/cases/:caseNo` | citizen (เจ้าของ) | รายละเอียดคำขอ | ของคนอื่น/ไม่มี → 404 `not-found-msg` |
| `/officer/queue` | officer · head (อ่านอย่างเดียว) | คิวงาน | 403 |
| `/officer/cases/:caseNo` | officer · head | รายละเอียด + ปุ่มดำเนินการ | 403 · ไม่มีเลข → 404 |
| `/head/approvals` | head | รายการรออนุมัติ | 403 |
| `/dashboard` | executive | Dashboard + ส่งออก | 403 |
| `/audit` | auditor | Audit Trail | 403 |
| `/admin/services` | admin | แก้ค่าธรรมเนียม/SLA | 403 |
| `/admin/holidays` | admin | จัดการวันหยุด | 403 |
| `/admin/users` | admin | จัดการผู้ใช้/บทบาท | 403 |
| `/notifications` | officer · head | กระดิ่งแจ้งเตือน | 403 |
| `/verify/:code` | **ไม่ต้องล็อกอิน** | ตรวจเอกสาร | – · รหัสที่ไม่มี → **HTTP 404** พร้อมหน้า `ไม่พบเอกสาร` · พบ (ถูกต้อง/หมดอายุ/ลายเซ็นไม่ถูกต้อง) → 200 |

- หน้าตั้งต้นหลังล็อกอิน: citizen → `/citizen` (ยังไม่ลงทะเบียน → `/register`) · officer → `/officer/queue` · head → `/head/approvals` · executive → `/dashboard` · auditor → `/audit` · admin → `/admin/services`
- ไม่ได้ล็อกอินแล้วเปิดหน้าที่ต้องล็อกอิน → redirect `/login` · ล็อกอินแล้วแต่บทบาทไม่ตรง → HTTP 403 พร้อม `forbidden-msg` (หน้า) · API → 401 / 403 (ตาราง 6)
- 404 ของคำขอใช้ข้อความเดียวกัน ไม่ว่าเลขไม่มีจริงหรือเป็นของคนอื่น (ห้ามเผยว่ามีอยู่)

## 2. `data-testid` ทุกหน้า

### 2.1 ทุกหน้า (เมื่อล็อกอินแล้ว)

| testid | คืออะไร | ค่า/ข้อความ |
|---|---|---|
| `app-header` | แถบหัวหน้า | – |
| `user-name` | ชื่อผู้ใช้ | ประชาชน = ชื่อ-สกุล · เจ้าหน้าที่ = ชื่อใน TEST-DATA เช่น `เจ้าหน้าที่ทะเบียน 1` |
| `user-role` | บทบาท | ข้อความ: `ประชาชน` `เจ้าหน้าที่` `หัวหน้าฝ่าย` `ผู้บริหาร` `ผู้ตรวจสอบภายใน` `ผู้ดูแลระบบ` · `data-role` = `citizen` `officer` `head` `executive` `auditor` `admin` · เจ้าหน้าที่มี `data-dept` = `registry` / `works` |
| `logout-btn` | ปุ่มออกจากระบบ | → `/login` |
| `nav-bell` | ลิงก์ไป `/notifications` (เฉพาะ officer/head) | – |
| `bell-count` | จำนวนแจ้งเตือนทั้งหมดของผู้ใช้ (เฉพาะ officer/head) | ตัวเลข |
| `nav-my-cases` · `nav-queue` · `nav-approvals` · `nav-dashboard` · `nav-audit` · `nav-admin-services` · `nav-admin-holidays` · `nav-admin-users` | เมนู | **แสดงเฉพาะบทบาทที่เข้าหน้านั้นได้** (citizen: `nav-my-cases` · officer: `nav-queue` `nav-bell` · head: `nav-queue` `nav-approvals` `nav-bell` · executive: `nav-dashboard` · auditor: `nav-audit` · admin: `nav-admin-*`) |
| `action-error` | ข้อความผิดพลาดของการกระทำ (`role="alert"`) | ข้อความตามตาราง 5 |
| `action-success` | ข้อความสำเร็จ (toast) | – |
| `forbidden-msg` | หน้า 403 | `ไม่มีสิทธิ์เข้าถึงหน้านี้` |
| `not-found-msg` | หน้า 404 ของคำขอ | `ไม่พบคำขอ` |

### 2.2 `/login`

| testid | คืออะไร | ค่า/ข้อความ |
|---|---|---|
| `login-tab-citizen` · `login-tab-staff` | แท็บ | – |
| `thaid-id-input` | ช่องเลขบัตร (**ไม่จำกัด maxlength** A-45) | – |
| `thaid-submit` | ปุ่ม | `เข้าสู่ระบบด้วย ThaiD (จำลอง)` |
| `thaid-error` | ข้อผิดพลาดเลขบัตร | ตาราง 5 |
| `otp-step` | กล่องขั้น OTP (แสดงเมื่อเลขบัตรผ่าน) | – |
| `otp-input` | ช่อง OTP | – |
| `otp-submit` | ปุ่มยืนยัน | `ยืนยัน OTP` |
| `otp-error` | OTP ผิด | `รหัส OTP ไม่ถูกต้อง` |
| `otp-attempts-left` | จำนวนครั้งที่เหลือหลัง OTP ผิด | `เหลือ 2 ครั้ง` / `เหลือ 1 ครั้ง` |
| `lock-message` | ถูกล็อก | `ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที` |
| `lock-until` | เวลาปลดล็อก | `data-iso` = เวลาครั้งที่ 3 + 15 นาที |
| `staff-username` · `staff-password` | ช่องเจ้าหน้าที่ | – |
| `staff-submit` | ปุ่ม | `เข้าสู่ระบบเจ้าหน้าที่ (SSO ภาครัฐ จำลอง)` |
| `staff-error` | ข้อผิดพลาด | `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง` |

### 2.3 `/register`

| testid | คืออะไร | ค่า |
|---|---|---|
| `reg-name` | ชื่อ-สกุลจาก ThaiD | `readOnly` (แก้ไม่ได้) |
| `reg-mobile` · `reg-email` | เบอร์ (บังคับ) · อีเมล (ไม่บังคับ) | – |
| `reg-consent` | checkbox ยินยอม PDPA (บังคับ) | – |
| `reg-submit` | ปุ่ม | `ลงทะเบียน` |
| `reg-error-mobile` | ข้อผิดพลาดเบอร์ | ตาราง 5 |
| `reg-error-consent` | ข้อผิดพลาดยินยอม | ตาราง 5 |

### 2.4 `/citizen`

| testid | คืออะไร | ค่า/แอตทริบิวต์ |
|---|---|---|
| `citizen-welcome` | ข้อความต้อนรับ | `สวัสดี <ชื่อ-สกุล>` |
| `start-service-SV-01` · `start-service-SV-02` · `start-service-SV-03` | ปุ่มเริ่มบริการ → `/citizen/new/:service` | – |
| `my-case-row` | แถวคำขอที่มีเลขแล้ว | `data-case-no` `data-status` · เรียงเลขคำขอมากไปน้อย |
| `my-draft-row` | แถวร่าง/รอชำระ (ไม่มีเลขคำขอ ห้ามมีข้อความ `EG-`) | `data-draft-id` `data-status` (`DRAFT` / `PENDING_PAYMENT`) |
| `row-case-no` · `row-service` · `row-status` · `row-due` | เซลล์ในแถว (ขอบเขตภายในแถว) | `row-due` มี `data-iso` |
| `row-draft-id` · `open-draft-btn` | รหัสร่าง · ปุ่มเปิดร่าง → `/citizen/new/:service?draft=<id>` | – |

### 2.5 `/citizen/new/:service` (ขั้นตอนยื่น)

| testid | คืออะไร | ค่า/ข้อความ |
|---|---|---|
| `wizard-step` | ขั้นปัจจุบัน | `1/3 กรอกข้อมูล` · `2/3 แนบเอกสาร` · `3/3 ชำระเงิน` |
| `service-name` | ชื่อบริการ | ตามตาราง 4.3 |
| `qty-input` | จำนวนฉบับ (SV-01 เท่านั้น) | จำนวนเต็ม · **ค่าตั้งต้น 1** (A-56) · test ใช้ `fill` แทนการพิมพ์ต่อท้าย |
| `area-input` | พื้นที่ ตร.ม. (SV-03 เท่านั้น) | จำนวนเต็ม |
| `fee-total` | ค่าธรรมเนียมที่คำนวณ | `฿1,010` · ค่าไม่ถูกต้อง → `–` |
| `fee-error` | ข้อผิดพลาดค่าที่กรอก | ตาราง 5 |
| `draft-id` | รหัสร่างหลังบันทึก | `DR-0003` |
| `save-draft-btn` | บันทึกร่าง | `บันทึกร่าง` |
| `to-upload-btn` | ไปขั้นแนบเอกสาร | `disabled` เมื่อค่าไม่ถูกต้อง |
| `upload-input-id-card` | ช่องแนบ บัตรประชาชน ✱ (ทุกบริการ) | `<input type=file>` |
| `upload-input-map` | แผนที่ตั้ง ✱ (SV-02) | – |
| `upload-input-site-photo` | ภาพสถานที่ (SV-02 ไม่บังคับ) | – |
| `upload-input-plan` | แบบแปลน ✱ (SV-03 PDF เท่านั้น) | – |
| `upload-input-deed` | โฉนด ✱ (SV-03) | – |
| `upload-input-extra` | เอกสารเพิ่มเติม (ทุกบริการ รับหลายไฟล์) | `multiple` |
| `file-item` | ไฟล์ที่แนบแล้ว | `data-name` `data-doc-key` (`id-card` `map` `site-photo` `plan` `deed` `extra`) |
| `file-remove-btn` | ลบไฟล์ (ในแถว `file-item`) | – |
| `upload-error` | ข้อผิดพลาดการแนบ | ตาราง 5 · ไฟล์ที่ถูกปฏิเสธไม่เพิ่มใน `file-item` |
| `missing-docs` | เอกสารที่ขาด | `ยังขาดเอกสาร: แบบแปลน, โฉนด` (เรียงตามลำดับในตาราง 4.3 คั่น `, `) · ครบแล้วไม่ render |
| `to-payment-btn` | ไปชำระเงิน | `ไปชำระเงิน` · `disabled` เมื่อเอกสารบังคับไม่ครบ |
| `payment-amount` | ยอดที่ต้องชำระ | `฿40` |
| `create-qr-btn` | สร้าง QR | `สร้าง QR` |
| `qr-image` | รูป QR จำลอง | – |
| `qr-ref` | เลขอ้างอิง | `PP-0002` |
| `qr-expires` | เวลาหมดอายุ | `หมดอายุ 1 ธ.ค. 2569 09:15` + `data-iso` |
| `qr-expired-msg` | QR หมดอายุ | `QR หมดอายุ กรุณาสร้าง QR ใหม่` |
| `regenerate-qr-btn` | สร้าง QR ใหม่ (แสดงเมื่อหมดอายุ) | `สร้าง QR ใหม่` |
| `payment-status` | สถานะชำระ | `รอชำระ` / `ชำระแล้ว` / `QR หมดอายุ` · `data-status` = `PENDING` `PAID` `EXPIRED` |
| `refresh-payment-btn` | ตรวจสอบการชำระเงิน (กดแล้วอ่านสถานะล่าสุด · หน้าอาจโพลล์เองด้วย) | `ตรวจสอบการชำระเงิน` |
| `submitted-case-no` | เลขคำขอหลังชำระ | `EG-2569-000031` |
| `receipt-no` | เลขใบเสร็จ | `RC-2569-000031` |
| `receipt-amount` | ยอดในใบเสร็จ | `฿40` |
| `receipt-paid-at` | เวลาชำระ | + `data-iso` |
| `go-case-btn` | ไปหน้าคำขอ | `ดูคำขอ` |

### 2.6 `/citizen/cases/:caseNo` และ `/officer/cases/:caseNo` (ใช้ชื่อเดียวกันถ้ามีในหน้า)

| testid | หน้า | คืออะไร | ค่า/ข้อความ |
|---|---|---|---|
| `case-no` | ทั้งสอง | เลขคำขอ | `EG-2569-000025` |
| `case-status` | ทั้งสอง | สถานะ | ข้อความไทย + `data-status` (ตาราง 4.1) |
| `case-service` | ทั้งสอง | บริการ | `SV-01 ขอหนังสือรับรอง` |
| `case-step` | ทั้งสอง | ขั้นตอน (**เฉพาะ SV-03** A-40) | ขั้น 1: `ขั้นตอน 1/3 · ฝ่ายทะเบียน` · ขั้น 2: `ขั้นตอน 2/3 · ฝ่ายโยธา` · ขั้น 3 (รออนุมัติ): `ขั้นตอน 3/3 · หัวหน้าฝ่าย` |
| `case-fee` | ทั้งสอง | ค่าธรรมเนียม | `฿1,010` |
| `applicant-name` | officer | ชื่อผู้ยื่น | `สมหญิง รักไทย` |
| `sla-due` | ทั้งสอง | กำหนดเสร็จ | `4 ธ.ค. 2569 16:30` + `data-iso` |
| `sla-level` | ทั้งสอง | ระดับเตือน | `ปกติ` `ใกล้ครบกำหนด` `เกินกำหนด` `หยุดนับ` `ปิดแล้ว` + `data-level` (ตาราง 4.2) |
| `case-timeline` · `timeline-item` | ทั้งสอง | ไทม์ไลน์เหตุการณ์ | แต่ละ `timeline-item` มี `data-iso` |
| `closed-at` | ทั้งสอง | เวลาปิดงาน (เฉพาะ COMPLETED/REJECTED) | + `data-iso` |
| `case-owner` | officer | ผู้ถือเรื่อง | `off.reg2` หรือ `ยังไม่มีผู้รับ` |
| `return-count` | officer | จำนวนครั้งที่ตีกลับแล้ว | ตัวเลข `0` `1` `2` |
| `doc-item` | officer · citizen | เอกสารแนบ (ไฟล์) | `data-name` `data-file-id` · มี `doc-download-link` (ลิงก์ไป `/api/files/<fileId>`) |
| `applicant-id` | officer | เลขบัตรปิดบัง | `X-XXXX-XXXXX-65-9` |
| `show-full-id-btn` | officer (officer/head เท่านั้น) | ปุ่มแสดงเลขเต็ม | `แสดงเลขเต็ม` |
| `unmask-reason` · `unmask-submit` · `unmask-error` | officer | เหตุผล · ยืนยัน · ข้อผิดพลาด | `กรุณากรอกเหตุผล` |
| `full-id` | officer | เลขเต็มหลัง unmask | `3-1006-00987-65-9` |
| `case-id-full` | citizen | เลขบัตรเต็มของตัวเอง | `3-1006-00987-65-9` |
| `claim-btn` | officer | รับเรื่อง (เฉพาะเมื่อรับได้) | `รับเรื่อง` |
| `return-btn` | officer | ตีกลับ (**ไม่ render เมื่อตีกลับครบ 2 ครั้ง**) | `ตีกลับ` |
| `forward-note` | officer | หมายเหตุส่งต่อ (ไม่บังคับ) | บันทึกใน Audit `FORWARD` detail |
| `return-reason` · `return-submit` · `return-reason-error` | officer | เหตุผล · ยืนยัน · ข้อผิดพลาด | `กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร` |
| `forward-btn` | officer | ส่งต่อ (SV-02/03 และ SV-03 ขั้นโยธา) | `ผ่าน/ส่งต่อ` · **ไม่มีช่องเลือกปลายทาง** |
| `approve-btn` | officer | อนุมัติ (SV-01 โดยผู้ถือเรื่อง · SV-02/03 โดยหัวหน้าที่ PENDING_APPROVAL เท่านั้น) | `อนุมัติ` |
| `reject-btn` · `reject-reason` · `reject-submit` · `reject-reason-error` | officer · head | ไม่อนุมัติ (SV-01 โดยผู้ถือเรื่อง · SV-02/03 โดย head ที่ PENDING_APPROVAL เท่านั้น · **เจ้าหน้าที่ที่ SV-02/03 ไม่มีปุ่มนี้**) | `ไม่อนุมัติ` · ข้อผิดพลาดเหมือน `return-reason-error` |
| `issue-btn` | officer | ออกเอกสาร (เฉพาะ APPROVED และผู้ออกเอกสารตาม A-27) | `ออกเอกสาร` |
| `doc-no` | ทั้งสอง | เลขเอกสาร (หลังออก) | `DOC-2569-000002` |
| `verify-code` | ทั้งสอง | รหัสตรวจสอบ 8 ตัว (`[A-Z0-9]{8}`) | `K7M2Q9XA` |
| `doc-qr` | ทั้งสอง | QR ของเอกสาร | `data-url` = `<BASE_URL>/verify/<รหัส>` |
| `download-doc-btn` | citizen | ดาวน์โหลด PDF | `ดาวน์โหลดเอกสาร` |
| `cancel-case-btn` | citizen | ยกเลิกคำขอ (**เฉพาะ SUBMITTED ที่ไม่มีผู้รับ**) | `ยกเลิกคำขอ` · มีกล่องยืนยัน: ข้อความ `cancel-confirm-text` = `ค่าธรรมเนียมที่ชำระแล้วไม่คืน` และปุ่ม `confirm-cancel-btn` |
| `return-reason-display` | citizen | เหตุผลที่ถูกตีกลับ (เมื่อ NEED_FIX) | ข้อความเหตุผล |
| `fix-deadline` | citizen | เส้นตายแก้ไข (NEED_FIX) | `4 ธ.ค. 2569 14:00` + `data-iso` |
| `fix-upload-input` · `submit-fix-btn` | citizen | แนบไฟล์ใหม่ (ไม่บังคับ) · ส่งแก้ไข (**ไม่ render เมื่อพ้นเส้นตาย**) | `ส่งแก้ไข` |
| `no-refund-note` | citizen | แสดงเมื่อ REJECTED/CANCELLED | `ค่าธรรมเนียมที่ชำระแล้วไม่คืน` |

### 2.7 `/officer/queue`

| testid | คืออะไร | ค่า/แอตทริบิวต์ |
|---|---|---|
| `queue-filter` | select | `all` (ทั้งหมด) · `unclaimed` (ยังไม่มีผู้รับ: SUBMITTED/IN_REVIEW ที่ไม่มีผู้ถือ) · `mine` (ของฉัน: IN_REVIEW ที่ฉันถือ) · ค่าเริ่มต้น `all` (A-34) |
| `queue-table` | ตาราง | – |
| `queue-row` | แถว | `data-case-no` `data-owner` (username หรือว่าง) `data-status` `data-sla-level` (รหัส) · เรียงตาม BR-16 |
| `row-case-no` · `row-service` · `row-applicant` · `row-id-masked` · `row-status` · `row-due` · `row-sla-level` · `row-owner` | เซลล์ในแถว | `row-id-masked` เช่น `X-XXXX-XXXXX-65-9` · `row-due` มี `data-iso` |
| `claim-btn` | ปุ่มรับเรื่องในแถว (เฉพาะแถวที่ `claim` ได้โดยเจ้าหน้าที่คนนั้น) | `รับเรื่อง` |
| `workload-count` | งานในมือของฉัน (เฉพาะ officer) | ตัวเลข เช่น `9` |
| `queue-empty` | ไม่มีรายการ | `ไม่มีงานในคิว` |

### 2.8 `/head/approvals`

| testid | คืออะไร | ค่า |
|---|---|---|
| `approval-row` | แถวรออนุมัติ (PENDING_APPROVAL) | `data-case-no` · เรียงตาม BR-16 |
| `row-case-no` · `row-service` · `row-applicant` · `row-due` | เซลล์ | – |
| `approval-open` | ลิงก์ไป `/officer/cases/:caseNo` (ที่นั่นมี `approve-btn` / `reject-btn`) | `เปิดคำขอ` |

### 2.9 `/dashboard`

| testid | คืออะไร | ค่า |
|---|---|---|
| `period-select` | เดือน/ปี | value `2026-12` (ค่าเริ่มต้น = เดือนของนาฬิกา) · `2026-11` · `2026-10` · `2026` (= ทั้งปี 2569) (A-41) |
| `service-select` | บริการ | `ALL` `SV-01` `SV-02` `SV-03` |
| `kpi-received` | รับเรื่อง | ตัวเลข |
| `kpi-closed` | ปิดงาน | ตัวเลข |
| `kpi-ontime-pct` | ทันกำหนด % | `85.7%` · ปิดงาน = 0 → `–` (ห้าม NaN/0%) |
| `kpi-backlog` | งานคงค้าง | ตัวเลข |
| `kpi-overdue` | เกินกำหนดคงค้าง | ตัวเลข |
| `workload-row` | แถวงานในมือรายเจ้าหน้าที่ | `data-username` · มี `workload-value` (ตัวเลข) · แสดงเจ้าหน้าที่ทั้ง 3 คนแม้ 0 |
| `export-xlsx-btn` · `export-pdf-btn` | ส่งออก | `ส่งออก Excel` · `ส่งออก PDF` |

### 2.10 `/audit`

| testid | คืออะไร | ค่า |
|---|---|---|
| `audit-filter-actor` | ช่องกรอง username | – |
| `audit-filter-event` | select เหตุการณ์ | ค่าว่าง = ทั้งหมด หรือ 1 ใน 10 เหตุการณ์ |
| `audit-filter-from` · `audit-filter-to` | `<input type=date>` ค่า `YYYY-MM-DD` ค.ศ. (A-51) | – |
| `audit-apply-btn` | ใช้ตัวกรอง | `ค้นหา` |
| `audit-count` | จำนวนรายการหลังกรอง | ตัวเลข |
| `audit-row` | แถว (เรียงเวลาใหม่ → เก่า) | `data-id` `data-event` `data-actor` `data-case-no` |
| `audit-time` | เวลา | + `data-iso` |
| `audit-actor` · `audit-role` · `audit-event` · `audit-case-no` | เซลล์ | `audit-role` = รหัสบทบาท (`officer` ...) |
| `audit-transition` | สถานะก่อน → หลัง | `IN_REVIEW → NEED_FIX` (ไม่มี = `–`) |
| `audit-detail` | รายละเอียด/เหตุผล | – |
| `audit-export-csv-btn` | ส่งออก CSV | `ส่งออก CSV` |
| (ต้องไม่มี) `audit-edit-btn` `audit-delete-btn` | ห้าม render | – |

### 2.11 `/admin/*`

| testid | หน้า | คืออะไร |
|---|---|---|
| `service-row` | services | `data-service-id` |
| `svc-fee-SV-01` | services | ฿ ต่อฉบับ (input number) |
| `svc-fee-SV-02` | services | ฿ คงที่ |
| `svc-fee-SV-03` · `svc-fee-per-sqm-SV-03` | services | ฐาน ฿1,000 (พื้นที่ 1–100) · ฿ ต่อ ตร.ม. ส่วนเกิน 100 (฿10) |
| `svc-sla-SV-01` · `svc-sla-SV-02` · `svc-sla-SV-03` | services | SLA วันทำการ |
| `svc-save-SV-01` · `svc-save-SV-02` · `svc-save-SV-03` | services | ปุ่มบันทึกต่อบริการ → `action-success` |
| `holiday-date-input` · `holiday-name-input` · `holiday-add-btn` | holidays | `YYYY-MM-DD` ค.ศ. |
| `holiday-row` · `holiday-delete-btn` | holidays | `data-date` |
| `user-row` | users | `data-username` |
| `user-role-select` · `user-dept-select` | users | role: `citizen` `officer` `head` `executive` `auditor` `admin` · dept: `registry` `works` หรือว่าง |
| `user-save-btn` | users | → `action-success` |

### 2.12 `/notifications`

| testid | คืออะไร | ค่า |
|---|---|---|
| `noti-item` | รายการ | `data-case-no` `data-level` (`near` / `overdue`) · ข้อความ `คำขอ EG-2569-000024 ใกล้ครบกำหนด` หรือ `คำขอ EG-2569-000020 เกินกำหนด` (A-30) |
| `noti-empty` | ไม่มีรายการ | `ไม่มีแจ้งเตือน` |

### 2.13 `/verify/:code`

| testid | คืออะไร | ค่า |
|---|---|---|
| `verify-result` | ผลตรวจ | `เอกสารถูกต้อง` · `เอกสารหมดอายุ` · `ลายเซ็นไม่ถูกต้อง` · `ไม่พบเอกสาร` + `data-result` = `VALID` `EXPIRED` `TAMPERED` `NOT_FOUND` |
| `verify-doc-no` | เลขเอกสาร | เฉพาะ VALID/EXPIRED |
| `verify-applicant` | ชื่อผู้ยื่นปิดบัง | `สมชาย ใ***` (เฉพาะ VALID/EXPIRED) |
| `verify-service` · `verify-issued` · `verify-signer` | บริการ · วันออก · ผู้ลงนาม | `verify-issued` มี `data-iso` |
| `verify-expires` | ใช้ได้ถึง (วันสุดท้ายที่ใช้ได้ A-43) | `2 ก.พ. 2570` + `data-iso="2027-02-02"` |

> ผล `TAMPERED` และ `NOT_FOUND` แสดงเฉพาะ `verify-result` (ห้ามแสดงชื่อ/เลขเอกสาร)

## 3. เนื้อหาที่ต้องตรงกับ TEST-DATA

| เรื่อง | ค่า |
|---|---|
| ชื่อแสดงของเจ้าหน้าที่ | `off.reg1` = เจ้าหน้าที่ทะเบียน 1 · `off.reg2` = เจ้าหน้าที่ทะเบียน 2 · `off.works1` = เจ้าหน้าที่โยธา 1 · `head1` = หัวหน้าฝ่าย · `exec1` = ผู้บริหาร · `audit1` = ผู้ตรวจสอบภายใน · `admin1` = ผู้ดูแลระบบ |
| PDF เอกสาร | `GET /api/documents/<docNo>/pdf` ตอบ `Content-Type: application/pdf` และ `Content-Disposition` ชื่อไฟล์ `DOC-2569-000002.pdf` · เนื้อไฟล์ต้องมีบรรทัด **ASCII ที่เครื่องอ่านได้** บรรทัดเดียว: `docNo=DOC-2569-000002 caseNo=EG-2569-000025 verify=<8 ตัว> validUntil=2027-02-28` (test ตรวจเฉพาะบรรทัดนี้; ข้อความไทยในเอกสาร ได้แก่ เลขเอกสาร เลขคำขอ ชื่อผู้ยื่น บริการ วันออก วันหมดอายุ ผู้ลงนาม รหัสตรวจสอบ และ QR ไป `/verify/<รหัส>` ตรวจผ่านหน้า `/verify` ไม่ตรวจจาก PDF · A-63) |
| ลายเซ็นจำลอง | HMAC-SHA256 ของฟิลด์ docNo, caseNo, applicant, serviceId, issuedAt, validUntil, signer ตามลำดับนี้ (ต่อกันคั่นด้วยอักขระ pipe) ด้วยคีย์ทดสอบ (A-22) · `tamper` แก้ฟิลด์ที่เก็บ (เช่น applicant) โดยไม่คำนวณลายเซ็นใหม่ |

## 4. ตารางรหัส

### 4.1 สถานะ (`case-status`)

| `data-status` | ข้อความไทย |
|---|---|
| `DRAFT` | ร่าง |
| `PENDING_PAYMENT` | รอชำระเงิน |
| `SUBMITTED` | ส่งคำขอแล้ว |
| `IN_REVIEW` | กำลังตรวจสอบ |
| `NEED_FIX` | รอแก้ไขเอกสาร |
| `PENDING_APPROVAL` | รออนุมัติ |
| `APPROVED` | อนุมัติ |
| `COMPLETED` | เสร็จสิ้น |
| `REJECTED` | ไม่อนุมัติ |
| `CANCELLED` | ยกเลิก |

### 4.2 ระดับเตือน (`sla-level`, `row-sla-level`)

| `data-level` | ข้อความไทย | เมื่อ |
|---|---|---|
| `normal` | ปกติ | ยังไม่ปิด ไม่ NEED_FIX วันคงเหลือ ≥ 2 |
| `near` | ใกล้ครบกำหนด | วันคงเหลือ ≤ 1 และตอนนี้ ≤ กำหนดเสร็จ |
| `overdue` | เกินกำหนด | ตอนนี้ > กำหนดเสร็จ |
| `paused` | หยุดนับ | NEED_FIX (A-33) |
| `closed` | ปิดแล้ว | COMPLETED / REJECTED / CANCELLED (A-33) |

### 4.3 บริการและเอกสาร

| รหัส | `service-name` | เอกสาร (ลำดับที่ใช้ใน `missing-docs`) | `docKey` |
|---|---|---|---|
| `SV-01` | ขอหนังสือรับรอง | บัตรประชาชน ✱ | `id-card` |
| `SV-02` | ขออนุญาตประกอบกิจการ | บัตรประชาชน ✱ · แผนที่ตั้ง ✱ · ภาพสถานที่ | `id-card` `map` `site-photo` |
| `SV-03` | ขออนุญาตก่อสร้าง/ต่อเติมอาคาร | บัตรประชาชน ✱ · แบบแปลน ✱ (PDF เท่านั้น) · โฉนด ✱ | `id-card` `plan` `deed` |

## 5. ข้อความ error ที่ test จะ assert (ตรงตัวอักษร)

| ข้อความ | แสดงที่ (testid) | API: HTTP · `code` |
|---|---|---|
| `เลขบัตรประชาชนไม่ถูกต้อง` | `thaid-error` | 400 · `INVALID_ID` |
| `รหัส OTP ไม่ถูกต้อง` | `otp-error` | 401 · `OTP_INVALID` (+ `attemptsLeft`) |
| `ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที` | `lock-message` | 423 · `LOCKED` (+ `lockedUntil`) |
| `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง` | `staff-error` | 401 · `INVALID_CREDENTIALS` |
| `เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0` | `reg-error-mobile` | 400 · `INVALID_MOBILE` |
| `กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)` | `reg-error-consent` | 400 · `CONSENT_REQUIRED` |
| `จำนวนฉบับต้อง 1–5 ฉบับ` | `fee-error` | 400 · `INVALID_QTY` |
| `กรุณาระบุพื้นที่ 1–500 ตร.ม.` | `fee-error` | 400 · `INVALID_AREA` |
| `พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน` | `fee-error` | 400 · `AREA_TOO_LARGE` |
| `ไฟล์ใหญ่เกิน 5 MB` | `upload-error` | 400 · `FILE_TOO_LARGE` |
| `รองรับเฉพาะไฟล์ PDF, JPG, PNG` | `upload-error` | 400 · `FILE_TYPE` |
| `แนบได้สูงสุด 5 ไฟล์ต่อคำขอ` | `upload-error` | 400 · `FILE_COUNT` |
| `แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น` | `upload-error` | 400 · `PLAN_NOT_PDF` |
| `ยังขาดเอกสาร: <ชื่อ, ชื่อ>` | `missing-docs` | 409 · `MISSING_DOCS` (+ `missing: ["แบบแปลน","โฉนด"]`) |
| `QR หมดอายุ กรุณาสร้าง QR ใหม่` | `qr-expired-msg` | 410 · `QR_EXPIRED` |
| `ยอดเงินไม่ตรงกับค่าธรรมเนียม` | (API เท่านั้น) | 422 · `AMOUNT_MISMATCH` |
| `ไม่พบคำขอ` | `not-found-msg` | 404 · `NOT_FOUND` |
| `ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว` | `action-error` | 409 · `CANNOT_CANCEL` |
| `หมดเวลาแก้ไขแล้ว คำขอถูกยกเลิก` | `action-error` | 409 · `FIX_WINDOW_EXPIRED` |
| `มีเจ้าหน้าที่รับเรื่องนี้แล้ว` | `action-error` | 409 · `ALREADY_CLAIMED` |
| `รับงานได้สูงสุด 10 เรื่อง` | `action-error` | 409 · `WORKLOAD_LIMIT` |
| `ตีกลับได้สูงสุด 2 ครั้ง` | `action-error` | 409 · `RETURN_LIMIT` |
| `กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร` | `return-reason-error` · `reject-reason-error` | 400 · `REASON_TOO_SHORT` |
| `กรุณากรอกเหตุผล` | `unmask-error` | 400 · `REASON_REQUIRED` |
| `สถานะคำขอไม่ถูกต้องสำหรับรายการนี้` | `action-error` | 409 · `INVALID_STATE` |
| `ไม่มีสิทธิ์ทำรายการนี้` | `action-error` | 403 · `FORBIDDEN` |
| `ไม่มีสิทธิ์เข้าถึงหน้านี้` | `forbidden-msg` | 403 (หน้า) |
| `กรุณาเข้าสู่ระบบ` | – | 401 · `UNAUTHENTICATED` |
| `ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท` | `action-error` (หน้า admin) | 400 · `INVALID_FEE` |
| `SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ` | `action-error` | 400 · `INVALID_SLA` |
| `มีวันหยุดนี้อยู่แล้ว` | `action-error` | 409 · `DUPLICATE_HOLIDAY` |
| `ไม่สามารถเปลี่ยนบทบาทของตัวเองได้` | `action-error` | 409 · `SELF_ROLE_CHANGE` |
| `Method Not Allowed` | – | 405 · `METHOD_NOT_ALLOWED` |

## 6. API ที่ test ใช้

> ทุก API ใช้ cookie session จากการล็อกอิน (test ล็อกอินผ่าน API แล้วใช้ `request` context ร่วมกัน) · ตัวอย่างค่าอ้าง TEST-DATA

### 6.1 ยืนยันตัวตน

| Method · path | ใครเรียก | Body | สำเร็จ | ผิดพลาด |
|---|---|---|---|---|
| `POST /api/auth/thaid/start` | ทุกคน | `{"idNo":"1101700123456"}` | 200 `{"status":"OTP_SENT"}` | 400 `INVALID_ID` · 423 `LOCKED` |
| `POST /api/auth/thaid/verify` | ทุกคน | `{"idNo":"…","otp":"123456"}` | 200 `{"registered":true}` + cookie (ยังไม่ลงทะเบียน → `{"registered":false}` + cookie เฉพาะ `/register`) | 401 `OTP_INVALID` `{attemptsLeft}` · 423 `LOCKED` `{lockedUntil}` |
| `POST /api/auth/register` | citizen ใหม่ | `{"mobile":"0812345678","email":"","consent":true}` | 201 | 400 `INVALID_MOBILE` · 400 `CONSENT_REQUIRED` |
| `POST /api/auth/staff/login` | ทุกคน | `{"username":"off.reg1","password":"Test@1234"}` | 200 `{"role":"officer","dept":"registry","landing":"/officer/queue"}` | 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | ล็อกอินแล้ว | – | 204 | – |
| `GET /api/me` | ล็อกอินแล้ว | – | 200 `{"username","name","role","dept"}` | 401 |

### 6.2 ประชาชน: ร่าง ไฟล์ ชำระ คำขอ

| Method · path | Body | สำเร็จ | ผิดพลาด |
|---|---|---|---|
| `POST /api/drafts` | `{"serviceId":"SV-01","qty":2}` · SV-03 `{"serviceId":"SV-03","areaSqm":101}` · SV-02 `{"serviceId":"SV-02"}` | 201 `{"draftId":"DR-0003","fee":40}` | 400 `INVALID_QTY` `INVALID_AREA` `AREA_TOO_LARGE` · 403 (ไม่ใช่ citizen) |
| `GET /api/drafts` · `GET /api/drafts/:id` | – | 200 `{items:[{draftId,serviceId,status,fee}]}` · ร่างของคนอื่น/ไม่มี → 404 `NOT_FOUND` | – |
| `POST /api/drafts/:id/files` | multipart: `file`, `docKey` | 201 `{"fileId","name","docKey","size"}` | 400 `FILE_TOO_LARGE` `FILE_TYPE` `FILE_COUNT` `PLAN_NOT_PDF` · **ต้องรับ body ≥ 6 MB แล้วตอบ 400 `FILE_TOO_LARGE` สำหรับไฟล์ 5,242,881 ไบต์ (ไม่ใช่ 413)** · ตรวจชนิดจาก magic bytes เท่านั้น (PDF `%PDF` · JPEG `FF D8 FF` · PNG `89 50 4E 47`) |
| `DELETE /api/drafts/:id` | citizen เจ้าของ (DRAFT / PENDING_PAYMENT ที่ยังไม่ชำระ) | 204 (ref ชำระของร่างนั้นกลายเป็น 404) | ร่างของคนอื่น/ไม่มี → 404 · ชำระแล้ว → 409 `INVALID_STATE` |
| `POST /api/drafts/:id/payment` | – | 201 `{"ref":"PP-0002","amount":40,"qrCreatedAt","qrExpiresAt"}` (สร้าง QR ใหม่ได้ซ้ำ ref ใหม่) | 409 `MISSING_DOCS` |
| `GET /api/payments/:ref` | – | 200 `{"ref","amount","status":"PENDING"/"PAID"/"EXPIRED","qrCreatedAt","qrExpiresAt","caseNo","receiptNo"}` | 404 |
| `GET /api/cases` | – | 200 `{"items":[{caseNo,serviceId,status,dueAt,slaLevel}]}` เฉพาะของฉันที่มีเลขแล้ว | – |
| `GET /api/cases/:caseNo` | citizen (เจ้าของ) · officer · head | 200 ดูรูปแบบ 6.7 | citizen ไม่ใช่เจ้าของ/ไม่มี → 404 `NOT_FOUND` · executive/auditor/admin → 403 |
| `POST /api/cases/:caseNo/cancel` | citizen เจ้าของ | 200 `{"status":"CANCELLED"}` | 409 `CANNOT_CANCEL` |
| `POST /api/cases/:caseNo/resubmit` | citizen เจ้าของ (multipart ไม่บังคับ) | 200 `{"status":"IN_REVIEW","dueAt"}` | 409 `FIX_WINDOW_EXPIRED` / `INVALID_STATE` |
| `GET /api/documents/:docNo/pdf` | citizen เจ้าของ · officer · head | 200 `application/pdf` (+ `Content-Disposition` `DOC-….pdf`) | คนอื่น → 404 |
| `GET /api/cases/:caseNo/files` | citizen เจ้าของ · officer (แผนกตนเอง ขั้นปัจจุบันหรือเคยผ่าน) · head (ทุกแผนก) | 200 `{"items":[{"fileId","name","docKey","size"}]}` | citizen ไม่ใช่เจ้าของ → 404 · officer นอกขอบเขต/executive/auditor/admin → 403 `FORBIDDEN` · ไม่ล็อกอิน 401 |
| `GET /api/files/:fileId` | เงื่อนไขเดียวกับ `/files` | 200 เนื้อไฟล์ (`Content-Type` ตามชนิดจริง) | citizen ที่ไม่ใช่เจ้าของ → 404 · นอกขอบเขต → 403 · fileId ไม่มี → 404 |

### 6.3 เจ้าหน้าที่ / หัวหน้า

| Method · path | ใครเรียก | Body | สำเร็จ | ผิดพลาด |
|---|---|---|---|---|
| `GET /api/officer/queue?filter=all` | officer · head | – | 200 `{"items":[{caseNo,serviceId,applicantName,idMasked,status,step,owner,dueAt,slaLevel}]}` **ห้ามมี `idNo` และห้ามมีสตริงเลข 13 หลักหรือ `d-dddd-ddddd-dd-d`** | 401 · 403 |
| `POST /api/officer/cases/:caseNo/claim` | officer แผนกที่ถือเรื่อง | – | 200 `{"owner":"off.reg2"}` | 409 `ALREADY_CLAIMED` · 409 `WORKLOAD_LIMIT` · 403 `FORBIDDEN` (หัวหน้า/ข้ามแผนก/บทบาทอื่น) · ลำดับตรวจ: สิทธิ์ → `ALREADY_CLAIMED` → `WORKLOAD_LIMIT` |
| `POST /api/officer/cases/:caseNo/return` | ผู้ถือเรื่อง | `{"reason":"xxxxxxxxxx"}` | 200 `{"status":"NEED_FIX","returnCount":1}` | 400 `REASON_TOO_SHORT` · 409 `RETURN_LIMIT` · 403 · 409 `INVALID_STATE` |
| `POST /api/officer/cases/:caseNo/forward` | ผู้ถือเรื่อง | `{"note":"…"}` (ไม่บังคับ) | 200 `{"status":"IN_REVIEW","step":2}` หรือ `{"status":"PENDING_APPROVAL"}` | 403 · 409 `INVALID_STATE` |
| `POST /api/cases/:caseNo/approve` | SV-01: ผู้ถือเรื่อง · SV-02/03: head (PENDING_APPROVAL) | – | 200 `{"status":"APPROVED"}` | **403 `FORBIDDEN`** (เจ้าหน้าที่ใช้กับ SV-02/03 · head ใช้กับ SV-01) · 409 `INVALID_STATE` |
| `POST /api/cases/:caseNo/reject` | เหมือน approve | `{"reason":"…"}` | 200 `{"status":"REJECTED","closedAt"}` | 400 `REASON_TOO_SHORT` · 403 · 409 |
| `POST /api/officer/cases/:caseNo/issue` | ผู้ออกเอกสาร (A-27) | – | 200 `{"docNo":"DOC-2569-000002","verifyCode":"…","status":"COMPLETED"}` | 403 · 409 `INVALID_STATE` |
| `POST /api/officer/cases/:caseNo/unmask` | officer · head | `{"reason":"ตรวจสอบตัวตนซ้ำ"}` | 200 `{"idNo":"3100600987659"}` + Audit `UNMASK` | 400 `REASON_REQUIRED` · 403 (บทบาทอื่น/ประชาชน) |
| `GET /api/notifications` | officer · head | – | 200 `{"items":[{id,caseNo,level:"near"/"overdue",text,createdAt}]}` ของผู้ใช้นั้นเท่านั้น | 403 |

### 6.4 ตรวจเอกสาร / Dashboard / Audit

| Method · path | ใครเรียก | สำเร็จ | ผิดพลาด |
|---|---|---|---|
| `GET /api/verify/:code` | ทุกคน (ไม่ต้องล็อกอิน) | 200 `{"result":"VALID"/"EXPIRED"/"TAMPERED","docNo","applicantMasked","serviceId","issuedAt","validUntil","signer"}` (TAMPERED มีเฉพาะ `result`) | 404 `{"result":"NOT_FOUND"}` |
| `GET /api/dashboard?period=2026-11&service=ALL` | executive | 200 `{"received":26,"closed":7,"onTime":6,"ontimePct":85.7,"backlog":21,"overdue":1,"workload":[{"username","count"}]}` (`ontimePct` = `null` เมื่อปิดงาน 0) | 403 |
| `GET /api/dashboard/export?format=xlsx\|pdf&period=…&service=…` | executive | ไฟล์ตามข้อ 7 + Audit `EXPORT` | 403 |
| `GET /api/audit?actor=&event=&from=2026-12-01&to=2026-12-01` | auditor | 200 `{"count":n,"items":[{id,time,username,role,event,caseNo,fromStatus,toStatus,detail}]}` (`time` เป็น ISO +07:00) | 403 |
| `GET /api/audit/export.csv?...` | auditor | CSV ข้อ 7 + Audit `EXPORT` (A-36) | 403 |
| `PUT` `PATCH` `DELETE` ที่ `/api/audit` และ `/api/audit/:id` | ทุกบทบาทรวม admin | – | **405 `METHOD_NOT_ALLOWED`** (แม้ `:id` ไม่มีจริง) |

### 6.5 ผู้ดูแลระบบ

| Method · path | Body | สำเร็จ |
|---|---|---|
| `GET /api/admin/services` | – | 200 `{"items":[{id,fee,feePerSqm,sla}]}` |
| `PUT /api/admin/services/SV-01` | **ค่าธรรมเนียมจำนวนเต็ม 0–100,000 · SLA จำนวนเต็ม 1–60 (นอกช่วง → 400 `INVALID_FEE` / `INVALID_SLA`)** · `{"fee":25,"sla":3}` · SV-03: `{"feeBase":1000,"feePerSqm":10,"sla":15}` | 200 + Audit `ADMIN_CHANGE` (detail เช่น `SV-01 fee 20 → 25`) |
| `GET/POST/DELETE /api/admin/holidays` | วันซ้ำ → 409 `DUPLICATE_HOLIDAY` · POST `{"date":"2026-12-02","name":"วันหยุดทดสอบ"}` · DELETE `/api/admin/holidays/2026-12-02` | 200/201 + Audit `ADMIN_CHANGE` |
| `GET /api/admin/users` · `PUT /api/admin/users/audit1` | admin แก้ของตัวเอง → 409 `SELF_ROLE_CHANGE` · `{"role":"executive","dept":""}` | 200 + Audit `ADMIN_CHANGE` (detail `audit1 role auditor → executive`) · มีผลกับล็อกอินครั้งถัดไป |
| ผู้ดูแลเรียก `POST /api/drafts` หรือ endpoint ทำรายการคำขอใด ๆ | – | **403** |

### 6.6 สุขภาพ

| Method · path | สำเร็จ |
|---|---|
| `GET /api/health` (ไม่ต้องล็อกอิน) | 200 `{"status":"ok"}` (ตรงตัว ไม่มีฟิลด์อื่น) |

### 6.7 รูปแบบ JSON ของคำขอ (`GET /api/cases/:caseNo`)

```json
{
  "caseNo": "EG-2569-000025", "serviceId": "SV-01", "status": "IN_REVIEW",
  "step": null, "fee": 60, "paidAt": "2026-11-30T10:00:00+07:00",
  "dueAt": "2026-12-03T16:30:00+07:00", "slaLevel": "normal",
  "owner": "off.reg2", "returnCount": 0, "closedAt": null,
  "applicantName": "สมหญิง รักไทย",
  "idMasked": "X-XXXX-XXXXX-65-9",
  "fixDeadline": null, "docNo": null, "verifyCode": null
}
```

- **ประชาชนเจ้าของ** ได้ `idNo` (เต็ม) แทน `idMasked` · **เจ้าหน้าที่/หัวหน้า** ได้เฉพาะ `idMasked` และห้ามมี `idNo` ทุก response
- `step` เป็นเลข 1–3 เฉพาะ SV-03 (อื่น ๆ `null`) · `slaLevel` = `normal` `near` `overdue` `paused` `closed`
- `fixDeadline` มีค่าเมื่อ NEED_FIX = เวลาตีกลับ + 168 ชม.

### 6.8 รูปแบบ `detail` ของ Audit (ให้ test ตรวจด้วย "มีข้อความนี้")

| เหตุการณ์ | `detail` |
|---|---|
| `STAFF_LOGIN` `CLAIM` | ว่างได้ |
| `RETURN` `REJECT` `UNMASK` | ข้อความเหตุผลที่กรอก |
| `FORWARD` | หมายเหตุส่งต่อ (`forward-note`) ถ้ามี · ว่างได้ |
| `APPROVE` | ว่างได้ |
| `ISSUE` | เลขเอกสาร เช่น `DOC-2569-000002` |
| `EXPORT` (Dashboard) | `<format> <period> <service>` เช่น `xlsx 2026-11 ALL` · (Audit CSV) `audit-csv` |
| `ADMIN_CHANGE` | ค่าธรรมเนียม/SLA: `SV-01 fee 20 → 25` (SLA: `SV-01 sla 3 → 5`) · วันหยุด: `holiday add 2026-12-02` / `holiday delete 2026-12-02` · บทบาท: `exec1 role executive → auditor` |

## 7. รูปแบบไฟล์ส่งออก

| ไฟล์ | รูปแบบ |
|---|---|
| Dashboard `.xlsx` | ชีตแรก · แถวที่ 1 หัวตาราง `ตัวชี้วัด` · `ค่า` · แถว 2–6 คอลัมน์ A = `รับเรื่อง` `ปิดงาน` `ทันกำหนด %` `งานคงค้าง` `เกินกำหนดคงค้าง` คอลัมน์ B = ค่าตามที่แสดงบนจอเป็นข้อความ (เช่น `26` `7` `85.7%` `21` `1` · ปิดงาน 0 → `–`) |
| Dashboard `.pdf` | `Content-Type: application/pdf` · มีบรรทัด ASCII ที่เครื่องอ่านได้บรรทัดเดียว `kpi received=26 closed=7 ontime=85.7% backlog=21 overdue=1` (ปิดงาน 0 → `ontime=-`) · (ป้ายภาษาไทยตามจอใส่เพิ่มได้ test ไม่ตรวจ) · **ไม่มีชื่อผู้ยื่น เลข 13 หลัก หรือเบอร์โทร** (เช่นเดียวกับ `.xlsx`) |
| Audit `.csv` | UTF-8 · แถวแรก `time,username,role,event,caseNo,fromStatus,toStatus,detail` · ต่อจากนั้นตามลำดับเดียวกับบนจอ (ใหม่ → เก่า) และตามตัวกรองเดียวกัน |

## 8. Test hook (เฉพาะ `TEST_MODE=1`) และ BUG_MODE

| Method · path | Body | สำเร็จ | ผิดพลาด |
|---|---|---|---|
| `POST /api/test/reset` | – | 200 `{"ok":true,"now":"2026-12-01T09:00:00+07:00"}` · ล้างทุกอย่างแล้ว seed ตาม TEST-DATA ใหม่ · นาฬิกากลับค่าเริ่มต้น · **ล้าง session ทุกคน (ต้อง LOGIN ใหม่)** | – |
| `GET /api/test/clock` | – | 200 `{"now":"2026-12-01T09:00:00+07:00"}` | – |
| `PUT /api/test/clock` | `{"now":"2026-12-01T16:30:00+07:00"}` | 200 `{"now":"…"}` นาฬิกา **แช่แข็ง** ที่ค่านั้น (A-37) | 400 `INVALID_TIME` (ISO ไม่ถูกต้อง/ไม่มี offset) |
| `POST /api/test/payments/<ref>/pay` | `{"amount":20}` | 200 `{"status":"PAID","caseNo":"EG-2569-000031","receiptNo":"RC-2569-000031","duplicate":false}` · ส่งซ้ำ ref เดิม 200 `"duplicate":true` เลขเดิม | 410 `QR_EXPIRED` (อายุ ≥ 15:00) · 422 `AMOUNT_MISMATCH` · 404 ไม่มี ref |
| `POST /api/test/documents/<docNo>/tamper` | – | 200 `{"ok":true}` แก้ข้อมูลเอกสารที่เก็บโดยไม่คำนวณลายเซ็นใหม่ | 404 |
| `BUG_MODE=B03,B07` (ตัวแปรสภาพแวดล้อม) | – | เปิดบั๊กตาม `BUGS.md` ได้หลายตัว (คั่น `,`) · ไม่ตั้ง = ถูกต้อง · บั๊กกระทบเฉพาะการคำนวณ/ตรวจสิทธิ์ใหม่ ไม่กระทบข้อมูล seed (A-35) | – |

- นาฬิกา: ทุกกฎเวลา (SLA, QR อายุ, ล็อก OTP, หมดอายุเอกสาร, 168 ชม., เวลาใน Audit/ไทม์ไลน์) อ่านจากนาฬิกานี้เท่านั้น
- `/api/health` และหน้า `/verify` ไม่ขึ้นกับ `TEST_MODE`

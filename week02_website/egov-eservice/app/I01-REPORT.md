# I01-REPORT · รวมระบบ + รัน Playwright เต็ม

## ผล
`TEST_MODE=1 BUG_MODE= docker compose up --build -d` แล้วรัน `cd e2e && npm i && npx playwright install chromium && DB_DUMP_CMD="docker exec app-web-1 sh -c 'cat /data/app.db*'" npx playwright test`
→ **79 test (ครบทั้ง 51 TC ใน TEST-PLAN; บาง TC แบ่งหลายส่วน) ผ่าน 79/79** (BUG_MODE ว่าง)

TC-NFR-04 ต้องมี `DB_PATH` หรือ `DB_DUMP_CMD` ตามที่ c.spec.js ระบุ (ฐานข้อมูลอยู่ใน volume ของ container).
ไม่ได้รันรอบ BUG_MODE=Bxx ในบล็อกนี้

## สิ่งที่ต้องสร้างเพิ่ม (F01 ส่งมาแค่ login.html)
สร้าง `public/app.js` `app.css` `case.js` และหน้า register, citizen, citizen-new, citizen-case, officer-queue, officer-case, head-approvals, dashboard, audit, admin-services/holidays/users, notifications, verify รวม 17 หน้า
แก้ `src/workflow.js` บรรทัด 85: เพิ่ม `canIssue` ในแถวคิว เพื่อให้หน้าแสดง `issue-btn` เฉพาะผู้ออกเอกสาร (A-27)

## ข้อที่ล้มระหว่างทางและการจำแนก (ไม่ได้แก้ผลที่คาดหวังของ test เลย)
| TC | อาการ | จำแนก | แก้ |
|---|---|---|---|
| TC-AUTH-04 | login.html ใส่ `#staff` ใน URL ทำให้ URL ไม่ใช่ `/login` | เว็บผิด (F01) | เลิกเขียน hash |
| TC-FEE-01 | SV-02 ยังมี `qty-input` (ซ่อนด้วย hidden) | เว็บผิด | ไม่ render ตามบริการ (CONTRACT ข้อ 0.5) |
| TC-SUBMIT-02 · TC-PAY-04 | `missing-docs` / `submitted-case-no` ต้อง count=0 เมื่อไม่เกี่ยวข้อง | เว็บผิด | render เมื่อมีเท่านั้น (รวม `qr-expired-msg`) |
| TC-DOC-02 · TC-DOC-03 D | NOT_FOUND/TAMPERED ห้ามมี `verify-doc-no` `verify-applicant` | เว็บผิด | render เฉพาะ VALID/EXPIRED |
| TC-DASH-02 | `kpi-ontime-pct` ต้อง `100.0%` | เว็บผิด | ใช้ `toFixed(1)` |
| TC-NFR-04 | ไม่มี DB_PATH | เงื่อนไขรัน (ไม่ใช่ test/แผนผิด) | ตั้ง `DB_DUMP_CMD` |
ไม่พบกรณี test ผิด หรือแผนผิด

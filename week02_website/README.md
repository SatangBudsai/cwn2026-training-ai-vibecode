# e-Service กลาง · เทศบาลนครตัวอย่าง (การบ้าน Week 2)

เว็บบริการภาครัฐสมมติ ประชาชนยื่นคำขอ 3 บริการและจ่ายเงินออนไลน์ เจ้าหน้าที่ตรวจและออกเอกสารดิจิทัล หัวหน้าอนุมัติ ผู้บริหารดู Dashboard ผู้ตรวจสอบดู Audit Trail
ThaiD, PromptPay และลายเซ็นดิจิทัลเป็น **ตัวจำลอง** ไม่เชื่อมระบบจริง และไม่มีชื่อ/ตราหน่วยงานจริง
โจทย์: `../week2_student` (README, USER-STORIES, REQUIREMENTS, CONTRACT, TEST-DATA, TEST-PLAN, BUGS)

## สรุปผล (ตัวเลขทั้งหมดมาจากการรันจริง)

| ขั้น | ผล |
|---|---|
| LAB 2 วางแผนด้วย dag-planner | ✅ 13 บล็อก จากโควตาจริงของ yolo1–3 ใน container `multi-account` → [`egov-eservice/`](egov-eservice/README.md) |
| LAB 3 ทีมเอเจนต์สร้างเว็บ (agent-team) | ✅ เสร็จ 13/13 บล็อก · 2,417,922 tokens · เว็บที่ได้รันซ้ำบนเครื่องผ่าน 79/79 → [`egov-eservice/`](egov-eservice/README.md) |
| เว็บในโฟลเดอร์นี้ (`app/`) | เว็บรอบก่อนที่ปรับดีไซน์ต่อ ใช้กับผล LAB 4–5 ด้านล่าง |
| รัน TEST-PLAN (ไม่เปิดบั๊ก) ใน Docker | **61 test ผ่านครบ 61 ในรอบเดียว** (ครอบ 51 TC) · 0 ล้ม · 0 flaky · 0 ข้าม · 2.4 นาที → `e2e/test-report/results.json` |
| BUG_MODE B01–B12 ใน Docker | **จับได้ 12 จาก 12** (retries 0 ไม่มี test ล้มแบบสุ่มปน) + ทดสอบรวมบั๊ก 2 ชุด → [`BUG-HUNT.md`](BUG-HUNT.md) |
| GIF ระดับ P1 | 24 ไฟล์ → `e2e/test-report/gifs/` เปิดดูรวมที่ `e2e/test-report/index.html` |

**ทำถึงระดับไหน: ใช้งานได้จริง ไม่ใช่ mock** กฎธุรกิจทั้งหมดคำนวณที่ฝั่งเซิร์ฟเวอร์ (ค่าธรรมเนียม, SLA วันทำการ, สิทธิ์ RBAC, OTP ล็อก 15 นาที, เลขคำขอ, ลายเซ็น HMAC, แจ้งเตือน, Audit) แต่มีข้อจำกัดที่ต้องรู้:
- เก็บใน SQLite เฉพาะ **ผู้ใช้** (เลขบัตรและเบอร์เข้ารหัส AES-256-GCM) ส่วนคำขอ ร่าง การชำระ ไฟล์ Audit และแจ้งเตือน **อยู่ในหน่วยความจำ** หายเมื่อรีสตาร์ต (ตรงกับที่ test ต้องการ เพราะ reset ทุก TC แต่ไม่ใช่ระบบ production)
- PDF เอกสารเป็น ASCII ไม่มีข้อความไทยในไฟล์ (ข้อความไทยแสดงในหน้าเว็บ) · QR เป็นภาพจำลอง
- `docker compose up --build` **ทดสอบแล้ว** ผล 61/61 ข้างบนรันกับ container ตามขั้นตอนใน "วิธีรัน"
- TC-NFR-04 (ตรวจว่าไฟล์ DB ไม่มีเลขบัตร/เบอร์เป็นข้อความธรรมดา) ต้องเห็นไฟล์ DB บนเครื่อง จึงใช้ override `docker-compose.inspect.yml` ที่ mount `app/data/` ออกมา · compose ปกติเก็บ DB ใน tmpfs

## เว็บทำอะไรได้ (6 บทบาท)

| บทบาท | ทำอะไร |
|---|---|
| ประชาชน | ล็อกอินเลขบัตร 13 หลัก (เช็ก checksum) + OTP · ลงทะเบียนครั้งแรก/PDPA · ยื่น SV-01/02/03 ใน 3 ขั้น · แนบไฟล์ (ตรวจชนิดจากเนื้อไฟล์ ≤5 MB ≤5 ไฟล์) · บันทึกร่าง · จ่าย QR จำลอง · ดูสถานะ/ไทม์ไลน์/SLA · ยกเลิก · ส่งแก้ไขใน 168 ชม. · ดาวน์โหลดเอกสาร PDF |
| เจ้าหน้าที่ | คิวแยกแผนก · รับเรื่อง (ครั้งละ 1 คน ≤10 งาน) · ตีกลับ ≤2 ครั้ง · ส่งต่ออัตโนมัติ · อนุมัติ SV-01 · ออกเอกสาร · ดูไฟล์แนบ · เลขบัตรปิดบัง + แสดงเต็มพร้อมเหตุผล · กระดิ่งแจ้งเตือน SLA |
| หัวหน้าฝ่าย | รายการรออนุมัติ SV-02/03 · อนุมัติ/ไม่อนุมัติ |
| ผู้บริหาร | Dashboard (รับเรื่อง ปิดงาน ทันกำหนด % คงค้าง เกินกำหนด งานในมือ) กรองเดือน/บริการ · ส่งออก Excel/PDF (ไม่มีข้อมูลส่วนบุคคล) |
| ผู้ตรวจสอบ | Audit Trail 10 เหตุการณ์ กรอง ส่งออก CSV แก้/ลบไม่ได้ (405) |
| ผู้ดูแลระบบ | แก้ค่าธรรมเนียม/SLA · วันหยุด · ผู้ใช้/บทบาท |
| ทุกคน | `/verify/<รหัส>` ตรวจเอกสารโดยไม่ต้องล็อกอิน (ชื่อผู้ยื่นปิดบัง) · `/api/health` |

## ดีไซน์

อิง design spec แบบ showroom (พื้นขาว ปุ่มแคปซูลสีน้ำเงินสีเดียว `#0070D5` ตัวอักษรหมึก `#262626` footer เทาถ่าน `#272727` ส้ม `#BE4E04` ใช้เฉพาะป้ายเล็ก) แล้วปรับตามที่ผู้ใช้ขอ:
- ฟอนต์ไทย **IBM Plex Sans Thai** (open source) เก็บไฟล์ไว้ใน `app/public/static/fonts/` ไม่โหลดจากเน็ต
- มุมมนทั้งระบบ (การ์ด 16px ช่องกรอก 10px) · ป้ายสถานะแบบสีพื้นเรียบ · ปุ่มในตารางขนาดเล็ก · ข้อความในตารางไม่ตัดบรรทัด (ตารางเลื่อนแนวนอนเอง)
- หน้า login แบ่งสองฝั่ง: ซ้ายเป็นแผงน้ำเงิน (ติดอยู่กับที่) มีข้อความจางเป็นลายพื้นหลัง · ขวาเป็นฟอร์มวางบนพื้นโดยไม่มีการ์ด · ขั้น OTP สลับเป็นหน้าจอแยก
- ช่องเลขบัตรรับเฉพาะตัวเลข และจัดรูปแบบ `1-1017-00123-45-6` ระหว่างพิมพ์ (ส่งเซิร์ฟเวอร์เป็นเลข 13 หลักล้วน) · ไม่ได้ทำเป็น 13 ช่องแยก เพราะ CONTRACT กำหนด `data-testid="thaid-id-input"` ช่องเดียว
- ตราสัญลักษณ์ `app/public/static/emblem.svg` ออกแบบใหม่สำหรับ "เทศบาลนครตัวอย่าง" ไม่ได้ใช้ตราของหน่วยงานจริง (โจทย์ห้ามใช้ชื่อหรือตราหน่วยงานจริง)
- สีที่ผ่านคอนทราสต์ WCAG AA ทั้งหมด (TC-NFR-02 ตรวจด้วย axe) เช่น ตัวอักษรในป้ายสถานะสีฟ้าใช้ `#00478A`

ไฟล์: `app/public/static/app.css`

## วิธีเข้าระบบ (บัญชีทดสอบจาก TEST-DATA)

หน้า `/login` มีกล่อง "บัญชีทดลองสำหรับเข้าระบบ" (พับไว้ กดเพื่อดู)

| ประเภท | วิธี | บัญชี |
|---|---|---|
| ประชาชน | แท็บ "ประชาชน" → กรอกเลขบัตร → กด "เข้าสู่ระบบด้วย ThaiD" → ใส่ OTP **`123456`** | สมชาย ใจดี `1101700123456` · สมหญิง รักไทย `3100600987659` · ปิติ มีสุข `1909900555015` · มานะ (ยังไม่ลงทะเบียน) `5500400111221` |
| เจ้าหน้าที่ | แท็บ "เจ้าหน้าที่" → ชื่อผู้ใช้ + รหัสผ่าน **`Test@1234`** | `off.reg1` `off.reg2` ทะเบียน · `off.works1` โยธา · `head1` หัวหน้า · `exec1` ผู้บริหาร · `audit1` ผู้ตรวจสอบ · `admin1` ผู้ดูแล |

OTP ผิด 3 ครั้งล็อกเลขบัตร 15 นาที (ปิติใช้ทดสอบกรณีนี้) · ล้างข้อมูลกลับค่าเริ่มต้นด้วย `POST /api/test/reset` (เมื่อเปิด `TEST_MODE=1`)

**การจ่ายเงิน:** ขั้นที่ 3 ของการยื่นคำขอ กด "สร้าง QR" แล้วกด **"จำลองสแกนจ่าย PromptPay"** ระบบเรียก callback ของธนาคาร (`POST /api/test/payments/<ref>/pay`) ด้วยยอดเต็ม แล้วหน้าจอเปลี่ยนเป็นใบเสร็จ พร้อมเลขคำขอ `EG-2569-…` ปุ่มนี้ใช้ได้เฉพาะเมื่อเปิด `TEST_MODE=1` (ทดลองจริงกับร่าง DR-0002 ได้ `PAID` ใบเสร็จ ฿500)

<!-- gallery:start -->
## ภาพประกอบ

### แผนภาพ DAG จาก dag-planner (LAB 2)

![DAG](egov-eservice/dag.png)

แผนจากโควตาจริงของ yolo1–3 · [PLAN.md](egov-eservice/PLAN.md) · [blocks.json](egov-eservice/blocks.json)

### ผล Playwright (LAB 4)

![ผล test](docs/img/tests.png)

### BUG_MODE (LAB 5)

![BUG-HUNT](docs/img/bughunt.png)

รายละเอียด expected → received ทุกบั๊ก: [BUG-HUNT.md](BUG-HUNT.md)

### Gantt แผน / Gantt จริง / แผน vs จริง จาก dag-planner (LAB 2–3)

![Gantt แผน](egov-eservice/gantt-plan.png)

![Gantt จริง](egov-eservice/gantt-actual.png)

![แผน vs จริง](egov-eservice/compare.png)

เสร็จ 13/13 บล็อก · เวลาจริงรวมช่วงรอโควตารีเซ็ต · [REPORT.md](egov-eservice/REPORT.md)

### ภาพหน้าเว็บ (13 หน้า)

| | |
|---|---|
| **หน้าเข้าสู่ระบบ (ThaiD จำลอง / เจ้าหน้าที่)**<br><img src="docs/img/web-01-login.png" width="460"> | **ตรวจเอกสารโดยไม่ต้องล็อกอิน (ชื่อผู้ยื่นปิดบัง)**<br><img src="docs/img/web-02-verify.png" width="460"> |
| **ประชาชน: รายการคำขอและเริ่มบริการ**<br><img src="docs/img/web-03-citizen.png" width="460"> | **ยื่นคำขอ SV-03 พื้นที่ 101 ตร.ม. ค่าธรรมเนียม ฿1,010**<br><img src="docs/img/web-04-wizard-fee.png" width="460"> |
| **ประชาชน: รายละเอียดคำขอ สถานะ ไทม์ไลน์ SLA**<br><img src="docs/img/web-05-citizen-case.png" width="460"> | **มือถือ 375px ไม่มี scroll แนวนอน**<br><img src="docs/img/web-06-mobile.png" width="460"> |
| **เจ้าหน้าที่: คิวงานแยกแผนก เลขบัตรปิดบัง**<br><img src="docs/img/web-07-queue.png" width="460"> | **เจ้าหน้าที่: แจ้งเตือน SLA ใกล้ครบกำหนด/เกินกำหนด**<br><img src="docs/img/web-08-notifications.png" width="460"> |
| **หัวหน้าฝ่าย: รายการรออนุมัติ**<br><img src="docs/img/web-09-approvals.png" width="460"> | **ผู้บริหาร: Dashboard (ไม่มีข้อมูลส่วนบุคคล)**<br><img src="docs/img/web-10-dashboard.png" width="460"> |
| **ผู้ตรวจสอบ: Audit Trail**<br><img src="docs/img/web-11-audit.png" width="460"> | **ผู้ดูแลระบบ: ค่าธรรมเนียม/SLA**<br><img src="docs/img/web-12-admin.png" width="460"> |
| **เจ้าหน้าที่: รายละเอียดคำขอและปุ่มดำเนินการ**<br><img src="docs/img/web-13-officer-case.png" width="460"> |  |

### GIF ตอน Playwright รัน test ระดับ P1 (24 ไฟล์ · LAB 4)

ทุก test ผ่าน · เปิดรวมทั้งหมดได้ที่ e2e/test-report/index.html

| | | |
|---|---|---|
| **TC-AUDIT-01**<br><img src="e2e/test-report/gifs/TC-AUDIT-01.gif" width="300"> | **TC-AUDIT-02**<br><img src="e2e/test-report/gifs/TC-AUDIT-02.gif" width="300"> | **TC-AUDIT-03**<br><img src="e2e/test-report/gifs/TC-AUDIT-03.gif" width="300"> |
| **TC-AUTH-01**<br><img src="e2e/test-report/gifs/TC-AUTH-01.gif" width="300"> | **TC-AUTH-02**<br><img src="e2e/test-report/gifs/TC-AUTH-02.gif" width="300"> | **TC-AUTH-03**<br><img src="e2e/test-report/gifs/TC-AUTH-03.gif" width="300"> |
| **TC-DASH-01**<br><img src="e2e/test-report/gifs/TC-DASH-01.gif" width="300"> | **TC-DASH-02**<br><img src="e2e/test-report/gifs/TC-DASH-02.gif" width="300"> | **TC-DASH-04**<br><img src="e2e/test-report/gifs/TC-DASH-04.gif" width="300"> |
| **TC-FEE-01**<br><img src="e2e/test-report/gifs/TC-FEE-01.gif" width="300"> | **TC-NFR-01**<br><img src="e2e/test-report/gifs/TC-NFR-01.gif" width="300"> | **TC-NFR-02**<br><img src="e2e/test-report/gifs/TC-NFR-02.gif" width="300"> |
| **TC-NFR-02B**<br><img src="e2e/test-report/gifs/TC-NFR-02B.gif" width="300"> | **TC-PAY-01**<br><img src="e2e/test-report/gifs/TC-PAY-01.gif" width="300"> | **TC-PDPA-01**<br><img src="e2e/test-report/gifs/TC-PDPA-01.gif" width="300"> |
| **TC-PDPA-03**<br><img src="e2e/test-report/gifs/TC-PDPA-03.gif" width="300"> | **TC-RBAC-01**<br><img src="e2e/test-report/gifs/TC-RBAC-01.gif" width="300"> | **TC-RBAC-02**<br><img src="e2e/test-report/gifs/TC-RBAC-02.gif" width="300"> |
| **TC-RBAC-03**<br><img src="e2e/test-report/gifs/TC-RBAC-03.gif" width="300"> | **TC-RBAC-05**<br><img src="e2e/test-report/gifs/TC-RBAC-05.gif" width="300"> | **TC-SUBMIT-01**<br><img src="e2e/test-report/gifs/TC-SUBMIT-01.gif" width="300"> |
| **TC-SUBMIT-02**<br><img src="e2e/test-report/gifs/TC-SUBMIT-02.gif" width="300"> | **TC-UPLOAD-01**<br><img src="e2e/test-report/gifs/TC-UPLOAD-01.gif" width="300"> | **TC-UPLOAD-02**<br><img src="e2e/test-report/gifs/TC-UPLOAD-02.gif" width="300"> |

หมายเหตุ: TC-NFR-02.gif แทบว่าง (5 KB) เพราะ test นั้นสแกน axe หลายหน้าอย่างรวดเร็ว ดู TC-NFR-02B สำหรับภาพการใช้คีย์บอร์ด · อีก 28 ข้อของ P1 เป็น test API อย่างเดียวจึงไม่มีวิดีโอ

<!-- gallery:end -->

## วิธีรัน

**เปิดเว็บด้วย Docker (คำสั่งเดียว)**

```powershell
cd app
docker compose up -d --build        # http://localhost:3100  (TEST_MODE=1 เป็นค่าเริ่มต้น)
$env:BUG_MODE='B03'; docker compose up -d --force-recreate   # เปิดบั๊กตาม BUGS.md
```

**รัน test ครบ 61 ข้อในรอบเดียว (วิธีที่ได้ผล 61/61 ข้างบน)**

```bash
cd app
docker compose -f docker-compose.yml -f docker-compose.inspect.yml up -d --force-recreate   # DB อยู่ที่ app/data/ ให้ TC-NFR-04 ตรวจได้
MSYS_NO_PATHCONV=1 docker run -d --name egov-nohook -p 3101:3100 -e PORT=3100 --tmpfs /data app-web   # ตัวที่ไม่เปิด TEST_MODE ให้ TC-NFR-03B
cd ../e2e && npm install
E2E_NOHOOK_URL=http://localhost:3101 npx playwright test   # → test-report/results.json + html
node make-gifs.js       # GIF ระดับ P1 → test-report/gifs + index.html
node make-charts.js     # กราฟ README ทั้งหมด → docs/img/
```

**BUG_MODE ทั้ง 12 ตัว:** `bash bughunt-docker/run.sh` (ตั้ง `BUGS="B01 B02"` เพื่อรันบางตัว)

**ไม่ใช้ Docker:** `cd app; $env:TEST_MODE='1'; node server.js` (Node 24 ไม่มี npm dependency)

หมายเหตุ: ffmpeg-static ต้องมี binary — npm 12 บล็อก install script ให้รัน `node node_modules/ffmpeg-static/install.js` หนึ่งครั้ง

## เฉลยคำถามเช็กความเข้าใจ (LAB 1)

1. ก่อสร้าง 101 ตร.ม. = ฿1,000 + ฿10 × (101 − 100) = **฿1,010** (BR-05)
2. ชำระ อ. 1 ธ.ค. 69 เวลา 16:30 (ไม่ใช่ "ก่อน 16:30") → D0 = พ. 2 ธ.ค. · SLA 3 วันทำการ (พฤ.3, ศ.4, ข้าม จ.7 ที่เป็นวันหยุด) → **อ. 8 ธ.ค. 69 เวลา 16:30** (BR-12)
3. ชุด Playwright กลางเขียนครั้งเดียวใช้ได้กับเว็บของทุกกลุ่ม ถ้า `data-testid` ไม่ตรงกัน test หาองค์ประกอบไม่เจอ จึงต้องมี CONTRACT

## ข้อที่เคยล้มและเป็นความผิดของอะไร (LAB 4)

แยกตามความผิด ไม่ได้แก้ผลที่คาดหวังใน test ให้ตรงหน้าจอ:

**เว็บผิด** (แก้ที่เว็บ)

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| test หน้าเว็บล้มเกือบทั้งหมดรอบแรก | server ส่งไฟล์ `/static/*` จากโฟลเดอร์ผิดชั้น (เว็บไม่มี CSS/JS) | `app/server.js` |
| TC-AUTH-01 | `otp-step` อยู่ใน DOM (ซ่อน) ก่อนเลขบัตรผ่าน การ์ดต้องการให้ไม่มี | `login.html`, `login.js` |
| TC-DASH-02 | ทันกำหนด % แสดง `100%` ต้อง `100.0%` (BR-25) | `dashboard.js` |
| TC-SUBMIT-01 | `row-owner` ต้องว่างเมื่อยังไม่มีผู้รับ (การ์ด บรรทัด 209) | `queue.js` |
| TC-NFR-04 | ไฟล์ DB ชื่อ `app.db` แต่ test หา `egov.db` (path ตั้งค่าได้) | `app/src/vault.js` |
| TC-NFR-01, TC-PAY-04 (เป็นบางรอบ) | race: แนบไฟล์เร็วก่อนสร้างร่างเสร็จ | `wizard.js` |

| TC-NFR-02 (หลังเปลี่ยนดีไซน์) | ตัวอักษรน้ำเงินบนพื้นฟ้าอ่อนในป้ายสถานะ คอนทราสต์ไม่ถึง WCAG AA (axe: color-contrast) | `app.css` ใช้ `#00478A` |

**test ผิด** (แก้ลำดับขั้นของ test ไม่แตะค่าที่ตรวจ)

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| TC-NFR-01 / TC-NFR-03 ล้มแบบสุ่ม `net::ERR_ABORTED at /login` (BUG_MODE รอบ 1 เจอ 7 จาก 12 รอบ) | test ล้าง cookie ทั้งที่หน้าเดิมยังเปิด สคริปต์หน้าเดิมได้ 401 แล้ว redirect ไป `/login` ชนกับ `page.goto` ของ test | `nfr.spec.js` ไป `about:blank` ก่อนล้าง cookie · `lib/common.js` helper `gotoLogin` · หลังแก้ ผ่าน 6/6 รอบแม้ server ช้า |
| TC-UPLOAD-01 ตอนเปิด B02 ล้มด้วย timeout ไม่บอกค่าต่าง | รอ `file-item` อย่างเดียว | **เพิ่ม** การรอ `upload-error` และข้อความ `size 5242880 must be accepted` ไม่ได้ลดเกณฑ์ |

**สภาพแวดล้อม:** TC-NFR-04 ล้มเมื่อรันกับ compose ปกติ เพราะ DB อยู่ใน tmpfs ข้างใน container test หาไฟล์ไม่เจอ แก้ด้วย override `docker-compose.inspect.yml`

## BUG_MODE สรุป

รันใน Docker ทีละบั๊ก (สร้าง container ใหม่ทุกครั้ง) **จับได้ครบ 12 จาก 12** และทดสอบรวมบั๊ก `B03,B07` (13 ล้ม) และ `B01,B05,B09` (3 ล้ม) ได้ผลรวมของบั๊กเดี่ยวพอดี รายละเอียด expected → received ของทุกบั๊กอยู่ใน [`BUG-HUNT.md`](BUG-HUNT.md)
ข้อสังเกต: B03 ทำให้ **TC-NOTI-02 ล้มเพิ่ม** ซึ่งไม่อยู่ในรายการ "อาจล้มด้วย" ของ BUGS.md เพราะระดับ "ใกล้ครบกำหนด" ที่ขับการแจ้งเตือนใช้ฟังก์ชันวันทำการตัวเดียวกับ SLA ควรแจ้งผู้สอน

## สิ่งที่ต่างจากโจทย์/ที่ยังไม่ได้ทำ

- **LAB 2–3 รันจริงด้วย dag-planner + agent-team ใน container `multi-account`** ผลอยู่ที่ [`egov-eservice/`](egov-eservice/README.md) · แผนเก่าในโฟลเดอร์ `plan/` และ `rerun/` ของโฟลเดอร์นี้เป็นรอบก่อนที่ยังไม่มี container (เก็บไว้เป็นประวัติ) · บล็อกกฎตัวเลขใช้ `yolo` แทน `review` เพราะไม่มีบัญชี Codex
- **จำนวน test:** 61 test ครอบ 51 TC เพราะ TC-SLA-01 แยกเป็น 9 test (แถว a–i) และมี TC-NFR-02B, TC-NFR-03B เพิ่ม 2 ข้อ (TC-NFR-03B ใช้เว็บพอร์ต 3101 ที่ไม่ตั้ง TEST_MODE)
- **GIF มี 24 จาก test ระดับ P1 ทั้งหมด 52** เพราะอีก 28 ข้อเป็น test ที่เรียก API อย่างเดียว ไม่เปิดเบราว์เซอร์ จึงไม่มีวิดีโอ
- **ไม่มีเกณฑ์ให้คะแนนในชุดโจทย์** ถ้าผู้สอนมีเกณฑ์แยกต่างหากยังไม่ได้เทียบ
- NFR-05 (HTTPS) ไม่มี TC และไม่ได้ทำ (ตามโจทย์ ทดสอบบนเครื่อง local ไม่ได้)

## คำถามถึงผู้สอน/TA (สัญญาไม่ชัด agent ที่เขียน test ต้องสมมติ)

1. หน้าร่างที่ `PENDING_PAYMENT` (`?draft=...`) ควรเปิดที่ขั้นไหน (เว็บเลือกขั้น 3)
2. `GET /api/drafts/:id` ควรคืนรายการไฟล์ และควรมี API ลบไฟล์ที่แนบหรือไม่ (เว็บเพิ่ม `files` และ `DELETE .../files/:fileId`)
3. ฟอร์มแก้ค่าธรรมเนียมและ SLA บันทึกพร้อมกันหรือแยก และถ้าค่าไม่เปลี่ยนต้องมีแถว `ADMIN_CHANGE` หรือไม่
4. `bell-count` ต้องอยู่ใน header ทุกหน้าของ officer/head หรือเฉพาะ `/notifications`
5. B03 ทำให้ TC-NOTI-02 ล้มเพิ่ม ถือว่ายอมรับได้หรือไม่

## โครงสร้างโฟลเดอร์

```
week02_website/
├── README.md · BUG-HUNT.md · plan/PLAN.md
├── app/            เซิร์ฟเวอร์ Node (server.js, src/*.js, public/ = หน้าเว็บ 17 หน้า, API-EXTRAS.md = API ที่เพิ่มจาก CONTRACT)
└── e2e/            Playwright (tests/*.spec.js, lib/*.js, make-gifs.js, test-report/)
```






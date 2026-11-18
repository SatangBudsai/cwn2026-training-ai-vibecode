# SPEC · สบายใจ สปา (Sabai Jai Wellness Spa)

เอกสารสำหรับคนทดสอบ · รหัส FR/BR/NFR อยู่ใน `../REQUIREMENTS.md` · ค่าขอบ E อยู่ใน `../TEST-DATA.md` ข้อ 7

## 1. วิธีเปิดเว็บ

ต้องมี Docker Desktop · ใช้คำสั่งเดียวกันทั้ง Windows (PowerShell) และ macOS (Terminal) · ไม่มีไฟล์ `.sh` ที่ต้องรัน

```
docker network create sabai-net        # มีแล้วข้ามได้
cd db  && docker compose up -d --wait
cd ../web && docker compose up -d --wait --build
```

เปิด http://localhost:3000 (Windows: `start http://localhost:3000` · macOS: `open http://localhost:3000`)

| ตัวแปร (`web/docker-compose.yml`) | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `ALLOW_TEST_RESET` | 1 | ปุ่มรีเซ็ต ล็อกเวลา · 0 = API ทดสอบตอบ 404 ปุ่มหาย นาฬิกาใช้เวลาจริง |
| `BUG_MODE` | 0 | โหมดฝึกทดสอบของผู้สอน · เปลี่ยนแล้ว `docker compose up -d` ไม่ต้อง build ใหม่ · อ่านค่าปัจจุบันได้จาก `<html data-bug-mode>` |
| `FEATURE_SKIN_PREVIEW` | 1 | ภาพจำลองก่อน/หลัง (FR-76, D-26) |
| `SESSION_SECRET` | ค่าทดสอบ | ลายเซ็น cookie |

ฐานข้อมูล: container `sabai-db` · volume `sabai-pgdata` · เครื่องเราเข้าได้ที่ `127.0.0.1:5433` (ผู้ใช้/รหัส/ฐาน `sabai`) · `web/` คุยผ่าน `sabai-db:5432`
รันซ้ำจากศูนย์: `docker compose down` แล้วลบ volume `sabai-pgdata` จึงรัน init ใหม่ · ปกติใช้ปุ่มรีเซ็ตพอ

ทดสอบ: `cd web && npx vitest run` (unit test) · `node scripts/verify-edges.mjs http://localhost:3000` (ค่าขอบผ่าน API)

## 2. เครื่องมือทดสอบ

- `<html lang data-ready data-bug-mode>`: `data-ready` เริ่ม `false` เป็น `true` หลัง hydrate ให้รอค่านี้ก่อนกด
- `POST /api/test/reset {"now":"<ISO>"}` ล้างกลับเป็น seed และล็อกวันนี้ · ไม่ส่งใช้ `2026-06-15T10:00:00+07:00`
- `POST /api/test/lock {"now":"<ISO>"}` ล็อกอย่างเดียว ปรับเดือนเกิด U02, U05 และปีของ R01 (D-24) · คอร์สและบัตรคิดใหม่เมื่อรีเซ็ต
- แผงท้ายหน้า: `reset-test-data` · `lock-today` (ช่องวันเวลา) · `lock-today-submit` · `test-now`

## 3. ผู้ใช้ seed (12 บัญชี · TD-05)

| รหัส | อีเมล | รหัสผ่าน | ชื่อ | ยอดสะสม | ระดับ | แต้ม | เดือนเกิด | หมายเหตุ |
|---|---|---|---|---:|---|---:|---|---|
| U01 | nida@sabai.test | Nida#2026 | คุณนิดา | 12,400 | Gold | 99 | มี.ค. | C01 เหลือ 7 จาก 11 · รอบเอว · ประวัติ 4 · B07 |
| U02 | ton@sabai.test | Ton#2026 | คุณต้น | 30,000 | Platinum | 0 | ตามวันล็อก | ยังไม่ใช้สิทธิ์เดือนเกิด |
| U03 | fon@sabai.test | Fon#2026 | คุณฝน | 9,999 | Silver | 250 | ก.พ. | ครบ 5 ขั้น |
| U04 | may@sabai.test | May#2026 | คุณเมย์ | 0 | Silver | 0 | พ.ค. | สมาชิกใหม่ |
| U05 | prae@sabai.test | Prae#2026 | น้องแพร | 29,999 | Gold | 100 | ตามวันล็อก | ใช้สิทธิ์เดือนเกิดแล้ว |
| U06 | liwei@sabai.test | LiWei#2026 | Mr. Li Wei | 0 | Silver | 0 | ม.ค. | โหมด /zh |
| U07 | owner@sabai.test | Owner#2026 | คุณจันทร์ | 0 | — | 0 | — | บัญชีร้าน OWNER |
| U08 | kan@sabai.test | Kan#2026 | คุณกานต์ | 10,000 | Gold | 101 | ส.ค. | C02 ใกล้หมดอายุ |
| U09 | win@sabai.test | Win#2026 | คุณวิน | 10,001 | Gold | 199 | พ.ย. | C03 หมดอายุ · B05 |
| U10 | bee@sabai.test | Bee#2026 | คุณบี | 30,001 | Platinum | 200 | ก.ย. | C04 เหลือ 0 |
| U11 | por@sabai.test | Por#2026 | คุณปอ | 500 | Silver | 1,700 | มิ.ย. | C05 เหลือ 1 |
| U12 | muk@sabai.test | Muk#2026 | คุณมุก | 5,000 | Silver | 300 | มิ.ย. | C06 กันไว้ 1 · B08, B15 |

แขก G1–G7 และรหัสการจอง `SJTEST05`–`SJTEST19`, `SJHIST01`–`SJHIST04` ดู TEST-DATA ข้อ 6 · UUID คงที่: U01–U12 `…0101`–`…0112` · B01–B19 `…0201`–`…0219` · C01–C06 `…0301`–`…0306`
Gift Card 17 ใบ ดู TEST-DATA ข้อ 6.6 เช่น `GIFT-500` `GIFT-1000` `GIFT-EXP365`

## 4. หน้าเว็บ (`/th` `/en` `/zh` · `/` ไป `/th` · `/admin` ไป `/th/admin`)

| Path | เนื้อหา | รหัส |
|---|---|---|
| `/{locale}` | หน้าแรก: hero, เรื่องราว, ทีมบำบัด, แกลเลอรี, รีวิวลูกค้าตัวอย่าง, ตัวเลขจริง, อารมณ์วันนี้ | FR-61, 62, 67 · NFR-02, 05, 06 |
| `/services` · `/services/{id}` | เมนู 9 รายการ ราคา สมุนไพร รายละเอียด | FR-01, 63, 64 |
| `/herbs` | สมุนไพร 12 ชนิด | FR-63, 64 |
| `/packages/bangkok-relax` | แพ็กเกจ ฿2,900/คน | FR-51, 52 · BR-30, 37 |
| `/therapists` | นักบำบัด T01–T06 ตัวกรอง 4.5 ดาว | FR-07, 71 · BR-47–49 |
| `/team` | ทีมงานรวมน้องบัว คุณจันทร์ | FR-61 |
| `/reviews` | รีวิวเก่าและรีวิวลูกค้าตัวอย่าง | FR-71, 72 |
| `/gallery` · `/about` | แกลเลอรี · เรื่องราวร้าน | FR-61 |
| `/booking` | จอง 3 หน้าจอ (ระบบ 4 ขั้น) | FR-02–11, 14–19, 27–33, 39, 52–54 · NFR-03, 11 |
| `/booking/cancel` | แขกยกเลิกด้วยรหัสและเบอร์ | FR-24, 26 |
| `/login` · `/register` | เข้าสู่ระบบ · สมัคร | FR-12, 13, 73 |
| `/account` · `/account/history` | ระดับ ยอด แต้ม นัด ยกเลิก · ประวัติ | FR-20–25, 34–36, 45 |
| `/wallet` | คอร์ส กราฟรอบเอว before/after บัตร | FR-37, 38, 40–46 |
| `/admin` | คิวรายวัน ใช้บริการเสร็จ | FR-77–80 |
| `/gift-cards` · `/shuttle` | ซื้อบัตร ตรวจยอด · รถรับส่ง | FR-30, 47–50, 53–55 |
| `/quiz` · `/mood` | แบบทดสอบ 4 ข้อ · อารมณ์ 3 แบบ | FR-67–70 · BR-50 |
| `/skin` | วิเคราะห์ผิวในเครื่อง ภาพจำลอง | FR-74–76 · NFR-09 |
| `/tour` | ทัวร์ 360° | FR-65 · NFR-04 |
| ทุกหน้า | สลับภาษา แชต เพลง | FR-56–60, 66 · NFR-10 |

deep link จอง: `/booking?service=S02&party=2&therapist=T01&course=<id>` · ยกเลิก: `/booking/cancel?code=SJTEST10`

## 5. กฎหลัก

ละเอียดทุกตัวเลขใน `REQUIREMENTS.md` ข้อ 2 · สรุปตามโค้ด:

| เรื่อง | กฎ | รหัส | โค้ด |
|---|---|---|---|
| รอบ | เริ่ม 10:00 ทุก 30 นาที จบไม่เกิน 22:00 | BR-01, 02 | `lib/rules/slots.ts` |
| ช่วงวัน | พรุ่งนี้ถึงวันนี้ + 30 | BR-03, 04 | `lib/rules/booking-window.ts`, `lib/booking/availability.ts` |
| คิว | นักบำบัด 1 คิว พัก 0 นาที · Couple Suite 1 ห้อง | BR-05–07 | EXCLUDE ใน `db/init/01-schema.sql` |
| ประเภท | 1 SINGLE · 2 COUPLE · 3–6 GROUP · ≥7 โทรร้าน | BR-08–12 | `lib/booking/create.ts` |
| ใครก็ได้ | คะแนนปัดแล้วสูงสุด · 0 รีวิวหลังสุด · เท่ากันรหัสน้อย | FR-08, 09 | `lib/rules/assign.ts` |
| ราคา | เต็ม → % มากสุด 1 อัน → แต้ม → ค่ารถ → บัตร · ปัดลงบาทเต็ม | BR-13, 29–33 | `lib/pricing/rules.ts` |
| แต้ม | ฿100 = 1 แต้ม · 100 แต้ม = ฿50 ชุดละ 100 · ไม่เกินค่าบริการ | BR-15–20 | `lib/pricing/rules.ts` |
| ระดับ | Gold ≥ ฿10,000 (5%) · Platinum ≥ ฿30,000 (10%) คำนวณจากยอด | BR-21–24 | `tierFromSpend`, `lib/admin/complete.ts` |
| เดือนเกิด | 20% เดือนของวันนัด ปีละครั้ง กดเอง S01–S07 | BR-25–28 | `birthdayEligibility` |
| รถ | ≤5.0 ฟรี · ≤15.0 ฿300/คัน · >15.0 ไม่รับ · 4 คน/คัน · ทศนิยมไม่เกิน 1 | BR-34–38 | `shuttleFee`, `parseDistanceKm` |
| คอร์ส | 11 ครั้ง 180 วัน ดูวันนัด กันตอนจอง ตัดตอนกดเสร็จ | BR-39, 40, 45 | `courseValidOn`, `lib/admin/complete.ts` |
| Gift Card | ฿500–฿10,000 จำนวนเต็ม 365 วัน ดูวันจอง | BR-41–45 | `lib/wallet/`, `giftCardValidOn` |
| ยกเลิก | เหลืออย่างน้อย 24:00 คืนครบทุกสิทธิ์ | BR-14, FR-22 | `lib/booking/cancel.ts` |
| รีวิว | เฉลี่ยปัด 1 ตำแหน่ง ≥4.5 ผ่าน 0 รีวิวไม่ผ่าน | BR-47–49 | `lib/rules/rating.ts` |
| AI | กฎตายตัวทุกตัว | NFR-14 | `lib/rules/{mood,quiz,chat,skin}.ts` |

## 6. ข้อความ error คำต่อคำ

ทุก API ตอบ `{"error":{"code","message"}}` ตามภาษาของ request · หน้าเว็บแสดงด้วย `data-testid="error-<code>"` · 3 ภาษาอยู่ใน `src/i18n/errors.ts`

| code | HTTP | ไทย |
|---|---:|---|
| `validation` | 400 | ข้อมูลไม่ถูกต้อง |
| `unauthorized` | 401 | กรุณาเข้าสู่ระบบ |
| `forbidden` | 403 | ไม่มีสิทธิ์เข้าถึง |
| `not-found` | 404 | ไม่พบข้อมูล |
| `internal` | 500 | ระบบขัดข้อง กรุณาลองใหม่ |
| `slot-taken` | 409 | เวลานี้ถูกจองแล้ว |
| `same-day-call` | 422 | จองวันนี้ในเว็บไม่ได้ กรุณาโทร 02-123-4567 |
| `date-out-of-range` | 422 | จองได้ตั้งแต่พรุ่งนี้ถึง 30 วันข้างหน้า |
| `invalid-slot` | 422 | ไม่มีรอบเวลานี้ |
| `party-too-large-call` | 422 | จอง 7 คนขึ้นไปในเว็บไม่ได้ กรุณาโทร 02-123-4567 |
| `not-enough-therapists` | 409 | นักบำบัดที่ทำบริการนี้ว่างไม่ครบจำนวนคน |
| `therapist-cannot-perform` | 422 | นักบำบัดคนนี้ไม่ได้ทำบริการนี้ |
| `price-changed` | 409 | ราคาเปลี่ยน กรุณาดูสรุปอีกครั้ง |
| `guest-info-required` | 422 | กรุณากรอกชื่อและเบอร์โทร |
| `phone-invalid` | 422 | เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก |
| `service-not-found` | 404 | ไม่พบบริการนี้ |
| `course-required` | 422 | บริการนี้จองได้ด้วยคอร์สเท่านั้น |
| `course-not-found` | 404 | ไม่พบคอร์สนี้ |
| `course-used-up` | 409 | คอร์สนี้ใช้ครบแล้ว |
| `course-expired` | 422 | หมดอายุสำหรับวันนี้ |
| `course-one-person` | 422 | จองด้วยคอร์สได้ครั้งละ 1 คน |
| `course-login-required` | 401 | กรุณาเข้าสู่ระบบเพื่อใช้คอร์ส |
| `booking-not-found` | 404 | ไม่พบการจอง |
| `cancel-too-late` | 422 | เหลือเวลาไม่ถึง 24 ชม. ยกเลิกเองไม่ได้ กรุณาโทร 02-123-4567 |
| `booking-not-cancellable` | 409 | การจองนี้เสร็จแล้วหรือยกเลิกแล้ว |
| `points-not-enough` | 422 | แต้มไม่พอ ต้องมีอย่างน้อย 100 แต้ม |
| `points-not-multiple` | 422 | แลกแต้มได้เป็นชุดละ 100 แต้มเท่านั้น |
| `points-exceed-service` | 422 | ส่วนลดจากแต้มเกินค่าบริการ |
| `points-login-required` | 401 | กรุณาเข้าสู่ระบบเพื่อแลกแต้ม |
| `distance-required` | 422 | กรุณาเลือกโรงแรมหรือกรอกระยะทาง |
| `distance-invalid` | 422 | ระยะทางต้องไม่ติดลบ และมีทศนิยมไม่เกิน 1 ตำแหน่ง |
| `distance-too-far` | 422 | ระยะเกิน 15.0 กม. ไม่รับรถรับส่ง |
| `hotel-not-found` | 404 | ไม่พบโรงแรมนี้ |
| `giftcard-not-found` | 404 | ไม่พบ Gift Card นี้ |
| `giftcard-expired` | 422 | Gift Card หมดอายุแล้ว |
| `giftcard-empty` | 422 | Gift Card ไม่มีมูลค่าเหลือ |
| `giftcard-amount-invalid` | 422 | มูลค่าต้องเป็นจำนวนเต็ม ฿500–฿10,000 |
| `giftcard-design-invalid` | 422 | กรุณาเลือกลายกล้วยไม้ บัว หรือทอง |
| `giftcard-channel-invalid` | 422 | กรุณาเลือกส่งทาง LINE หรือ email |
| `invalid-credentials` | 401 | อีเมลหรือรหัสผ่านไม่ถูกต้อง |
| `email-taken` | 409 | อีเมลนี้สมัครแล้ว |
| `email-invalid` | 422 | รูปแบบอีเมลไม่ถูกต้อง |
| `password-too-short` | 422 | รหัสผ่านต้องมีอย่างน้อย 8 ตัว |
| `name-required` | 422 | กรุณากรอกชื่อ |
| `birth-date-invalid` | 422 | กรุณากรอกวันเกิดให้ถูกต้อง |
| `already-completed` | 409 | กดใช้บริการเสร็จไปแล้ว |
| `quiz-incomplete` | 422 | กรุณาตอบให้ครบ 4 ข้อ |
| `quiz-too-many` | 422 | แบบทดสอบมี 4 ข้อเท่านั้น |
| `quiz-invalid-answer` | 422 | คำตอบไม่ถูกต้อง |
| `mood-invalid` | 422 | ไม่มีอารมณ์นี้ในรายการ |

ข้อความอื่นคำต่อคำ: "ยังไม่มีรีวิว" · "ภาพจำลอง ผลจริงอาจต่างกัน" · "เหลือ 7 ครั้ง จาก 11 ครั้ง" · "อีก ฿17,600 ถึง Platinum" · "ลดลง 4.0 ซม." · "ใช้บริการเสร็จ" · เบอร์ร้าน 02-123-4567 · โหมด 中文 แสดงเงินเป็น "1,000 泰铢" เพราะ ฿ อยู่ในช่วงอักขระที่ NFR-07 ตรวจ

## 7. API

รายละเอียด request/response และลำดับตรวจอยู่ใน `API-CONTRACT.md` · type จริงใน `src/types/index.ts`

| Method · Path | หน้าที่ | สิทธิ์ |
|---|---|---|
| GET `/api/health` | `{"ok":true,"db":true}` · ต่อ DB ไม่ได้ 503 | ทุกคน |
| GET `/api/clock` | เวลาและช่วงจอง | ทุกคน |
| GET `/api/services` `/api/herbs` `/api/hotels` | ข้อมูลร้าน | ทุกคน |
| GET `/api/therapists?service=&minRating=` | นักบำบัด | ทุกคน |
| GET `/api/availability?service=&date=&party=&therapist=&course=` | รอบว่าง | ทุกคน |
| POST `/api/quote` | คิดราคา 5 ขั้น | ทุกคน |
| POST `/api/bookings` · GET `/api/bookings/{id}` | จอง · ดูของตัวเอง | ทุกคน · เจ้าของ |
| POST `/api/bookings/{id}/cancel` · `/api/bookings/cancel-guest` | ยกเลิก | เจ้าของ · รหัส+เบอร์ |
| POST `/api/auth/register` `/login` `/logout` | บัญชี | ทุกคน |
| GET `/api/me` `/api/me/history` `/api/me/bookings` · GET `/api/wallet` | ข้อมูลตัวเอง | สมาชิก |
| POST `/api/courses/purchase` | ซื้อคอร์ส | สมาชิก |
| POST `/api/gift-cards` · GET `/api/gift-cards/{code}` | ซื้อ · ตรวจยอด | ทุกคน |
| GET `/api/admin/schedule?date=` · POST `/api/admin/bookings/{id}/complete` | หลังร้าน | OWNER |
| POST `/api/mood` · GET,POST `/api/quiz` · POST `/api/chat` | กฎตายตัว | ทุกคน |
| POST `/api/test/reset` `/api/test/lock` | ทดสอบ | เมื่อ `ALLOW_TEST_RESET=1` ไม่งั้น 404 |

## 8. data-testid ทั้งหมด

ไล่จากโค้ดจริง · `<ค่า>` คือส่วนที่เป็นรหัส เช่น `booking-service-S01` `booking-slot-20-00` `therapist-card-T01` `admin-complete-SJTEST05` · ค่าเดียวกันทุกภาษา · error ใช้ `error-<code>`

**อื่น ๆ** (9)

`<ค่า>-<ค่า>` · `<ค่า>-distance` · `<ค่า>-hint` · `<ค่า>-hotel` · `<ค่า>-mode-distance` · `<ค่า>-mode-hotel` · `<ค่า>-picker` · `<ค่า>-rules` · `<ค่า>-toggle`

**about** (19)

`about-book-link` · `about-gallery-link` · `about-herbs-link` · `about-herbs-photo` · `about-hero` · `about-hours` · `about-interview-photo` · `about-owner-name` · `about-owner-photo` · `about-phone` · `about-promise-<ค่า>` · `about-promises` · `about-quote` · `about-quote-text` · `about-story` · `about-story-feel` · `about-story-herbs` · `about-team-link` · `about-visit`

**account** (39)

`account-admin` · `account-birth-date` · `account-birth-readonly` · `account-book` · `account-booking-<ค่า>` · `account-booking-code-<ค่า>` · `account-booking-date-<ค่า>` · `account-booking-party-<ค่า>` · `account-booking-service-<ค่า>` · `account-booking-shuttle-<ค่า>` · `account-booking-time-<ค่า>` · `account-booking-total-<ค่า>` · `account-bookings` · `account-call-<ค่า>` · `account-call-link-<ค่า>` · `account-cancel-<ค่า>` · `account-cancel-confirm-<ค่า>` · `account-cancel-done` · `account-cancel-keep-<ค่า>` · `account-cancel-panel-<ค่า>` · `account-email` · `account-history-link` · `account-lifetime-note` · `account-loading` · `account-logout` · `account-name` · `account-next-tier` · `account-no-reschedule` · `account-owner-note` · `account-page` · `account-phone` · `account-points` · `account-retry` · `account-spend` · `account-tier` · `account-title` · `account-upcoming-empty` · `account-wallet-link` · `account-whole-only-<ค่า>`

**admin** (27)

`admin-booking-<ค่า>` · `admin-complete-<ค่า>` · `admin-count` · `admin-course-<ค่า>` · `admin-customer-<ค่า>` · `admin-date` · `admin-date-label` · `admin-empty` · `admin-forbidden` · `admin-guest-<ค่า>` · `admin-loading` · `admin-login-required` · `admin-member-<ค่า>` · `admin-page` · `admin-party-<ค่า>` · `admin-pay-<ค่า>` · `admin-phone-<ค่า>` · `admin-points-<ค่า>` · `admin-result-<ค่า>` · `admin-schedule` · `admin-service-<ค่า>` · `admin-status-<ค่า>` · `admin-therapist-<ค่า>` · `admin-therapist-queue-<ค่า>` · `admin-therapists` · `admin-therapists-<ค่า>` · `admin-time-<ค่า>`

**booking** (89)

`booking-assigned-<ค่า>` · `booking-auto-assign-note` · `booking-birthday-reason` · `booking-birthday-result` · `booking-call-shop` · `booking-call-shop-link` · `booking-code` · `booking-confirm` · `booking-confirm-amount` · `booking-confirmation` · `booking-course-lock` · `booking-course-login` · `booking-course-panel` · `booking-course-remaining<ค่า>` · `booking-course-status-<ค่า>` · `booking-date` · `booking-date-chip-<ค่า>` · `booking-date-range` · `booking-discount-source` · `booking-done-guest` · `booking-done-no-cancel` · `booking-done-pickup` · `booking-done-service` · `booking-done-therapists` · `booking-done-when` · `booking-extra-<ค่า>` · `booking-extra-shuttle` · `booking-flow` · `booking-giftcard-apply` · `booking-giftcard-code` · `booking-giftcard-info` · `booking-giftcard-remove` · `booking-guest-name` · `booking-guest-note` · `booking-guest-phone` · `booking-line-discount` · `booking-line-full-price` · `booking-line-giftcard` · `booking-line-points` · `booking-line-transport` · `booking-link-account` · `booking-link-cancel` · `booking-login-link` · `booking-member-note` · `booking-no-online-payment` · `booking-no-reschedule` · `booking-party-<ค่า>` · `booking-party-max` · `booking-party-note` · `booking-pay-at-shop` · `booking-points-balance` · `booking-points-dec` · `booking-points-earned` · `booking-points-inc` · `booking-points-max` · `booking-points-none` · `booking-points-value` · `booking-progress` · `booking-quote-loading` · `booking-quote-need-input` · `booking-quote-stale` · `booking-recap` · `booking-recap-party` · `booking-recap-service` · `booking-recap-therapist` · `booking-recap-when` · `booking-retry` · `booking-same-day-call-link` · `booking-screen-1` · `booking-screen-2` · `booking-screen-3` · `booking-service-<ค่า>` · `booking-shuttle` · `booking-slot-<ค่า>` · `booking-slot-gone` · `booking-slots-empty` · `booking-slots-pick-date` · `booking-step1-hint` · `booking-step1-next` · `booking-step2-back` · `booking-step2-hint` · `booking-step2-next` · `booking-therapist-<ค่า>` · `booking-therapist-any` · `booking-therapist-rating-<ค่า>` · `booking-toggle-<ค่า>` · `booking-under24h-warning` · `booking-use-birthday` · `booking-use-course<ค่า>`

**cancel** (13)

`cancel-account-link` · `cancel-call-shop` · `cancel-code` · `cancel-form` · `cancel-phone` · `cancel-rebook` · `cancel-refund-giftcard` · `cancel-result` · `cancel-result-code` · `cancel-result-service` · `cancel-result-when` · `cancel-rule` · `cancel-submit`

**chat** (15)

`chat-booking-<ค่า>` · `chat-booking-code-<ค่า>` · `chat-close` · `chat-error` · `chat-input` · `chat-log` · `chat-message-<ค่า>` · `chat-open` · `chat-panel` · `chat-quote-<ค่า>` · `chat-quote-total-<ค่า>` · `chat-send` · `chat-suggest-<ค่า>` · `chat-typing` · `chat-welcome`

**error** (1)

`error-<code>`

**floating** (1)

`floating-book`

**footer** (3)

`footer` · `footer-link-<ค่า>` · `footer-phone`

**gallery** (6)

`gallery-book-link` · `gallery-caption-<ค่า>` · `gallery-grid` · `gallery-hero` · `gallery-item-<ค่า>` · `gallery-tour-link`

**giftcard** (34)

`giftcard-amount` · `giftcard-amount-<ค่า>` · `giftcard-buy-section` · `giftcard-channel-<ค่า>` · `giftcard-check-balance` · `giftcard-check-code` · `giftcard-check-expires` · `giftcard-check-form` · `giftcard-check-initial` · `giftcard-check-result` · `giftcard-check-section` · `giftcard-check-status` · `giftcard-check-submit` · `giftcard-design-<ค่า>` · `giftcard-form` · `giftcard-hero` · `giftcard-hero-cta` · `giftcard-message` · `giftcard-pay-total` · `giftcard-preview` · `giftcard-preview-amount` · `giftcard-recipient` · `giftcard-result` · `giftcard-result-book` · `giftcard-result-channel` · `giftcard-result-code` · `giftcard-result-design` · `giftcard-result-expires` · `giftcard-result-message` · `giftcard-result-status` · `giftcard-result-value` · `giftcard-simulated-note` · `giftcard-submit` · `giftcard-terms`

**header** (11)

`header` · `header-account` · `header-admin` · `header-book` · `header-lang-<ค่า>` · `header-login` · `header-logo` · `header-menu-toggle` · `header-nav-<ค่า>` · `header-skip-link` · `header-wallet`

**herbs** (9)

`herbs-card-<ค่า>` · `herbs-cta` · `herbs-hero` · `herbs-list` · `herbs-name-<ค่า>` · `herbs-section` · `herbs-service-<ค่า>-<ค่า>` · `herbs-services-<ค่า>` · `herbs-services-link`

**history** (14)

`history-back` · `history-book` · `history-code-<ค่า>` · `history-date-<ค่า>` · `history-empty` · `history-item-<ค่า>` · `history-list` · `history-loading` · `history-page` · `history-points-<ค่า>` · `history-retry` · `history-service-<ค่า>` · `history-title` · `history-total-<ค่า>`

**home** (35)

`home-closing` · `home-closing-book` · `home-closing-tour` · `home-gallery` · `home-gallery-<ค่า>` · `home-gallery-all` · `home-hero` · `home-hero-book` · `home-hero-dot-<ค่า>` · `home-hero-pause` · `home-hero-scroll` · `home-hero-services` · `home-hero-slide-<ค่า>` · `home-mood` · `home-package` · `home-package-link` · `home-package-price` · `home-review-<ค่า>` · `home-review-badge-<ค่า>` · `home-reviews` · `home-reviews-all` · `home-service-<ค่า>` · `home-service-price-<ค่า>` · `home-services` · `home-services-all` · `home-stat-<ค่า>` · `home-stats` · `home-story` · `home-story-about` · `home-story-herbs` · `home-team` · `home-therapist-<ค่า>` · `home-therapist-rating-<ค่า>` · `home-therapist-services-<ค่า>` · `home-therapists-all`

**lock** (2)

`lock-today` · `lock-today-submit`

**login** (5)

`login-email` · `login-form` · `login-password` · `login-submit` · `login-to-register`

**mood** (11)

`mood-<ค่า>` · `mood-book` · `mood-error` · `mood-heading` · `mood-intro` · `mood-loading` · `mood-price` · `mood-reason` · `mood-result` · `mood-section` · `mood-service-name`

**music** (3)

`music-audio` · `music-note` · `music-toggle`

**not** (1)

`not-found-home`

**package** (14)

`package-book` · `package-book-bottom` · `package-cta` · `package-duration` · `package-herbs` · `package-hero` · `package-include-<ค่า>` · `package-includes` · `package-price` · `package-rule-<ค่า>` · `package-rules` · `package-services-link` · `package-shop` · `package-shuttle-link`

**quiz** (16)

`quiz-book` · `quiz-error` · `quiz-hint` · `quiz-intro` · `quiz-load-error` · `quiz-loading` · `quiz-option-<ค่า>-<ค่า>` · `quiz-price` · `quiz-progress` · `quiz-question-<ค่า>` · `quiz-reason` · `quiz-restart` · `quiz-result` · `quiz-retry` · `quiz-service-name` · `quiz-submit`

**register** (9)

`register-birth-date` · `register-birth-note` · `register-email` · `register-form` · `register-name` · `register-password` · `register-phone` · `register-submit` · `register-to-login`

**reset** (1)

`reset-test-data`

**reviews** (17)

`reviews-card-<ค่า>` · `reviews-cta` · `reviews-cta-book` · `reviews-customer-<ค่า>` · `reviews-customers` · `reviews-hero` · `reviews-name-<ค่า>` · `reviews-note` · `reviews-quote-<ค่า>` · `reviews-rating-<ค่า>` · `reviews-sample-badge-<ค่า>` · `reviews-star-<ค่า>-<ค่า>` · `reviews-stars-<ค่า>` · `reviews-testimonial-<ค่า>` · `reviews-testimonials` · `reviews-therapists` · `reviews-therapists-link`

**service** (26)

`service-back` · `service-book-<ค่า>` · `service-buy-<ค่า>` · `service-card-<ค่า>` · `service-detail-<ค่า>` · `service-detail-page-<ค่า>` · `service-duration-<ค่า>` · `service-herb-<ค่า>-<ค่า>` · `service-herbs-<ค่า>` · `service-herbs-link` · `service-herbs-section` · `service-image-<ค่า>` · `service-includes-<ค่า>` · `service-last-slot-<ค่า>` · `service-max-party-<ค่า>` · `service-name-<ค่า>` · `service-note-<ค่า>` · `service-package-<ค่า>` · `service-price-<ค่า>` · `service-therapist-<ค่า>` · `service-therapist-book-<ค่า>` · `service-therapist-name-<ค่า>` · `service-therapist-rating-<ค่า>` · `service-therapists-<ค่า>` · `service-therapists-link` · `service-therapists-section`

**services** (7)

`services-featured` · `services-herbs-link` · `services-hero` · `services-list` · `services-more` · `services-quiz-link` · `services-treatments`

**shuttle** (19)

`shuttle-book-link` · `shuttle-calc-form` · `shuttle-calc-section` · `shuttle-calc-submit` · `shuttle-hero` · `shuttle-hero-cta` · `shuttle-hotel-distance-<ค่า>` · `shuttle-hotel-fee-<ค่า>` · `shuttle-hotel-row-<ค่า>` · `shuttle-hotels` · `shuttle-hotels-loading` · `shuttle-hotels-retry` · `shuttle-hotels-section` · `shuttle-package-link` · `shuttle-party` · `shuttle-result` · `shuttle-result-cars` · `shuttle-result-fee` · `shuttle-rules-section`

**skin** (23)

`skin-book` · `skin-brightness` · `skin-cleared` · `skin-disclaimer` · `skin-error` · `skin-file` · `skin-file-label` · `skin-herb-<ค่า>` · `skin-herbs` · `skin-intro` · `skin-preview` · `skin-preview-after` · `skin-preview-before` · `skin-preview-note` · `skin-price` · `skin-privacy-notice` · `skin-reason` · `skin-reset` · `skin-result` · `skin-service` · `skin-service-name` · `skin-status` · `skin-use-sample`

**team** (11)

`team-about-link` · `team-front` · `team-grid` · `team-group-photo` · `team-hero` · `team-link-<ค่า>` · `team-member-<ค่า>` · `team-name-<ค่า>` · `team-note-<ค่า>` · `team-therapists` · `team-title-<ค่า>`

**test** (2)

`test-now` · `test-panel`

**therapist** (9)

`therapist-book-<ค่า>` · `therapist-card-<ค่า>` · `therapist-name-<ค่า>` · `therapist-rating-<ค่า>` · `therapist-review-count-<ค่า>` · `therapist-service-<ค่า>-<ค่า>` · `therapist-services-<ค่า>` · `therapist-stars-<ค่า>` · `therapist-title-<ค่า>`

**therapists** (5)

`therapists-count` · `therapists-filter` · `therapists-filter-all` · `therapists-grid` · `therapists-hero`

**tour** (8)

`tour-angle` · `tour-book` · `tour-book-section` · `tour-hint` · `tour-intro` · `tour-rotate-left` · `tour-rotate-right` · `tour-viewport`

**wallet** (39)

`wallet-buy-confirm-panel` · `wallet-buy-course` · `wallet-buy-course-cancel` · `wallet-buy-course-confirm` · `wallet-buy-panel` · `wallet-buy-price` · `wallet-buy-success` · `wallet-course-<ค่า>` · `wallet-course-book-<ค่า>` · `wallet-course-expired-<ค่า>` · `wallet-course-expires-<ค่า>` · `wallet-course-remaining-<ค่า>` · `wallet-course-reserved-<ค่า>` · `wallet-course-used-<ค่า>` · `wallet-course-used-up-<ค่า>` · `wallet-courses` · `wallet-courses-empty` · `wallet-giftcard-<ค่า>` · `wallet-giftcard-balance-<ค่า>` · `wallet-giftcard-code-<ค่า>` · `wallet-giftcard-expired-<ค่า>` · `wallet-giftcard-expires-<ค่า>` · `wallet-giftcard-initial-<ค่า>` · `wallet-giftcard-no-balance-<ค่า>` · `wallet-giftcards` · `wallet-giftcards-buy` · `wallet-giftcards-empty` · `wallet-history-link` · `wallet-loading` · `wallet-page` · `wallet-photo-<ค่า>` · `wallet-photo-badge-<ค่า>` · `wallet-photos` · `wallet-results` · `wallet-waist` · `wallet-waist-chart` · `wallet-waist-point-<ค่า>` · `wallet-waist-range` · `wallet-waist-reduced`

## 9. สมมติฐานที่ใช้

ใช้ A-xx, D-xx, TD-xx ตามที่เขียนในเอกสาร · จุดที่เอกสารชนกันตัดสินตามคำสั่งงาน: `ALLOW_TEST_RESET` แทน `TEST_MODE` · `cust-*.jpg` ขึ้นเฉพาะส่วนรีวิวพร้อมป้าย "ลูกค้าตัวอย่าง" · หน้าจอง 3 หน้าจอ · seed 12 บัญชี · ตำแหน่ง 3 ภาษา · อารมณ์ 3 แบบ · `mood-glow.jpg` ใช้ที่หน้าวิเคราะห์ผิว
รายละเอียดการต่องานอยู่ใน `CONTRACT-NOTES/`

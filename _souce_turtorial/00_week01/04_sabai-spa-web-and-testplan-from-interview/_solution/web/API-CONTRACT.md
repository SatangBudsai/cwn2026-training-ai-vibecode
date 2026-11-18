# API Contract · สบายใจ สปา

สัญญากลางที่ทั้ง 13 subagent ยึด · type จริงอยู่ที่ `src/types/index.ts` (ชื่อในตารางคือชื่อ type นั้น)
สัญญาขาดให้จดใน `CONTRACT-NOTES/<ชื่อ>.md` แล้วทำต่อตามสมมติฐานนั้น · ห้ามแก้ไฟล์นี้

## 1. ข้อตกลงทั่วไป

- เงินทุกตัวใน API เป็น**บาทเต็ม** (`number`) · ฐานข้อมูลเป็น `NUMERIC` เป็น string ใช้ `lib/money.ts`
- ระยะเป็น **string** (`"5.0"`) ตรวจจากข้อความ `"5.05"` ต้อง ✗ ห้ามปัด (ถ้าส่ง number ให้ `String()` ก่อน)
- วันที่ `YYYY-MM-DD` · เวลา `HH:MM` ตาม Asia/Bangkok · เขตเวลาอื่นไม่มีในระบบ
- "ตอนนี้" อ่านจาก `getNow()` / `getToday()` ใน `lib/clock.ts` เท่านั้น · helper ใน `lib/date.ts`
- ภาษาของ request: header `x-locale` → `?locale=` → `Accept-Language` → `th` (`api()` ใน `lib/api-client.ts` ใส่ให้)
- Error: `{"error":{"code":"slot-taken","message":"เวลานี้ถูกจองแล้ว"}}` · แคตตาล็อกอยู่ที่ `src/i18n/errors.ts` (มี 3 ภาษาและ status ครบ)
  `throw new ApiError('slot-taken')` · code ใหม่ที่ไม่อยู่ในแคตตาล็อก: `new ApiError('my-code', 422, {th,en,zh})` แล้วจดใน CONTRACT-NOTES
- ทุก route: `export const dynamic = 'force-dynamic'` และครอบด้วย `withApi` จาก `lib/errors.ts` · ส่งกลับด้วย `json(data, status)` · อ่าน body ด้วย `readJson`
- หน้าเว็บแสดง error ด้วย `<ErrorMessage code message />` จึงได้ `data-testid="error-<code>"`
- `23P01` ถูกแปลงเป็น 409 `slot-taken` อัตโนมัติ
- Transaction: `withTransaction` จาก `lib/db.ts` · ลำดับล็อก `users → course_purchases → gift_cards`
- UUID คงที่ใน seed: U01–U12 = `00000000-0000-0000-0000-000000000101`…`112` · B01–B19 = `…0201`…`219` · C01–C06 = `…0301`…`306`

## 2. API ทุกเส้น

### 2.1 ข้อมูลร้าน (A5)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `GET /api/services` | — | `ServicesResponse` 9 รายการตาม sort_order | — |
| `GET /api/herbs` | — | `HerbsResponse` 12 ชนิด | — |
| `GET /api/therapists` | `?service=S07` `?minRating=4.5` | `TherapistsResponse` · มี minRating เรียงคะแนนมากไปน้อย (E222: T01,T05,T02) · ไม่มีเรียงตามรหัส (E237: T04,T05) | — |
| `GET /api/hotels` | — | `HotelsResponse` 6 แห่ง | — |
| `GET /api/clock` (หัวหน้า) | — | `ClockResponse` | — |
| `GET /api/health` (หัวหน้า) | — | `{"ok":true,"db":true}` · ต่อ DB ไม่ได้ 503 `{"ok":false,"db":false}` | — |

### 2.2 รอบว่างและการจอง (A1)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `GET /api/availability` | `?service=S01&date=2026-06-17&party=1[&therapist=T01][&course=<id>]` | `AvailabilityResponse` · `slots` มีเฉพาะรอบที่จองได้จริง | `service-not-found` · `same-day-call` (วันนี้ หรือก่อนหน้า) · `date-out-of-range` (เกิน +30) · `party-too-large-call` (≥7) · `course-*` |
| `POST /api/bookings` | `CreateBookingRequest` | 201 `CreateBookingResponse` | ด้านล่าง |
| `GET /api/bookings/{id}` | เจ้าของหรือ OWNER เท่านั้น | `GetBookingResponse` | 401 `unauthorized` · คนอื่น 404 `booking-not-found` (NFR-12, E252) |
| `POST /api/bookings/{id}/cancel` | เจ้าของ | `CancelResponse` | `unauthorized` · `booking-not-found` · `booking-not-cancellable` · `cancel-too-late` |
| `POST /api/bookings/cancel-guest` | `CancelGuestRequest` | `CancelResponse` | `booking-not-found` (รหัสหรือเบอร์ไม่ตรง หรือเป็นการจองของสมาชิก · E80) · `booking-not-cancellable` · `cancel-too-late` |

ลำดับตรวจของ `POST /api/bookings` และ error ที่ใช้:

1. จำนวนคน: ≥7 `party-too-large-call` · <1 `validation`
2. บริการ `service-not-found` · K01 ไม่มีคอร์ส `course-required` · ไม่เข้าสู่ระบบแต่ใช้คอร์ส `course-login-required` · คอร์ส 2 คน `course-one-person`
3. วันที่: ≤วันนี้ `same-day-call` · >วันนี้+30 `date-out-of-range`
4. รอบ: ไม่ใช่ :00/:30, ก่อน 10:00, จบเกิน 22:00 → `invalid-slot`
5. จำนวนคนเกินคนที่ทำบริการได้ทั้งหมด (BR-11, BR-12) → 409 `not-enough-therapists`
6. แขกไม่กรอกชื่อ/เบอร์ `guest-info-required` · เบอร์ผิด `phone-invalid`
7. `loadAndQuote` (forUpdate): ผิดกฎราคา แต้ม รถ บัตร คอร์ส → error ของขั้นนั้น
8. `expectedPayAtShop` ไม่ตรง → 409 `price-changed`
9. จัดคน:
   - เลือกคนเอง: ทำบริการไม่ได้ `therapist-cannot-perform` · ไม่ว่างหรือชน → 409 `slot-taken` ทันที
   - ใครก็ได้ 1 คน: ไม่มีใครว่าง → 409 `slot-taken`
   - คู่: Couple Suite ไม่ว่าง → 409 `slot-taken` · ห้องว่างแต่คนไม่พอ → 409 `not-enough-therapists`
   - กลุ่ม: คนไม่พอ → 409 `not-enough-therapists`
   - ระบบจัดคนแล้วชน `23P01` → ลองใหม่ใน transaction ใหม่ไม่เกิน 3 ครั้ง (D-29)
10. INSERT และหักสิทธิ์ทุกอย่างใน transaction เดียว (แต้ม −, บัตร −, reserved +1, สิทธิ์เดือนเกิด)

ประเภทการจอง: 1 คน `SINGLE` · 2 คน `COUPLE` + Couple Suite เสมอ รวม P01 (D-01, TD-16) · 3–6 คน `GROUP` ไม่จำกัดห้อง
คู่และกลุ่มระบบจัดคนให้เสมอ · `therapistId` มีผลเฉพาะ 1 คน
OWNER ที่จองผ่านหน้าเว็บ นับเป็นแขก (`userId=null`) ต้องกรอกชื่อและเบอร์
ลำดับจัดคน: คะแนนปัดแล้วมากไปน้อย · 0 รีวิวหลังสุด · เท่ากันรหัสน้อยกว่า (FR-08, FR-09)

### 2.3 ราคา (A2)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `POST /api/quote` | `QuoteRequest` | `QuoteResponse` | `service-not-found` · `party-too-large-call` · `not-enough-therapists` (เกินจำนวนคนที่ทำได้) · `same-day-call` · `date-out-of-range` · `course-*` · `points-*` · `distance-*` · `hotel-not-found` · `giftcard-*` |

กฎที่ต้องทำใน `loadAndQuote`:
- เลือกเดือนเกิดแต่ไม่เข้าเงื่อนไข **ไม่ error** ราคาใช้ % ถัดไป (E116, E119, E123, E124) และบอกผลใน `birthday`
- `birthday.offered` เป็น false เมื่อแขก หรือ P01, K01 (E130, E131)
- 99 แต้มขอแลก → `points-not-enough` · 150 แต้ม → `points-not-multiple` · เกินยอดหลัง % → `points-exceed-service` (E102) · แขกแลก → `points-login-required`
- P01 ไม่ส่ง `shuttle` → `distance-required` · `shuttle` ส่งมาแต่ไม่มีทั้ง hotelId และ distanceKm → `distance-required` · ส่งทั้งคู่ให้ใช้ hotelId
- บัตร: ไม่พบ `giftcard-not-found` · หมดอายุตามวันนี้ `giftcard-expired` · ยอด 0 `giftcard-empty` · ตรวจวันจองไม่ใช่วันนัด (E208)
- คอร์ส: ไม่พบหรือไม่ใช่ของตน `course-not-found` · เหลือ 0 `course-used-up` · วันนัดเกินอายุ `course-expired` (BR-40) · ตรวจ used-up ก่อน expired
- จองด้วยคอร์สขอรถได้ คิดค่ารถปกติ ใช้บัตรจ่ายได้ (D-09, E164) · บริการ K01 ไม่มีคอร์สใน quote → `course-required`
- ฟังก์ชันล้วน `quote()` ไม่ตรวจจำนวนคนเอง (E66)

### 2.4 บัญชี (A3)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `POST /api/auth/register` | `RegisterRequest` | 201 `AuthResponse` + cookie | `email-invalid` · `email-taken` · `password-too-short` · `name-required` · `phone-invalid` · `birth-date-invalid` |
| `POST /api/auth/login` | `LoginRequest` | `AuthResponse` + cookie | `invalid-credentials` |
| `POST /api/auth/logout` | — | `{"ok":true}` | — |
| `GET /api/me` | — | `MeResponse` | 401 |
| `GET /api/me/history` | — | `HistoryResponse` COMPLETED เรียงจากล่าสุด | 401 |
| `GET /api/me/bookings` | — | `MyBookingsResponse` CONFIRMED เรียงตามวันนัด | 401 |

### 2.5 Wallet คอร์ส Gift Card (A4)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `GET /api/wallet` | — | `WalletResponse` ของตัวเองเท่านั้น | 401 |
| `POST /api/courses/purchase` | `{}` · ซื้อ K01 ฿15,000 ไม่มี % เปิดใช้ทันที ยอดสะสมไม่เพิ่ม | 201 `PurchaseCourseResponse` | 401 (ต้องเป็นสมาชิก D-08) |
| `POST /api/gift-cards` | `CreateGiftCardRequest` · แขกซื้อได้ | 201 `CreateGiftCardResponse` | `giftcard-amount-invalid` · `giftcard-design-invalid` · `giftcard-channel-invalid` |
| `GET /api/gift-cards/{code}` | — ใครมีรหัสก็ดูได้ (TD-12) | `GetGiftCardResponse` | `giftcard-not-found` |

`file_path` ของรูปเก็บเป็น `public/placeholder/…` ตาม TEST-DATA · API ตัด `public` ออกเป็น URL `/placeholder/…`

### 2.6 หลังร้าน (A4)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `GET /api/admin/schedule` | `?date=2026-06-15` · ไม่ส่งใช้วันนี้ | `AdminScheduleResponse` | 401 · 403 |
| `POST /api/admin/bookings/{id}/complete` | — · กดก่อนเวลานัดได้ (D-04) | `CompleteBookingResponse` | 401 · 403 · `booking-not-found` · 409 `already-completed` |

### 2.7 ตัวช่วยแบบกฎตายตัว (A5)

| Method · Path | Request | Response | Error |
|---|---|---|---|
| `POST /api/mood` | `MoodRequest` · tired→S02, stress→S04, achy→S03 เท่านั้น | `MoodResponse` | `mood-invalid` |
| `GET /api/quiz` | — | `QuizQuestionsResponse` 4 ข้อพอดี | — |
| `POST /api/quiz` | `QuizRequest` | `QuizResponse` 1 รายการจาก S01–S07, P01 | `quiz-incomplete` (<4) · `quiz-too-many` (>4) · `quiz-invalid-answer` |
| `POST /api/chat` | `ChatRequest` | `ChatResponse` | `validation` |

แชต: ตอบเวลาเปิดและราคาตาม §1 ตามภาษาที่ถาม (FR-58) · ตอบไม่ได้ใช้ข้อความตายตัวพร้อม 02-123-4567 (FR-59) · จองตาม D-17: รับเฉพาะบริการ วันเวลา จำนวนคน ชื่อกับเบอร์ เรียก `loadAndQuote` + `createBooking` · ถ้าเข้าสู่ระบบอยู่ใช้ส่วนลดระดับอัตโนมัติ
ถามเหมือนเดิม + state เดิม ต้องตอบเหมือนเดิมทุกตัวอักษร (NFR-14) · ห้ามเรียกบริการภายนอก

### 2.8 ทดสอบ (A5) · เปิดเมื่อ `ALLOW_TEST_RESET=1` เท่านั้น ไม่งั้นตอบ 404 `not-found`

| Method · Path | Request | Response | ทำอะไร |
|---|---|---|---|
| `POST /api/test/reset` | `TestResetRequest` · ไม่ส่ง now ใช้ `2026-06-15T10:00:00+07:00` | `TestOkResponse` | `SELECT sabai_seed($1)` ล้างทุกตารางกลับเป็น seed และล็อกวันนี้ |
| `POST /api/test/lock` | `TestLockRequest` | `TestOkResponse` | ล็อกอย่างเดียวตาม D-24: อัปเดต `locked_now`, เดือนเกิดของ U02, U05 (คงปีและวันที่ 1), `benefit_year` ของแถว R01 (U05, booking_id NULL) · ไม่แตะคอร์สและบัตร |

`now` ไม่ใช่ ISO ที่ parse ได้ → 400 `validation`

## 3. signature ที่ข้ามเจ้าของ (stub มีแล้ว · เจ้าของเติม body โดยคงชื่อและ signature)

| ไฟล์ | เจ้าของ | ผู้เรียก |
|---|---|---|
| `lib/pricing/rules.ts`: `quote` `pointsEarned` `loyaltyBase` `roundDownBaht` `tierFromSpend` `nextTier` `parseDistanceKm` `shuttleFee` `birthdayEligibility` `courseValidOn` `giftCardValidOn` | A2 | A1, A3, A4, A5 |
| `lib/pricing/quote.ts`: `loadAndQuote` | A2 | `/api/quote`, A1, A5 |
| `lib/booking/create.ts`: `createBooking` | A1 | `/api/bookings`, A5 แชต |
| `lib/booking/read.ts`: `getBookingDetail` `listBookingsForUser` | A1 | A3, A4 |
| `lib/rules/rating.ts`: `averageRating` `roundAverage` `passesRatingFilter` | A5 | A1 |
| `lib/catalog/index.ts`: `listServices` `getService` `listHerbs` `listTherapists` `listHotels` | A5 | F1, F2, F3, F4, A1 |
| `components/widgets/{ChatWidget,MusicToggle,MoodPicker}.tsx` | F8 | layout, F1 |
| `components/shuttle/ShuttlePicker.tsx` | F7 | F4 |

## 4. ข้อความคำต่อคำ

"เวลานี้ถูกจองแล้ว" · "คอร์สนี้ใช้ครบแล้ว" · "หมดอายุสำหรับวันนี้" · "ไม่พบการจอง" · "ยังไม่มีรีวิว" · "ภาพจำลอง ผลจริงอาจต่างกัน" · "เหลือ 7 ครั้ง จาก 11 ครั้ง" (รูปแบบ `เหลือ {n} ครั้ง จาก {total} ครั้ง`) · "อีก ฿17,600 ถึง Platinum" (รูปแบบ `อีก ฿{gap} ถึง {tier}`) · "ลดลง 4.0 ซม." · เบอร์ร้าน 02-123-4567 · ปุ่ม "ใช้บริการเสร็จ"

ข้อความภาษาไทยตามนี้ · ภาษาอังกฤษและจีนแปลให้ความหมายเดียวกัน · โหมด 中文 ห้ามเหลือตัวอักษรไทย (NFR-07) รวมถึงชื่อคน ชื่อบริการ และป้ายทุกจุด

## 5. หน้าเว็บ และ deep link

| Path (`/{locale}…`) | เจ้าของ | query |
|---|---|---|
| `` (หน้าแรก) | F1 | |
| `/services` · `/services/{id}` · `/herbs` · `/packages/bangkok-relax` | F2 | |
| `/therapists` · `/team` · `/reviews` · `/gallery` · `/about` | F3 | `/therapists?filter=4.5` |
| `/booking` · `/booking/cancel` | F4 | `/booking?service=S02&party=2&therapist=T01&course=<id>` ทุกตัวไม่บังคับ |
| `/login` · `/register` · `/account` · `/account/history` | F5 | `/login?next=/th/wallet` |
| `/wallet` · `/admin` | F6 | |
| `/gift-cards` · `/shuttle` | F7 | |
| `/quiz` · `/mood` · `/skin` · `/tour` | F8 | |

ทุกหน้าที่อ่าน DB: `export const dynamic = 'force-dynamic'` · props หน้าใช้ `LocalePageProps` จาก `@/types` และ `parseLocale`

## 6. data-testid

ทุกปุ่ม ช่องกรอก ลิงก์ ผลลัพธ์ และข้อความ error ต้องมี · kebab-case · ค่าเดียวกันทุกภาษา · ห้ามซ้ำในหน้าเดียว · ทุกปุ่มมีชื่อที่อ่านได้
ตัวที่มีรหัสใช้ pattern เช่น `booking-service-S01` `booking-slot-20-00` `therapist-card-T01` · error ใช้ `error-<code>`

| เจ้าของ | prefix |
|---|---|
| หัวหน้า (layout) | `header-` `footer-` `floating-book` `test-` `reset-test-data` `lock-today` `lock-today-submit` |
| F1 | `home-` |
| F2 | `services-` `service-` `herbs-` `package-` |
| F3 | `therapists-` `therapist-` `team-` `reviews-` `gallery-` `about-` |
| F4 | `booking-` `cancel-` |
| F5 | `login-` `register-` `account-` `history-` |
| F6 | `wallet-` `admin-` |
| F7 | `giftcard-` `shuttle-` (F4 ส่ง `testIdPrefix="booking-shuttle"`) |
| F8 | `chat-` `quiz-` `mood-` `skin-` `tour-` `music-` |

## 7. ตารางเจ้าของไฟล์

ไฟล์กลาง**ของหัวหน้า ห้ามแก้**: `package.json` `package-lock.json` `next.config.ts` `tsconfig.json` `vitest.config.ts` `Dockerfile` `docker-compose.yml` `API-CONTRACT.md` `db/` `public/` `src/types/` `src/lib/{db,clock,date,env,errors,session,money,format,api-client}.ts` `src/i18n/{locales,common,errors,index,use-locale}.ts` `src/components/ui/` `src/components/layout/` `src/content/` `src/app/globals.css` `src/app/icon.svg` `src/app/[locale]/{layout,template,not-found}.tsx` `src/app/[locale]/[...rest]/` `src/app/api/{health,clock}/`

| ชื่อ | หน้า (ใต้ `src/app/[locale]/`) | route (ใต้ `src/app/api/`) | lib และ component | i18n |
|---|---|---|---|---|
| A1 | — | `availability/` `bookings/` `bookings/[id]/` `bookings/[id]/cancel/` `bookings/cancel-guest/` | `lib/booking/*` `lib/rules/slots.ts` `lib/rules/assign.ts` + test | `a1.ts` |
| A2 | — | `quote/` | `lib/pricing/*` + test | `a2.ts` |
| A3 | — | `auth/register/` `auth/login/` `auth/logout/` `me/` `me/history/` `me/bookings/` | `lib/account/*` + test | `a3.ts` |
| A4 | — | `wallet/` `courses/purchase/` `gift-cards/` `gift-cards/[code]/` `admin/schedule/` `admin/bookings/[id]/complete/` | `lib/wallet/*` `lib/admin/*` + test | `a4.ts` |
| A5 | — | `services/` `herbs/` `therapists/` `hotels/` `chat/` `mood/` `quiz/` `test/reset/` `test/lock/` | `lib/catalog/*` `lib/rules/{rating,mood,quiz,chat}.ts` `lib/chat/*` `lib/test-tools/*` + test | `a5.ts` |
| F1 | `page.tsx` | — | `components/home/*` | `f1.ts` |
| F2 | `services/` `herbs/` `packages/` | — | `components/services/*` | `f2.ts` |
| F3 | `therapists/` `team/` `reviews/` `gallery/` `about/` | — | `components/people/*` | `f3.ts` |
| F4 | `booking/` | — | `components/booking/*` | `f4.ts` |
| F5 | `login/` `register/` `account/` | — | `components/account/*` | `f5.ts` |
| F6 | `wallet/` `admin/` | — | `components/wallet/*` `components/admin/*` | `f6.ts` |
| F7 | `gift-cards/` `shuttle/` | — | `components/giftcard/*` `components/shuttle/*` | `f7.ts` |
| F8 | `quiz/` `mood/` `skin/` `tour/` | — | `components/widgets/*` `components/quiz/*` `components/skin/*` `components/tour/*` `lib/rules/skin.ts` | `f8.ts` |

## 8. รูปตามเจ้าของ (ทุกรูปใน `public/brand/` ควรได้ใช้ · ใช้ `SmartImage` พร้อม `sizes` เสมอ · ห้ามรูปจากเน็ต ห้ามการ์ตูน)

| รูป | ใครเป็นหลัก |
|---|---|
| `shop/hero-dusk` `hero-ritual` `hero-room` | F1 hero |
| `shop/exterior-day` `lobby` `couple-suite` `foot-lounge` `garden-sala` `herb-bar` `herbal-steam` `welcome-tea` | F1 masonry · F3 gallery |
| `people/owner-chan` `shop/owner-herbs` `shop/owner-interview` | F1 เรื่องราว · F3 about |
| `shop/team-group` | F1 · F3 team |
| `people/staff-t0X-*` (T01–T06 ตามรหัส ใช้ `Therapist.photoPath`) | F1 · F3 · F4 |
| `people/staff-bua` น้องบัว พนักงานต้อนรับ | F3 team (ไม่อยู่ในรายชื่อจอง) |
| `people/cust-*` ผ่าน `content/testimonials.ts` เท่านั้น พร้อมป้าย `common.sampleCustomer` | F1 · F3 reviews |
| `services/svc-*` (`Service.imagePath`) | F2 · F4 |
| `herbs/herb-*` (`Herb.imagePath`) | F2 |
| `giftcard/gc-*` | F7 · F6 wallet |
| `misc/mood-tired` `mood-stress` `mood-achy` | F8 MoodPicker |
| `misc/mood-glow` `misc/skin-sample` | F8 skin |
| `misc/login-side` | F5 |
| `misc/empty-state` | F5 F6 สถานะว่าง |
| `misc/review-bg` | F3 reviews |
| `shop/pano-couple` | F8 ทัวร์ 360° |
| `/placeholder/nida-*-body.jpg` พร้อมป้าย `common.placeholderBadge` | F6 |
| `/audio/spa-ambient-placeholder.wav` พร้อมป้ายชั่วคราว | F8 |

## 9. ส่วนประกอบกลางที่ใช้ได้ทันที

`@/components/ui`: `Button` `LinkButton` (บังคับ `testId`) · `Card` · `Section` · `Reveal` · `Parallax` · `Counter` · `SmartImage` · `ErrorMessage` · `ThaiPattern`
`@/lib/format`: `formatBaht` `formatDate` · `@/i18n/locales`: `defineMessages` `format` `pick` `parseLocale` · `@/i18n/use-locale`: `useLocale`
CSS: ใช้ CSS Modules ของตัวเอง (`*.module.css`) กับ token ใน `src/app/globals.css` (`--c-forest-*` `--c-cream-*` `--c-gold-*` `--c-teak-*` `--font-display` `--font-body` `--shadow-card` `--radius-*` `--gutter` `--section-gap`) · class กลาง `container` `eyebrow` `input` `select` `textarea` `field` `badge` · ไม่ใช้ไลบรารีภายนอก · มือถือ 375px ห้ามเลื่อนข้าง

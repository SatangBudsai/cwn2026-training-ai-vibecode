# __PROJECT_TITLE__ (`__PROJECT__`)

ลูกค้า: __CLIENT__ · ขึ้นโครงด้วย skill `project-scaffold` (dev-mew) เมื่อ __DATE__

Modular monolith: Next.js 15 (App Router) + TypeScript strict + PostgreSQL 16 (Prisma) + Redis/BullMQ

## เริ่มใช้

```bash
cp .env.example .env          # ใส่ค่าจริง
npm install
npx prisma migrate dev --name init
npm run dev                   # เว็บ + API
npm run worker                # worker คิว (แยก process)
npm test                      # unit test (Vitest)
npm run test:e2e              # E2E (Playwright) — dev server ตั้ง ACCESS_TOKEN_TTL_SEC=5
```

## โมดูล (`src/modules/<module>/` — import ข้ามโมดูลผ่าน `index.ts` เท่านั้น)

| โมดูล | หน้าที่ |
|---|---|
| `auth` | สมัคร, login, refresh (หมุนทุกครั้ง + reuse detection), logout · access token 15 นาที |
| `member` | โปรไฟล์, ระดับสมาชิก, consent PDPA พร้อมเวอร์ชัน (`CURRENT_CONSENT_VERSION`) |
| `payment` | checkout → ThaiPay GW, webhook (HMAC + idempotent), สถานะ `pending → paid → refunded`, คืนเงิน |
| `notification` | อีเมล/SMS/LINE ผ่านคิว `notification.requested` |
| `audit` | บันทึกใคร ทำอะไร เมื่อไร (ตัดข้อมูลอ่อนไหวออกก่อน) |

## API

| method | path | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` · `/api/auth/refresh` · `/api/auth/logout` | public (refresh ใช้ cookie) |
| POST | `/api/payment/checkout` | member |
| POST | `/api/payment/webhook` | ThaiPay GW (ตรวจลายเซ็น `x-thaipay-signature`) |
| GET | `/api/payment/orders/:orderId` | public — ตอบแค่สถานะ ใช้ในหน้า callback |
| GET | `/healthz` · `/readyz` | public |

## กันบั๊กเดิม (ห้ามถอด)

- **token หมดกลางจ่ายเงิน (ShopDee 2025):** access 15 นาที · refresh หมุนทุกครั้ง · client refresh ก่อนหมด 60 วินาที และก่อน redirect ไป gateway (`goToGateway`) · หน้า `/payment/callback` อ่านผลจาก `order_id` ไม่ใช้ session · E2E `checkout.spec.ts` ตั้ง access 5 วินาทีแล้วต้องเห็น "ชำระเงินสำเร็จ"
- **webhook ซ้ำ (BaanRai 2026):** ตาราง `payment.payment_events` (event_id unique) insert ก่อน · ตรวจ HMAC-SHA256 ก่อนทุกอย่าง · งานหนักโยนเข้าคิว `payment.paid`

## ยังต้องทำตาม spec (TODO)

__TODOS__

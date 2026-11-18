# PawPantry 🐾 ร้านอาหารแมวและสุนัข (เว็บสำหรับฝึก Playwright)

เว็บ Next.js 16 ภาษาไทย ใช้เป็นเป้าหมายในการฝึกเขียนเทสต์

## เปิดเว็บด้วย Docker

```bash
cd petshop
docker compose up -d --build
```

จากนั้นเปิด http://localhost:3000 แล้วรอให้สถานะ container เป็น `healthy` (`docker ps`)

ปิดเว็บ: `docker compose down`

## รีเซ็ตข้อมูลก่อนรันเทสต์

ข้อมูลทั้งหมดเก็บในหน่วยความจำ ถ้าต้องการล้างผู้ใช้ คำสั่งซื้อ และสต็อกให้กลับเป็นค่าเริ่มต้น ให้เรียก

```bash
curl -X POST http://localhost:3000/api/test/reset
```

ใช้ได้เฉพาะเมื่อ `ALLOW_TEST_RESET=1` (ตั้งไว้แล้วใน `docker-compose.yml`) และเลขคำสั่งซื้อจะเริ่มที่ `PP-100001` ใหม่
ส่วนตะกร้าและรายการโปรดเก็บใน localStorage ของเบราว์เซอร์ จึงไม่ถูกรีเซ็ตด้วยคำสั่งนี้

## บัญชีทดลอง

| อีเมล | รหัสผ่าน | ชื่อ |
|---|---|---|
| `demo@pawpantry.test` | `Paw12345` | สมใจ ใจดี |

## คูปองสำหรับทดสอบ

| โค้ด | ผล |
|---|---|
| `PAW10` | ลด 10% |
| `FREESHIP` | ส่งฟรี |
| `NEWCAT50` | ลด ฿50 เมื่อซื้ออาหารแมวครบ ฿500 |
| `SUMMER20` | หมดอายุแล้ว |

## รูปภาพ

วางรูปไว้ที่ `public/images/products/<slug>.jpg` และ `public/images/brand/*` ถ้าไม่มีไฟล์ เว็บจะแสดงกรอบไล่สีพร้อมอีโมจิแทน
เพิ่มหรือเปลี่ยนรูปแล้วต้องสั่ง `docker compose up -d --build` ใหม่

## รันแบบไม่ใช้ Docker (สำหรับนักพัฒนา)

```bash
npm install
npm run dev     # http://localhost:3000
```

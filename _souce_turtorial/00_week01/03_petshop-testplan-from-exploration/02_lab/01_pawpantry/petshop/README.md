# PawPantry 🐾 ร้านอาหารแมวและสุนัข (เว็บสำหรับฝึกทดสอบ)

เว็บ Next.js 16 ภาษาไทย ใช้เป็นระบบที่ต้องทดสอบในบทนี้ ยังไม่มีเอกสารข้อกำหนด (spec) ให้ ต้องสำรวจเว็บเอง แล้วสรุปเป็นแผนการทดสอบ

## เปิดเว็บด้วย Docker

```bash
cd petshop
docker compose up -d --build
```

จากนั้นเปิด http://localhost:3000 แล้วรอให้สถานะ container เป็น `healthy` (`docker ps`)

ปิดเว็บ: `docker compose down`

## รีเซ็ตข้อมูลก่อนทดสอบ

ข้อมูลทั้งหมดเก็บในหน่วยความจำ ถ้าต้องการล้างผู้ใช้ คำสั่งซื้อ และสต็อกให้กลับเป็นค่าเริ่มต้น ให้เรียก

```bash
curl -X POST http://localhost:3000/api/test/reset
```

ใช้ได้เฉพาะเมื่อ `ALLOW_TEST_RESET=1` (ตั้งไว้แล้วใน `docker-compose.yml`)
ส่วนตะกร้าและรายการโปรดเก็บใน localStorage ของเบราว์เซอร์ จึงไม่ถูกรีเซ็ตด้วยคำสั่งนี้

ข้อมูลทดสอบที่ใช้ได้ (บัญชี คูปอง ค่าส่ง) อยู่ใน [`../TEST-DATA.md`](../TEST-DATA.md)

## รันแบบไม่ใช้ Docker (สำหรับนักพัฒนา)

```bash
npm install
npm run dev     # http://localhost:3000
```

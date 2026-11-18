| TC | อาการ | คาดหวัง | ไฟล์ที่แก้ |
|---|---|---|---|
| TC-PRD-03 | สินค้าสต็อก 3 กด + 5 ครั้ง ช่องจำนวนไปหยุดที่ 4 (เกินสต็อก 1 ชิ้น เพราะ clamp ใช้ `stock + 1`) | หยุดที่ 3 | petshop/components/ProductDetail.tsx |
| TC-CPN-01 | PAW10 กับยอด ฿799 ลด ฿80 (ใช้ `Math.round` ปัดขึ้น 79.9) ยอดรวม ฿769 | ลด ฿79 → ยอดรวม ฿770 | petshop/lib/pricing.ts |
| TC-AUTH-03 | รหัสผ่านอ่อน + ยืนยันไม่ตรงกัน แสดง error เฉพาะรหัสผ่าน ไม่มี error ช่องยืนยันรหัส (`else if` ข้ามการตรวจ confirm) | error ทั้งรหัสผ่านและยืนยันรหัสพร้อมกัน | petshop/lib/validation.ts |

# T1 — ข้อกำหนดและข้อตกลงการเชื่อมต่อ

ห้าฟีเจอร์: แสดงห้อง ดูเวลาว่าง จอง ยกเลิก และสถานะ ต้องเข้าถึงจากหน้าแรกไม่เกินสองคลิก
หน้าเดียวแสดง rooms, availability, booking-form, bookings และ message; input: date, room, start, end, title
ฟังก์ชัน JavaScript: renderRooms(), renderAvailability(), renderBookings(), bookRoom(), cancelBooking(id)
ข้อมูล Room: id,name,capacity; Booking: id,room,date,start,end,title,status
ห้องตัวอย่าง RIVER, GARDEN, STUDIO; วันตั้งต้น 2026-09-17; ช่วงเวลาแบบ 24 ชั่วโมง
ตัวอย่างนัดเริ่มต้น: RIVER 10:00–11:00 ชื่อ ประชุมตัวอย่าง สถานะ ยืนยันแล้ว
status ใช้ ยืนยันแล้ว / ยกเลิกแล้ว; กติกาตรวจเวลาซ้อน: start < existing.end และ end > existing.start
ปุ่ม ดูเวลาว่าง ใช้ data-room และคลาส availability-button; ปุ่มยกเลิกใช้ data-id
ทดสอบสร้างนัด GARDEN 13:00–14:00 ชื่อ Dynamic test แล้วดูสถานะ ยกเลิก และตรวจเวลาว่าง
สิ่งที่สมมติ: ชื่อห้อง ความจุ วันและนัดเริ่มต้นเป็นข้อมูลสาธิต ข้อมูลอยู่ในหน่วยความจำ รีเฟรชแล้วเริ่มใหม่

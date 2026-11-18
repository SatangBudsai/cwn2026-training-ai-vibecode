/**
 * จุดรวมการเชื่อมฐานข้อมูล
 * โครงเริ่มต้นใช้ repository แบบ in-memory (อยู่ใน repository.ts ของแต่ละโมดูล) เพื่อให้รันและ test ได้ทันที
 * เมื่อมี PostgreSQL แล้ว: `npx prisma generate` แล้วเพิ่ม Prisma repository ที่ implement interface เดียวกัน
 * schema อยู่ที่ prisma/schema.prisma และ migration แรกอยู่ที่ prisma/migrations/
 */
export type StorageMode = "memory" | "prisma";

export function getStorageMode(): StorageMode {
  return "memory";
}

// เงินคิดเป็นสตางค์แบบจำนวนเต็ม ไม่แปลง NUMERIC เป็น number ที่มีทศนิยมก่อนคิด (DESIGN ข้อ 4)

/** '1000.50' → 100050 */
export function numericToSatang(value: string | number): number {
  const text = typeof value === 'number' ? value.toFixed(2) : value;
  const negative = text.startsWith('-');
  const [baht, frac = ''] = text.replace('-', '').split('.');
  const satang = Number(baht) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
  return negative ? -satang : satang;
}

/** '1000.00' → 1000 · ค่าในฐานข้อมูลเป็นบาทเต็มอยู่แล้ว ใช้ตอนส่งออก API */
export function numericToBaht(value: string | number): number {
  return Math.floor(numericToSatang(value) / 100);
}

export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}

/** ปัดเศษสตางค์ลงเป็นบาทเต็ม (BR-32) */
export function satangToBahtFloor(satang: number): number {
  return Math.floor(satang / 100);
}

// ฟังก์ชันล้วน · A1 ใช้จัดลำดับ "ใครก็ได้"
const FILTER_TENTHS = 45;

/** เศษที่ต่ำกว่านี้ถือเป็นเศษจากการคำนวณ float · คะแนนจริงห่างจากขอบ .x5 มากกว่านี้เสมอ (จำนวนรีวิวไม่ถึงพันล้าน) */
const FLOAT_NOISE_DIGITS = 10;

/** BR-48: เฉลี่ยแล้วปัดทศนิยม 1 ตำแหน่ง .05 ขึ้นปัดขึ้น · ไม่มีรีวิวคืน null (BR-49) */
export function averageRating(stars: number[]): number | null {
  if (stars.length === 0) return null;
  const sum = stars.reduce((total, star) => total + star, 0);
  // ปัดด้วยจำนวนเต็มล้วน: floor(sum × 10 / n + 1/2) = floor((20 × sum + n) / 2n)
  const numerator = 20 * sum + stars.length;
  const denominator = 2 * stars.length;
  return (numerator - (numerator % denominator)) / denominator / 10;
}

/** BR-48 สำหรับค่าเฉลี่ยที่มีอยู่แล้ว เช่น 4.45 → 4.5 (คิดจากข้อความหรือจำนวนเต็ม ไม่ใช้ float ตรง ๆ) */
export function roundAverage(average: number): number {
  if (!Number.isFinite(average)) return average;
  const [whole, fraction] = Math.abs(average).toFixed(FLOAT_NOISE_DIGITS).split('.');
  const tenths = Number(whole) * 10 + Number(fraction[0]) + (Number(fraction[1]) >= 5 ? 1 : 0);
  return (Math.sign(average) * tenths) / 10;
}

/** BR-47, BR-49: ใช้ค่าที่ปัดแล้วเทียบ 4.5 · ไม่มีรีวิวไม่ผ่าน */
export function passesRatingFilter(rating: number | null): boolean {
  if (rating === null) return false;
  return Math.round(roundAverage(rating) * 10) >= FILTER_TENTHS;
}

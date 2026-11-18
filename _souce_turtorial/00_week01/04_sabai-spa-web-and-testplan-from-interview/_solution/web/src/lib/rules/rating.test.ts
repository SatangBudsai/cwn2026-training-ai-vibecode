import { describe, expect, it } from 'vitest';
import { averageRating, passesRatingFilter, roundAverage } from './rating';

describe('คะแนนรีวิว BR-47–49', () => {
  it('E223 เฉลี่ย 4.44 ปัดเป็น 4.4 ไม่ผ่านตัวกรอง', () => {
    expect(roundAverage(4.44)).toBe(4.4);
    expect(passesRatingFilter(roundAverage(4.44))).toBe(false);
  });

  it('E224 เฉลี่ย 4.45 ปัดเป็น 4.5 ผ่านตัวกรอง', () => {
    expect(roundAverage(4.45)).toBe(4.5);
    expect(passesRatingFilter(roundAverage(4.45))).toBe(true);
  });

  it('E225 เฉลี่ย 4.46 ปัดเป็น 4.5 ผ่านตัวกรอง', () => {
    expect(roundAverage(4.46)).toBe(4.5);
    expect(passesRatingFilter(roundAverage(4.46))).toBe(true);
  });

  it('E227 มี 1 รีวิว 5 ดาว ได้ 5.0 ผ่านตัวกรอง', () => {
    const rating = averageRating([5]);
    expect(rating).toBe(5);
    expect(rating?.toFixed(1)).toBe('5.0');
    expect(passesRatingFilter(rating)).toBe(true);
  });

  it('คะแนนจากรีวิวของนักบำบัดทุกคนตรงกับข้อมูลร้าน', () => {
    expect(averageRating([5, 5, 5])).toBe(5);
    expect(averageRating([5, 4])).toBe(4.5);
    expect(averageRating([5, 5, 4, 4, 4])).toBe(4.4);
    expect(averageRating([5, 5, 5, 4, 4])).toBe(4.6);
    expect(averageRating([5, 3])).toBe(4);
  });

  it('ไม่มีรีวิวได้ null และไม่ผ่านตัวกรอง', () => {
    expect(averageRating([])).toBeNull();
    expect(passesRatingFilter(null)).toBe(false);
  });

  it('ค่าเฉลี่ยจริงที่ลงตัวที่ขอบ .x5 ปัดขึ้นโดยไม่พลาดจาก float', () => {
    // 9 รีวิว 5 ดาว + 11 รีวิว 4 ดาว: 89 ÷ 20 = 4.45 พอดี
    expect(averageRating([...Array<number>(9).fill(5), ...Array<number>(11).fill(4)])).toBe(4.5);
    expect(roundAverage(1.15)).toBe(1.2);
    expect(roundAverage(1.25)).toBe(1.3);
    expect(roundAverage(8.9 / 2)).toBe(4.5);
    expect(roundAverage(0.1 * 44.5)).toBe(4.5);
    expect(roundAverage(4.449)).toBe(4.4);
    expect(roundAverage(4.4499999)).toBe(4.4);
    expect(roundAverage(5)).toBe(5);
  });

  it('ตัวกรองรับค่าที่ยังไม่ปัดโดยปัดให้ก่อน และไม่เปลี่ยนค่าที่ปัดแล้ว', () => {
    expect(passesRatingFilter(4.4)).toBe(false);
    expect(passesRatingFilter(4.5)).toBe(true);
    expect(passesRatingFilter(4.6)).toBe(true);
    expect(passesRatingFilter(4.45)).toBe(true);
  });
});

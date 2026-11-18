import { describe, expect, it } from 'vitest';
import { recommendForMood } from './mood';

const THAI_BLOCK = /[฀-๿]/;

describe('ตารางอารมณ์ FR-68', () => {
  it('มีอารมณ์ 3 แบบตามตาราง พร้อมรูปของตัวเอง', () => {
    expect(recommendForMood('tired')).toMatchObject({ serviceId: 'S02', imagePath: '/brand/misc/mood-tired.jpg' });
    expect(recommendForMood('stress')).toMatchObject({ serviceId: 'S04', imagePath: '/brand/misc/mood-stress.jpg' });
    expect(recommendForMood('achy')).toMatchObject({ serviceId: 'S03', imagePath: '/brand/misc/mood-achy.jpg' });
  });

  it('อารมณ์นอกตารางไม่ได้ผล รวมถึง key ของ Object', () => {
    for (const mood of ['happy', '', null, undefined, 1, {}, 'constructor', '__proto__', 'TIRED']) {
      expect(recommendForMood(mood)).toBeNull();
    }
  });

  it('เหตุผลภาษาจีนไม่มีอักขระไทย', () => {
    for (const mood of ['tired', 'stress', 'achy']) {
      expect(recommendForMood(mood)?.reason.zh).not.toMatch(THAI_BLOCK);
    }
  });

  it('รัน 20 รอบได้ผลเดียวกันทุกตัวอักษร', () => {
    const first = JSON.stringify(recommendForMood('stress'));
    for (let round = 0; round < 20; round++) {
      expect(JSON.stringify(recommendForMood('stress'))).toBe(first);
    }
  });
});

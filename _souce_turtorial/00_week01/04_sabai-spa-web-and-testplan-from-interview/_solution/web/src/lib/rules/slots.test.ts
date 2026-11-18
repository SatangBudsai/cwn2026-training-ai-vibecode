import { describe, expect, it } from 'vitest';
import { endsBeforeClose, generateSlots, isBookableSlot, isOnSlotGrid, slotEndTime } from './slots';

describe('รอบเวลา', () => {
  it('BR-01 รอบแรก 10:00 ก่อนหน้านั้นไม่มีรอบ', () => {
    expect(isOnSlotGrid('09:30')).toBe(false);
    expect(isOnSlotGrid('10:00')).toBe(true);
  });

  it('BR-01 รอบห่างกัน 30 นาที ลงท้าย :00 หรือ :30 เท่านั้น', () => {
    expect(isOnSlotGrid('10:15')).toBe(false);
    expect(isOnSlotGrid('10:30')).toBe(true);
  });

  it('BR-01 ข้อความที่ไม่ใช่เวลาไม่ใช่รอบ', () => {
    for (const bad of ['', '1000', '25:00', '10:60', '10:0', null, undefined, 600]) {
      expect(isOnSlotGrid(bad)).toBe(false);
    }
  });

  it.each([
    ['S01 60 นาที', 60, '20:30', true],
    ['S01 60 นาที', 60, '21:00', true],
    ['S01 60 นาที', 60, '21:30', false],
    ['S02 90 นาที', 90, '20:00', true],
    ['S02 90 นาที', 90, '20:30', true],
    ['S02 90 นาที', 90, '21:00', false],
    ['P01 120 นาที', 120, '19:30', true],
    ['P01 120 นาที', 120, '20:00', true],
    ['P01 120 นาที', 120, '20:30', false],
  ])('BR-02 %s รอบ %s', (_name, duration, time, ok) => {
    expect(endsBeforeClose(time as string, duration as number)).toBe(ok);
    expect(isBookableSlot(time, duration as number)).toBe(ok);
    expect(generateSlots(duration as number).includes(time as string)).toBe(ok);
  });

  it('BR-01 BR-02 รอบแรกและรอบสุดท้ายของแต่ละความยาว', () => {
    expect(generateSlots(60)[0]).toBe('10:00');
    expect(generateSlots(60).at(-1)).toBe('21:00');
    expect(generateSlots(90).at(-1)).toBe('20:30');
    expect(generateSlots(120).at(-1)).toBe('20:00');
    expect(generateSlots(60)).toHaveLength(23);
  });

  it('BR-02 เวลาจบ = เริ่ม + นาทีบริการ', () => {
    expect(slotEndTime('20:30', 90)).toBe('22:00');
  });
});

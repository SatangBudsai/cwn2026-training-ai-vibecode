import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/errors';
import { addDays } from '@/lib/date';
import type { GiftCardSummary } from '@/types';

import {
  cmToTenths,
  courseRemaining,
  giftCardImagePath,
  parseGiftCardAmount,
  parseGiftCardRequest,
  photoUrl,
  randomGiftCardCode,
  reducedCm,
  simulatedGiftCardMessage,
  tenthsToCm,
  toBodyPhoto,
  toCourseSummary,
  toGiftCardSummary,
} from './helpers';

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return err instanceof ApiError ? err.code : 'not-api-error';
  }
  return undefined;
}

describe('parseGiftCardAmount', () => {
  it.each([
    [500, 500],
    [501, 501],
    [2150, 2150],
    [9999, 9999],
    [10000, 10000],
    ['500', 500],
    ['2150', 2150],
    ['10000', 10000],
    [' 2150 ', 2150],
  ])('รับ %j', (input, expected) => {
    expect(parseGiftCardAmount(input)).toBe(expected);
  });

  it.each([
    [499],
    [10001],
    [2149.99],
    [2150.5],
    [-500],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    ['499'],
    ['10001'],
    ['2149.99'],
    ['2150.50'],
    ['2150.00'],
    ['2,150'],
    ['1e3'],
    ['0500'],
    ['-500'],
    [''],
    ['abc'],
    ['99999999999999999999999'],
    [null],
    [undefined],
    [true],
    [[500]],
    [{}],
  ])('ปฏิเสธ %j', (input) => {
    expect(parseGiftCardAmount(input)).toBeNull();
  });
});

describe('parseGiftCardRequest', () => {
  const ok = { amount: '2000', design: 'LOTUS', channel: 'LINE' };

  it('แปลงมูลค่าเป็น number และเติม recipient กับ message เป็น null', () => {
    expect(parseGiftCardRequest(ok)).toEqual({
      amount: 2000,
      design: 'LOTUS',
      channel: 'LINE',
      recipient: null,
      message: null,
    });
  });

  it('เก็บ recipient กับ message ที่ trim แล้ว และค่าว่างเป็น null', () => {
    const parsed = parseGiftCardRequest({ ...ok, recipient: ' fon@sabai.test ', message: '   ' });
    expect(parsed.recipient).toBe('fon@sabai.test');
    expect(parsed.message).toBeNull();
  });

  it('ตรวจตามลำดับ มูลค่า ลาย ช่องทาง', () => {
    expect(errorCode(() => parseGiftCardRequest({ amount: 1, design: 'X', channel: 'X' }))).toBe('giftcard-amount-invalid');
    expect(errorCode(() => parseGiftCardRequest({ amount: 500, design: 'X', channel: 'X' }))).toBe('giftcard-design-invalid');
    expect(errorCode(() => parseGiftCardRequest({ amount: 500, design: 'GOLD', channel: 'SMS' }))).toBe('giftcard-channel-invalid');
  });

  it('body ที่ไม่ใช่ object และข้อความเสริมผิดรูปตอบ validation', () => {
    expect(errorCode(() => parseGiftCardRequest(null))).toBe('validation');
    expect(errorCode(() => parseGiftCardRequest([]))).toBe('validation');
    expect(errorCode(() => parseGiftCardRequest({ ...ok, recipient: 5 }))).toBe('validation');
    expect(errorCode(() => parseGiftCardRequest({ ...ok, message: 'x'.repeat(501) }))).toBe('validation');
  });
});

describe('randomGiftCardCode', () => {
  it('มีรูปแบบคงที่ และไม่ซ้ำกันในการสุ่มหลายครั้ง', () => {
    const codes = Array.from({ length: 200 }, randomGiftCardCode);
    for (const code of codes) expect(code).toMatch(/^GIFT-[2-9A-HJ-NP-Z]{10}$/);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('toGiftCardSummary', () => {
  const row = {
    code: 'GIFT-X',
    design: 'LOTUS' as const,
    initial_value: '1000.00',
    balance: '400.00',
    purchased_on: '2025-06-15',
    expires_on: '2026-06-15',
    delivery_channel: 'EMAIL' as const,
  };

  it('แปลงเงินเป็นบาท และ imagePath ตามลาย', () => {
    const s = toGiftCardSummary(row, '2026-06-15');
    expect(s).toMatchObject({ initialValue: 1000, balance: 400, imagePath: '/brand/giftcard/gc-lotus.jpg', paymentStatus: 'SIMULATED', channel: 'EMAIL' });
    expect(giftCardImagePath('ORCHID')).toBe('/brand/giftcard/gc-orchid.jpg');
    expect(giftCardImagePath('GOLD')).toBe('/brand/giftcard/gc-gold.jpg');
  });

  it('ใช้ได้ถึงวันที่ 365 และหมดอายุวันที่ 366', () => {
    expect(toGiftCardSummary(row, '2026-06-15')).toMatchObject({ expired: false, usable: true });
    expect(toGiftCardSummary(row, '2026-06-16')).toMatchObject({ expired: true, usable: false });
  });

  it('ยอด 0 ไม่หมดอายุแต่ใช้ไม่ได้', () => {
    expect(toGiftCardSummary({ ...row, balance: '0.00' }, '2026-06-15')).toMatchObject({ expired: false, usable: false, balance: 0 });
  });
});

describe('simulatedGiftCardMessage', () => {
  const card: GiftCardSummary = {
    code: 'GIFT-ABC',
    design: 'LOTUS',
    imagePath: '/brand/giftcard/gc-lotus.jpg',
    initialValue: 2000,
    balance: 2000,
    purchasedOn: '2026-06-15',
    expiresOn: addDays('2026-06-15', 365),
    expired: false,
    usable: true,
    channel: 'LINE',
    paymentStatus: 'SIMULATED',
  };

  it('ภาษาไทยมีมูลค่า ลาย รหัส วันหมดอายุ และบอกว่าจำลอง', () => {
    const text = simulatedGiftCardMessage(card, 'th');
    for (const part of ['฿2,000', 'ลายบัว', 'GIFT-ABC', '15 มิ.ย. 2027', 'จำลอง', 'LINE']) expect(text).toContain(part);
  });

  it('อังกฤษและจีนไม่เหลือตัวอักษรไทย', () => {
    const en = simulatedGiftCardMessage(card, 'en');
    const zh = simulatedGiftCardMessage(card, 'zh');
    for (const text of [en, zh]) {
      expect(text).not.toMatch(/[ก-ฺเ-๛]/);
      expect(text).toContain('GIFT-ABC');
    }
    expect(en).toContain('฿2,000');
    expect(zh).toContain('2,000 泰铢');
    expect(en).toContain('Lotus');
    expect(en).toContain('Simulated');
    expect(zh).toContain('莲花');
    expect(zh).toContain('模拟');
    expect(zh).toContain('2027');
  });
});

describe('คอร์ส', () => {
  const row = {
    id: 'c1',
    name_th: 'คอร์ส',
    name_en: 'Course',
    name_zh: '疗程',
    total_sessions: 11,
    used_sessions: 4,
    reserved_sessions: 0,
    purchased_on: '2026-03-17',
    expires_on: '2026-09-13',
    price_paid: '15000.00',
  };

  it('เหลือ = ทั้งหมด − ใช้ − กัน', () => {
    expect(courseRemaining(11, 4, 0)).toBe(7);
    expect(courseRemaining(11, 3, 1)).toBe(7);
    expect(courseRemaining(11, 11, 0)).toBe(0);
  });

  it('สรุปครบและอายุถึงวันที่ 180', () => {
    expect(toCourseSummary(row, '2026-09-13')).toMatchObject({
      serviceId: 'K01',
      serviceName: { th: 'คอร์ส', en: 'Course', zh: '疗程' },
      remaining: 7,
      expired: false,
      usedUp: false,
      pricePaid: 15000,
      expiresOn: '2026-09-13',
    });
    expect(toCourseSummary(row, '2026-09-14').expired).toBe(true);
  });

  it('ครั้งที่กันไว้ทำให้ใช้ครบได้ก่อนตัดจริง', () => {
    expect(toCourseSummary({ ...row, used_sessions: 10, reserved_sessions: 1 }, '2026-06-15')).toMatchObject({ remaining: 0, usedUp: true });
  });
});

describe('รอบเอว', () => {
  it('แปลงระหว่างข้อความกับสิบเท่า', () => {
    expect(cmToTenths('82.0')).toBe(820);
    expect(cmToTenths('79.5')).toBe(795);
    expect(cmToTenths('80')).toBe(800);
    expect(tenthsToCm(40)).toBe('4.0');
    expect(tenthsToCm(5)).toBe('0.5');
    expect(tenthsToCm(-15)).toBe('-1.5');
    expect(tenthsToCm(0)).toBe('0.0');
  });

  const pts = (...cms: string[]) => cms.map((cm, i) => ({ date: `2026-03-0${i + 1}`, cm }));

  it('ลดลงจากจุดแรกถึงจุดสุดท้าย', () => {
    expect(reducedCm(pts('82.0', '81.0', '79.5', '78.0'))).toBe('4.0');
  });

  it('ไม่มีเศษจาก float', () => {
    expect(82.3 - 78.1).not.toBe(4.2);
    expect(reducedCm(pts('82.3', '78.1'))).toBe('4.2');
  });

  it('น้อยกว่า 2 จุดเป็น null', () => {
    expect(reducedCm([])).toBeNull();
    expect(reducedCm(pts('82.0'))).toBeNull();
  });

  it('รอบเอวเพิ่มขึ้นเป็นค่าติดลบ', () => {
    expect(reducedCm(pts('78.0', '79.5'))).toBe('-1.5');
  });
});

describe('รูป before/after', () => {
  it('ตัด public ออกจาก path', () => {
    expect(photoUrl('public/placeholder/nida-before-body.jpg')).toBe('/placeholder/nida-before-body.jpg');
    expect(photoUrl('/public/photos/a.jpg')).toBe('/photos/a.jpg');
    expect(photoUrl('/photos/a.jpg')).toBe('/photos/a.jpg');
    expect(photoUrl('public-art/a.jpg')).toBe('/public-art/a.jpg');
  });

  it('ติดป้าย placeholder เฉพาะไฟล์ใต้ placeholder/', () => {
    expect(toBodyPhoto({ kind: 'BEFORE', taken_on: '2026-03-17', file_path: 'public/placeholder/x.jpg' })).toEqual({
      kind: 'BEFORE',
      takenOn: '2026-03-17',
      url: '/placeholder/x.jpg',
      placeholder: true,
    });
    expect(toBodyPhoto({ kind: 'AFTER', taken_on: '2026-05-19', file_path: 'public/photos/x.jpg' }).placeholder).toBe(false);
  });
});

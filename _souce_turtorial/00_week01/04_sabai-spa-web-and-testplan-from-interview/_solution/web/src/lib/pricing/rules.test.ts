import { expect, test } from 'vitest';
import type { ServiceKind } from '@/types';
import {
  birthdayEligibility,
  courseValidOn,
  giftCardValidOn,
  loyaltyBase,
  maxRedeemSets,
  nextTier,
  parseDistanceKm,
  pointsEarned,
  quote,
  roundDownBaht,
  shuttleFee,
  tierFromSpend,
  type PriceInput,
} from './rules';

interface Case {
  unit?: number;
  party?: number;
  kind?: ServiceKind;
  course?: boolean;
  spend?: number | null;
  birthday?: boolean;
  redeem?: number;
  balance?: number;
  km?: string;
  gift?: number;
}

function input(c: Case): PriceInput {
  return {
    unitPriceBaht: c.unit ?? 1000,
    partySize: c.party ?? 1,
    kind: c.kind ?? 'SERVICE',
    isCourseBooking: c.course ?? false,
    lifetimeSpendBaht: c.spend === undefined ? null : c.spend,
    birthdayApplies: c.birthday ?? false,
    pointsToRedeem: c.redeem ?? 0,
    pointsBalance: c.balance ?? 0,
    distanceTenths: c.km === undefined ? null : parseDistanceKm(c.km),
    giftCardBalanceBaht: c.gift ?? null,
  };
}

function run(c: Case) {
  return quote(input(c));
}

function earned(c: Case): number {
  const lines = run(c);
  return pointsEarned(loyaltyBase(lines.serviceNet, lines.giftCardAmount));
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return (err as { code: string }).code;
  }
  return 'no-error';
}

const JUNE_BIRTH = '1992-06-01';
const eligibleOn = (appointmentDate: string, usedYears: number[] = [], kind: ServiceKind = 'SERVICE') =>
  birthdayEligibility({ birthDate: JUNE_BIRTH, appointmentDate, kind, usedYears });

// ---------- 21 แถวบังคับจาก TEST-DATA ข้อ 7 ----------

test('E66 P01 4 คนเข้าฟังก์ชันราคาตรง ๆ ได้ ฿11,600 ไม่ลดกลุ่ม 10%', () => {
  const lines = run({ unit: 2900, party: 4, kind: 'PACKAGE' });
  expect(lines.fullPrice).toBe(11600);
  expect(lines.discountPercent).toBe(0);
  expect(lines.discountSource).toBe('NONE');
  expect(lines.discountAmount).toBe(0);
  expect(lines.serviceNet).toBe(11600);
});

test('E81 ฐาน ฿99 ได้ 0 แต้ม', () => {
  expect(pointsEarned(99)).toBe(0);
});

test('E82 ฐาน ฿100 ได้ 1 แต้ม', () => {
  expect(pointsEarned(100)).toBe(1);
});

test('E83 ฐาน ฿199 ได้ 1 แต้ม', () => {
  expect(pointsEarned(199)).toBe(1);
});

test('E84 ฐาน ฿2,950 ได้ 29 แต้ม', () => {
  expect(pointsEarned(2950)).toBe(29);
});

test('E85 ค่าบริการสุทธิ ฿99 ค่ารถ ฿300 ฐานไม่รวมรถ ได้ 0 แต้ม', () => {
  const lines = run({ unit: 99, km: '12.0', spend: 0 });
  expect(lines.serviceNet).toBe(99);
  expect(lines.transportFee).toBe(300);
  expect(pointsEarned(loyaltyBase(lines.serviceNet, lines.giftCardAmount))).toBe(0);
});

test('E86 ค่าบริการสุทธิ ฿100 ค่ารถ ฿300 ฐานไม่รวมรถ ได้ 1 แต้ม', () => {
  const lines = run({ unit: 100, km: '12.0', spend: 0 });
  expect(lines.serviceNet).toBe(100);
  expect(lines.transportFee).toBe(300);
  expect(pointsEarned(loyaltyBase(lines.serviceNet, lines.giftCardAmount))).toBe(1);
});

test('E87 ค่าบริการสุทธิ ฿199 ค่ารถ ฿300 ฐานไม่รวมรถ ได้ 1 แต้ม', () => {
  const lines = run({ unit: 199, km: '12.0', spend: 0 });
  expect(lines.serviceNet).toBe(199);
  expect(lines.transportFee).toBe(300);
  expect(pointsEarned(loyaltyBase(lines.serviceNet, lines.giftCardAmount))).toBe(1);
});

test('E126 ใช้สิทธิ์ปี 2026 แล้ว นัดปี 2026 อีกครั้ง ✗', () => {
  expect(eligibleOn('2026-06-20', [2026])).toEqual({ eligible: false, reason: 'already-used' });
});

test('E127 ใช้สิทธิ์ปี 2026 แล้ว นัดปี 2027 ✓', () => {
  expect(eligibleOn('2027-06-20', [2026])).toEqual({ eligible: true, reason: null });
});

test('E128 ใช้สิทธิ์ปี 2026 แล้ว นัดปี 2028 ✓', () => {
  expect(eligibleOn('2028-06-20', [2026])).toEqual({ eligible: true, reason: null });
});

test('E153 ฿954.00 ปัดลงเป็น ฿954', () => {
  expect(roundDownBaht(95400)).toBe(954);
});

test('E154 ฿954.01 ปัดลงเป็น ฿954', () => {
  expect(roundDownBaht(95401)).toBe(954);
});

test('E155 ฿954.99 ปัดลงเป็น ฿954', () => {
  expect(roundDownBaht(95499)).toBe(954);
});

test('E156 ราคาสมมติ ฿999 ลด 5% ได้ ฿949.05 ปัดลงเป็น ฿949', () => {
  const lines = run({ unit: 999, spend: 10000 });
  expect(lines.discountPercent).toBe(5);
  expect(lines.serviceNet).toBe(949);
  expect(lines.payAtShop).toBe(949);
  expect(lines.fullPrice - lines.discountAmount).toBe(949);
});

test('E209 คอร์สซื้อ 15 มิ.ย. 2026 นัด 11 ธ.ค. 2026 วันที่ 179 ✓', () => {
  expect(courseValidOn('2026-06-15', '2026-12-11')).toBe(true);
});

test('E210 คอร์สซื้อ 15 มิ.ย. 2026 นัด 12 ธ.ค. 2026 วันที่ 180 ✓', () => {
  expect(courseValidOn('2026-06-15', '2026-12-12')).toBe(true);
});

test('E211 คอร์สซื้อ 15 มิ.ย. 2026 นัด 13 ธ.ค. 2026 วันที่ 181 ✗', () => {
  expect(courseValidOn('2026-06-15', '2026-12-13')).toBe(false);
});

test('E212 บัตรซื้อ 15 มิ.ย. 2026 ใช้ 14 มิ.ย. 2027 วันที่ 364 ✓', () => {
  expect(giftCardValidOn('2026-06-15', '2027-06-14')).toBe(true);
});

test('E213 บัตรซื้อ 15 มิ.ย. 2026 ใช้ 15 มิ.ย. 2027 วันที่ 365 ✓', () => {
  expect(giftCardValidOn('2026-06-15', '2027-06-15')).toBe(true);
});

test('E214 บัตรซื้อ 15 มิ.ย. 2026 ใช้ 16 มิ.ย. 2027 วันที่ 366 ✗', () => {
  expect(giftCardValidOn('2026-06-15', '2027-06-16')).toBe(false);
});

// ---------- เทียบตัวเลขแถวอื่น ๆ ของ E88–E183 (ชื่อห้ามขึ้นต้นด้วยรหัส) ----------

const SVC = { S01: 1000, S02: 1400, S03: 1200, S04: 2000, S05: 800, S06: 1500, S07: 1800, P01: 2900 };
const P01 = { unit: SVC.P01, kind: 'PACKAGE' as const };

test.each<[string, Case, number, number]>([
  // แถว, เงื่อนไข, จ่ายหน้าร้าน, แต้มที่ได้
  ['E88', { unit: SVC.S04, spend: 0, km: '12.0' }, 2300, 20],
  ['E89', { spend: 0, km: '12.0', gift: 899 }, 401, 1],
  ['E90', { spend: 0, km: '12.0', gift: 900 }, 400, 1],
  ['E91', { spend: 0, km: '12.0', gift: 901 }, 399, 0],
  ['E92', { unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 500 }, 1700, 14],
  ['E112', { unit: SVC.S05, spend: 9999, balance: 250 }, 800, 8],
  ['E113', { spend: 0 }, 1000, 10],
  ['E114', { spend: 0, gift: 400 }, 600, 6],
  ['E115', { spend: 0, gift: 1000 }, 0, 0],
  ['E144', { party: 2, spend: 30000, birthday: true }, 1600, 16],
  ['E148', { ...P01, spend: 9999, km: '12.0' }, 2900, 29],
  ['E149', { ...P01, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 500 }, 2300, 23],
  ['E160', { unit: SVC.S05, spend: 0, gift: 2000 }, 0, 0],
  ['E162', { spend: 0, gift: 1 }, 999, 9],
])('เทียบ %s ยอดจ่ายและแต้ม', (_row, c, pay, points) => {
  expect(run(c).payAtShop).toBe(pay);
  expect(earned(c)).toBe(points);
});

test.each<[string, Case, number]>([
  ['E93', { spend: 12400, balance: 99 }, 950],
  ['E94', { spend: 29999, balance: 100, redeem: 100 }, 900],
  ['E95', { spend: 10000, balance: 101, redeem: 100 }, 900],
  ['E96', { spend: 10001, balance: 199, redeem: 100 }, 900],
  ['E97', { spend: 30001, balance: 200, redeem: 200 }, 800],
  ['E98', { spend: 9999, balance: 250, redeem: 200 }, 900],
  ['E100', { unit: SVC.S05, spend: 500, balance: 1700, redeem: 1500 }, 50],
  ['E101', { unit: SVC.S05, spend: 500, balance: 1700, redeem: 1600 }, 0],
  ['E103', { unit: SVC.S05, spend: 500, balance: 1700, redeem: 1600, km: '12.0' }, 300],
  ['E104', { spend: 9999 }, 1000],
  ['E105', { spend: 10000 }, 950],
  ['E106', { spend: 10001 }, 950],
  ['E107', { spend: 29999 }, 950],
  ['E108', { spend: 30000 }, 900],
  ['E109', { spend: 30001 }, 900],
  ['E116', { spend: 500 }, 1000],
  ['E117', { spend: 500, birthday: true }, 800],
  ['E118', { spend: 30000, birthday: true }, 800],
  ['E119', { spend: 30000 }, 900],
  ['E122', { spend: 30000 }, 900],
  ['E123', { spend: 29999 }, 950],
  ['E129', { spend: 30000, birthday: true }, 800],
  ['E130', { ...P01, spend: 30000, km: '12.0' }, 2900],
  ['E132', { unit: SVC.S02, spend: 30000, birthday: true }, 1120],
  ['E133', { unit: SVC.S03, spend: 30000, birthday: true }, 960],
  ['E134', { unit: SVC.S04, spend: 30000, birthday: true }, 1600],
  ['E135', { unit: SVC.S05, spend: 30000, birthday: true }, 640],
  ['E136', { unit: SVC.S06, spend: 30000, birthday: true }, 1200],
  ['E137', { unit: SVC.S07, spend: 30000, birthday: true }, 1440],
  ['E138', { party: 3, spend: 10000 }, 2850],
  ['E139', { party: 4, spend: 30000 }, 3600],
  ['E140', { party: 4, spend: 30000, birthday: true }, 3200],
  ['E141', { party: 4, spend: 10000 }, 3600],
  ['E142', { unit: SVC.S04, party: 2, spend: 30000 }, 3600],
  ['E143', { unit: SVC.S04, party: 2 }, 4000],
  ['E145', { ...P01, spend: 9999, km: '12.0' }, 2900],
  ['E146', { ...P01, spend: 29999, km: '12.0' }, 2900],
  ['E147', { ...P01, spend: 30001, km: '12.0' }, 2900],
  ['E150', {}, 1000],
  ['E151', { spend: 10000, balance: 101, redeem: 100 }, 900],
  ['E152', { unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 500 }, 1700],
  ['E157', { unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 2199 }, 1],
  ['E158', { unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 2200 }, 0],
  ['E159', { unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 2201 }, 0],
  ['E165', { km: '4.9' }, 1000],
  ['E166', { km: '5.0' }, 1000],
  ['E167', { km: '5.1' }, 1300],
  ['E168', { km: '2.0' }, 1000],
  ['E169', { km: '14.9' }, 1300],
  ['E170', { km: '15.0' }, 1300],
  ['E172', { km: '12.0' }, 1300],
  ['E173', { party: 3, km: '12' }, 3300],
  ['E174', { party: 4, spend: 0, km: '12' }, 3900],
  ['E175', { party: 5, km: '12' }, 5100],
  ['E176', { party: 6, km: '12' }, 6000],
  ['E177', { party: 5, km: '5.0' }, 4500],
  ['E178', { ...P01, km: '14.9' }, 2900],
  ['E179', { ...P01, km: '15.0' }, 2900],
  ['E182', { km: '0.0' }, 1000],
])('เทียบ %s ยอดจ่ายหน้าร้าน', (_row, c, pay) => {
  expect(run(c).payAtShop).toBe(pay);
});

test.each<[string, () => unknown, string]>([
  ['E93 แลกทั้งที่มี 99 แต้ม', () => run({ spend: 12400, balance: 99, redeem: 100 }), 'points-not-enough'],
  ['สัญญา 2.3 ขอแลก 99 แต้ม', () => run({ spend: 9999, balance: 250, redeem: 99 }), 'points-not-enough'],
  ['ขอแลกเกินยอดที่มี', () => run({ spend: 9999, balance: 250, redeem: 300 }), 'points-not-enough'],
  ['E99 ขอแลก 150 แต้ม', () => run({ spend: 9999, balance: 250, redeem: 150 }), 'points-not-multiple'],
  ['E102 แลก 17 ชุดกับ S05', () => run({ unit: SVC.S05, spend: 500, balance: 1700, redeem: 1700 }), 'points-exceed-service'],
  ['แขกแลกแต้ม', () => run({ redeem: 100, balance: 100 }), 'points-login-required'],
  ['แต้มติดลบ', () => run({ spend: 0, redeem: -100, balance: 100 }), 'validation'],
  ['E171 โรงแรม H06', () => run({ km: '15.1' }), 'distance-too-far'],
  ['E180 P01 โรงแรม H06', () => run({ ...P01, km: '15.1' }), 'distance-too-far'],
  ['E181 ระยะ -0.1', () => parseDistanceKm('-0.1'), 'distance-invalid'],
  ['E183 ระยะ 5.05', () => parseDistanceKm('5.05'), 'distance-invalid'],
  ['ระยะไม่ใช่ตัวเลข', () => parseDistanceKm('abc'), 'distance-invalid'],
  ['ระยะแบบ 1e1', () => parseDistanceKm('1e1'), 'distance-invalid'],
  ['ระยะว่าง', () => parseDistanceKm(''), 'distance-invalid'],
  ['ระยะลงท้ายจุด', () => parseDistanceKm('5.'), 'distance-invalid'],
])('เทียบ error %s', (_name, fn, code) => {
  expect(codeOf(fn)).toBe(code);
});

test('เทียบ E116 E117 E118 E119 เดือนของวันนัด', () => {
  expect(eligibleOn('2026-05-31')).toEqual({ eligible: false, reason: 'not-birthday-month' });
  expect(eligibleOn('2026-06-01').eligible).toBe(true);
  expect(eligibleOn('2026-06-30').eligible).toBe(true);
  expect(eligibleOn('2026-07-01')).toEqual({ eligible: false, reason: 'not-birthday-month' });
});

test('เทียบ E130 E131 P01 และ K01 ไม่เข้าเงื่อนไขเดือนเกิด', () => {
  expect(eligibleOn('2026-06-20', [], 'PACKAGE').reason).toBe('service-not-eligible');
  expect(eligibleOn('2026-06-20', [], 'COURSE').reason).toBe('service-not-eligible');
});

test('แขกไม่เข้าเงื่อนไขเดือนเกิด', () => {
  expect(
    birthdayEligibility({ birthDate: null, appointmentDate: '2026-06-20', kind: 'SERVICE', usedYears: [] }),
  ).toEqual({ eligible: false, reason: 'guest' });
});

test('แหล่งส่วนลด: เท่ากันให้ TIER มาก่อน GROUP และเดือนเกิดเมื่อ 20% มากสุด', () => {
  expect(run({ party: 4, spend: 30000 }).discountSource).toBe('TIER');
  expect(run({ party: 4, spend: 10000 }).discountSource).toBe('GROUP');
  expect(run({ party: 4 }).discountSource).toBe('GROUP');
  expect(run({ party: 4, spend: 30000, birthday: true }).discountSource).toBe('BIRTHDAY');
  expect(run({ party: 3, spend: 10000 }).discountSource).toBe('TIER');
  expect(run({ spend: 0 }).discountSource).toBe('NONE');
  expect(run({ party: 3 }).discountPercent).toBe(0);
});

test('เทียบ B13 P01 1 คนนับ cars = 1 แม้ค่ารถ ฿0', () => {
  const lines = run({ ...P01, km: '2.0' });
  expect(lines.cars).toBe(1);
  expect(lines.transportFee).toBe(0);
});

test('เทียบ E177 รถฟรีแต่ยังนับ 2 คัน', () => {
  expect(shuttleFee(50, 5, 'SERVICE')).toEqual({ cars: 2, feeBaht: 0 });
});

test('ไม่ใช้รถ cars = 0', () => {
  expect(run({}).cars).toBe(0);
});

test('เทียบ E164 คอร์สราคา ฿0 ค่ารถ ฿300 บัตรหัก ฿300 เหลือบัตร ฿200', () => {
  const lines = run({ unit: 15000, kind: 'COURSE', course: true, spend: 12400, km: '12.0', gift: 500 });
  expect(lines.fullPrice).toBe(0);
  expect(lines.discountPercent).toBe(0);
  expect(lines.serviceNet).toBe(0);
  expect(lines.transportFee).toBe(300);
  expect(lines.giftCardAmount).toBe(300);
  expect(lines.payAtShop).toBe(0);
});

test('เทียบ BR-31 ครบ 5 บรรทัด', () => {
  expect(run({ unit: SVC.S04, spend: 9999, balance: 250, redeem: 200, km: '12.0', gift: 500 })).toEqual({
    fullPrice: 2000,
    discountPercent: 0,
    discountSource: 'NONE',
    discountAmount: 0,
    pointsRedeemed: 200,
    pointsDiscount: 100,
    serviceNet: 1900,
    cars: 1,
    transportFee: 300,
    totalBeforeGiftCard: 2200,
    giftCardAmount: 500,
    payAtShop: 1700,
  });
});

test('ระยะตรวจจากข้อความคืนสิบเท่าของ กม.', () => {
  expect(parseDistanceKm('0.0')).toBe(0);
  expect(parseDistanceKm('5')).toBe(50);
  expect(parseDistanceKm('5.0')).toBe(50);
  expect(parseDistanceKm('5.1')).toBe(51);
  expect(parseDistanceKm('15.0')).toBe(150);
});

test('ระดับตามยอดสะสมและระยะถึงระดับถัดไป', () => {
  expect(tierFromSpend(9999)).toBe('Silver');
  expect(tierFromSpend(10000)).toBe('Gold');
  expect(tierFromSpend(29999)).toBe('Gold');
  expect(tierFromSpend(30000)).toBe('Platinum');
  expect(nextTier(0)).toEqual({ name: 'Gold', gap: 10000 });
  expect(nextTier(12400)).toEqual({ name: 'Platinum', gap: 17600 });
  expect(nextTier(30000)).toBeNull();
});

test('ฐานแต้มไม่ต่ำกว่า 0', () => {
  expect(loyaltyBase(1000, 899)).toBe(101);
  expect(loyaltyBase(0, 300)).toBe(0);
});

test('ชุดแต้มสูงสุดเป็นค่าน้อยกว่าระหว่างแต้มกับยอดหลัง %', () => {
  expect(maxRedeemSets(1700, 800)).toBe(16);
  expect(maxRedeemSets(250, 1000)).toBe(2);
  expect(maxRedeemSets(99, 1000)).toBe(0);
  expect(maxRedeemSets(0, 0)).toBe(0);
});

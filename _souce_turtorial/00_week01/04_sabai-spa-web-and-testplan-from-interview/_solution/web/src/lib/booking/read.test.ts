import { describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { cancelState, getBookingDetail, isUuid, listBookingsForUser } from './read';

const start = new Date('2026-06-16T10:00:00+07:00');

const ROW = {
  id: '00000000-0000-0000-0000-000000000215',
  booking_code: 'SJTEST15',
  user_id: '00000000-0000-0000-0000-000000000112',
  guest_name: null,
  guest_phone: null,
  service_id: 'S04',
  booking_type: 'SINGLE',
  party_size: 1,
  start_at: new Date('2026-06-25T14:00:00+07:00'),
  end_at: new Date('2026-06-25T15:30:00+07:00'),
  is_couple_suite: false,
  status: 'CONFIRMED',
  full_price: '2000.00',
  discount_percent: 20,
  discount_source: 'BIRTHDAY',
  discount_amount: '400.00',
  points_redeemed: 200,
  points_discount: '100.00',
  service_net: '1500.00',
  hotel_id: 'H04',
  distance_km: '12.0',
  cars: 1,
  transport_fee: '300.00',
  gift_card_amount: '500.00',
  pay_at_shop: '1300.00',
  course_purchase_id: null,
  points_earned: 0,
  completed_at: null,
  service_name_th: 'th',
  service_name_en: 'en',
  service_name_zh: 'zh',
  hotel_name_th: 'ht',
  hotel_name_en: 'he',
  hotel_name_zh: 'hz',
  gift_card_code: 'GIFT-REFUND',
};

const ITEM = {
  booking_id: ROW.id,
  person_no: 1,
  therapist_id: 'T03',
  name_th: 'พี่ภูมิ',
  name_en: "P'Phum",
  name_zh: '普姆',
  photo_path: '/brand/people/staff-t03-phum.jpg',
};

function fakeDb(rows: unknown[], items: unknown[]): Db & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    query: async (text: string) => {
      calls.push(text);
      return { rows: text.includes('booking_items') ? items : rows };
    },
  } as unknown as Db & { calls: string[] };
}

describe('สิทธิ์ยกเลิก', () => {
  it.each([
    ['23:59', '2026-06-15T10:01:00+07:00', false],
    ['24:00 พอดี', '2026-06-15T10:00:00+07:00', true],
    ['24:01', '2026-06-15T09:59:00+07:00', true],
  ])('BR-14 เหลือ %s', (_label, now, ok) => {
    const state = cancelState('CONFIRMED', start, new Date(now as string));
    expect(state.canCancel).toBe(ok);
    expect(state.cancelBlockedReason).toBe(ok ? null : 'under-24h');
  });

  it('BR-14 เสร็จแล้วหรือยกเลิกแล้วยกเลิกไม่ได้ ไม่ว่าเหลือกี่ชั่วโมง', () => {
    const early = new Date('2026-06-01T10:00:00+07:00');
    expect(cancelState('COMPLETED', start, early)).toEqual({ canCancel: false, cancelBlockedReason: 'not-confirmed' });
    expect(cancelState('CANCELLED', start, early)).toEqual({ canCancel: false, cancelBlockedReason: 'not-confirmed' });
  });
});

describe('BookingDetail', () => {
  const now = new Date('2026-06-15T10:00:00+07:00');

  it('NFR-11 คืนครบทุกฟิลด์ เงินเป็นบาทเต็ม เวลาเป็น Asia/Bangkok', async () => {
    const detail = await getBookingDetail(fakeDb([ROW], [ITEM]), ROW.id, now);
    expect(detail).toMatchObject({
      bookingCode: 'SJTEST15',
      serviceId: 'S04',
      serviceName: { th: 'th', en: 'en', zh: 'zh' },
      date: '2026-06-25',
      time: '14:00',
      endTime: '15:30',
      startAt: '2026-06-25T14:00:00+07:00',
      endAt: '2026-06-25T15:30:00+07:00',
      hotelId: 'H04',
      hotelName: { th: 'ht', en: 'he', zh: 'hz' },
      distanceKm: '12.0',
      giftCardCode: 'GIFT-REFUND',
      completedAt: null,
      canCancel: true,
      cancelBlockedReason: null,
    });
    expect(detail?.lines).toEqual({
      fullPrice: 2000,
      discountPercent: 20,
      discountSource: 'BIRTHDAY',
      discountAmount: 400,
      pointsRedeemed: 200,
      pointsDiscount: 100,
      serviceNet: 1500,
      cars: 1,
      transportFee: 300,
      totalBeforeGiftCard: 1800,
      giftCardAmount: 500,
      payAtShop: 1300,
    });
    expect(detail?.therapists).toEqual([
      {
        personNo: 1,
        id: 'T03',
        name: { th: 'พี่ภูมิ', en: "P'Phum", zh: '普姆' },
        photoPath: '/brand/people/staff-t03-phum.jpg',
      },
    ]);
  });

  it('NFR-12 รหัสที่ไม่ใช่ uuid ตอบไม่พบโดยไม่ถึง SQL', async () => {
    const db = fakeDb([ROW], [ITEM]);
    expect(await getBookingDetail(db, 'not-a-uuid', now)).toBeNull();
    expect(db.calls).toHaveLength(0);
    expect(isUuid(ROW.id)).toBe(true);
  });

  it('NFR-11 ไม่พบแถวคืน null และรายการว่างไม่ยิงคำสั่งที่สอง', async () => {
    const db = fakeDb([], []);
    expect(await getBookingDetail(db, ROW.id, now)).toBeNull();
    expect(await listBookingsForUser(db, ROW.user_id, ['CONFIRMED'], now)).toEqual([]);
    expect(db.calls).toHaveLength(2);
  });

  it('NFR-11 การจองหลายรายการได้นักบำบัดของตัวเอง', async () => {
    const other = { ...ROW, id: '00000000-0000-0000-0000-000000000216', hotel_name_th: null, hotel_id: null };
    const items = [
      ITEM,
      { ...ITEM, booking_id: other.id, person_no: 1, therapist_id: 'T01' },
      { ...ITEM, booking_id: other.id, person_no: 2, therapist_id: 'T05' },
    ];
    const list = await listBookingsForUser(fakeDb([ROW, other], items), ROW.user_id, ['CONFIRMED'], now);
    expect(list.map((b) => b.therapists.map((t) => t.id))).toEqual([['T03'], ['T01', 'T05']]);
    expect(list[1].hotelName).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getService, listHerbs, listHotels, listServices, listTherapists } from './index';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/db', () => ({ query }));

const names = (th: string) => ({ name_th: th, name_en: `${th}-en`, name_zh: `${th}-zh` });

const SERVICES = (
  [
    ['S01', 'SERVICE', 60, '1000.00'],
    ['S02', 'SERVICE', 90, '1400.00'],
    ['S03', 'SERVICE', 60, '1200.00'],
    ['S04', 'SERVICE', 90, '2000.00'],
    ['S05', 'SERVICE', 60, '800.00'],
    ['S06', 'SERVICE', 60, '1500.00'],
    ['S07', 'SERVICE', 60, '1800.00'],
    ['P01', 'PACKAGE', 120, '2900.00'],
    ['K01', 'COURSE', 60, '15000.00'],
  ] as const
).map(([id, kind, duration_minutes, price]) => ({
  id,
  kind,
  duration_minutes,
  price,
  image_path: `/brand/services/${id}.jpg`,
  ...names(id),
}));

const SKILLS: Record<string, string[]> = {
  T01: ['S01', 'S02', 'S03', 'S04', 'S05', 'P01', 'K01'],
  T02: ['S01', 'S02', 'S03', 'S05', 'P01'],
  T03: ['S01', 'S02', 'S04', 'S05', 'S06'],
  T04: ['S01', 'S02', 'S05', 'S06', 'S07'],
  T05: ['S01', 'S02', 'S03', 'S04', 'S07', 'K01'],
  T06: ['S01', 'S02', 'S03', 'S05', 'P01'],
};
const LINKS = Object.entries(SKILLS).flatMap(([therapist_id, ids]) =>
  ids.map((service_id) => ({ therapist_id, service_id })),
);
const REVIEWS: Record<string, number[]> = {
  T01: [5, 5, 5],
  T02: [5, 4],
  T03: [5, 5, 4, 4, 4],
  T05: [5, 5, 5, 4, 4],
  T06: [5, 3],
};
const REVIEW_ROWS = Object.entries(REVIEWS).flatMap(([therapist_id, stars]) =>
  stars.map((value) => ({ therapist_id, stars: value })),
);
const THERAPISTS = Object.keys(SKILLS).map((id) => ({
  id,
  ...names(id),
  title_th: 'นักบำบัด',
  title_en: 'Therapist',
  title_zh: '理疗师',
  photo_path: `/brand/people/${id}.jpg`,
}));

beforeEach(() => {
  query.mockReset();
  query.mockImplementation(async (sql: string) => {
    if (/FROM services\b/.test(sql)) return { rows: SERVICES };
    if (/FROM herbs\b/.test(sql)) {
      return { rows: [{ id: 1, image_path: '/brand/herbs/herb-phlai.jpg', ...names('ไพล') }] };
    }
    if (/FROM service_herbs\b/.test(sql)) {
      return { rows: [{ herb_id: 1, service_id: 'S01' }, { herb_id: 1, service_id: 'K01' }] };
    }
    if (/FROM therapist_services\b/.test(sql)) return { rows: LINKS };
    if (/FROM therapist_reviews\b/.test(sql)) return { rows: REVIEW_ROWS };
    if (/FROM therapists\b/.test(sql)) return { rows: THERAPISTS };
    if (/FROM hotels\b/.test(sql)) {
      return { rows: [{ id: 'H01', distance_km: '2.0', ...names('เรือนไทย') }] };
    }
    throw new Error(`unexpected sql: ${sql}`);
  });
});

describe('listServices', () => {
  it('maxParty และ lastSlot คำนวณจากข้อมูล และเงินเป็นบาทเต็ม', async () => {
    const services = await listServices();
    expect(services.map((s) => s.id)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'P01', 'K01']);
    expect(Object.fromEntries(services.map((s) => [s.id, s.maxParty]))).toEqual({
      S01: 6, S02: 6, S03: 4, S04: 3, S05: 5, S06: 2, S07: 2, P01: 3, K01: 1,
    });
    expect(Object.fromEntries(services.map((s) => [s.id, s.lastSlot]))).toEqual({
      S01: '21:00', S02: '20:30', S03: '21:00', S04: '20:30', S05: '21:00', S06: '21:00', S07: '21:00', P01: '20:00', K01: '21:00',
    });
    expect(services[0].price).toBe(1000);
    expect(services[8].price).toBe(15000);
    expect(services[0].herbs.map((h) => h.id)).toEqual([1]);
    expect(services[1].herbs).toEqual([]);
    expect(services[6].therapistIds).toEqual(['T04', 'T05']);
  });

  it('getService ตรงรหัสแบบตรงตัวเท่านั้น', async () => {
    expect((await getService('S07'))?.id).toBe('S07');
    expect(await getService('ZZZ')).toBeNull();
    expect(await getService('S01 ')).toBeNull();
  });
});

describe('listHerbs และ listHotels', () => {
  it('บอกบริการของสมุนไพร และคงระยะเป็นข้อความ', async () => {
    expect((await listHerbs())[0]).toMatchObject({ id: 1, serviceIds: ['S01', 'K01'] });
    expect((await listHotels())[0]).toMatchObject({ id: 'H01', distanceKm: '2.0' });
  });
});

describe('listTherapists', () => {
  it('ไม่มีตัวกรองเรียงตามรหัส และคะแนนตรงข้อมูลร้าน', async () => {
    const therapists = await listTherapists();
    expect(therapists.map((t) => t.id)).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06']);
    expect(therapists.map((t) => t.ratingText)).toEqual(['5.0', '4.5', '4.4', null, '4.6', '4.0']);
    expect(therapists.map((t) => t.passesFilter)).toEqual([true, true, false, false, true, false]);
    expect(therapists[3]).toMatchObject({ rating: null, reviewCount: 0, stars: [] });
    expect(therapists[0].title).toEqual({ th: 'นักบำบัด', en: 'Therapist', zh: '理疗师' });
  });

  it('กรองตามบริการแล้วเรียงตามรหัส', async () => {
    expect((await listTherapists({ serviceId: 'S07' })).map((t) => t.id)).toEqual(['T04', 'T05']);
  });

  it('ตัวกรอง 4.5 ดาวเรียงคะแนนมากไปน้อย ไม่มี T03 T06 T04', async () => {
    expect((await listTherapists({ minRating: 4.5 })).map((t) => t.id)).toEqual(['T01', 'T05', 'T02']);
  });

  it('ใช้ตัวกรองคู่กับบริการ', async () => {
    expect((await listTherapists({ serviceId: 'S07', minRating: 4.5 })).map((t) => t.id)).toEqual(['T05']);
  });
});

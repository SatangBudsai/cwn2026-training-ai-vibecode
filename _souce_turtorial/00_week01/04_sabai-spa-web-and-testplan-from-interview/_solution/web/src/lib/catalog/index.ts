// แคตตาล็อกอ่านจากฐานข้อมูลทุกครั้ง · หน้า server component ของ F1, F2, F3 เรียกตรงได้ (ไม่ต้อง fetch)
import { minutesToTime } from '@/lib/date';
import { query } from '@/lib/db';
import { numericToBaht } from '@/lib/money';
import { averageRating, passesRatingFilter } from '@/lib/rules/rating';
import type {
  Herb,
  Hotel,
  HotelId,
  I18nText,
  Service,
  ServiceId,
  ServiceKind,
  Therapist,
  TherapistId,
} from '@/types';

const CLOSE_MINUTES = 22 * 60;

type NameRow = { name_th: string; name_en: string; name_zh: string };
type HerbRow = NameRow & { id: number; image_path: string };
type ServiceRow = NameRow & {
  id: ServiceId;
  kind: ServiceKind;
  duration_minutes: number;
  price: string;
  image_path: string;
};
type TherapistRow = NameRow & {
  id: TherapistId;
  title_th: string;
  title_en: string;
  title_zh: string;
  photo_path: string;
};
type HotelRow = NameRow & { id: HotelId; distance_km: string };

function nameOf(row: NameRow): I18nText {
  return { th: row.name_th, en: row.name_en, zh: row.name_zh };
}

/** จับคู่ key → รายการ โดยคงลำดับของแถวที่ query เรียงมาแล้ว */
function groupBy<K, V>(rows: V[], keyOf: (row: V) => K): Map<K, V[]> {
  const groups = new Map<K, V[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export async function listHerbs(): Promise<Herb[]> {
  const [herbs, links] = await Promise.all([
    query<HerbRow>('SELECT id, name_th, name_en, name_zh, image_path FROM herbs ORDER BY id'),
    query<{ herb_id: number; service_id: ServiceId }>(
      `SELECT sh.herb_id, sh.service_id
         FROM service_herbs sh
         JOIN services s ON s.id = sh.service_id
        ORDER BY s.sort_order`,
    ),
  ]);
  const servicesOfHerb = groupBy(links.rows, (link) => link.herb_id);
  return herbs.rows.map((row) => ({
    id: row.id,
    name: nameOf(row),
    imagePath: row.image_path,
    serviceIds: (servicesOfHerb.get(row.id) ?? []).map((link) => link.service_id),
  }));
}

/** 9 รายการเรียงตาม sort_order */
export async function listServices(): Promise<Service[]> {
  const [services, herbs, performers] = await Promise.all([
    query<ServiceRow>(
      `SELECT id, kind, name_th, name_en, name_zh, duration_minutes, price, image_path
         FROM services
        ORDER BY sort_order`,
    ),
    listHerbs(),
    query<{ service_id: ServiceId; therapist_id: TherapistId }>(
      'SELECT service_id, therapist_id FROM therapist_services ORDER BY therapist_id',
    ),
  ]);
  const therapistsOfService = groupBy(performers.rows, (link) => link.service_id);
  return services.rows.map((row) => {
    const therapistIds = (therapistsOfService.get(row.id) ?? []).map((link) => link.therapist_id);
    return {
      id: row.id,
      kind: row.kind,
      name: nameOf(row),
      durationMinutes: row.duration_minutes,
      price: numericToBaht(row.price),
      imagePath: row.image_path,
      herbs: herbs.filter((herb) => herb.serviceIds.includes(row.id)),
      therapistIds,
      // คอร์สจองได้ครั้งละ 1 คน (FR-39) · ที่เหลือเท่าจำนวนนักบำบัดที่ทำได้ (BR-11, BR-12)
      maxParty: row.kind === 'COURSE' ? 1 : therapistIds.length,
      lastSlot: minutesToTime(CLOSE_MINUTES - row.duration_minutes),
    };
  });
}

export async function getService(id: string): Promise<Service | null> {
  const services = await listServices();
  return services.find((service) => service.id === id) ?? null;
}

/**
 * minRating: ตัวกรอง 4.5 ดาว → เรียงคะแนนมากไปน้อย (E222)
 * ไม่มี minRating → เรียงตามรหัส (E237)
 * น้องบัวไม่อยู่ในตาราง therapists จึงไม่มีทางอยู่ในรายชื่อนี้ (FR-07)
 */
export async function listTherapists(opts?: { serviceId?: ServiceId; minRating?: number }): Promise<Therapist[]> {
  const [therapists, skills, reviews] = await Promise.all([
    query<TherapistRow>(
      `SELECT id, name_th, name_en, name_zh, title_th, title_en, title_zh, photo_path
         FROM therapists
        ORDER BY id`,
    ),
    query<{ therapist_id: TherapistId; service_id: ServiceId }>(
      `SELECT ts.therapist_id, ts.service_id
         FROM therapist_services ts
         JOIN services s ON s.id = ts.service_id
        ORDER BY s.sort_order`,
    ),
    query<{ therapist_id: TherapistId; stars: number }>(
      'SELECT therapist_id, stars FROM therapist_reviews ORDER BY id',
    ),
  ]);
  const servicesOfTherapist = groupBy(skills.rows, (skill) => skill.therapist_id);
  const reviewsOfTherapist = groupBy(reviews.rows, (review) => review.therapist_id);

  const all = therapists.rows.map((row): Therapist => {
    const stars = (reviewsOfTherapist.get(row.id) ?? []).map((review) => review.stars);
    const rating = averageRating(stars);
    return {
      id: row.id,
      name: nameOf(row),
      title: { th: row.title_th, en: row.title_en, zh: row.title_zh },
      photoPath: row.photo_path,
      serviceIds: (servicesOfTherapist.get(row.id) ?? []).map((skill) => skill.service_id),
      stars,
      reviewCount: stars.length,
      rating,
      ratingText: rating === null ? null : rating.toFixed(1),
      passesFilter: passesRatingFilter(rating),
    };
  });

  const serviceId = opts?.serviceId;
  const performers = serviceId ? all.filter((therapist) => therapist.serviceIds.includes(serviceId)) : all;

  const minRating = opts?.minRating;
  if (minRating === undefined) return performers;
  return performers
    .filter((therapist) => therapist.rating !== null && therapist.rating >= minRating)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.id.localeCompare(b.id));
}

export async function listHotels(): Promise<Hotel[]> {
  const hotels = await query<HotelRow>('SELECT id, name_th, name_en, name_zh, distance_km FROM hotels ORDER BY id');
  return hotels.rows.map((row) => ({ id: row.id, name: nameOf(row), distanceKm: row.distance_km }));
}

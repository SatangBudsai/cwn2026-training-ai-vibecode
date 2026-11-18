// Wallet, ซื้อคอร์ส, ซื้อ Gift Card · การซื้อทั้งสองแบบไม่แตะยอดสะสมและแต้ม (BR-23) และจ่ายแบบจำลอง (FR-30)
import { getToday } from '@/lib/clock';
import { addDays } from '@/lib/date';
import { query, withTransaction } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type {
  BodyPhoto,
  CreateGiftCardResponse,
  GetGiftCardResponse,
  Locale,
  PurchaseCourseResponse,
  WaistPoint,
  WalletResponse,
} from '@/types';
import {
  COURSE_SERVICE_ID,
  COURSE_TOTAL_SESSIONS,
  COURSE_VALID_DAYS,
  GIFT_CARD_VALID_DAYS,
  parseGiftCardRequest,
  randomGiftCardCode,
  reducedCm,
  simulatedGiftCardMessage,
  toBodyPhoto,
  toCourseSummary,
  toGiftCardSummary,
  type CourseRow,
  type GiftCardRow,
} from './helpers';

const GIFT_CARD_COLUMNS = 'code, design, initial_value, balance, purchased_on, expires_on, delivery_channel';
const CODE_ATTEMPTS = 5;
// รหัสที่ระบบออกและใน seed เป็นตัวอักษรอังกฤษ ตัวเลข และขีด · ค่าอื่นไม่ต้องถามฐานข้อมูล
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** NFR-12: userId มาจาก session เท่านั้น */
export async function getWallet(userId: string): Promise<WalletResponse> {
  const today = await getToday();
  const [courses, waist, photos, giftCards] = await Promise.all([
    query<CourseRow>(
      `SELECT c.id, s.name_th, s.name_en, s.name_zh, c.total_sessions, c.used_sessions, c.reserved_sessions,
              c.purchased_on, c.expires_on, c.price_paid
         FROM course_purchases c
         JOIN services s ON s.id = c.service_id
        WHERE c.user_id = $1
        ORDER BY c.purchased_on DESC, c.id`,
      [userId],
    ),
    query<{ measured_on: string; waist_cm: string }>(
      `SELECT measured_on, waist_cm FROM waist_measurements WHERE user_id = $1 ORDER BY measured_on, id`,
      [userId],
    ),
    query<{ kind: BodyPhoto['kind']; taken_on: string; file_path: string }>(
      `SELECT kind, taken_on, file_path FROM before_after_photos WHERE user_id = $1 ORDER BY taken_on, kind DESC, id`,
      [userId],
    ),
    query<GiftCardRow>(
      `SELECT ${GIFT_CARD_COLUMNS} FROM gift_cards WHERE buyer_user_id = $1 ORDER BY purchased_on DESC, code`,
      [userId],
    ),
  ]);

  const points: WaistPoint[] = waist.rows.map((r) => ({ date: r.measured_on, cm: r.waist_cm }));
  return {
    courses: courses.rows.map((r) => toCourseSummary(r, today)),
    waist: { points, reducedCm: reducedCm(points) },
    photos: photos.rows.map(toBodyPhoto),
    giftCards: giftCards.rows.map((r) => toGiftCardSummary(r, today)),
  };
}

/** BR-46: ราคาจากตาราง services ไม่มี % ทุกระดับ · body ไม่มีผลกับราคา (FR-50: ใช้บัตรจ่ายไม่ได้) */
export async function purchaseCourse(userId: string): Promise<PurchaseCourseResponse> {
  return withTransaction(async (client) => {
    const user = await client.query<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    // session ที่ค้างจากข้อมูลก่อนรีเซ็ต ไม่มีแถวผู้ใช้แล้ว
    if (user.rows.length === 0) throw new ApiError('unauthorized');
    if (user.rows[0].role !== 'CUSTOMER') throw new ApiError('forbidden');

    const service = await client.query<{ price: string; name_th: string; name_en: string; name_zh: string }>(
      `SELECT price, name_th, name_en, name_zh FROM services WHERE id = $1`,
      [COURSE_SERVICE_ID],
    );
    const k01 = service.rows[0];
    if (!k01) throw new ApiError('service-not-found');

    const today = await getToday(client);
    const inserted = await client.query<{
      id: string;
      total_sessions: number;
      used_sessions: number;
      reserved_sessions: number;
      purchased_on: string;
      expires_on: string;
      price_paid: string;
    }>(
      `INSERT INTO course_purchases (user_id, service_id, price_paid, total_sessions, purchased_on, expires_on, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'SIMULATED')
       RETURNING id, total_sessions, used_sessions, reserved_sessions, purchased_on, expires_on, price_paid`,
      [userId, COURSE_SERVICE_ID, k01.price, COURSE_TOTAL_SESSIONS, today, addDays(today, COURSE_VALID_DAYS)],
    );
    const row = inserted.rows[0];
    return {
      course: toCourseSummary(
        { ...row, name_th: k01.name_th, name_en: k01.name_en, name_zh: k01.name_zh },
        today,
      ),
    };
  });
}

/** แขกซื้อได้ (buyerId = null · D-08) · ไม่เรียกบริการภายนอก ส่งแบบจำลองด้วย simulatedMessage (FR-48) */
export async function createGiftCard(
  body: unknown,
  buyerId: string | null,
  locale: Locale,
): Promise<CreateGiftCardResponse> {
  const input = parseGiftCardRequest(body);
  return withTransaction(async (client) => {
    let buyer: string | null = null;
    if (buyerId) {
      // session ที่ค้างจากข้อมูลก่อนรีเซ็ต นับเป็นแขก ไม่ให้ชน foreign key
      const user = await client.query(`SELECT id FROM users WHERE id = $1`, [buyerId]);
      if (user.rows.length > 0) buyer = buyerId;
    }

    const today = await getToday(client);
    const expiresOn = addDays(today, GIFT_CARD_VALID_DAYS);

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      // ON CONFLICT เพราะ unique violation จะทำให้ transaction ใช้ต่อไม่ได้
      const inserted = await client.query<GiftCardRow>(
        `INSERT INTO gift_cards
           (code, buyer_user_id, design, initial_value, balance, purchased_on, expires_on,
            delivery_channel, recipient, message, payment_status)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, 'SIMULATED')
         ON CONFLICT (code) DO NOTHING
         RETURNING ${GIFT_CARD_COLUMNS}`,
        [
          randomGiftCardCode(),
          buyer,
          input.design,
          input.amount,
          today,
          expiresOn,
          input.channel,
          input.recipient,
          input.message,
        ],
      );
      if (inserted.rows[0]) {
        const giftCard = toGiftCardSummary(inserted.rows[0], today);
        return { giftCard, simulatedMessage: simulatedGiftCardMessage(giftCard, locale) };
      }
    }
    throw new ApiError('internal');
  });
}

/** TD-12: ใครมีรหัสก็ดูได้ · ไม่คืน recipient และ message */
export async function getGiftCard(code: string): Promise<GetGiftCardResponse> {
  if (!CODE_PATTERN.test(code)) throw new ApiError('giftcard-not-found');
  const res = await query<GiftCardRow>(`SELECT ${GIFT_CARD_COLUMNS} FROM gift_cards WHERE code = $1`, [code]);
  const row = res.rows[0];
  if (!row) throw new ApiError('giftcard-not-found');
  return { giftCard: toGiftCardSummary(row, await getToday()) };
}

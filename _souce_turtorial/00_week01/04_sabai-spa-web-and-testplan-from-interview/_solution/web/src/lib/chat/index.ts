// ต่อแชตเข้ากับของจริง: session นาฬิกา แคตตาล็อก loadAndQuote และ createBooking (D-17)
import { createBooking } from '@/lib/booking/create';
import { listServices } from '@/lib/catalog';
import { getNow } from '@/lib/clock';
import { bangkokDate } from '@/lib/date';
import { getPool } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { loadAndQuote } from '@/lib/pricing/quote';
import { getSession } from '@/lib/session';
import type { ChatResponse, Locale, QuoteResponse } from '@/types';
import { runChat } from './engine';

const MAX_MESSAGE_LENGTH = 1000;

/** body มาจาก client · message ต้องเป็นข้อความไม่ว่าง · state ที่เสียถูกทิ้งใน normalizeChatState */
export async function handleChat(body: unknown, requestLocale: Locale): Promise<ChatResponse> {
  const { message, state } = (typeof body === 'object' && body !== null ? body : {}) as {
    message?: unknown;
    state?: unknown;
  };
  if (typeof message !== 'string' || message.trim() === '' || message.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError('validation');
  }

  const session = await getSession();
  // OWNER นับเป็นแขก (สัญญา 2.2)
  const userId = session?.role === 'CUSTOMER' ? session.userId : null;
  const [services, now] = await Promise.all([listServices(), getNow()]);
  const today = bangkokDate(now);

  return runChat(
    { message, state, requestLocale },
    {
      services,
      today,
      isMember: userId !== null,
      quote: async (req): Promise<QuoteResponse> => {
        // internal เป็นค่าภายในของ createBooking ห้ามออกไปใน API
        const { internal: _internal, ...quote } = await loadAndQuote(getPool(), req, {
          userId,
          today,
          now,
          forUpdate: false,
        });
        return quote;
      },
      book: (req) => createBooking(req, { userId }),
    },
  );
}

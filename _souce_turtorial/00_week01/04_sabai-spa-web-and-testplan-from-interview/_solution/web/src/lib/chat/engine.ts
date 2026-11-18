// ขั้นตอนตอบแชต · กฎตายตัวล้วน ไม่เรียกบริการภายนอก · ราคาและการจองผ่าน deps ตัวเดียวกับหน้าจอง (FR-60, NFR-14)
import { a5 } from '@/i18n/a5';
import type { ErrorCode } from '@/i18n/errors';
import { format } from '@/i18n/locales';
import { ApiError, toApiError } from '@/lib/errors';
import { formatBaht } from '@/lib/format';
import { isBookableSlot } from '@/lib/rules/slots';
import {
  bookingDateProblem,
  CHAT_BOOKABLE_IDS,
  cleanText,
  detectLanguage,
  isAffirmative,
  isBookingRequest,
  isCancel,
  isGreeting,
  isHoursQuestion,
  isNegative,
  isPriceQuestion,
  matchServiceIds,
  normalizeChatState,
  parseBookingSlots,
  parseGuest,
  wantsReferral,
  type ChatFlowState,
} from '@/lib/rules/chat';
import type {
  BookingDetail,
  ChatResponse,
  ChatState,
  CreateBookingRequest,
  Locale,
  QuoteRequest,
  QuoteResponse,
  Service,
  ServiceId,
} from '@/types';

const THAI_BLOCK = /[฀-๿]/;

export interface ChatDeps {
  services: Service[];
  today: string;
  /** ลูกค้าที่เข้าสู่ระบบ · OWNER นับเป็นแขกตามสัญญา 2.2 */
  isMember: boolean;
  quote: (req: QuoteRequest) => Promise<QuoteResponse>;
  book: (req: CreateBookingRequest) => Promise<BookingDetail>;
}

export interface ChatInput {
  message: string;
  state?: unknown;
  /** ภาษาของ request · ใช้เมื่อข้อความไม่บอกภาษาและ state ก็ไม่บอก */
  requestLocale: Locale;
}

interface Turn {
  deps: ChatDeps;
  lang: Locale;
  m: (typeof a5)[Locale];
}

// ---------- ข้อความ ----------

function money(amount: number, lang: Locale): string {
  return formatBaht(amount, lang);
}

function serviceOf(turn: Turn, id: ServiceId | undefined): Service | undefined {
  return turn.deps.services.find((service) => service.id === id);
}

function priceLine(turn: Turn, service: Service): string {
  const template = service.kind === 'COURSE' ? turn.m.chatPriceLineCourse : turn.m.chatPriceLine;
  return format(template, {
    id: service.id,
    name: service.name[turn.lang],
    price: money(service.price, turn.lang),
    minutes: service.durationMinutes,
  });
}

function bookingPath(lang: Locale, serviceId?: ServiceId): string {
  return `/${lang}/booking${serviceId ? `?service=${serviceId}` : ''}`;
}

function bookableLines(turn: Turn): string[] {
  return turn.deps.services
    .filter((service) => CHAT_BOOKABLE_IDS.includes(service.id))
    .map((service) => priceLine(turn, service));
}

function ruleMessage(turn: Turn, err: ApiError): string {
  return err.messages[turn.lang];
}

/** กฎที่แชตแจ้งได้เองก่อนถึงขั้นคิดราคา ใช้ข้อความจากแคตตาล็อกกลางเดียวกัน */
function ruleError(turn: Turn, code: ErrorCode): string {
  return ruleMessage(turn, new ApiError(code));
}

function summaryLines(turn: Turn, state: ChatFlowState, quote: QuoteResponse): string[] {
  const { m, lang } = turn;
  const service = serviceOf(turn, state.serviceId);
  const lines = [
    format(m.chatSummary, {
      service: service?.name[lang] ?? '',
      date: state.date ?? '',
      time: state.time ?? '',
      party: state.partySize ?? 0,
    }),
    format(m.chatSummaryFull, { amount: money(quote.lines.fullPrice, lang) }),
  ];
  if (quote.lines.discountAmount > 0) {
    lines.push(
      format(m.chatSummaryDiscount, {
        percent: quote.lines.discountPercent,
        amount: money(quote.lines.discountAmount, lang),
      }),
    );
  }
  lines.push(format(m.chatSummaryPay, { amount: money(quote.lines.payAtShop, lang) }));
  if (quote.under24h) lines.push(m.chatUnder24h);
  return lines;
}

/** โหมดจีนห้ามมีอักขระไทย ชื่อที่ลูกค้าพิมพ์เป็นไทยจึงไม่สะท้อนกลับ */
function guestLine(turn: Turn, state: ChatFlowState): string | null {
  if (turn.deps.isMember || !state.guestPhone) return null;
  const { guestName: name, guestPhone: phone } = state;
  if (!name) return null;
  if (turn.lang === 'zh' && THAI_BLOCK.test(name)) return format(turn.m.chatSummaryGuestPhone, { phone });
  return format(turn.m.chatSummaryGuest, { name, phone });
}

// ---------- state ----------

function clean(state: ChatFlowState): ChatFlowState {
  return Object.fromEntries(Object.entries(state).filter(([, value]) => value !== undefined)) as ChatFlowState;
}

function nextStep(state: ChatFlowState, isMember: boolean): ChatState['step'] {
  if (!state.serviceId) return 'service';
  if (!state.date) return 'date';
  if (!state.time) return 'time';
  if (!state.partySize) return 'party';
  if (!isMember && (!state.guestName || !state.guestPhone)) return 'guest';
  return 'confirm';
}

function promptFor(turn: Turn, state: ChatFlowState): string[] {
  const { m, deps } = turn;
  const step = nextStep(state, deps.isMember);
  switch (step) {
    case 'service':
      return [m.chatAskService, ...bookableLines(turn)];
    case 'date':
      return [m.chatAskDate];
    case 'time':
      return [format(m.chatAskTime, { lastSlot: serviceOf(turn, state.serviceId)?.lastSlot ?? '21:00' })];
    case 'party':
      return [format(m.chatAskParty, { max: serviceOf(turn, state.serviceId)?.maxParty ?? 6 })];
    case 'guest':
      if (state.guestName) return [m.chatAskGuestPhone];
      if (state.guestPhone) return [m.chatAskGuestName];
      return [m.chatAskGuest];
    default:
      return [m.chatConfirmHint];
  }
}

function reply(
  turn: Turn,
  intent: ChatResponse['intent'],
  lines: string[],
  state: ChatFlowState,
  extra?: Pick<ChatResponse, 'quote' | 'booking'>,
): ChatResponse {
  const inFlow = state.step !== 'idle';
  return {
    reply: lines.join('\n'),
    language: turn.lang,
    intent,
    state: inFlow ? clean({ ...state, language: turn.lang }) : { step: 'idle' },
    ...extra,
  };
}

const IDLE: ChatFlowState = { step: 'idle' };

/** ย้อนกลับไปถามช่องที่ผิดกฎ · คืน null เมื่อเป็น error ที่แชตแก้ให้ไม่ได้ */
function rollback(turn: Turn, code: string, state: ChatFlowState): ChatFlowState | null {
  const next: ChatFlowState = { ...state, quotedPayAtShop: undefined };
  switch (code) {
    case 'same-day-call':
    case 'date-out-of-range':
      return { ...next, date: undefined };
    case 'invalid-slot':
    case 'slot-taken':
      return { ...next, time: undefined };
    case 'party-too-large-call':
      return { ...next, partySize: undefined };
    case 'not-enough-therapists': {
      // เกินจำนวนคนที่ทำบริการได้ต้องลดคน · ไม่เกินแต่รอบนั้นคนไม่พอให้เปลี่ยนเวลา
      const max = serviceOf(turn, state.serviceId)?.maxParty ?? 0;
      return (state.partySize ?? 0) > max ? { ...next, partySize: undefined } : { ...next, time: undefined };
    }
    case 'service-not-found':
      return { ...next, serviceId: undefined };
    case 'guest-info-required':
    case 'phone-invalid':
      return { ...next, guestPhone: undefined };
    default:
      return null;
  }
}

// ---------- คิดราคาและจอง ----------

function ruleFailure(err: unknown): ApiError {
  const api = toApiError(err);
  // ระบบขัดข้องไม่ใช่กฎ ให้ withApi ตอบ 500 ตามปกติ
  if (api.code === 'internal') throw api;
  return api;
}

/** มีครบ 4 ช่องแล้วคิดราคาด้วย loadAndQuote ตัวเดียวกับหน้าจอง แล้วถามช่องถัดไป */
async function advance(turn: Turn, state: ChatFlowState, notices: string[]): Promise<ChatResponse> {
  const { deps, m } = turn;
  const service = serviceOf(turn, state.serviceId);
  const step = nextStep(state, deps.isMember);
  if (!service || !state.date || !state.time || !state.partySize) {
    return reply(turn, 'booking', [...notices, ...promptFor(turn, state)], { ...state, step });
  }
  if (!isBookableSlot(state.time, service.durationMinutes)) {
    const cleared = { ...state, time: undefined, quotedPayAtShop: undefined };
    return advance(turn, cleared, [...notices, ruleError(turn, 'invalid-slot')]);
  }

  let quote: QuoteResponse;
  try {
    quote = await deps.quote({
      serviceId: state.serviceId as ServiceId,
      partySize: state.partySize,
      date: state.date,
      time: state.time,
    });
  } catch (err) {
    const failure = ruleFailure(err);
    const back = rollback(turn, failure.code, state);
    if (back) return advance(turn, back, [...notices, ruleMessage(turn, failure)]);
    const path = format(m.chatReferral, { path: bookingPath(turn.lang, state.serviceId) });
    return reply(turn, 'booking', [...notices, ruleMessage(turn, failure), path], IDLE);
  }

  const quoted: ChatFlowState = { ...state, step, quotedPayAtShop: quote.lines.payAtShop };
  const guest = guestLine(turn, quoted);
  const lines = [...notices, ...summaryLines(turn, quoted, quote), ...(guest ? [guest] : []), ...promptFor(turn, quoted)];
  return reply(turn, 'booking', lines, quoted, { quote });
}

async function confirmBooking(turn: Turn, state: ChatFlowState): Promise<ChatResponse> {
  const { deps, m, lang } = turn;
  const request: CreateBookingRequest = {
    serviceId: state.serviceId as ServiceId,
    partySize: state.partySize as number,
    date: state.date as string,
    time: state.time as string,
  };
  if (!deps.isMember) request.guest = { name: state.guestName as string, phone: state.guestPhone as string };
  if (state.quotedPayAtShop !== undefined) request.expectedPayAtShop = state.quotedPayAtShop;

  let booking: BookingDetail;
  try {
    booking = await deps.book(request);
  } catch (err) {
    const failure = ruleFailure(err);
    // ราคาเปลี่ยนระหว่างรอยืนยัน: คิดใหม่ให้ลูกค้าเห็นก่อน ไม่จองด้วยยอดที่ไม่ได้เห็น
    const back =
      failure.code === 'price-changed' ? { ...state, quotedPayAtShop: undefined } : rollback(turn, failure.code, state);
    if (back) return advance(turn, back, [ruleMessage(turn, failure)]);
    const path = format(m.chatReferral, { path: bookingPath(lang, state.serviceId) });
    return reply(turn, 'booking', [ruleMessage(turn, failure), path], IDLE);
  }

  const lines = [
    format(m.chatBooked, { code: booking.bookingCode }),
    format(m.chatSummary, {
      service: booking.serviceName[lang],
      date: booking.date,
      time: booking.time,
      party: booking.partySize,
    }),
    format(m.chatSummaryPay, { amount: money(booking.lines.payAtShop, lang) }),
  ];
  if (booking.therapists.length > 0) {
    lines.push(
      format(m.chatBookedTherapists, {
        names: booking.therapists.map((therapist) => therapist.name[lang]).join(', '),
      }),
    );
  }
  return reply(turn, 'booking', lines, IDLE, { booking });
}

// ---------- ขั้นตอนจอง ----------

function collectGuest(turn: Turn, state: ChatFlowState, cleaned: string, notices: string[]): ChatFlowState {
  const guest = parseGuest(cleaned);
  if (guest.phoneInvalid) notices.push(ruleError(turn, 'phone-invalid'));
  return {
    ...state,
    guestName: guest.name ?? state.guestName,
    guestPhone: guest.phone ?? state.guestPhone,
  };
}

async function continueFlow(
  turn: Turn,
  state: ChatFlowState,
  cleaned: string,
  text: string,
  startedNow: boolean,
): Promise<ChatResponse> {
  const { deps, m, lang } = turn;
  const step = nextStep(state, deps.isMember);

  // ขั้นกรอกชื่อ ข้อความทั้งหมดคือชื่อกับเบอร์ ไม่ตีความเป็นบริการหรือเวลา
  // state.step ต้องเป็น guest ด้วย ไม่งั้น "ยืนยัน" จาก state ที่ขาดชื่อจะกลายเป็นชื่อผู้จอง
  if (state.step === 'guest' && step === 'guest') {
    const notices: string[] = [];
    const next = collectGuest(turn, state, cleaned, notices);
    return advance(turn, { ...next, quotedPayAtShop: undefined }, notices);
  }

  const notices: string[] = [];
  const next: ChatFlowState = { ...state };
  let understood = startedNow || isGreeting(text);
  let changed = false;

  const ids = matchServiceIds(text);
  const offPath = ids.find((id) => !CHAT_BOOKABLE_IDS.includes(id));
  if (offPath) {
    understood = true;
    const name = serviceOf(turn, offPath)?.name[lang] ?? offPath;
    notices.push(format(m.chatReferralService, { name, path: bookingPath(lang, offPath) }));
    if (startedNow) return reply(turn, 'booking', notices, IDLE);
  } else if (ids.length === 1) {
    understood = true;
    if (ids[0] !== next.serviceId) {
      next.serviceId = ids[0];
      changed = true;
    }
  } else if (ids.length > 1) {
    understood = true;
    notices.push(m.chatAmbiguousService);
    for (const id of ids) {
      const service = serviceOf(turn, id);
      if (service) notices.push(priceLine(turn, service));
    }
  }

  const slots = parseBookingSlots(text, step, deps.today);
  if (slots.dateInvalid) {
    understood = true;
    notices.push(m.chatDateInvalid);
  } else if (slots.date) {
    understood = true;
    const problem = bookingDateProblem(slots.date, deps.today);
    if (problem) {
      notices.push(ruleError(turn, problem));
      next.date = undefined;
      changed = true;
    } else if (slots.date !== next.date) {
      next.date = slots.date;
      changed = true;
    }
  }
  if (slots.timeInvalid) {
    understood = true;
    notices.push(ruleError(turn, 'invalid-slot'));
  } else if (slots.time) {
    understood = true;
    if (slots.time !== next.time) {
      next.time = slots.time;
      changed = true;
    }
  }
  if (slots.party !== undefined) {
    understood = true;
    if (slots.party >= 7) {
      notices.push(ruleError(turn, 'party-too-large-call'));
      next.partySize = undefined;
      changed = true;
    } else if (slots.party >= 1 && slots.party !== next.partySize) {
      next.partySize = slots.party;
      changed = true;
    } else if (slots.party < 1) {
      notices.push(m.chatNotUnderstood);
    }
  }
  if (slots.phone && !deps.isMember && slots.phone !== next.guestPhone) {
    understood = true;
    next.guestPhone = slots.phone;
    changed = true;
  }

  if (state.step === 'confirm' && !changed && notices.length === 0) {
    if (isNegative(text)) return reply(turn, 'booking', [m.chatCancelled], IDLE);
    if (isAffirmative(text) && step === 'confirm') return confirmBooking(turn, state);
    if (!isAffirmative(text)) notices.push(m.chatNotUnderstood);
  } else if (!understood) {
    notices.push(m.chatNotUnderstood);
  }
  return advance(turn, changed ? { ...next, quotedPayAtShop: undefined } : next, notices);
}

// ---------- ทางเข้า ----------

export async function runChat(input: ChatInput, deps: ChatDeps): Promise<ChatResponse> {
  const cleaned = cleanText(input.message);
  const text = cleaned.toLowerCase();
  const state = normalizeChatState(input.state);
  const inFlow = state.step !== 'idle';
  const guestTurn = state.step === 'guest' && !deps.isMember;

  // ขั้นกรอกชื่อ ข้อความที่มีตัวเลขคือชื่อกับเบอร์เสมอ ไม่ใช่คำถาม
  const canAsk = !(guestTurn && /\d/.test(text));
  const wantsHours = canAsk && isHoursQuestion(text, inFlow);
  const wantsPrice = canAsk && isPriceQuestion(text);

  // ชื่อที่พิมพ์ไม่บอกภาษาของบทสนทนา ("Li Wei" ในโหมดจีน)
  const signal = detectLanguage(cleaned);
  const lang =
    guestTurn && !wantsHours && !wantsPrice
      ? (state.language ?? signal ?? input.requestLocale)
      : (signal ?? state.language ?? input.requestLocale);
  const turn: Turn = { deps, lang, m: a5[lang] };
  const { m } = turn;
  const resume = inFlow ? promptFor(turn, state) : [];

  if (wantsHours) return reply(turn, 'hours', [m.chatHours, ...resume], state);

  if (wantsPrice) {
    const named = matchServiceIds(text);
    if (named.length === 0 && wantsReferral(text)) {
      return reply(turn, 'booking', [format(m.chatReferral, { path: bookingPath(lang) }), ...resume], state);
    }
    const ids = named.length > 0 ? named : state.serviceId ? [state.serviceId] : [];
    const services = ids.length > 0 ? deps.services.filter((s) => ids.includes(s.id)) : deps.services;
    const title = ids.length > 0 ? [] : [m.chatPriceTitle];
    return reply(turn, 'price', [...title, ...services.map((s) => priceLine(turn, s)), ...resume], state);
  }

  if (inFlow && isCancel(text)) return reply(turn, 'booking', [m.chatCancelled], IDLE);

  if (!guestTurn && wantsReferral(text)) {
    return reply(turn, 'booking', [format(m.chatReferral, { path: bookingPath(lang) }), ...resume], state);
  }

  if (inFlow) return continueFlow(turn, state, cleaned, text, false);

  if (isBookingRequest(text)) return continueFlow(turn, { step: 'service' }, cleaned, text, true);
  if (isGreeting(text)) return reply(turn, 'greeting', [m.chatGreeting], IDLE);

  const named = deps.services.filter((service) => matchServiceIds(text).includes(service.id));
  if (named.length > 0) return reply(turn, 'price', named.map((s) => priceLine(turn, s)), IDLE);

  return reply(turn, 'fallback', [m.chatFallback], IDLE);
}

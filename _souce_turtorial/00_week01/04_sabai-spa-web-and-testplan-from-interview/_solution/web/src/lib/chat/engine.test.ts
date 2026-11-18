import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/errors';
import type {
  BookingDetail,
  ChatResponse,
  CreateBookingRequest,
  Locale,
  QuoteRequest,
  QuoteResponse,
  Service,
  ServiceId,
} from '@/types';
import { runChat, type ChatDeps } from './engine';

const THAI_BLOCK = /[฀-๿]/;
const TODAY = '2026-06-15';

function service(id: ServiceId, th: string, en: string, zh: string, minutes: number, price: number, max: number): Service {
  return {
    id,
    kind: id === 'K01' ? 'COURSE' : id === 'P01' ? 'PACKAGE' : 'SERVICE',
    name: { th, en, zh },
    durationMinutes: minutes,
    price,
    imagePath: '',
    herbs: [],
    therapistIds: [],
    maxParty: max,
    lastSlot: `${String(Math.floor((1320 - minutes) / 60)).padStart(2, '0')}:${String((1320 - minutes) % 60).padStart(2, '0')}`,
  };
}

const SERVICES: Service[] = [
  service('S01', 'นวดไทย 60 นาที', 'Thai Massage 60', '泰式按摩 60分钟', 60, 1000, 6),
  service('S02', 'นวดไทย 90 นาที', 'Thai Massage 90', '泰式按摩 90分钟', 90, 1400, 6),
  service('S03', 'ประคบสมุนไพร', 'Herbal Compress', '草药热敷', 60, 1200, 4),
  service('S04', 'นวดน้ำมันอโรมา', 'Aroma Oil Massage', '香薰精油按摩', 90, 2000, 3),
  service('S05', 'นวดเท้า', 'Foot Massage', '足部按摩', 60, 800, 5),
  service('S06', 'ขัดผิวสมุนไพร', 'Herbal Body Scrub', '草药身体磨砂', 60, 1500, 2),
  service('S07', 'ทรีตเมนต์หน้า', 'Herbal Facial', '草药面部护理', 60, 1800, 2),
  service('P01', 'แพ็กเกจ Bangkok Relax', 'Bangkok Relax', '曼谷放松套餐', 120, 2900, 3),
  service('K01', 'คอร์สกระชับสัดส่วน 10 แถม 1', 'Body Contouring Course', '塑形疗程', 60, 15000, 1),
];

function quoteOf(req: QuoteRequest, percent: 0 | 5 = 0): QuoteResponse {
  const full = (SERVICES.find((s) => s.id === req.serviceId)?.price ?? 0) * req.partySize;
  const discount = (full * percent) / 100;
  return {
    serviceId: req.serviceId,
    partySize: req.partySize,
    bookingType: 'SINGLE',
    isCoupleSuite: false,
    lines: {
      fullPrice: full,
      discountPercent: percent,
      discountSource: percent ? 'TIER' : 'NONE',
      discountAmount: discount,
      pointsRedeemed: 0,
      pointsDiscount: 0,
      serviceNet: full - discount,
      cars: 0,
      transportFee: 0,
      totalBeforeGiftCard: full - discount,
      giftCardAmount: 0,
      payAtShop: full - discount,
    },
    tier: null,
    birthday: { offered: false, eligible: false, applied: false, reason: null },
    points: { balance: 0, maxSets: 0, maxRedeemable: 0 },
    giftCard: null,
    course: null,
    pointsEarnedPreview: 0,
    under24h: false,
  };
}

function bookingOf(req: CreateBookingRequest): BookingDetail {
  return {
    bookingCode: 'SJ123456',
    serviceId: req.serviceId,
    serviceName: SERVICES.find((s) => s.id === req.serviceId)?.name ?? { th: '', en: '', zh: '' },
    partySize: req.partySize,
    date: req.date,
    time: req.time,
    therapists: [
      {
        personNo: 1,
        id: 'T01',
        name: { th: 'พี่ศรี', en: "P'Sri", zh: '诗丽' },
        photoPath: '',
      },
    ],
    lines: quoteOf(req).lines,
  } as unknown as BookingDetail;
}

function makeDeps(over: Partial<ChatDeps> = {}) {
  const quote = vi.fn(async (req: QuoteRequest) => quoteOf(req));
  const book = vi.fn(async (req: CreateBookingRequest) => bookingOf(req));
  const deps: ChatDeps = { services: SERVICES, today: TODAY, isMember: false, quote, book, ...over };
  return { deps, quote, book };
}

function chat(message: string, deps: ChatDeps, state?: unknown, requestLocale: Locale = 'th'): Promise<ChatResponse> {
  return runChat({ message, state, requestLocale }, deps);
}

/** เล่นบทสนทนาต่อกัน ส่ง state กลับทุกรอบ */
async function converse(messages: string[], deps: ChatDeps, requestLocale: Locale = 'th'): Promise<ChatResponse[]> {
  const results: ChatResponse[] = [];
  let state: unknown;
  for (const message of messages) {
    const res = await chat(message, deps, state, requestLocale);
    results.push(res);
    state = res.state;
  }
  return results;
}

describe('ถามเวลาเปิด FR-58', () => {
  it('ตอบตามภาษาที่ถาม ไม่ขึ้นกับภาษาของหน้า', async () => {
    const { deps } = makeDeps();
    const zh = await chat('营业时间?', deps);
    expect(zh).toMatchObject({ language: 'zh', intent: 'hours', state: { step: 'idle' } });
    expect(zh.reply).toContain('10:00–22:00');
    expect(zh.reply).not.toMatch(THAI_BLOCK);

    const th = await chat('เปิดกี่โมง', deps, undefined, 'en');
    expect(th).toMatchObject({ language: 'th', intent: 'hours' });
    expect(th.reply).toContain('10:00–22:00');

    const en = await chat('What are your opening hours?', deps, undefined, 'zh');
    expect(en).toMatchObject({ language: 'en', intent: 'hours' });
    expect(en.reply).toContain('10:00–22:00');
  });
});

describe('ถามราคา FR-58', () => {
  it('ไม่ระบุบริการได้ทุกรายการจากข้อมูล', async () => {
    const { deps } = makeDeps();
    const res = await chat('多少钱?', deps);
    expect(res).toMatchObject({ language: 'zh', intent: 'price' });
    expect(res.reply).toContain('1,000');
    expect(res.reply).toContain('15,000');
    expect(res.reply).toContain('泰式按摩 60分钟');
    expect(res.reply).not.toMatch(THAI_BLOCK);
  });

  it('ถามรายบริการได้เฉพาะบริการนั้น', async () => {
    const { deps } = makeDeps();
    const res = await chat('นวดเท้าราคาเท่าไหร่', deps);
    expect(res.intent).toBe('price');
    expect(res.reply).toContain('฿800');
    expect(res.reply).not.toContain('฿1,000');

    const s02 = await chat('泰式按摩90分钟多少钱', deps);
    expect(s02.reply).toContain('1,400');
    expect(s02.reply).not.toContain('1,000 ');

    const code = await chat('how much is S07', deps);
    expect(code.reply).toContain('฿1,800');
  });

  it('นวดไทยไม่บอกนาทีได้ทั้ง 2 ราคา', async () => {
    const { deps } = makeDeps();
    const res = await chat('นวดไทยราคาเท่าไหร่', deps);
    expect(res.reply).toContain('฿1,000');
    expect(res.reply).toContain('฿1,400');
  });

  it('ราคาอ่านจากข้อมูลที่ส่งเข้ามา ไม่ได้เขียนตายในข้อความ', async () => {
    const changed = SERVICES.map((s) => (s.id === 'S05' ? { ...s, price: 999 } : s));
    const { deps } = makeDeps({ services: changed });
    expect((await chat('foot massage price', deps)).reply).toContain('฿999');
  });

  it('พิมพ์ชื่อบริการอย่างเดียวบอกราคา', async () => {
    const { deps } = makeDeps();
    expect(await chat('นวดเท้า', deps)).toMatchObject({ intent: 'price' });
  });
});

describe('ตอบไม่ได้ FR-59', () => {
  it('ใช้ข้อความตายตัวพร้อมเบอร์ร้านตามภาษา', async () => {
    const { deps } = makeDeps();
    for (const [message, language] of [
      ['มีที่จอดรถไหม', 'th'],
      ['tell me a joke', 'en'],
      ['讲个笑话', 'zh'],
    ] as const) {
      const res = await chat(message, deps);
      expect(res).toMatchObject({ language, intent: 'fallback', state: { step: 'idle' } });
      expect(res.reply).toContain('02-123-4567');
    }
  });

  it('ข้อความไม่บอกภาษาใช้ภาษาของ request', async () => {
    const { deps } = makeDeps();
    expect(await chat('???', deps, undefined, 'zh')).toMatchObject({ language: 'zh', intent: 'fallback' });
    expect(await chat('???', deps, undefined, 'en')).toMatchObject({ language: 'en', intent: 'fallback' });
  });
});

describe('ทักทายและคำถามนอกขอบเขตจอง D-17', () => {
  it('ทักทาย', async () => {
    const { deps } = makeDeps();
    expect(await chat('สวัสดี', deps)).toMatchObject({ intent: 'greeting', language: 'th' });
    expect(await chat('你好', deps)).toMatchObject({ intent: 'greeting', language: 'zh' });
    expect((await chat('你好', deps)).reply).not.toMatch(THAI_BLOCK);
  });

  it('แต้ม เดือนเกิด บัตร รถ คอร์ส แนะนำไปหน้าจองตามภาษา', async () => {
    const { deps, quote } = makeDeps();
    for (const message of ['ใช้แต้มได้ไหม', 'มีส่วนลดวันเกิดไหม', 'ขอรถรับส่ง', 'ใช้บัตรของขวัญ', 'ใช้คอร์ส']) {
      const res = await chat(message, deps);
      expect(res.intent, message).toBe('booking');
      expect(res.reply, message).toContain('/th/booking');
    }
    const zh = await chat('可以用积分吗', deps);
    expect(zh.reply).toContain('/zh/booking');
    expect(zh.reply).not.toMatch(THAI_BLOCK);
    expect(quote).not.toHaveBeenCalled();
  });

  it('ระหว่างจองขอเรื่องนอกขอบเขต แนะนำแล้วคงขั้นตอนเดิม', async () => {
    const { deps } = makeDeps();
    const state = { step: 'date', serviceId: 'S01' };
    const res = await chat('use my points', deps, state);
    expect(res.reply).toContain('/en/booking');
    expect(res.state).toMatchObject({ step: 'date', serviceId: 'S01' });
  });

  it('P01 และ K01 จองผ่านแชตไม่ได้ พาไปหน้าจองพร้อมรหัสบริการ', async () => {
    const { deps, quote } = makeDeps();
    const p01 = await chat('จอง P01', deps);
    expect(p01.reply).toContain('/th/booking?service=P01');
    expect(p01.state).toEqual({ step: 'idle' });

    const k01 = await chat('book K01', deps);
    expect(k01.reply).toContain('/en/booking?service=K01');

    const midFlow = await chat('P01', deps, { step: 'service' });
    expect(midFlow.reply).toContain('/th/booking?service=P01');
    expect(midFlow.state).toMatchObject({ step: 'service' });
    expect(quote).not.toHaveBeenCalled();
  });
});

describe('จองผ่านแชต FR-60', () => {
  it('แขกจองทีละขั้นจนได้รหัสการจอง', async () => {
    const { deps, quote, book } = makeDeps();
    const [start, svc, date, time, party, guest, done] = await converse(
      ['จอง', 'S01', '2026-06-17', '14:00', '2', 'สมชาย 0812345678', 'ยืนยัน'],
      deps,
    );
    expect(start).toMatchObject({ intent: 'booking', state: { step: 'service' } });
    expect(svc.state).toMatchObject({ step: 'date', serviceId: 'S01' });
    expect(date.state).toMatchObject({ step: 'time', date: '2026-06-17' });
    expect(time.state).toMatchObject({ step: 'party', time: '14:00' });
    expect(party.state).toMatchObject({ step: 'guest', partySize: 2, quotedPayAtShop: 2000 });
    expect(party.quote?.lines.payAtShop).toBe(2000);
    expect(party.reply).toContain('฿2,000');
    expect(guest.state).toMatchObject({ step: 'confirm', guestName: 'สมชาย', guestPhone: '0812345678' });
    expect(guest.reply).toContain('ยืนยัน');
    expect(guest.booking).toBeUndefined();

    expect(done.booking?.bookingCode).toBe('SJ123456');
    expect(done.reply).toContain('SJ123456');
    expect(done.state).toEqual({ step: 'idle' });
    expect(book).toHaveBeenCalledTimes(1);
    expect(book).toHaveBeenCalledWith({
      serviceId: 'S01',
      partySize: 2,
      date: '2026-06-17',
      time: '14:00',
      guest: { name: 'สมชาย', phone: '0812345678' },
      expectedPayAtShop: 2000,
    });
    expect(quote).toHaveBeenCalledWith({ serviceId: 'S01', partySize: 2, date: '2026-06-17', time: '14:00' });
  });

  it('พิมพ์ครบในข้อความเดียวก็ได้', async () => {
    const { deps } = makeDeps();
    const res = await chat('จอง S04 พรุ่งนี้ 14:00 2 คน', deps);
    expect(res.state).toMatchObject({
      step: 'guest',
      serviceId: 'S04',
      date: '2026-06-16',
      time: '14:00',
      partySize: 2,
    });
    expect(res.quote).toBeDefined();
  });

  it('โหมดจีนทั้งบทสนทนาไม่มีอักขระไทย แม้ลูกค้าตอบเป็นเลขหรือชื่ออังกฤษหรือชื่อไทย', async () => {
    const { deps, book } = makeDeps();
    const results = await converse(
      ['我想预约', 'S01', '明天', '14:00', '2', 'สมชาย 0812345678', '确认'],
      deps,
      'th',
    );
    for (const res of results) {
      expect(res.language).toBe('zh');
      expect(res.reply).not.toMatch(THAI_BLOCK);
    }
    expect(book).toHaveBeenCalledTimes(1);
    expect(results[6].reply).toContain('诗丽');
    expect(results[6].reply).toContain('泰式按摩 60分钟');

    const latin = await converse(['我想预约 S01 明天 14:00 2人', 'Li Wei 0812345678'], makeDeps().deps, 'th');
    expect(latin[1].language).toBe('zh');
    expect(latin[1].state).toMatchObject({ guestName: 'Li Wei', step: 'confirm' });
    expect(latin[1].reply).toContain('Li Wei');
  });

  it('สมาชิกไม่ต้องกรอกชื่อและเบอร์ และใช้ราคาที่หักส่วนลดจาก quote', async () => {
    const { deps, book } = makeDeps({
      isMember: true,
      quote: vi.fn(async (req: QuoteRequest) => quoteOf(req, 5)),
    });
    const res = await chat('จอง S01 พรุ่งนี้ 14:00 1 คน', deps);
    expect(res.state).toMatchObject({ step: 'confirm', quotedPayAtShop: 950 });
    expect(res.reply).toContain('5%');
    expect(res.reply).toContain('฿950');

    const done = await chat('ยืนยัน', deps, res.state);
    expect(done.booking).toBeDefined();
    const request = book.mock.calls[0][0];
    expect(request.guest).toBeUndefined();
    expect(request.expectedPayAtShop).toBe(950);
  });

  it('พรุ่งนี้อ่านจาก today ที่ส่งเข้ามา', async () => {
    const { deps } = makeDeps({ today: '2026-12-31' });
    const res = await chat('S01 tomorrow', deps, { step: 'service' });
    expect(res.state).toMatchObject({ date: '2027-01-01' });
  });

  it('ยืนยันโดยไม่มียอดใน state ก็จองได้ ถ้าช่องครบ', async () => {
    const { deps, book } = makeDeps();
    const res = await chat('ยืนยัน', deps, {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'นิดา',
      guestPhone: '0812345678',
    });
    expect(res.booking).toBeDefined();
    expect(book.mock.calls[0][0].expectedPayAtShop).toBeUndefined();
  });

  it('ยืนยันแต่ state ขาดชื่อ กลับไปถามชื่อ ไม่เอาคำว่ายืนยันเป็นชื่อ', async () => {
    const { deps, book } = makeDeps();
    const res = await chat('ยืนยัน', deps, {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
    });
    expect(res.state).toMatchObject({ step: 'guest' });
    expect(res.state.guestName).toBeUndefined();
    expect(book).not.toHaveBeenCalled();
  });

  it('ขั้นยืนยันแก้ข้อมูลแล้วคิดราคาใหม่ก่อนจอง', async () => {
    const { deps, book, quote } = makeDeps();
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'นิดา',
      guestPhone: '0812345678',
      quotedPayAtShop: 1000,
    };
    const res = await chat('เปลี่ยนเป็น S02', deps, state);
    expect(book).not.toHaveBeenCalled();
    expect(quote).toHaveBeenCalledTimes(1);
    expect(res.state).toMatchObject({ step: 'confirm', serviceId: 'S02', quotedPayAtShop: 1400 });
  });

  it('ปฏิเสธหรือยกเลิกกลับเป็น idle และไม่จอง', async () => {
    const { deps, book } = makeDeps();
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'นิดา',
      guestPhone: '0812345678',
    };
    for (const message of ['ไม่ใช่', 'ยกเลิก', 'no', 'cancel', '不是', '取消']) {
      const res = await chat(message, deps, state);
      expect(res.state, message).toEqual({ step: 'idle' });
    }
    expect(book).not.toHaveBeenCalled();
  });

  it('ถามเวลาเปิดหรือราคาระหว่างจอง ตอบแล้วถามขั้นเดิมต่อ', async () => {
    const { deps } = makeDeps();
    const hours = await chat('营业时间?', deps, { step: 'time', serviceId: 'S01', date: '2026-06-17' });
    expect(hours.intent).toBe('hours');
    expect(hours.reply).toContain('10:00–22:00');
    expect(hours.reply).toContain('21:00');
    expect(hours.state).toMatchObject({ step: 'time', serviceId: 'S01', date: '2026-06-17' });

    const price = await chat('ราคาเท่าไหร่', deps, { step: 'date', serviceId: 'S05' });
    expect(price.intent).toBe('price');
    expect(price.reply).toContain('฿800');
    expect(price.state).toMatchObject({ step: 'date', serviceId: 'S05' });
  });

  it('ขั้นกรอกชื่อ ถามคำถามได้โดยไม่เอาคำถามเป็นชื่อ', async () => {
    const { deps } = makeDeps();
    const state = { step: 'guest', serviceId: 'S01', date: '2026-06-17', time: '14:00', partySize: 1, language: 'th' };
    const res = await chat('营业时间?', deps, state);
    expect(res).toMatchObject({ intent: 'hours', language: 'zh' });
    expect(res.state.guestName).toBeUndefined();
  });

  it('ขอชื่อกับเบอร์ทีละอย่างได้', async () => {
    const { deps } = makeDeps();
    const base = { step: 'guest', serviceId: 'S01', date: '2026-06-17', time: '14:00', partySize: 1 };
    const named = await chat('นิดา', deps, base);
    expect(named.state).toMatchObject({ step: 'guest', guestName: 'นิดา' });
    const phoned = await chat('0812345678', deps, named.state);
    expect(phoned.state).toMatchObject({ step: 'confirm', guestName: 'นิดา', guestPhone: '0812345678' });
  });

  it('ข้อความที่ไม่เข้าใจถามขั้นเดิมซ้ำ ไม่ขยับ state', async () => {
    const { deps } = makeDeps();
    const res = await chat('asdf', deps, { step: 'date', serviceId: 'S01' });
    expect(res.state).toMatchObject({ step: 'date', serviceId: 'S01' });
    expect(res.reply).toContain('2026-06-17');
  });

  it('นวดไทยไม่บอกนาที ให้เลือกก่อนและเก็บช่องอื่นไว้', async () => {
    const { deps } = makeDeps();
    const res = await chat('จองนวดไทย พรุ่งนี้', deps);
    expect(res.state).toMatchObject({ step: 'service', date: '2026-06-16' });
    expect(res.state.serviceId).toBeUndefined();
    expect(res.reply).toContain('฿1,400');
  });
});

describe('แปลง error ของกฎตามภาษาที่ถาม', () => {
  it('วันนี้และเกิน 30 วัน แจ้งทันทีแล้วถามวันใหม่', async () => {
    const { deps, quote } = makeDeps();
    const zh = await chat('今天', deps, { step: 'date', serviceId: 'S01', language: 'zh' });
    expect(zh.reply).toContain('02-123-4567');
    expect(zh.reply).not.toMatch(THAI_BLOCK);
    expect(zh.state).toMatchObject({ step: 'date' });
    expect(zh.state.date).toBeUndefined();

    const far = await chat('2026-07-16', deps, { step: 'date', serviceId: 'S01' });
    expect(far.reply).toContain('30');
    expect(far.state.date).toBeUndefined();

    const edge = await chat('2026-07-15', deps, { step: 'date', serviceId: 'S01' });
    expect(edge.state).toMatchObject({ step: 'time', date: '2026-07-15' });
    expect(quote).not.toHaveBeenCalled();
  });

  it('วันที่ไม่มีจริงไม่รับ', async () => {
    const { deps } = makeDeps();
    const res = await chat('2026-02-31', deps, { step: 'date', serviceId: 'S01' });
    expect(res.state).toMatchObject({ step: 'date' });
    expect(res.state.date).toBeUndefined();
  });

  it('รอบที่ไม่มีจริงหรือจบเกิน 22:00 ได้ invalid-slot', async () => {
    const { deps, quote } = makeDeps();
    const base = { step: 'time', serviceId: 'S02', date: '2026-06-17', partySize: 1 };
    for (const message of ['14:15', '09:30', '21:00']) {
      const res = await chat(message, deps, base);
      expect(res.state.time, message).toBeUndefined();
      expect(res.state.step, message).toBe('time');
      expect(res.reply, message).toContain('ไม่มีรอบเวลานี้');
    }
    expect(quote).not.toHaveBeenCalled();
    const last = await chat('20:30', deps, base);
    expect(last.state).toMatchObject({ time: '20:30' });
  });

  it('7 คนขึ้นไปให้โทร', async () => {
    const { deps } = makeDeps();
    const res = await chat('7', deps, { step: 'party', serviceId: 'S01', date: '2026-06-17', time: '14:00' });
    expect(res.reply).toContain('02-123-4567');
    expect(res.state).toMatchObject({ step: 'party' });
    expect(res.state.partySize).toBeUndefined();
  });

  it('เบอร์ผิดอยู่ขั้นเดิม', async () => {
    const { deps } = makeDeps();
    const base = { step: 'guest', serviceId: 'S01', date: '2026-06-17', time: '14:00', partySize: 1 };
    const res = await chat('Alex 123', deps, base);
    expect(res.reply).toContain('9–10');
    expect(res.state).toMatchObject({ step: 'guest', guestName: 'Alex' });
    expect(res.state.guestPhone).toBeUndefined();
  });

  it('quote ตอบ not-enough-therapists เพราะเกินจำนวนคนที่ทำได้ ถามจำนวนคนใหม่', async () => {
    const { deps } = makeDeps({
      quote: vi.fn(async () => {
        throw new ApiError('not-enough-therapists');
      }),
    });
    const res = await chat('3', deps, { step: 'party', serviceId: 'S06', date: '2026-06-17', time: '14:00', language: 'en' });
    expect(res.reply).toContain('Not enough therapists');
    expect(res.state).toMatchObject({ step: 'party' });
    expect(res.state.partySize).toBeUndefined();
  });

  it('createBooking ตอบ slot-taken ถามเวลาใหม่ตามภาษาที่ถาม', async () => {
    const { deps } = makeDeps({
      book: vi.fn(async () => {
        throw new ApiError('slot-taken');
      }),
    });
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'Li',
      guestPhone: '0812345678',
      language: 'zh',
    };
    const res = await chat('确认', deps, state);
    expect(res.reply).toContain('该时间已被预订');
    expect(res.reply).not.toMatch(THAI_BLOCK);
    expect(res.state).toMatchObject({ step: 'time' });
    expect(res.state.time).toBeUndefined();
    expect(res.booking).toBeUndefined();
  });

  it('createBooking ตอบ not-enough-therapists ในจำนวนที่ทำได้ ให้เปลี่ยนเวลา', async () => {
    const { deps } = makeDeps({
      book: vi.fn(async () => {
        throw new ApiError('not-enough-therapists');
      }),
    });
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 2,
      guestName: 'นิดา',
      guestPhone: '0812345678',
    };
    const res = await chat('ยืนยัน', deps, state);
    expect(res.state).toMatchObject({ step: 'time', partySize: 2 });
  });

  it('ราคาเปลี่ยนระหว่างรอยืนยัน แสดงยอดใหม่ให้ยืนยันอีกครั้ง', async () => {
    const book = vi.fn(async () => {
      throw new ApiError('price-changed');
    });
    const { deps } = makeDeps({ book });
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'นิดา',
      guestPhone: '0812345678',
      quotedPayAtShop: 900,
    };
    const res = await chat('ยืนยัน', deps, state);
    expect(res.reply).toContain('ราคาเปลี่ยน');
    expect(res.state).toMatchObject({ step: 'confirm', quotedPayAtShop: 1000 });
    expect(res.booking).toBeUndefined();
    expect(res.quote?.lines.payAtShop).toBe(1000);
  });

  it('ระบบขัดข้องไม่กลืน error ให้ตอบ 500 ตามปกติ', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { deps } = makeDeps({
      quote: vi.fn(async () => {
        throw new Error('db down');
      }),
    });
    await expect(chat('S01 พรุ่งนี้ 14:00 1 คน', deps, { step: 'service' })).rejects.toMatchObject({ code: 'internal' });
    error.mockRestore();
  });

  it('error ที่แชตแก้ไม่ได้ แนะนำไปหน้าจองและจบขั้นตอน', async () => {
    const { deps } = makeDeps({
      quote: vi.fn(async () => {
        throw new ApiError('course-required');
      }),
    });
    const res = await chat('S01 พรุ่งนี้ 14:00 1 คน', deps, { step: 'service' });
    expect(res.reply).toContain('/th/booking');
    expect(res.state).toEqual({ step: 'idle' });
  });
});

describe('state ที่ client ส่งมา', () => {
  it('state เสียไม่ทำให้ error', async () => {
    const { deps } = makeDeps();
    for (const state of [null, 'x', 1, [], { step: 'nope' }, { step: 'confirm', partySize: 'many' }]) {
      await expect(chat('สวัสดี', deps, state)).resolves.toBeDefined();
    }
  });

  it('state ปลอมบริการนอกขอบเขตถูกทิ้ง', async () => {
    const { deps, book } = makeDeps();
    const res = await chat('ยืนยัน', deps, {
      step: 'confirm',
      serviceId: 'K01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 1,
      guestName: 'x',
      guestPhone: '0812345678',
    });
    expect(book).not.toHaveBeenCalled();
    expect(res.state).toMatchObject({ step: 'service' });
  });
});

describe('ถามเหมือนเดิมตอบเหมือนเดิม NFR-14', () => {
  const scripts: [string, unknown][] = [
    ['营业时间?', undefined],
    ['多少钱?', undefined],
    ['ราคา S01', undefined],
    ['tell me a joke', undefined],
    ['จอง S04 พรุ่งนี้ 14:00 2 คน', undefined],
    ['14:15', { step: 'time', serviceId: 'S01', date: '2026-06-17' }],
    ['0812345678', { step: 'guest', serviceId: 'S01', date: '2026-06-17', time: '14:00', partySize: 1 }],
  ];

  it('ทุกข้อความรัน 20 รอบได้ผลเดียวกันทุกตัวอักษร', async () => {
    for (const [message, state] of scripts) {
      const { deps } = makeDeps();
      const first = JSON.stringify(await chat(message, deps, state));
      for (let round = 0; round < 20; round++) {
        expect(JSON.stringify(await chat(message, deps, state)), message).toBe(first);
      }
    }
  });

  it('โหมดจีนไม่มีอักขระไทยในทุกคำตอบของชุดนี้ รวมถึง ฿', async () => {
    const zhMessages = ['营业时间?', '多少钱?', 'S01 多少钱', '你好', '讲个笑话', '可以用积分吗', '预约', '预约 P01', '预约 K01'];
    for (const message of zhMessages) {
      const { deps } = makeDeps();
      const res = await chat(message, deps);
      expect(res.language, message).toBe('zh');
      expect(res.reply, message).not.toMatch(THAI_BLOCK);
    }
  });
});

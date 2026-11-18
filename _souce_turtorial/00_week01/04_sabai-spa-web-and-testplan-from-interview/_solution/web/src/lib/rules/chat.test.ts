import { describe, expect, it } from 'vitest';
import {
  bookingDateProblem,
  cleanText,
  detectLanguage,
  findPhone,
  isAffirmative,
  isHoursQuestion,
  isNegative,
  isPriceQuestion,
  matchServiceIds,
  normalizeChatState,
  parseBookingSlots,
  parseDate,
  parseGuest,
  parseParty,
  parseTime,
  wantsReferral,
} from './chat';

const TODAY = '2026-06-15';

describe('cleanText', () => {
  it('แปลงตัวเต็มความกว้างและเลขไทย โดยไม่แยกสระอำ', () => {
    expect(cleanText('１４：００')).toBe('14:00');
    expect(cleanText('๑๔:๐๐')).toBe('14:00');
    expect(cleanText('น้ำมัน')).toBe('น้ำมัน');
    expect(matchServiceIds(cleanText('น้ำมัน'))).toEqual(['S04']);
  });

  it('ตัด NUL ที่ PostgreSQL เก็บไม่ได้', () => {
    expect(cleanText('a\u0000b')).toBe('a b');
  });
});

describe('detectLanguage', () => {
  it('แยกจีน ไทย อังกฤษ จากตัวอักษร', () => {
    expect(detectLanguage('营业时间?')).toBe('zh');
    expect(detectLanguage('多少钱?')).toBe('zh');
    expect(detectLanguage('เปิดกี่โมง')).toBe('th');
    expect(detectLanguage('what are your hours')).toBe('en');
    expect(detectLanguage('S01 多少钱')).toBe('zh');
    expect(detectLanguage('ราคา S01')).toBe('th');
  });

  it('ข้อความที่ไม่บอกภาษาคืน null', () => {
    for (const text of ['2', 'S01', '2026-06-17', '14:00', '2pm', 'ok', '???', '฿1,000']) {
      expect(detectLanguage(text)).toBeNull();
    }
  });
});

describe('เจตนา', () => {
  it('คำถามเวลาเปิด', () => {
    for (const text of ['营业时间?', 'เปิดกี่โมง', 'เวลาทำการ', 'what are your opening hours', 'when do you open']) {
      expect(isHoursQuestion(text, false)).toBe(true);
    }
  });

  it('คำกว้างไม่นับเป็นคำถามระหว่างจอง', () => {
    expect(isHoursQuestion('what time', false)).toBe(true);
    expect(isHoursQuestion('what time', true)).toBe(false);
    expect(isHoursQuestion('เปิดกี่โมง', true)).toBe(true);
  });

  it('คำถามราคา', () => {
    for (const text of ['多少钱?', 'ราคาเท่าไหร่', 'how much', 'price', 'กี่บาท', '价格']) {
      expect(isPriceQuestion(text)).toBe(true);
    }
    expect(isPriceQuestion('นวดเท้า')).toBe(false);
  });

  it('คำปฏิเสธมาก่อนคำยืนยัน', () => {
    expect(isAffirmative('ยืนยัน')).toBe(true);
    expect(isAffirmative('确认')).toBe(true);
    expect(isAffirmative('ok')).toBe(true);
    expect(isAffirmative('ไม่ใช่')).toBe(false);
    expect(isNegative('ไม่ใช่')).toBe(true);
    expect(isAffirmative('不是')).toBe(false);
    expect(isAffirmative('book')).toBe(true);
    expect(isAffirmative('no')).toBe(false);
  });

  it('สามารถไม่ถูกตีความว่าพูดถึงรถ', () => {
    expect(wantsReferral('สามารถจองได้ไหม')).toBe(false);
    expect(wantsReferral('มีที่จอดรถไหม')).toBe(false);
    expect(wantsReferral('ขอรถรับส่ง')).toBe(true);
    expect(wantsReferral('use points')).toBe(true);
    expect(wantsReferral('礼品卡')).toBe(true);
  });
});

describe('matchServiceIds', () => {
  it('รู้จักรหัส ชื่อ 3 ภาษา และแยกนวดไทยตามนาที', () => {
    expect(matchServiceIds('s03')).toEqual(['S03']);
    expect(matchServiceIds('s01多少钱')).toEqual(['S01']);
    expect(matchServiceIds('นวดไทย 60 นาที')).toEqual(['S01']);
    expect(matchServiceIds('thai massage 90')).toEqual(['S02']);
    expect(matchServiceIds('泰式按摩90分钟')).toEqual(['S02']);
    expect(matchServiceIds('นวดไทย')).toEqual(['S01', 'S02']);
    expect(matchServiceIds('aroma oil massage')).toEqual(['S04']);
    expect(matchServiceIds('足部按摩')).toEqual(['S05']);
    expect(matchServiceIds('ขัดผิวสมุนไพร')).toEqual(['S06']);
    expect(matchServiceIds('herbal facial')).toEqual(['S07']);
    expect(matchServiceIds('bangkok relax')).toEqual(['P01']);
    expect(matchServiceIds('คอร์สกระชับสัดส่วน')).toEqual(['K01']);
    expect(matchServiceIds('hello')).toEqual([]);
  });
});

describe('parseDate', () => {
  it('เข้าใจ ISO และคำว่าพรุ่งนี้ 3 ภาษาจาก today', () => {
    expect(parseDate('2026-06-17', TODAY).date).toBe('2026-06-17');
    expect(parseDate('2026-6-7', TODAY).date).toBe('2026-06-07');
    expect(parseDate('พรุ่งนี้', TODAY).date).toBe('2026-06-16');
    expect(parseDate('tomorrow', TODAY).date).toBe('2026-06-16');
    expect(parseDate('明天', TODAY).date).toBe('2026-06-16');
    expect(parseDate('后天', TODAY).date).toBe('2026-06-17');
    expect(parseDate('day after tomorrow', TODAY).date).toBe('2026-06-17');
    expect(parseDate('วันนี้', TODAY).date).toBe(TODAY);
    expect(parseDate('tomorrow', '2026-12-31').date).toBe('2027-01-01');
  });

  it('วันที่ไม่มีจริงบอกว่าผิด และไม่มีวันที่คืนว่าง', () => {
    expect(parseDate('2026-02-31', TODAY)).toMatchObject({ invalid: true });
    expect(parseDate('hello', TODAY).date).toBeUndefined();
  });
});

describe('parseTime', () => {
  it('เข้าใจรูปแบบเวลาของ 3 ภาษา', () => {
    const cases: [string, string][] = [
      ['14:00', '14:00'],
      ['14.30', '14:30'],
      ['14:30 น.', '14:30'],
      ['14 น.', '14:00'],
      ['2pm', '14:00'],
      ['2:30 pm', '14:30'],
      ['10am', '10:00'],
      ['12pm', '12:00'],
      ['บ่าย 2', '14:00'],
      ['บ่ายสองโมงครึ่ง', '14:30'],
      ['บ่ายโมง', '13:00'],
      ['2 ทุ่ม', '20:00'],
      ['สองทุ่ม', '20:00'],
      ['10 โมงเช้า', '10:00'],
      ['6 โมงเย็น', '18:00'],
      ['4 โมง', '16:00'],
      ['เที่ยง', '12:00'],
      ['下午2点', '14:00'],
      ['下午两点半', '14:30'],
      ['14点30', '14:30'],
      ['下午2点2位', '14:00'],
      ['晚上8点', '20:00'],
      ['noon', '12:00'],
    ];
    for (const [text, expected] of cases) expect(parseTime(text).time, text).toBe(expected);
  });

  it('เลขเดี่ยวเป็นเวลาเฉพาะขั้นถามเวลา และเวลาที่ไม่มีจริงบอกว่าผิด', () => {
    expect(parseTime('14').time).toBeUndefined();
    expect(parseTime('14', true).time).toBe('14:00');
    expect(parseTime('25:00').invalid).toBe(true);
    expect(parseTime('14:75').time).toBeUndefined();
    expect(parseTime('2 คน').time).toBeUndefined();
  });
});

describe('parseParty', () => {
  it('เข้าใจจำนวนคน 3 ภาษา', () => {
    const cases: [string, number][] = [
      ['2 คน', 2],
      ['สองคน', 2],
      ['คู่', 2],
      ['คนเดียว', 1],
      ['2 people', 2],
      ['two people', 2],
      ['for 3', 3],
      ['for three', 3],
      ['couple', 2],
      ['2人', 2],
      ['两位', 2],
      ['三个人', 3],
      ['7 คน', 7],
    ];
    for (const [text, expected] of cases) expect(parseParty(text), text).toBe(expected);
  });

  it('เลขเดี่ยวเป็นจำนวนคนเฉพาะขั้นถามจำนวนคน', () => {
    expect(parseParty('2')).toBeNull();
    expect(parseParty('2', true)).toBe(2);
    expect(parseParty('two', true)).toBe(2);
    expect(parseParty('两', true)).toBe(2);
    expect(parseParty('สามารถ', true)).toBeNull();
  });
});

describe('parseGuest', () => {
  it('แยกชื่อกับเบอร์ และคงตัวสะกดชื่อ', () => {
    expect(parseGuest('สมชาย 0812345678')).toEqual({ name: 'สมชาย', phone: '0812345678', phoneInvalid: false });
    expect(parseGuest('Li Wei, 081-234-5678')).toEqual({ name: 'Li Wei', phone: '0812345678', phoneInvalid: false });
    expect(parseGuest('ชื่อ นิดา เบอร์ 021234567')).toEqual({ name: 'นิดา', phone: '021234567', phoneInvalid: false });
    expect(parseGuest('姓名：李伟 电话：0812345678')).toEqual({ name: '李伟', phone: '0812345678', phoneInvalid: false });
    expect(parseGuest('0812345678')).toEqual({ name: undefined, phone: '0812345678', phoneInvalid: false });
    expect(parseGuest('สมชาย')).toEqual({ name: 'สมชาย', phone: undefined, phoneInvalid: false });
  });

  it('เบอร์สั้นหรือยาวเกินเป็น phoneInvalid', () => {
    expect(parseGuest('สมชาย 12345678').phoneInvalid).toBe(true);
    expect(parseGuest('สมชาย 08123456789').phoneInvalid).toBe(true);
    expect(parseGuest('สมชาย 123').phoneInvalid).toBe(true);
  });

  it('ไม่นับเลข 8 หลักเป็นเบอร์ในขั้นอื่น', () => {
    expect(findPhone('20260617')).toBeUndefined();
    expect(findPhone('โทร 0812345678')).toBe('0812345678');
  });
});

describe('parseBookingSlots', () => {
  it('อ่านครบจากข้อความเดียว โดยเลขของแต่ละช่องไม่ปนกัน', () => {
    expect(parseBookingSlots('จอง s01 2026-06-17 14:00 2 คน', 'service', TODAY)).toMatchObject({
      date: '2026-06-17',
      time: '14:00',
      party: 2,
    });
    expect(parseBookingSlots('预约 泰式按摩 90分钟 明天 下午2点 两位', 'service', TODAY)).toMatchObject({
      date: '2026-06-16',
      time: '14:00',
      party: 2,
    });
    expect(parseBookingSlots('book s02 tomorrow 2pm for 3', 'service', TODAY)).toMatchObject({
      date: '2026-06-16',
      time: '14:00',
      party: 3,
    });
    expect(parseBookingSlots('2026-06-17', 'party', TODAY).party).toBeUndefined();
    expect(parseBookingSlots('s01', 'party', TODAY).party).toBeUndefined();
    expect(parseBookingSlots('0812345678', 'party', TODAY)).toMatchObject({ phone: '0812345678' });
    expect(parseBookingSlots('0812345678', 'party', TODAY).party).toBeUndefined();
  });
});

describe('bookingDateProblem', () => {
  it('จองได้ตั้งแต่พรุ่งนี้ถึงวันนี้ +30', () => {
    expect(bookingDateProblem(TODAY, TODAY)).toBe('same-day-call');
    expect(bookingDateProblem('2026-06-14', TODAY)).toBe('same-day-call');
    expect(bookingDateProblem('2026-06-16', TODAY)).toBeNull();
    expect(bookingDateProblem('2026-07-15', TODAY)).toBeNull();
    expect(bookingDateProblem('2026-07-16', TODAY)).toBe('date-out-of-range');
  });
});

describe('normalizeChatState', () => {
  it('state ที่เสียกลับเป็น idle และค่าที่ผิดรูปแบบถูกทิ้ง', () => {
    for (const raw of [undefined, null, 'x', 1, [], {}, { step: 'nope' }, { step: 'idle', serviceId: 'S01' }]) {
      expect(normalizeChatState(raw)).toEqual({ step: 'idle' });
    }
    expect(
      normalizeChatState({
        step: 'confirm',
        serviceId: 'K01',
        date: '2026-02-31',
        time: '99:00',
        partySize: 2.5,
        guestName: '  ',
        guestPhone: 'abc',
        language: 'fr',
        quotedPayAtShop: 'free',
        extra: 'x',
      }),
    ).toEqual({ step: 'confirm' });
  });

  it('คงค่าที่ถูกต้องไว้ครบ', () => {
    const state = {
      step: 'confirm',
      serviceId: 'S01',
      date: '2026-06-17',
      time: '14:00',
      partySize: 2,
      guestName: 'นิดา',
      guestPhone: '0812345678',
      language: 'zh',
      quotedPayAtShop: 2000,
    };
    expect(normalizeChatState(state)).toEqual(state);
  });
});

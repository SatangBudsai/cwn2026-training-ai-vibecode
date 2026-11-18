import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/errors';
import { isValidBirthDate, isValidEmail, isValidPassword, isValidPhone, normalizeEmail, parseLogin, parseRegister } from './validation';

const TODAY = '2026-06-15';
const VALID = {
  email: 'New.User@Sabai.Test',
  password: 'Passw0rd',
  fullName: '  คุณทดสอบ  ',
  phone: '0812345678',
  birthDate: '1990-01-31',
};

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    if (err instanceof ApiError) return err.code;
    throw err;
  }
  return 'no-error';
}

describe('อีเมล', () => {
  it('ทำเป็นตัวเล็กและตัดช่องว่างหัวท้าย', () => {
    expect(normalizeEmail('  NIDA@Sabai.TEST ')).toBe('nida@sabai.test');
  });

  it.each(['nida@sabai.test', 'a.b+c@mail.example.co.th'])('รับ %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'nida', 'nida@', '@sabai.test', 'nida@sabai', 'a b@sabai.test', 'a@b@c.test', 'a@b..test', 'a\0@sabai.test'])(
    'ไม่รับ %j',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );

  it('ไม่รับอีเมลยาวเกิน 254 ตัว', () => {
    expect(isValidEmail(`${'a'.repeat(243)}@sabai.test`)).toBe(true);
    expect(isValidEmail(`${'a'.repeat(244)}@sabai.test`)).toBe(false);
  });
});

describe('รหัสผ่าน', () => {
  it('ขอบ 8 ตัว: 7 ไม่ผ่าน 8 ผ่าน', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
  });

  it('นับอีโมจิเป็นตัวเดียว', () => {
    expect(isValidPassword('😀😀😀😀')).toBe(false);
  });

  it.each([undefined, null, 12345678, ['12345678']])('ไม่รับค่าที่ไม่ใช่ข้อความ %j', (value) => {
    expect(isValidPassword(value)).toBe(false);
  });
});

describe('เบอร์โทร', () => {
  it.each(['081234567', '0812345678', '021234567'])('รับ %s', (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });

  it.each(['08123456', '08123456789', '081-234-5678', '081234567a', '０８１２３４５６７', '0812345678\n', 812345678])(
    'ไม่รับ %j',
    (phone) => {
      expect(isValidPhone(phone)).toBe(false);
    },
  );
});

describe('วันเกิด', () => {
  it('ต้องอยู่ก่อนวันนี้ของเว็บ', () => {
    expect(isValidBirthDate('2026-06-14', TODAY)).toBe(true);
    expect(isValidBirthDate('2026-06-15', TODAY)).toBe(false);
    expect(isValidBirthDate('2026-06-16', TODAY)).toBe(false);
  });

  it.each(['1990-02-30', '1990-13-01', '01/02/1990', '1990-1-1', '', undefined, null, 19900101])('ไม่รับ %j', (value) => {
    expect(isValidBirthDate(value, TODAY)).toBe(false);
  });
});

describe('parseRegister', () => {
  it('คืนค่าที่ทำให้เป็นมาตรฐานแล้ว และคงรหัสผ่านเดิม', () => {
    expect(parseRegister(VALID, TODAY)).toEqual({
      email: 'new.user@sabai.test',
      password: 'Passw0rd',
      fullName: 'คุณทดสอบ',
      phone: '0812345678',
      birthDate: '1990-01-31',
    });
  });

  it('ตัดช่องที่ไม่อยู่ในสัญญาทิ้ง เช่น role และรูปหน้า', () => {
    const parsed = parseRegister({ ...VALID, role: 'OWNER', lifetimeSpend: 99999, facePhoto: 'x.jpg' }, TODAY);
    expect(Object.keys(parsed).sort()).toEqual(['birthDate', 'email', 'fullName', 'password', 'phone']);
  });

  it.each([
    ['email', 'bad', 'email-invalid'],
    ['email', undefined, 'email-invalid'],
    ['password', '1234567', 'password-too-short'],
    ['password', undefined, 'password-too-short'],
    ['fullName', '   ', 'name-required'],
    ['fullName', undefined, 'name-required'],
    ['fullName', 'a\0b', 'name-required'],
    ['phone', '123', 'phone-invalid'],
    ['phone', undefined, 'phone-invalid'],
    ['birthDate', TODAY, 'birth-date-invalid'],
    ['birthDate', undefined, 'birth-date-invalid'],
  ])('ช่อง %s ค่า %j ตอบ %s', (field, value, code) => {
    expect(codeOf(() => parseRegister({ ...VALID, [field]: value }, TODAY))).toBe(code);
  });

  it('ผิดหลายช่องตอบช่องแรกตามลำดับสัญญา', () => {
    expect(codeOf(() => parseRegister({}, TODAY))).toBe('email-invalid');
    expect(codeOf(() => parseRegister({ ...VALID, password: '', phone: 'x' }, TODAY))).toBe('password-too-short');
  });

  it.each([null, 'text', 42])('body ไม่ใช่ object %j ตอบ validation', (body) => {
    expect(codeOf(() => parseRegister(body, TODAY))).toBe('validation');
  });
});

describe('parseLogin', () => {
  it('ทำอีเมลเป็นตัวเล็ก และไม่ตัดช่องว่างของรหัสผ่าน', () => {
    expect(parseLogin({ email: 'NIDA@sabai.test', password: ' Nida#2026 ' })).toEqual({
      email: 'nida@sabai.test',
      password: ' Nida#2026 ',
    });
  });

  it.each([
    {},
    { email: 'nida@sabai.test' },
    { password: 'Nida#2026' },
    { email: 123, password: 'Nida#2026' },
    { email: 'nida@sabai.test', password: 12345678 },
    { email: 'a\0@sabai.test', password: 'Nida#2026' },
  ])('ข้อมูล %j ตอบ invalid-credentials', (body) => {
    expect(codeOf(() => parseLogin(body))).toBe('invalid-credentials');
  });
});

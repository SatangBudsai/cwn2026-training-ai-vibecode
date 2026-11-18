/** Form validation shared by client and server. */

export const MSG = {
  name: "กรุณากรอกชื่อ",
  email: "อีเมลไม่ถูกต้อง",
  password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข",
  confirm: "รหัสผ่านไม่ตรงกัน",
  terms: "กรุณายอมรับเงื่อนไข",
  duplicate: "อีเมลนี้ถูกใช้แล้ว",
  login: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  shipName: "กรุณากรอกชื่อผู้รับ",
  shipPhone: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0",
  shipAddress: "กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)",
  shipPostcode: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
} as const;

export const PROVINCES = [
  "กรุงเทพมหานคร",
  "เชียงใหม่",
  "ขอนแก่น",
  "ชลบุรี",
  "ภูเก็ต",
  "นนทบุรี",
  "นครราชสีมา",
  "สงขลา",
  "เชียงราย",
  "อุดรธานี",
] as const;

export type RegisterField = "name" | "email" | "password" | "confirm" | "terms";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /\d/.test(pw);
}

export function validateRegister(input: RegisterInput): Partial<Record<RegisterField, string>> {
  const errors: Partial<Record<RegisterField, string>> = {};
  if (!input.name.trim()) errors.name = MSG.name;
  if (!isValidEmail(input.email)) errors.email = MSG.email;
  if (!isValidPassword(input.password)) errors.password = MSG.password;
  if (input.confirm !== input.password) errors.confirm = MSG.confirm;
  if (!input.terms) errors.terms = MSG.terms;
  return errors;
}

export type Strength = "อ่อน" | "ปานกลาง" | "แข็งแรง";

export function passwordStrength(pw: string): Strength {
  if (!isValidPassword(pw)) return "อ่อน";
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 10 && ((hasLower && hasUpper) || hasSymbol)) return "แข็งแรง";
  return "ปานกลาง";
}

export type ShipField = "name" | "phone" | "address" | "postcode";

export interface ShipInput {
  name: string;
  phone: string;
  address: string;
  province: string;
  postcode: string;
}

/** Training bug #3 (BUG_MODE): phone validation accepts 9 digits. */
export function isValidPhone(phone: string, bugMode = false): boolean {
  const re = bugMode ? /^0\d{8,9}$/ : /^0\d{9}$/;
  return re.test(phone.trim());
}

export function validateShipping(input: ShipInput, bugMode = false): Partial<Record<ShipField, string>> {
  const errors: Partial<Record<ShipField, string>> = {};
  if (!input.name.trim()) errors.name = MSG.shipName;
  if (!isValidPhone(input.phone, bugMode)) errors.phone = MSG.shipPhone;
  if (input.address.trim().length < 10) errors.address = MSG.shipAddress;
  if (!/^\d{5}$/.test(input.postcode.trim())) errors.postcode = MSG.shipPostcode;
  return errors;
}

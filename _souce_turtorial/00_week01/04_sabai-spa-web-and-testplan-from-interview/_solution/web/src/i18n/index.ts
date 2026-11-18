// รวมข้อความทุกส่วน · ใช้ import ตรงจากไฟล์ของตัวเองได้เลย เพื่อไม่ลากทุกภาษาทุกหน้าลง bundle
import { a1 } from './a1';
import { a2 } from './a2';
import { a3 } from './a3';
import { a4 } from './a4';
import { a5 } from './a5';
import { common } from './common';
import { f1 } from './f1';
import { f2 } from './f2';
import { f3 } from './f3';
import { f4 } from './f4';
import { f5 } from './f5';
import { f6 } from './f6';
import { f7 } from './f7';
import { f8 } from './f8';

export { DEFAULT_LOCALE, LOCALES, defineMessages, format, isLocale, parseLocale, pick } from './locales';
export const messages = { common, a1, a2, a3, a4, a5, f1, f2, f3, f4, f5, f6, f7, f8 };

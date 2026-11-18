// แคตตาล็อก error กลาง · code เป็น kebab-case และหน้าเว็บแสดงด้วย data-testid="error-<code>"
import type { I18nText } from '@/types';

export interface ErrorDef extends I18nText {
  status: number;
}

export const ERROR_CATALOG = {
  // ---------- ทั่วไป ----------
  validation: { status: 400, th: 'ข้อมูลไม่ถูกต้อง', en: 'Invalid data', zh: '数据无效' },
  unauthorized: { status: 401, th: 'กรุณาเข้าสู่ระบบ', en: 'Please sign in', zh: '请先登录' },
  forbidden: { status: 403, th: 'ไม่มีสิทธิ์เข้าถึง', en: 'You do not have access', zh: '无权访问' },
  'not-found': { status: 404, th: 'ไม่พบข้อมูล', en: 'Not found', zh: '未找到' },
  internal: { status: 500, th: 'ระบบขัดข้อง กรุณาลองใหม่', en: 'Something went wrong, please try again', zh: '系统出错，请重试' },

  // ---------- จองคิว ----------
  'slot-taken': { status: 409, th: 'เวลานี้ถูกจองแล้ว', en: 'This time has already been booked', zh: '该时间已被预订' },
  'same-day-call': { status: 422, th: 'จองวันนี้ในเว็บไม่ได้ กรุณาโทร 02-123-4567', en: 'Same-day booking is not available online. Please call 02-123-4567', zh: '当天预约无法在线办理，请致电 02-123-4567' },
  'date-out-of-range': { status: 422, th: 'จองได้ตั้งแต่พรุ่งนี้ถึง 30 วันข้างหน้า', en: 'Bookings open from tomorrow up to 30 days ahead', zh: '可预约明天起 30 天内的日期' },
  'invalid-slot': { status: 422, th: 'ไม่มีรอบเวลานี้', en: 'This time slot does not exist', zh: '没有这个时段' },
  'party-too-large-call': { status: 422, th: 'จอง 7 คนขึ้นไปในเว็บไม่ได้ กรุณาโทร 02-123-4567', en: 'Groups of 7 or more cannot book online. Please call 02-123-4567', zh: '7 人及以上无法在线预约，请致电 02-123-4567' },
  'not-enough-therapists': { status: 409, th: 'นักบำบัดที่ทำบริการนี้ว่างไม่ครบจำนวนคน', en: 'Not enough therapists are available for this service', zh: '可提供此服务的理疗师人数不足' },
  'therapist-cannot-perform': { status: 422, th: 'นักบำบัดคนนี้ไม่ได้ทำบริการนี้', en: 'This therapist does not offer this service', zh: '该理疗师不提供此服务' },
  'price-changed': { status: 409, th: 'ราคาเปลี่ยน กรุณาดูสรุปอีกครั้ง', en: 'The price has changed. Please review the summary again', zh: '价格已变动，请重新查看摘要' },
  'guest-info-required': { status: 422, th: 'กรุณากรอกชื่อและเบอร์โทร', en: 'Please enter your name and phone number', zh: '请填写姓名和电话' },
  'phone-invalid': { status: 422, th: 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก', en: 'Phone number must be 9–10 digits', zh: '电话号码须为 9–10 位数字' },
  'service-not-found': { status: 404, th: 'ไม่พบบริการนี้', en: 'Service not found', zh: '未找到此服务' },

  // ---------- คอร์ส ----------
  'course-required': { status: 422, th: 'บริการนี้จองได้ด้วยคอร์สเท่านั้น', en: 'This service can only be booked with a course', zh: '此服务只能用疗程预约' },
  'course-not-found': { status: 404, th: 'ไม่พบคอร์สนี้', en: 'Course not found', zh: '未找到此疗程' },
  'course-used-up': { status: 409, th: 'คอร์สนี้ใช้ครบแล้ว', en: 'This course has been fully used', zh: '此疗程已用完' },
  'course-expired': { status: 422, th: 'หมดอายุสำหรับวันนี้', en: 'Expired for this date', zh: '此日期已过期' },
  'course-one-person': { status: 422, th: 'จองด้วยคอร์สได้ครั้งละ 1 คน', en: 'Course bookings are for 1 person at a time', zh: '疗程每次只能预约 1 人' },
  'course-login-required': { status: 401, th: 'กรุณาเข้าสู่ระบบเพื่อใช้คอร์ส', en: 'Please sign in to use a course', zh: '请登录后使用疗程' },

  // ---------- ยกเลิก ----------
  'booking-not-found': { status: 404, th: 'ไม่พบการจอง', en: 'Booking not found', zh: '未找到预约' },
  'cancel-too-late': { status: 422, th: 'เหลือเวลาไม่ถึง 24 ชม. ยกเลิกเองไม่ได้ กรุณาโทร 02-123-4567', en: 'Less than 24 hours remain, so this cannot be cancelled online. Please call 02-123-4567', zh: '距预约不足 24 小时，无法自行取消，请致电 02-123-4567' },
  'booking-not-cancellable': { status: 409, th: 'การจองนี้เสร็จแล้วหรือยกเลิกแล้ว', en: 'This booking is already completed or cancelled', zh: '此预约已完成或已取消' },

  // ---------- แต้ม ----------
  'points-not-enough': { status: 422, th: 'แต้มไม่พอ ต้องมีอย่างน้อย 100 แต้ม', en: 'Not enough points. You need at least 100 points', zh: '积分不足，至少需要 100 积分' },
  'points-not-multiple': { status: 422, th: 'แลกแต้มได้เป็นชุดละ 100 แต้มเท่านั้น', en: 'Points can only be redeemed in sets of 100', zh: '积分只能按每 100 分兑换' },
  'points-exceed-service': { status: 422, th: 'ส่วนลดจากแต้มเกินค่าบริการ', en: 'The points discount exceeds the service price', zh: '积分折扣超过服务费用' },
  'points-login-required': { status: 401, th: 'กรุณาเข้าสู่ระบบเพื่อแลกแต้ม', en: 'Please sign in to redeem points', zh: '请登录后兑换积分' },

  // ---------- รถรับส่ง ----------
  'distance-required': { status: 422, th: 'กรุณาเลือกโรงแรมหรือกรอกระยะทาง', en: 'Please choose a hotel or enter a distance', zh: '请选择酒店或填写距离' },
  'distance-invalid': { status: 422, th: 'ระยะทางต้องไม่ติดลบ และมีทศนิยมไม่เกิน 1 ตำแหน่ง', en: 'Distance must not be negative and may have at most 1 decimal place', zh: '距离不能为负数，且最多保留 1 位小数' },
  'distance-too-far': { status: 422, th: 'ระยะเกิน 15.0 กม. ไม่รับรถรับส่ง', en: 'Distances over 15.0 km are not served', zh: '距离超过 15.0 公里，不提供接送' },
  'hotel-not-found': { status: 404, th: 'ไม่พบโรงแรมนี้', en: 'Hotel not found', zh: '未找到此酒店' },

  // ---------- Gift Card ----------
  'giftcard-not-found': { status: 404, th: 'ไม่พบ Gift Card นี้', en: 'Gift card not found', zh: '未找到此礼品卡' },
  'giftcard-expired': { status: 422, th: 'Gift Card หมดอายุแล้ว', en: 'This gift card has expired', zh: '此礼品卡已过期' },
  'giftcard-empty': { status: 422, th: 'Gift Card ไม่มีมูลค่าเหลือ', en: 'This gift card has no balance left', zh: '此礼品卡余额为零' },
  'giftcard-amount-invalid': { status: 422, th: 'มูลค่าต้องเป็นจำนวนเต็ม ฿500–฿10,000', en: 'Value must be a whole number from ฿500 to ฿10,000', zh: '金额须为 500–10,000 泰铢的整数' },
  'giftcard-design-invalid': { status: 422, th: 'กรุณาเลือกลายกล้วยไม้ บัว หรือทอง', en: 'Please choose orchid, lotus or gold', zh: '请选择兰花、莲花或金色款式' },
  'giftcard-channel-invalid': { status: 422, th: 'กรุณาเลือกส่งทาง LINE หรือ email', en: 'Please choose LINE or email', zh: '请选择 LINE 或 email' },

  // ---------- บัญชี ----------
  'invalid-credentials': { status: 401, th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', en: 'Incorrect email or password', zh: '邮箱或密码错误' },
  'email-taken': { status: 409, th: 'อีเมลนี้สมัครแล้ว', en: 'This email is already registered', zh: '此邮箱已注册' },
  'email-invalid': { status: 422, th: 'รูปแบบอีเมลไม่ถูกต้อง', en: 'Invalid email format', zh: '邮箱格式无效' },
  'password-too-short': { status: 422, th: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว', en: 'Password must be at least 8 characters', zh: '密码至少 8 位' },
  'name-required': { status: 422, th: 'กรุณากรอกชื่อ', en: 'Please enter your name', zh: '请填写姓名' },
  'birth-date-invalid': { status: 422, th: 'กรุณากรอกวันเกิดให้ถูกต้อง', en: 'Please enter a valid date of birth', zh: '请填写有效的出生日期' },

  // ---------- หลังร้าน ----------
  'already-completed': { status: 409, th: 'กดใช้บริการเสร็จไปแล้ว', en: 'This booking was already marked as completed', zh: '此预约已标记为完成' },

  // ---------- แบบทดสอบ อารมณ์ ----------
  'quiz-incomplete': { status: 422, th: 'กรุณาตอบให้ครบ 4 ข้อ', en: 'Please answer all 4 questions', zh: '请回答全部 4 道题' },
  'quiz-too-many': { status: 422, th: 'แบบทดสอบมี 4 ข้อเท่านั้น', en: 'The quiz has only 4 questions', zh: '测验只有 4 道题' },
  'quiz-invalid-answer': { status: 422, th: 'คำตอบไม่ถูกต้อง', en: 'Invalid answer', zh: '答案无效' },
  'mood-invalid': { status: 422, th: 'ไม่มีอารมณ์นี้ในรายการ', en: 'This mood is not in the list', zh: '列表中没有这种心情' },
} satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

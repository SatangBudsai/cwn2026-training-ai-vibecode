// type กลางของทุก entity และทุก request/response · แก้ได้เฉพาะหัวหน้า
// เงินทุกตัวในชั้น API เป็น "บาทเต็ม" ชนิด number · ระยะเป็น string เพื่อคง "5.0" และตรวจจากข้อความ (BR-38)
// วันที่เป็น 'YYYY-MM-DD' และเวลาเป็น 'HH:MM' ตาม Asia/Bangkok เสมอ

export type Locale = 'th' | 'en' | 'zh';
export type I18nText = Record<Locale, string>;

export type ServiceId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07' | 'P01' | 'K01';
export type TherapistId = 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06';
export type HotelId = 'H01' | 'H02' | 'H03' | 'H04' | 'H05' | 'H06';
export type ServiceKind = 'SERVICE' | 'PACKAGE' | 'COURSE';
export type BookingType = 'SINGLE' | 'COUPLE' | 'GROUP';
export type BookingStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type DiscountSource = 'NONE' | 'TIER' | 'GROUP' | 'BIRTHDAY';
export type Tier = 'Silver' | 'Gold' | 'Platinum';
export type GiftCardDesign = 'ORCHID' | 'LOTUS' | 'GOLD';
export type DeliveryChannel = 'LINE' | 'EMAIL';
export type Role = 'CUSTOMER' | 'OWNER';
export type Mood = 'tired' | 'stress' | 'achy';

/** รูปแบบ error ของทุก API */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

// ---------- catalog ----------
export interface Herb {
  id: number;
  name: I18nText;
  imagePath: string;
  serviceIds: ServiceId[];
}
export interface Service {
  id: ServiceId;
  kind: ServiceKind;
  name: I18nText;
  durationMinutes: number;
  /** ราคาต่อคน (K01 = ราคาต่อคอร์ส) */
  price: number;
  imagePath: string;
  herbs: Herb[];
  therapistIds: TherapistId[];
  /** BR-11, BR-12, FR-39: S01,S02=6 S05=5 S03=4 S04=3 S06,S07=2 P01=3 K01=1 */
  maxParty: number;
  /** รอบสุดท้ายที่จองได้ เช่น '21:00' */
  lastSlot: string;
}
export interface Therapist {
  id: TherapistId;
  name: I18nText;
  title: I18nText;
  photoPath: string;
  serviceIds: ServiceId[];
  stars: number[];
  reviewCount: number;
  /** คะแนนปัดแล้ว 1 ตำแหน่ง (BR-48) · null เมื่อไม่มีรีวิว (BR-49) */
  rating: number | null;
  /** '5.0' · null เมื่อไม่มีรีวิว */
  ratingText: string | null;
  /** ผ่านตัวกรอง 4.5 ดาว (BR-47, BR-49) */
  passesFilter: boolean;
}
export interface Hotel {
  id: HotelId;
  name: I18nText;
  /** '5.0' */
  distanceKm: string;
}
export interface ServicesResponse { services: Service[] }
export interface HerbsResponse { herbs: Herb[] }
export interface TherapistsResponse { therapists: Therapist[] }
export interface HotelsResponse { hotels: Hotel[] }

export interface ClockResponse {
  /** ISO พร้อม +07:00 เช่น 2026-06-15T10:00:00+07:00 */
  now: string;
  today: string;
  /** วันแรกที่จองได้ (BR-03) */
  minBookingDate: string;
  /** วันสุดท้ายที่จองได้ (BR-04) */
  maxBookingDate: string;
  locked: boolean;
}

// ---------- availability ----------
export interface AvailabilitySlot {
  time: string;
  /** นักบำบัดที่ทำบริการนี้ได้และว่าง เรียงตามลำดับ "ใครก็ได้" */
  availableTherapistIds: TherapistId[];
  /** คนที่ระบบจะจัดให้ถ้าเลือก "ใครก็ได้" หรือเป็นคู่/กลุ่ม */
  autoAssignIds: TherapistId[];
}
export interface AvailabilityResponse {
  serviceId: ServiceId;
  date: string;
  partySize: number;
  bookingType: BookingType;
  maxParty: number;
  /** เฉพาะรอบที่จองได้จริง (รอบที่ไม่เข้ากฎไม่อยู่ในรายการ) */
  slots: AvailabilitySlot[];
  /** นักบำบัดที่ทำบริการนี้ได้ (FR-07) */
  therapists: Therapist[];
}

// ---------- price ----------
export interface ShuttleInput {
  hotelId?: HotelId;
  /** พิมพ์เอง ตรวจจากข้อความ · ส่งมาเป็น number ก็รับ แต่จะแปลงเป็น String() ก่อนตรวจ */
  distanceKm?: string;
}
export interface QuoteRequest {
  serviceId: ServiceId;
  partySize: number;
  /** วันนัด */
  date: string;
  /** รอบ · ไม่ส่งก็ได้ตอนดูราคา แต่ under24h จะเป็น false */
  time?: string;
  /** ต้องเป็นทวีคูณของ 100 */
  pointsToRedeem?: number;
  /** ลูกค้ากดเลือกเอง (FR-33) */
  useBirthday?: boolean;
  /** null/ไม่ส่ง = ไม่ใช้รถ · P01 ต้องส่งเสมอ */
  shuttle?: ShuttleInput | null;
  giftCardCode?: string;
  /** จองด้วยคอร์ส (service ต้องเป็น K01) */
  coursePurchaseId?: string;
}
export interface PriceLines {
  /** ขั้น 1 */
  fullPrice: number;
  /** ขั้น 2 */
  discountPercent: 0 | 5 | 10 | 20;
  discountSource: DiscountSource;
  discountAmount: number;
  /** ขั้น 3 */
  pointsRedeemed: number;
  pointsDiscount: number;
  /** ฐานแต้มก่อนหักบัตร */
  serviceNet: number;
  /** ขั้น 4 */
  cars: number;
  transportFee: number;
  /** ยอดก่อนหักบัตร = serviceNet + transportFee */
  totalBeforeGiftCard: number;
  /** ขั้น 5 */
  giftCardAmount: number;
  /** จ่ายหน้าร้าน */
  payAtShop: number;
}
export type BirthdayReason =
  | 'guest'
  | 'not-birthday-month'
  | 'already-used'
  | 'service-not-eligible'
  | null;
export interface QuoteResponse {
  serviceId: ServiceId;
  partySize: number;
  bookingType: BookingType;
  isCoupleSuite: boolean;
  lines: PriceLines;
  /** ระดับของผู้จอง · null เมื่อเป็นแขก */
  tier: Tier | null;
  birthday: {
    /** แสดงตัวเลือกไหม: false เมื่อแขก หรือ P01/K01 (E130, E131) */
    offered: boolean;
    /** ใช้ได้ไหมกับวันนัดนี้ */
    eligible: boolean;
    /** ถูกใช้จริงในราคานี้ไหม (เลือกแล้วและเป็น % มากสุด) */
    applied: boolean;
    reason: BirthdayReason;
  };
  points: {
    balance: number;
    /** จำนวนชุดสูงสุดที่แลกได้กับยอดนี้ (BR-18, 19, 20) */
    maxSets: number;
    maxRedeemable: number;
  };
  giftCard: {
    code: string;
    balanceBefore: number;
    amountUsed: number;
    balanceAfter: number;
    expiresOn: string;
  } | null;
  course: { id: string; remaining: number; expiresOn: string } | null;
  /** แต้มที่จะได้เมื่อร้านกดเสร็จ · แขกและคอร์ส = 0 */
  pointsEarnedPreview: number;
  /** D-12: เหลือไม่ถึง 24 ชม. จะยกเลิกเองไม่ได้ */
  under24h: boolean;
}

// ---------- bookings ----------
export interface CreateBookingRequest extends QuoteRequest {
  time: string;
  /** ระบุเฉพาะ 1 คน · ไม่ส่งหรือ 'ANY' = ใครก็ได้ */
  therapistId?: TherapistId | 'ANY';
  /** จำเป็นเมื่อไม่ได้เข้าสู่ระบบ */
  guest?: { name: string; phone: string };
  /** ยอดจ่ายหน้าร้านที่ลูกค้าเห็น · ไม่ตรง → 409 price-changed */
  expectedPayAtShop?: number;
}
export interface BookingTherapist {
  personNo: number;
  id: TherapistId;
  name: I18nText;
  photoPath: string;
}
export interface BookingDetail {
  id: string;
  bookingCode: string;
  userId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  serviceId: ServiceId;
  serviceName: I18nText;
  bookingType: BookingType;
  partySize: number;
  date: string;
  time: string;
  endTime: string;
  startAt: string;
  endAt: string;
  isCoupleSuite: boolean;
  status: BookingStatus;
  therapists: BookingTherapist[];
  lines: PriceLines;
  hotelId: HotelId | null;
  hotelName: I18nText | null;
  distanceKm: string | null;
  giftCardCode: string | null;
  coursePurchaseId: string | null;
  pointsEarned: number;
  completedAt: string | null;
  /** ตาม BR-14 ณ เวลานาฬิกาของเว็บ */
  canCancel: boolean;
  cancelBlockedReason: 'under-24h' | 'not-confirmed' | null;
}
export interface CreateBookingResponse { booking: BookingDetail }
export interface GetBookingResponse { booking: BookingDetail }
export interface CancelGuestRequest { bookingCode: string; phone: string }
export interface CancelResponse {
  booking: BookingDetail;
  refunded: {
    sessions: number;
    points: number;
    giftCardAmount: number;
    birthday: boolean;
  };
}

// ---------- auth & account ----------
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  birthDate: string;
}
export interface LoginRequest { email: string; password: string }
export interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  birthDate: string | null;
  role: Role;
  lifetimeSpend: number;
  pointsBalance: number;
  /** null เมื่อเป็น OWNER */
  tier: Tier | null;
  /** FR-35: null เมื่อ Platinum หรือ OWNER */
  nextTier: { name: Exclude<Tier, 'Silver'>; gap: number } | null;
}
export interface AuthResponse { user: MeResponse }
export interface HistoryItem {
  bookingId: string;
  bookingCode: string;
  serviceId: ServiceId;
  serviceName: I18nText;
  date: string;
  time: string;
  endTime: string;
  therapists: BookingTherapist[];
  usedCourse: boolean;
  payAtShop: number;
  pointsEarned: number;
}
/** COMPLETED เรียงจากล่าสุด (FR-45, E251) */
export interface HistoryResponse { items: HistoryItem[] }
/** นัดของตัวเองที่ยัง CONFIRMED เรียงตามวันนัด */
export interface MyBookingsResponse { bookings: BookingDetail[] }

// ---------- wallet & course ----------
export interface CourseSummary {
  id: string;
  serviceId: 'K01';
  serviceName: I18nText;
  totalSessions: number;
  usedSessions: number;
  reservedSessions: number;
  /** total − used − reserved */
  remaining: number;
  purchasedOn: string;
  expiresOn: string;
  expired: boolean;
  usedUp: boolean;
  pricePaid: number;
}
export interface WaistPoint { date: string; cm: string }
export interface BodyPhoto {
  kind: 'BEFORE' | 'AFTER';
  takenOn: string;
  /** URL พร้อมใช้ เช่น /placeholder/nida-before-body.jpg (ตัด public/ ออกจาก file_path) */
  url: string;
  /** ไฟล์ชั่วคราวต้องติดป้าย */
  placeholder: boolean;
}
export interface GiftCardSummary {
  code: string;
  design: GiftCardDesign;
  imagePath: string;
  initialValue: number;
  balance: number;
  purchasedOn: string;
  expiresOn: string;
  expired: boolean;
  usable: boolean;
  channel: DeliveryChannel;
  paymentStatus: 'SIMULATED';
}
export interface WalletResponse {
  courses: CourseSummary[];
  waist: {
    points: WaistPoint[];
    /** '4.0' · null เมื่อน้อยกว่า 2 จุด */
    reducedCm: string | null;
  };
  photos: BodyPhoto[];
  /** บัตรที่ผู้ใช้นี้ซื้อ */
  giftCards: GiftCardSummary[];
}
export interface PurchaseCourseResponse { course: CourseSummary }

// ---------- gift card ----------
export interface CreateGiftCardRequest {
  /** ส่งเป็น number หรือ string ก็ได้ · ต้องเป็นจำนวนเต็ม 500–10000 */
  amount: number | string;
  design: GiftCardDesign;
  channel: DeliveryChannel;
  /** LINE id หรืออีเมลผู้รับ (จำลอง) */
  recipient?: string;
  message?: string;
}
export interface CreateGiftCardResponse {
  giftCard: GiftCardSummary;
  /** ข้อความจำลองที่ "ส่ง" ตามภาษาของ request · ไม่ส่งออกจริง (FR-48) */
  simulatedMessage: string;
}
export interface GetGiftCardResponse { giftCard: GiftCardSummary }

// ---------- admin ----------
export interface AdminBooking extends BookingDetail {
  customerName: string;
  customerPhone: string;
  isGuest: boolean;
}
export interface AdminScheduleResponse {
  date: string;
  /** ไม่รวม CANCELLED · เรียงตามเวลาเริ่ม */
  bookings: AdminBooking[];
  therapists: Pick<Therapist, 'id' | 'name' | 'photoPath'>[];
}
export interface CompleteBookingResponse {
  booking: BookingDetail;
  pointsEarned: number;
  /** ยอดใหม่ของผู้จอง · null เมื่อแขก */
  member: { lifetimeSpend: number; pointsBalance: number; tier: Tier } | null;
  course: { remaining: number; usedSessions: number; reservedSessions: number } | null;
}

// ---------- rule-based helpers ----------
export interface MoodRequest { mood: Mood }
export interface MoodResponse {
  mood: Mood;
  serviceId: ServiceId;
  service: Service;
  reason: I18nText;
  imagePath: string;
}
export interface QuizQuestion {
  id: string;
  text: I18nText;
  options: { id: string; text: I18nText }[];
}
export interface QuizQuestionsResponse { questions: QuizQuestion[] }
export interface QuizRequest { answers: string[] }
export interface QuizResponse {
  serviceId: ServiceId;
  service: Service;
  reason: I18nText;
}
/** สถานะบทสนทนาจองของแชต ส่งกลับไปกลับมา เซิร์ฟเวอร์ไม่เก็บ */
export interface ChatState {
  step: 'idle' | 'service' | 'date' | 'time' | 'party' | 'guest' | 'confirm';
  serviceId?: ServiceId;
  date?: string;
  time?: string;
  partySize?: number;
  guestName?: string;
  guestPhone?: string;
}
export interface ChatRequest {
  message: string;
  state?: ChatState;
}
export interface ChatResponse {
  reply: string;
  /** ภาษาที่ตอบ ตามภาษาที่ถาม (FR-58) */
  language: Locale;
  intent: 'hours' | 'price' | 'booking' | 'fallback' | 'greeting';
  state: ChatState;
  quote?: QuoteResponse;
  booking?: BookingDetail;
}

// ---------- test ----------
export interface TestResetRequest { now?: string }
export interface TestLockRequest { now: string }
export interface TestOkResponse { ok: true; now: string }

// ---------- health ----------
export interface HealthResponse { ok: boolean; db: boolean }

// ---------- page ----------
export interface LocaleParams { locale: string }
export interface LocalePageProps {
  params: Promise<LocaleParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

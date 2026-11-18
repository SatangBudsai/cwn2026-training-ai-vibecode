// รีวิวลูกค้าตัวอย่าง ใช้ร่วมกันใน F1 และ F3
// เรียบเรียงจาก interview/INTERVIEW.md เท่านั้น · ห้ามแต่งตัวเลข · ไม่มีคะแนนดาว · ไม่มีช่องเขียนรีวิว (FR-72)
// รูป cust-*.jpg ขึ้นเว็บได้เฉพาะส่วนรีวิว และต้องติดป้าย "ลูกค้าตัวอย่าง" (common.sampleCustomer)
import type { I18nText } from '@/types';

export interface Testimonial {
  id: string;
  /** รูปจริงจาก brand-kit */
  imagePath: string;
  /** อัตราส่วนรูปต้นฉบับ */
  imageRatio: '2 / 3' | '3 / 2';
  name: I18nText;
  role: I18nText;
  quote: I18nText;
}

export const testimonials: Testimonial[] = [
  {
    id: 'may',
    imagePath: '/brand/people/cust-may.jpg',
    imageRatio: '2 / 3',
    name: { th: 'คุณเมย์', en: 'May', zh: 'May 女士' },
    role: { th: 'พนักงานออฟฟิศ', en: 'Office worker', zh: '上班族' },
    quote: {
      th: 'เลิกงาน 19:00 ก็ยังจองรอบ 20:00 จากมือถือได้แบบไม่ยุ่งยาก วันไหนเหนื่อยหรือเครียด แค่กดเลือกอารมณ์ เว็บก็แนะนำบริการให้',
      en: 'I finish work at 19:00 and can still book the 20:00 slot from my phone without any fuss. On tired or stressful days I just pick my mood and the site suggests a service.',
      zh: '19:00 下班，也能用手机轻松预约 20:00 的时段。疲惫或压力大的日子，只要选择心情，网站就会推荐合适的服务。',
    },
  },
  {
    id: 'liwei',
    imagePath: '/brand/people/cust-liwei.jpg',
    imageRatio: '2 / 3',
    name: { th: 'Mr. Li Wei', en: 'Mr. Li Wei', zh: '李伟先生' },
    role: { th: 'นักท่องเที่ยวจากจีน', en: 'Traveller from China', zh: '来自中国的游客' },
    quote: {
      th: 'อ่านไทยไม่ได้ก็ไม่เป็นไร เว็บมีภาษาจีน ถามแชตเรื่องเวลาเปิดและราคาได้ มากัน 4 คนจากโรงแรมที่ห่าง 12 กม. ก็รู้ค่ารถก่อนจ่าย',
      en: "I can't read Thai, but the site is in Chinese and the chat answers about hours and prices. There were 4 of us at a hotel 12 km away, and we knew the shuttle fee before paying.",
      zh: '不懂泰文也没关系，网站有中文，还能在聊天中询问营业时间和价格。我们 4 个人住在 12 公里外的酒店，付款前就知道车费。',
    },
  },
  {
    id: 'tonfon',
    imagePath: '/brand/people/cust-tonfon.jpg',
    imageRatio: '3 / 2',
    name: { th: 'คุณต้น & คุณฝน', en: 'Ton & Fon', zh: 'Ton 与 Fon' },
    role: { th: 'คู่รัก', en: 'Couple', zh: '情侣' },
    quote: {
      th: 'วันครบรอบของเราได้นวดคู่ในห้อง Couple Suite เวลาเดียวกัน ดูห้องแบบ 360° ก่อนจองได้ด้วย และซื้อ Gift Card ส่ง LINE ให้แม่ได้',
      en: 'On our anniversary we had our treatment together in the Couple Suite at the same time. We could view the room in 360° before booking, and send a gift card to Mum over LINE.',
      zh: '纪念日那天我们在情侣套房同时享受护理，预约前还能 360° 查看房间，也能通过 LINE 把礼品卡送给妈妈。',
    },
  },
  {
    id: 'nida',
    imagePath: '/brand/people/cust-nida.jpg',
    imageRatio: '2 / 3',
    name: { th: 'คุณนิดา', en: 'Nida', zh: 'Nida 女士' },
    role: { th: 'ลูกค้าคอร์สกระชับสัดส่วน', en: 'Body contouring course member', zh: '塑形疗程会员' },
    quote: {
      th: 'เปิด Wallet ก็เห็นเลยว่าคอร์สเหลือกี่ครั้ง มีกราฟรอบเอวที่ลดลง ดูประวัติทรีตเมนต์ได้ และวันไหนติดงานก็ยกเลิกนัดเองในเว็บได้',
      en: 'My Wallet shows how many sessions are left, with a chart of my shrinking waistline and my treatment history. If work gets in the way I can cancel online myself.',
      zh: '打开钱包就能看到疗程还剩几次，还有腰围下降的图表和护理记录。工作走不开时，也能自己在网站上取消预约。',
    },
  },
  {
    id: 'prae',
    imagePath: '/brand/people/cust-prae.jpg',
    imageRatio: '2 / 3',
    name: { th: 'น้องแพร', en: 'Prae', zh: 'Prae 小姐' },
    role: { th: 'สาวรักผิว', en: 'Skincare lover', zh: '护肤爱好者' },
    quote: {
      th: 'วิเคราะห์เซลฟี่ได้โดยรูปไม่ถูกส่งออกไปเก็บ และรู้ว่าแต่ละทรีตเมนต์ใช้สมุนไพรอะไร ก่อนตัดสินใจจอง',
      en: 'I can have my selfie analysed without the photo being sent anywhere or stored, and I know which herbs each treatment uses before I book.',
      zh: '自拍分析时照片不会被传出或保存，预约前还能知道每项护理使用哪些草药。',
    },
  },
];

import { defineMessages } from './locales';

// ข้อความของ a4 · เจ้าของแก้ไฟล์นี้ได้คนเดียว · type บังคับให้ key ครบ 3 ภาษา
export const a4 = defineMessages({
  th: {
    giftCardSimulated:
      'ข้อความจำลอง ไม่ได้ส่งออกจริง: Gift Card มูลค่า {amount} ลาย{design} ส่งทาง {channel} รหัส {code} หมดอายุ {expires}',
    designOrchid: 'กล้วยไม้',
    designLotus: 'บัว',
    designGold: 'ทอง',
    channelLine: 'LINE',
    channelEmail: 'email',
  },
  en: {
    giftCardSimulated:
      'Simulated message, nothing was actually sent: Gift Card worth {amount}, {design} design, delivered by {channel}, code {code}, expires {expires}',
    designOrchid: 'Orchid',
    designLotus: 'Lotus',
    designGold: 'Gold',
    channelLine: 'LINE',
    channelEmail: 'email',
  },
  zh: {
    giftCardSimulated:
      '模拟消息，并未实际发送：礼品卡面额 {amount}，{design}款式，通过 {channel} 发送，兑换码 {code}，有效期至 {expires}',
    designOrchid: '兰花',
    designLotus: '莲花',
    designGold: '金色',
    channelLine: 'LINE',
    channelEmail: 'email',
  },
});

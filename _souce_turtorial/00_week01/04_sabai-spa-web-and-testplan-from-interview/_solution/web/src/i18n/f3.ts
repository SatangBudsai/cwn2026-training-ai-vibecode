import type { I18nText } from '@/types';
import { defineMessages } from './locales';

// ข้อความของ f3 · เจ้าของแก้ไฟล์นี้ได้คนเดียว · type บังคับให้ key ครบ 3 ภาษา
// เรียบเรียงจาก interview/ เท่านั้น · ห้ามแต่งตัวเลข · zh ห้ามมีอักษรไทย (NFR-07)
export const f3 = defineMessages({
  th: {
    noReviews: 'ยังไม่มีรีวิว',
    reviewCount: '{count} รีวิว',
    starsLabel: 'คะแนน {value} จาก 5 ดาว',

    therapistsEyebrow: 'นักบำบัดของเรา',
    therapistsTitle: 'เลือกคนที่จะดูแลคุณในวันนี้',
    therapistsSubtitle: 'ดูคะแนนจากรีวิวเก่าที่ร้านจดไว้ และบริการที่แต่ละคนทำได้ แล้วจองกับคนที่คุณถูกใจ',
    filterLabel: 'กรองตามคะแนนรีวิว',
    filterAll: 'ทั้งหมด',
    filter45: '4.5 ดาวขึ้นไป',
    resultCount: 'แสดง {count} คน',
    filteredNote: 'เรียงจากคะแนนมากไปน้อย',
    servicesLabel: 'บริการที่ทำได้',
    bookWith: 'จองกับ{name}',

    teamEyebrow: 'ทีมงาน',
    teamTitle: 'คนที่ดูแลคุณที่สบายใจ สปา',
    teamSubtitle: 'ตั้งแต่ก้าวแรกที่หน้าร้านจนถึงบนเตียงนวด นี่คือทีมงานทั้งหมดของเรา',
    teamGroupCaption: 'คุณจันทร์และทีมงานยืนไหว้ต้อนรับหน้าร้าน',
    teamFrontEyebrow: 'หน้าร้าน',
    teamFrontTitle: 'เจ้าของร้านและพนักงานต้อนรับ',
    teamTherapistsEyebrow: 'นักบำบัด',
    teamTherapistsTitle: 'นักบำบัดที่รับคิว',
    teamTherapistsSubtitle: 'ดูคะแนน บริการที่ทำได้ และจองคิวกับแต่ละคนได้ที่หน้านักบำบัด',
    teamRatingLink: 'ดูคะแนนและบริการ',
    teamAboutLink: 'อ่านเรื่องราวของร้าน',

    reviewsEyebrow: 'รีวิว',
    reviewsTitle: 'คะแนนรีวิวที่ร้านจดไว้',
    reviewsSubtitle: 'รีวิวเก่าของนักบำบัดแต่ละคน แสดงดาวทีละรีวิวตามที่ร้านบันทึกไว้',
    reviewsAverage: 'คะแนนเฉลี่ย',
    reviewItem: 'รีวิวที่ {n}',
    reviewsCustomersEyebrow: 'เสียงจากลูกค้า',
    reviewsCustomersTitle: 'เรื่องเล่าจากลูกค้าตัวอย่าง',
    reviewsCustomersSubtitle: 'สิ่งที่ลูกค้าแต่ละแบบอยากได้จากการมาสปา และการจองกับเรา',
    reviewsCtaEyebrow: 'ถึงตาคุณแล้ว',
    reviewsCtaTitle: 'พร้อมมาพักด้วยตัวเองแล้วหรือยัง',
    reviewsNote: 'หน้านี้แสดงเฉพาะรีวิวที่ร้านบันทึกไว้ ตอนนี้ยังไม่มีช่องเขียนหรือลบรีวิวบนเว็บ',

    galleryEyebrow: 'แกลเลอรี',
    galleryTitle: 'เดินชมร้านก่อนมาถึง',
    gallerySubtitle: 'เรือนไม้ บ่อบัว ห้องทรีตเมนต์ และชั้นสมุนไพร มุมต่าง ๆ ของสบายใจ สปา',

    aboutEyebrow: 'เรื่องราวของเรา',
    aboutTitle: 'สปาไทยสาขาเดียว ที่อยากให้คุณมาแล้วสบายใจ',
    aboutLead: 'สบายใจ สปา คือร้านสาขาเดียวในกรุงเทพฯ ของคุณจันทร์ ดูแลลูกค้าด้วยสมุนไพรไทยและทีมบำบัดของเราเอง',
    aboutQuote: 'อยากให้เว็บดูไทย หรู และรู้สึกว่า “มาร้านจริง”',
    aboutStoryOneTitle: 'เหมือนได้ก้าวเข้ามาในร้าน',
    aboutStoryOneBody:
      'เมื่อทีมทำเว็บมานั่งคุยที่ร้าน คุณจันทร์ขอให้ทุกคนที่เปิดเว็บรู้สึกเหมือนได้มาจริง จึงส่งรูปร้านและรูปทีมงานมาให้ พร้อมขอให้มีทัวร์ห้อง 360° และเพลงสปาเบา ๆ ที่ลูกค้ากดเปิดเอง',
    aboutStoryOneCaption: 'คุณจันทร์เล่าเรื่องร้านให้ทีมทำเว็บฟัง',
    aboutStoryTwoTitle: 'สมุนไพรที่บอกชัดก่อนจอง',
    aboutStoryTwoBody:
      'แต่ละบริการใช้สมุนไพรต่างกัน เช่น ไพล ตะไคร้ ขมิ้น และมะกรูด คุณจันทร์จึงให้มีข้อมูลสมุนไพรของแต่ละบริการ ลูกค้าที่กลัวแพ้จะได้ดูก่อนตัดสินใจ',
    aboutStoryTwoCaption: 'คุณจันทร์กับตะกร้าตะไคร้และสมุนไพรสดในสวนของร้าน',
    aboutPromisesEyebrow: 'สิ่งที่ร้านยึดถือ',
    aboutPromisesTitle: 'ความสบายใจที่เริ่มตั้งแต่ก่อนมาถึง',
    aboutPromiseHoursTitle: 'เปิดทุกวัน',
    aboutPromiseHoursBody: 'เปิด 10:00–22:00 รวมวันหยุดนักขัตฤกษ์ จองเป็นรอบทุก 30 นาที',
    aboutPromiseGuestTitle: 'ไม่สมัครก็จองได้',
    aboutPromiseGuestBody: 'ลูกค้าไม่สมัครสมาชิกก็จองได้ ใช้แค่ชื่อและเบอร์โทร',
    aboutPromiseLanguageTitle: 'สามภาษาบนเว็บเดียว',
    aboutPromiseLanguageBody: 'เว็บของร้านมีทั้งภาษาไทย อังกฤษ และจีน ลูกค้าต่างชาติจึงจองได้สะดวก',
    aboutPromisePrivacyTitle: 'เคารพความเป็นส่วนตัว',
    aboutPromisePrivacyBody: 'ร้านไม่เก็บรูปหน้าลูกค้า เซลฟี่สำหรับวิเคราะห์ผิววิเคราะห์ในเครื่องของลูกค้าเท่านั้น',
    aboutVisitEyebrow: 'มาเยือนเรา',
    aboutVisitTitle: 'เรายินดีต้อนรับทุกวัน',
  },
  en: {
    noReviews: 'No reviews yet',
    reviewCount: '{count} reviews',
    starsLabel: 'Rated {value} out of 5 stars',

    therapistsEyebrow: 'Our therapists',
    therapistsTitle: 'Choose who will care for you today',
    therapistsSubtitle: "See each therapist's rating from the reviews the spa has on record and the services they offer, then book the one you like.",
    filterLabel: 'Filter by review rating',
    filterAll: 'All',
    filter45: '4.5 stars and up',
    resultCount: 'Showing {count} therapists',
    filteredNote: 'Highest rated first',
    servicesLabel: 'Services offered',
    bookWith: 'Book with {name}',

    teamEyebrow: 'Our team',
    teamTitle: 'The people who care for you at Sabai Jai',
    teamSubtitle: 'From your first step at the door to the treatment bed, this is our whole team.',
    teamGroupCaption: 'Khun Chan and the team greeting guests with a wai at the entrance',
    teamFrontEyebrow: 'Front of house',
    teamFrontTitle: 'Our owner and our receptionist',
    teamTherapistsEyebrow: 'Therapists',
    teamTherapistsTitle: 'Therapists taking bookings',
    teamTherapistsSubtitle: 'See ratings and services, and book with each therapist, on the Therapists page.',
    teamRatingLink: 'See ratings and services',
    teamAboutLink: 'Read our story',

    reviewsEyebrow: 'Reviews',
    reviewsTitle: 'Ratings the spa has on record',
    reviewsSubtitle: "Each therapist's past reviews, shown star by star as the spa recorded them.",
    reviewsAverage: 'Average',
    reviewItem: 'Review {n}',
    reviewsCustomersEyebrow: 'Customer voices',
    reviewsCustomersTitle: 'Stories from sample customers',
    reviewsCustomersSubtitle: 'What different guests look for from a spa visit and from booking with us.',
    reviewsCtaEyebrow: 'Your turn',
    reviewsCtaTitle: 'Ready to come and rest for yourself?',
    reviewsNote: 'This page shows only reviews recorded by the spa. Writing or deleting reviews on the site is not available yet.',

    galleryEyebrow: 'Gallery',
    galleryTitle: 'Walk through the spa before you arrive',
    gallerySubtitle: 'Timber pavilions, lotus ponds, treatment rooms and the herb bar: corners of Sabai Jai Spa.',

    aboutEyebrow: 'Our story',
    aboutTitle: 'One Thai spa, made to put your mind at ease',
    aboutLead: "Sabai Jai Spa is Khun Chan's single-branch spa in Bangkok, caring for guests with Thai herbs and our own therapists.",
    aboutQuote: 'I want the site to look Thai and luxurious, and to feel like you have “really come to the spa”.',
    aboutStoryOneTitle: 'As if you had stepped inside',
    aboutStoryOneBody:
      'When the web team sat down with her at the spa, Khun Chan asked that everyone opening the site should feel as if they had really come. She sent photos of the spa and the team, and asked for a 360° room tour and soft spa music that guests turn on themselves.',
    aboutStoryOneCaption: 'Khun Chan telling the web team about the spa',
    aboutStoryTwoTitle: 'Herbs made clear before you book',
    aboutStoryTwoBody:
      'Each service uses different herbs, such as phlai, lemongrass, turmeric and kaffir lime. So Khun Chan wanted herb information for every service, letting guests worried about allergies check before they decide.',
    aboutStoryTwoCaption: 'Khun Chan with a basket of lemongrass and fresh herbs in the spa garden',
    aboutPromisesEyebrow: 'What we hold to',
    aboutPromisesTitle: 'Peace of mind that starts before you arrive',
    aboutPromiseHoursTitle: 'Open every day',
    aboutPromiseHoursBody: 'Open 10:00–22:00, including public holidays, with booking slots every 30 minutes.',
    aboutPromiseGuestTitle: 'Book without signing up',
    aboutPromiseGuestBody: 'Guests can book without becoming members, using just a name and phone number.',
    aboutPromiseLanguageTitle: 'Three languages, one site',
    aboutPromiseLanguageBody: 'Our site comes in Thai, English and Chinese, so visitors from abroad can book with ease.',
    aboutPromisePrivacyTitle: 'Respecting your privacy',
    aboutPromisePrivacyBody: 'The spa keeps no photos of guests’ faces. Selfies for the skin check are analysed only on your own device.',
    aboutVisitEyebrow: 'Visit us',
    aboutVisitTitle: 'We welcome you every day',
  },
  zh: {
    noReviews: '暂无评价',
    reviewCount: '{count} 条评价',
    starsLabel: '评分 {value} 星，满分 5 星',

    therapistsEyebrow: '我们的理疗师',
    therapistsTitle: '选择今天为您服务的理疗师',
    therapistsSubtitle: '查看门店记录的历史评价评分和每位理疗师提供的服务，再预约您喜欢的理疗师。',
    filterLabel: '按评价评分筛选',
    filterAll: '全部',
    filter45: '4.5 星及以上',
    resultCount: '显示 {count} 位理疗师',
    filteredNote: '按评分从高到低排列',
    servicesLabel: '可提供的服务',
    bookWith: '预约{name}',

    teamEyebrow: '团队',
    teamTitle: '在 Sabai Jai 照顾您的人',
    teamSubtitle: '从踏入门口的第一步到理疗床上，这就是我们的全体团队。',
    teamGroupCaption: 'Chan 女士与团队在门口合十迎宾',
    teamFrontEyebrow: '门店',
    teamFrontTitle: '店主与前台接待',
    teamTherapistsEyebrow: '理疗师',
    teamTherapistsTitle: '可预约的理疗师',
    teamTherapistsSubtitle: '可在理疗师页面查看评分和服务，并预约每位理疗师。',
    teamRatingLink: '查看评分和服务',
    teamAboutLink: '阅读门店故事',

    reviewsEyebrow: '评价',
    reviewsTitle: '门店记录的评价评分',
    reviewsSubtitle: '每位理疗师的历史评价，按门店记录逐条显示星级。',
    reviewsAverage: '平均评分',
    reviewItem: '第 {n} 条评价',
    reviewsCustomersEyebrow: '客户心声',
    reviewsCustomersTitle: '示例客户的故事',
    reviewsCustomersSubtitle: '不同的客人对水疗之旅和预约体验的期待。',
    reviewsCtaEyebrow: '轮到您了',
    reviewsCtaTitle: '准备好亲自来放松一下了吗？',
    reviewsNote: '本页仅显示门店记录的评价，网站目前还不能撰写或删除评价。',

    galleryEyebrow: '图库',
    galleryTitle: '到店之前，先来逛逛',
    gallerySubtitle: '木造凉亭、莲花池、理疗室和草药吧台，看看 Sabai Jai 水疗的各个角落。',

    aboutEyebrow: '我们的故事',
    aboutTitle: '只此一店的泰式水疗，愿您来了就安心',
    aboutLead: 'Sabai Jai 水疗是 Chan 女士在曼谷经营的唯一门店，以泰国草药和我们自己的理疗师团队为您服务。',
    aboutQuote: '我希望网站看起来有泰式风情、有格调，让人感觉“真的来到了店里”。',
    aboutStoryOneTitle: '仿佛已踏入店中',
    aboutStoryOneBody:
      '网站团队到店交谈时，Chan 女士希望每位打开网站的人都感觉真的来到了店里。她送来门店和团队的照片，还希望提供 360° 房间导览和由客人自行开启的轻柔水疗音乐。',
    aboutStoryOneCaption: 'Chan 女士向网站团队讲述门店的故事',
    aboutStoryTwoTitle: '预约前看清楚草药',
    aboutStoryTwoBody:
      '每项服务使用的草药各不相同，例如紫姜、香茅、姜黄和泰国青柠。因此 Chan 女士希望提供每项服务的草药信息，让担心过敏的客人在决定前先查看。',
    aboutStoryTwoCaption: 'Chan 女士在门店花园里，提着一篮香茅和新鲜草药',
    aboutPromisesEyebrow: '我们的坚持',
    aboutPromisesTitle: '到店之前，安心已经开始',
    aboutPromiseHoursTitle: '每天营业',
    aboutPromiseHoursBody: '营业时间 10:00–22:00，节假日照常营业，每 30 分钟一个预约时段。',
    aboutPromiseGuestTitle: '无需注册也能预约',
    aboutPromiseGuestBody: '不注册会员也能预约，只需姓名和电话号码。',
    aboutPromiseLanguageTitle: '一个网站，三种语言',
    aboutPromiseLanguageBody: '我们的网站提供泰文、英文和中文，外国客人也能轻松预约。',
    aboutPromisePrivacyTitle: '尊重您的隐私',
    aboutPromisePrivacyBody: '门店不保存客人的面部照片，用于肌肤分析的自拍只在您自己的设备上分析。',
    aboutVisitEyebrow: '欢迎到访',
    aboutVisitTitle: '我们每天恭候您的光临',
  },
});

export type F3PersonId = 'chan' | 'bua';

/** คนที่ไม่อยู่ในตาราง therapists · น้องบัวไม่รับคิว จึงไม่อยู่ในรายชื่อจอง (FR-07) */
export const f3People: Record<F3PersonId, { name: I18nText; title: I18nText; note: I18nText; photoPath: string }> = {
  chan: {
    name: { th: 'คุณจันทร์', en: 'Khun Chan', zh: 'Chan 女士' },
    title: { th: 'เจ้าของร้าน', en: 'Owner', zh: '店主' },
    note: {
      th: 'ดูแลสบายใจ สปา ร้านสาขาเดียวในกรุงเทพฯ และเป็นผู้ส่งรูปกับเรื่องราวของร้านให้เว็บนี้',
      en: 'She runs Sabai Jai Spa, our single branch in Bangkok, and provided the photos and stories behind this site.',
      zh: '她经营曼谷唯一门店 Sabai Jai 水疗，并为本网站提供了门店的照片和故事。',
    },
    photoPath: '/brand/people/owner-chan.jpg',
  },
  bua: {
    name: { th: 'น้องบัว', en: 'Nong Bua', zh: 'Bua 小姐' },
    title: { th: 'พนักงานต้อนรับ', en: 'Receptionist', zh: '前台接待' },
    note: {
      th: 'ดูแลการต้อนรับหน้าร้าน ไม่รับคิวบริการ จึงไม่อยู่ในรายชื่อสำหรับจอง',
      en: 'She looks after guests at reception. She does not take treatment bookings, so she is not on the booking list.',
      zh: '负责门店接待，不接理疗预约，因此不在预约名单中。',
    },
    photoPath: '/brand/people/staff-bua.jpg',
  },
};

export interface F3GalleryItem {
  id: string;
  src: string;
  ratio: '3 / 2' | '16 / 9' | '1 / 1' | '4 / 5';
  /** ตำแหน่งครอปเมื่อกล่องแนวตั้ง */
  position?: string;
  title: I18nText;
  caption: I18nText;
}

/** ลำดับนี้จัดให้ความสูงสลับกันในคอลัมน์ masonry */
export const f3Gallery: F3GalleryItem[] = [
  {
    id: 'exterior-day',
    src: '/brand/shop/exterior-day.jpg',
    ratio: '3 / 2',
    title: { th: 'ทางเข้าร้าน', en: 'The entrance', zh: '门店入口' },
    caption: {
      th: 'ทางเดินหินผ่านบ่อบัว สู่ประตูไม้ใต้ร่มลีลาวดี',
      en: 'A stone path past lotus ponds to the timber doors, shaded by frangipani.',
      zh: '石板小径穿过莲花池，通向鸡蛋花树下的木门。',
    },
  },
  {
    id: 'herbal-steam',
    src: '/brand/shop/herbal-steam.jpg',
    ratio: '4 / 5',
    title: { th: 'ห้องอบสมุนไพร', en: 'Herbal steam room', zh: '草药蒸汽室' },
    caption: {
      th: 'ผนังหินกับไอสมุนไพรอุ่น ๆ ม้านั่งไม้และลูกประคบวางรอริมหน้าต่าง',
      en: 'Stone walls and warm herbal steam, with a timber bench and compresses waiting by the window.',
      zh: '石墙与温暖的草药蒸汽，木长椅和草药球已在窗边备好。',
    },
  },
  {
    id: 'hero-dusk',
    src: '/brand/shop/hero-dusk.jpg',
    ratio: '16 / 9',
    title: { th: 'ยามพลบค่ำ', en: 'At dusk', zh: '暮色时分' },
    caption: {
      th: 'โคมไฟส่องเรือนไทยริมน้ำ เงาสะท้อนทอดยาวบนบ่อบัว',
      en: 'Lanterns light the Thai pavilions, their reflections stretching across the lotus pond.',
      zh: '灯笼照亮水边的泰式木屋，倒影在莲花池上缓缓铺开。',
    },
  },
  {
    id: 'lobby',
    src: '/brand/shop/lobby.jpg',
    ratio: '3 / 2',
    title: { th: 'ล็อบบี้', en: 'The lobby', zh: '大堂' },
    caption: {
      th: 'เคาน์เตอร์ไม้ กล้วยไม้ และเก้าอี้หวาย เปิดโล่งออกสู่สวนบัว',
      en: 'A timber counter, orchids and rattan chairs, open to the lotus garden.',
      zh: '木质柜台、兰花和藤椅，向莲花园敞开。',
    },
  },
  {
    id: 'welcome-tea',
    src: '/brand/shop/welcome-tea.jpg',
    ratio: '1 / 1',
    title: { th: 'เครื่องดื่มต้อนรับ', en: 'A welcome drink', zh: '迎宾饮品' },
    caption: {
      th: 'น้ำสีม่วงอัญชันและมาลัยมะลิบนถาดทองเหลือง',
      en: 'A butterfly pea drink and a jasmine garland on a brass tray.',
      zh: '黄铜托盘上的蝶豆花饮品和茉莉花环。',
    },
  },
  {
    id: 'couple-suite',
    src: '/brand/shop/couple-suite.jpg',
    ratio: '3 / 2',
    title: { th: 'ห้อง Couple Suite', en: 'The Couple Suite', zh: '情侣套房' },
    caption: {
      th: 'เตียงนวดคู่ริมสวน กับอ่างหินโรยกลีบกล้วยไม้',
      en: 'Twin treatment beds beside the garden, and a stone tub scattered with orchid petals.',
      zh: '花园旁的双人理疗床，以及撒满兰花花瓣的石浴缸。',
    },
  },
  {
    id: 'hero-ritual',
    src: '/brand/shop/hero-ritual.jpg',
    ratio: '16 / 9',
    title: { th: 'ลูกประคบสมุนไพร', en: 'Herbal compresses', zh: '草药热敷球' },
    caption: {
      th: 'ลูกประคบอุ่น ๆ กับขมิ้น มะกรูด ตะไคร้ และดอกอัญชัน',
      en: 'Warm compresses with turmeric, kaffir lime, lemongrass and butterfly pea flowers.',
      zh: '温热的草药球，配上姜黄、泰国青柠、香茅和蝶豆花。',
    },
  },
  {
    id: 'garden-sala',
    src: '/brand/shop/garden-sala.jpg',
    ratio: '4 / 5',
    position: '28% center',
    title: { th: 'ศาลาในสวน', en: 'The garden sala', zh: '花园凉亭' },
    caption: {
      th: 'ศาลาไม้ม่านขาวตั้งอยู่ริมบ่อบัว ท่ามกลางสวนเขียวครึ้ม',
      en: 'A white-curtained timber sala at the edge of the lotus pond, deep in the garden.',
      zh: '白色纱帘的木凉亭坐落在莲花池畔，隐于浓绿的花园中。',
    },
  },
  {
    id: 'foot-lounge',
    src: '/brand/shop/foot-lounge.jpg',
    ratio: '3 / 2',
    title: { th: 'ห้องนวดเท้า', en: 'The foot lounge', zh: '足部按摩区' },
    caption: {
      th: 'เก้าอี้ไม้เรียงหันออกสวน พร้อมอ่างทองเหลืองลอยดอกไม้',
      en: 'Timber loungers facing the garden, each with a brass basin of floating flowers.',
      zh: '木躺椅面向花园排开，黄铜盆中漂着鲜花。',
    },
  },
  {
    id: 'herb-bar',
    src: '/brand/shop/herb-bar.jpg',
    ratio: '3 / 2',
    title: { th: 'ชั้นสมุนไพร', en: 'The herb bar', zh: '草药吧台' },
    caption: {
      th: 'โหลสมุนไพรแห้ง ครกทองเหลือง ตะไคร้ และมะกรูดสด',
      en: 'Jars of dried herbs, brass mortars, and fresh lemongrass and kaffir lime.',
      zh: '一罐罐干草药、黄铜研钵，以及新鲜香茅和泰国青柠。',
    },
  },
  {
    id: 'hero-room',
    src: '/brand/shop/hero-room.jpg',
    ratio: '16 / 9',
    title: { th: 'ห้องทรีตเมนต์', en: 'A treatment room', zh: '理疗室' },
    caption: {
      th: 'เตียงผ้าขาวบนพื้นไม้ รับแสงอ่อนและวิวสวนบัว',
      en: 'A white-draped bed on timber floors, with soft light and a view of the lotus garden.',
      zh: '木地板上铺着白布的理疗床，迎着柔光与莲花园的景色。',
    },
  },
  {
    id: 'team-group',
    src: '/brand/shop/team-group.jpg',
    ratio: '3 / 2',
    title: { th: 'ทีมงานของเรา', en: 'Our team', zh: '我们的团队' },
    caption: {
      th: 'คุณจันทร์และทีมงานยืนไหว้ต้อนรับหน้าร้าน',
      en: 'Khun Chan and the team greeting guests with a wai at the entrance.',
      zh: 'Chan 女士与团队在门口合十迎宾。',
    },
  },
];

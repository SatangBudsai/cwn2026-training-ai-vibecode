// B02: ข้อมูลสินค้า 6 รายการ — รูปอยู่ใน products.png (กริด 2 แถว x 3 คอลัมน์, row/col เริ่มที่ 0)
const PRODUCTS = [
  { id: 1, name: 'อาหารเม็ดแมว รสปลาทูน่า', price: 289, description: 'อาหารเม็ดสำหรับแมวโต รสทูน่า โปรตีนสูง ขนาด 1.5 กก.', image: { file: 'products.png', row: 0, col: 0 } },
  { id: 2, name: 'อาหารเปียก รสแซลมอน', price: 25, description: 'อาหารเปียกซอง เนื้อแซลมอนชิ้นนุ่มในน้ำเกรวี่ 70 กรัม', image: { file: 'products.png', row: 0, col: 1 } },
  { id: 3, name: 'ขนมแมวเลีย รสไก่', price: 59, description: 'ขนมแมวเลียสุดฮิต รสไก่ เสริมทอรีน แพ็ก 4 ซอง', image: { file: 'products.png', row: 0, col: 2 } },
  { id: 4, name: 'อาหารลูกแมว รสนม', price: 349, description: 'สูตรสำหรับลูกแมวอายุ 2–12 เดือน เสริม DHA บำรุงสมอง 1.2 กก.', image: { file: 'products.png', row: 1, col: 0 } },
  { id: 5, name: 'อาหารแมวสูตรควบคุมก้อนขน', price: 319, description: 'ช่วยลดปัญหาก้อนขนในกระเพาะ เส้นใยสูง รสไก่และข้าว 1.5 กก.', image: { file: 'products.png', row: 1, col: 1 } },
  { id: 6, name: 'ขนมแมวฟรีซดราย', price: 129, description: 'เนื้อไก่ฟรีซดราย 100% ไม่ปรุงแต่ง กรอบอร่อย 40 กรัม', image: { file: 'products.png', row: 1, col: 2 } }
];

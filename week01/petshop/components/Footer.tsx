import Link from "next/link";
import { SmartImage } from "./SmartImage";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-wave" aria-hidden="true" />
      <div className="container footer-grid">
        <div className="footer-brand">
          <p className="logo-word footer-logo">
            Paw<span>Pantry</span>
          </p>
          <p>ร้านอาหารแมวและสุนัขคัดสรรคุณภาพ ส่งตรงถึงบ้าน ด้วยรักจากทาสหมาทาสแมว 🐾</p>
          <p className="made-for">สร้างไว้สำหรับฝึก Playwright</p>
        </div>
        <div>
          <p className="footer-head">ช้อปเลย</p>
          <ul className="footer-links">
            <li>
              <Link href="/products?pet=cat">อาหารแมว</Link>
            </li>
            <li>
              <Link href="/products?pet=dog">อาหารสุนัข</Link>
            </li>
            <li>
              <Link href="/products?type=treat">ขนมสัตว์เลี้ยง</Link>
            </li>
            <li>
              <Link href="/products?type=toy">ของเล่น</Link>
            </li>
            <li>
              <Link href="/finder">ตัวช่วยเลือกอาหาร</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="footer-head">บัญชีของฉัน</p>
          <ul className="footer-links">
            <li>
              <Link href="/account">ประวัติการสั่งซื้อ</Link>
            </li>
            <li>
              <Link href="/wishlist">รายการโปรด</Link>
            </li>
            <li>
              <Link href="/cart">ตะกร้าสินค้า</Link>
            </li>
            <li>
              <Link href="/register">สมัครสมาชิก</Link>
            </li>
          </ul>
        </div>
        <div className="newsletter">
          <SmartImage src="/images/brand/newsletter.jpg" alt="ภาพประกอบรับข่าวสาร" emoji="💌" tone="brand" className="newsletter-img" />
          <p className="footer-head">รับข่าวสารและโปรโมชัน</p>
          <label htmlFor="newsletter-email" className="sr-only">
            อีเมลสำหรับรับข่าวสาร
          </label>
          <div className="newsletter-row">
            <input id="newsletter-email" type="email" placeholder="you@example.com" data-testid="newsletter-input" />
            <button type="button" className="btn btn-sun btn-sm" data-testid="newsletter-submit">
              สมัคร
            </button>
          </div>
          <p className="fineprint">* ฟอร์มนี้เป็นตัวอย่าง ไม่มีการส่งอีเมลจริง</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 PawPantry · ร้านจำลองเพื่อการเรียนรู้</span>
        <span>ส่งฟรีเมื่อซื้อครบ ฿999 · ชำระเงินปลายทางได้</span>
      </div>
    </footer>
  );
}

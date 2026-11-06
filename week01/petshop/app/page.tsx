import Link from "next/link";
import { HomePersonal } from "@/components/HomePersonal";
import { ProductGrid } from "@/components/ProductCard";
import { SmartImage } from "@/components/SmartImage";
import { byPopularity } from "@/lib/products";
import { liveProducts } from "@/lib/store";

const PAWS = [
  { left: "6%", top: "18%", size: 34, delay: "0s", rot: "-18deg" },
  { left: "18%", top: "72%", size: 22, delay: "1.2s", rot: "12deg" },
  { left: "44%", top: "10%", size: 18, delay: "2.1s", rot: "30deg" },
  { left: "52%", top: "82%", size: 28, delay: "0.6s", rot: "-8deg" },
  { left: "88%", top: "14%", size: 26, delay: "1.8s", rot: "22deg" },
  { left: "93%", top: "64%", size: 20, delay: "2.6s", rot: "-26deg" },
  { left: "70%", top: "40%", size: 16, delay: "3.1s", rot: "8deg" },
];

export default function HomePage() {
  const products = liveProducts();
  const popular = [...products].sort(byPopularity).slice(0, 8);
  const catCount = products.filter((p) => p.pet === "cat").length;
  const dogCount = products.filter((p) => p.pet === "dog").length;
  const toyCount = products.filter((p) => p.type === "toy").length;

  return (
    <>
      <section className="hero" data-testid="hero">
        <div className="hero-bg" aria-hidden="true">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
          {PAWS.map((p, i) => (
            <span
              key={i}
              className="float-paw"
              style={{
                left: p.left,
                top: p.top,
                fontSize: p.size,
                animationDelay: p.delay,
                ["--rot" as string]: p.rot,
              }}
            >
              🐾
            </span>
          ))}
        </div>
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span className="pulse-dot" aria-hidden="true" /> ร้านอาหารสัตว์เลี้ยงที่ทาสไว้ใจ
            </p>
            <h1 className="hero-title">
              อาหารดี ๆ <br />
              <span className="gradient-text">เพื่อเพื่อนสี่ขา</span>
              <br />
              ที่คุณรักที่สุด
            </h1>
            <p className="hero-sub">
              คัดสูตรพรีเมียมสำหรับน้องแมวและน้องหมาทุกช่วงวัย โปรตีนแท้ เกรนฟรี และขนมแสนอร่อย ส่งไวถึงหน้าบ้าน
            </p>
            <div className="hero-ctas">
              <Link href="/products?pet=cat" className="btn btn-cat btn-lg" data-testid="hero-cta-cat">
                🐱 ช้อปอาหารแมว
              </Link>
              <Link href="/products?pet=dog" className="btn btn-dog btn-lg" data-testid="hero-cta-dog">
                🐶 ช้อปอาหารหมา
              </Link>
            </div>
            <div className="coupon-ribbon">
              <span className="ribbon-tag">โค้ดลับ</span>
              กรอก <code>PAW10</code> ลดทันที 10% ทุกออเดอร์
            </div>
            <ul className="hero-stats">
              <li>
                <strong>28</strong>
                <span>สินค้าคัดพิเศษ</span>
              </li>
              <li>
                <strong>4.7★</strong>
                <span>คะแนนรีวิวเฉลี่ย</span>
              </li>
              <li>
                <strong>฿999</strong>
                <span>ส่งฟรีเมื่อซื้อครบ</span>
              </li>
            </ul>
          </div>
          <div className="hero-art">
            <div className="hero-frame">
              <SmartImage
                src="/images/brand/hero.jpg"
                alt="แมวและสุนัขกำลังกินอาหารอย่างมีความสุข"
                emoji="🐱🐶"
                tone="brand"
                className="hero-img"
                eager
              />
            </div>
            <div className="float-card fc-1" aria-hidden="true">
              <span className="fc-emoji">🚚</span>
              <div>
                <strong>ส่งฟรี</strong>
                <small>เมื่อซื้อครบ ฿999</small>
              </div>
            </div>
            <div className="float-card fc-2" aria-hidden="true">
              <span className="fc-emoji">💖</span>
              <div>
                <strong>12,000+</strong>
                <small>ทาสไว้ใจ</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust container" aria-label="จุดเด่นของร้าน">
        <div className="trust-item">
          <SmartImage src="/images/brand/feature-fresh.jpg" alt="ไอคอนวัตถุดิบคัดพิเศษ" emoji="🌿" tone="sun" className="feature-icon" />
          <div>
            <strong>วัตถุดิบคัดพิเศษ</strong>
            <small>โปรตีนแท้เป็นส่วนผสมหลัก</small>
          </div>
        </div>
        <div className="trust-item">
          <SmartImage src="/images/brand/feature-fast.jpg" alt="ไอคอนส่งด่วน" emoji="⚡" tone="sun" className="feature-icon" />
          <div>
            <strong>ส่งด่วนใน 24 ชม.</strong>
            <small>เลือกขนส่งด่วนได้</small>
          </div>
        </div>
        <div className="trust-item">
          <SmartImage src="/images/brand/feature-genuine.jpg" alt="ไอคอนของแท้" emoji="🛡️" tone="sun" className="feature-icon" />
          <div>
            <strong>ของแท้ 100%</strong>
            <small>รับประกันจากร้าน</small>
          </div>
        </div>
        <div className="trust-item">
          <SmartImage src="/images/brand/feature-cod.jpg" alt="ไอคอนเก็บเงินปลายทาง" emoji="💸" tone="sun" className="feature-icon" />
          <div>
            <strong>เก็บเงินปลายทาง</strong>
            <small>หรือสแกน PromptPay</small>
          </div>
        </div>
      </section>

      <section className="section container categories" aria-label="หมวดหมู่">
        <Link href="/products?pet=cat" className="category-tile cat" data-testid="category-cat">
          <SmartImage src="/images/brand/cat.jpg" alt="น้องแมวน่ารัก" emoji="🐱" tone="cat" className="cat-img" />
          <div className="category-copy">
            <span className="category-kicker">{catCount} รายการ</span>
            <h2>สำหรับน้องแมว</h2>
            <p>อาหารเม็ด อาหารเปียก และขนมเลียสุดฮิต</p>
            <span className="category-go">ไปช้อปเลย →</span>
          </div>
        </Link>
        <Link href="/products?pet=dog" className="category-tile dog" data-testid="category-dog">
          <SmartImage src="/images/brand/dog.jpg" alt="น้องหมาแสนรู้" emoji="🐶" tone="dog" className="cat-img" />
          <div className="category-copy">
            <span className="category-kicker">{dogCount} รายการ</span>
            <h2>สำหรับน้องหมา</h2>
            <p>ตั้งแต่ลูกสุนัขจนถึงวัยเก๋า พร้อมขนมขัดฟัน</p>
            <span className="category-go">ไปช้อปเลย →</span>
          </div>
        </Link>
        <Link href="/products?type=toy" className="category-tile toys" data-testid="category-toys">
          <SmartImage src="/images/brand/toys.jpg" alt="ของเล่นสำหรับแมวและสุนัข" emoji="🧸" tone="sun" className="cat-img" />
          <div className="category-copy">
            <span className="category-kicker">{toyCount} รายการ</span>
            <h2>ของเล่น</h2>
            <p>ไม้ตกแมว ลูกบอล เชือกกัด เล่นสนุกทั้งวัน</p>
            <span className="category-go">ไปช้อปเลย →</span>
          </div>
        </Link>
      </section>

      <section className="section container" data-testid="popular-products">
        <div className="section-head">
          <div>
            <p className="eyebrow">🔥 ขายดีประจำสัปดาห์</p>
            <h2>สินค้ายอดนิยม</h2>
          </div>
          <Link href="/products" className="link-arrow">
            ดูทั้งหมด →
          </Link>
        </div>
        <ProductGrid products={popular} />
      </section>

      <HomePersonal />

      <section className="section container">
        <Link href="/finder" className="finder-teaser">
          <div className="finder-teaser-copy">
            <p className="eyebrow light">🧭 Pet Food Finder</p>
            <h2>ไม่แน่ใจว่าจะเลือกสูตรไหน?</h2>
            <p>ตอบ 3 คำถามง่าย ๆ แล้วเราจะจับคู่อาหารที่ใช่ให้น้องภายใน 10 วินาที</p>
            <span className="btn btn-sun">เริ่มเลือกอาหาร ✨</span>
          </div>
          <SmartImage src="/images/brand/finder.jpg" alt="ตัวช่วยเลือกอาหารสัตว์เลี้ยง" emoji="🧭" tone="teal" className="finder-teaser-img" />
        </Link>
      </section>

      <section className="section container">
        <div className="promo-banner" data-testid="promo-banner">
          <SmartImage src="/images/brand/promo.jpg" alt="" emoji="🎁" tone="brand" className="promo-art" />
          <div className="promo-confetti" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div>
            <p className="promo-kicker">โปรโมชันพิเศษสำหรับสมาชิกใหม่</p>
            <h2>
              ลดทันที <span className="promo-big">10%</span>
            </h2>
            <p>ใส่โค้ดตอนชำระเงิน ใช้ได้กับสินค้าทุกชิ้นในร้าน</p>
          </div>
          <div className="promo-code" aria-label="โค้ดส่วนลด PAW10">
            <small>โค้ดส่วนลด</small>
            <strong>PAW10</strong>
          </div>
        </div>
      </section>
    </>
  );
}

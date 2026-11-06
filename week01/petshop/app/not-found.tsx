import Link from "next/link";
import { SmartImage } from "@/components/SmartImage";

export default function NotFound() {
  return (
    <div className="container page">
      <div className="not-found" data-testid="not-found">
        <SmartImage src="/images/brand/not-found.jpg" alt="น้องแมวหาของไม่เจอ" emoji="🙀" tone="cat" className="nf-img" eager />
        <div className="nf-copy">
          <p className="nf-code">404</p>
          <h1>อุ๊ย! ไม่พบหน้าที่คุณตามหา</h1>
          <p>หน้านี้อาจถูกย้าย หรือน้องแมวเผลอทำหล่นหายไปแล้ว ลองกลับไปเริ่มที่หน้าแรกนะ</p>
          <div className="nf-actions">
            <Link href="/" className="btn btn-primary btn-lg" data-testid="not-found-home">
              🏠 กลับหน้าแรก
            </Link>
            <Link href="/products" className="btn btn-ghost btn-lg">
              ดูสินค้าทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

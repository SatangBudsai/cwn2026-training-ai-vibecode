import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

// ปุ่ม "สำรวจ" ตอนปลายทางว่าง (B10) · แอปนี้มีข้อมูลเส้นทางเดียว
export default function Explore() {
  return (
    <>
      <Header />
      <main id="main" className="results">
        <h1 className="results-title">สำรวจจุดหมายปลายทาง</h1>
        <p>จุดหมายที่มีข้อมูลเที่ยวบิน: <Link href="/search?trip=oneway&cabin=economy&from=กรุงเทพมหานคร&to=โตเกียว&date=2026-11-15">โตเกียว (อาทิตย์ 15 พ.ย. 2026)</Link></p>
      </main>
      <Footer />
    </>
  );
}

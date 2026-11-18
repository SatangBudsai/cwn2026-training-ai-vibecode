import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeForm from '@/components/HomeForm';

export default function Home() {
  return (
    <>
      <Header />
      <div className="hero">
        <h1 className="hero-title">เที่ยวบิน</h1>
      </div>
      <Suspense><HomeForm /></Suspense>
      <main id="main" tabIndex={-1} className="home-main">
        <p className="home-note">ค้นหาเที่ยวบินจากไทย ข้อมูลที่มีในระบบ: กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · อาทิตย์ 15 พ.ย. 2026</p>
      </main>
      <Footer />
    </>
  );
}

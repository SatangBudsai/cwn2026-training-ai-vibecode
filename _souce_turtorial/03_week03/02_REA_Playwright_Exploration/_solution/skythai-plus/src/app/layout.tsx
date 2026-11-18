import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { FooterSettings } from "@/components/FooterSettings";

export const metadata: Metadata = {
  title: "SkyThai Plus — จองตั๋วเครื่องบินไปญี่ปุ่น (ข้อมูลจำลอง)",
  description: "SkyThai Plus เว็บจองตั๋วเครื่องบินกรุงเทพ → ญี่ปุ่น เวอร์ชัน 2 ใช้ข้อมูลจำลอง ไม่มีการชำระเงินจริง",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <header className="site-header" data-testid="site-header">
          <div className="container">
            <Link href="/" className="brand" data-testid="brand-logo" aria-label="SkyThai Plus หน้าแรก">
              <img src="/icon.png" alt="โลโก้ SkyThai Plus" />
              <span className="brand-text">SkyThai <span>Plus</span></span>
            </Link>
            <span className="mock-pill" data-testid="mock-badge">ข้อมูลจำลอง · ไม่ชำระเงินจริง</span>
            <nav className="header-nav">
              <Link href="/">ค้นหาเที่ยวบิน</Link>
              <Link href="/bookings/lookup" data-testid="nav-lookup">ตรวจสอบการจอง</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer" data-testid="site-footer">
          <div className="container">
            <FooterSettings />
            <div className="row">
              © 2026 SkyThai Plus · โปรเจกต์สาธิต ข้อมูลเที่ยวบินเป็นข้อมูลจำลองที่เก็บไว้ ณ วันที่ 31 ต.ค. 2026
              ราคาและตารางบินจริงอาจต่างออกไป โปรดตรวจสอบกับสายการบินก่อนเดินทาง
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

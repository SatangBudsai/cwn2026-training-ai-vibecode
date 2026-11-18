import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyThai Mini — จองตั๋วเครื่องบินไปญี่ปุ่น",
  description: "เดโมระบบจองตั๋วเครื่องบิน กรุงเทพ → ญี่ปุ่น (ข้อมูลจำลอง ไม่มีการชำระเงินจริง)",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <header className="site-header" data-testid="site-header">
          <Link href="/" className="brand" data-testid="brand-link">
            <img src="/logo.png" alt="โลโก้ SkyThai Mini" width={44} height={44} data-testid="brand-logo" />
            <span>SkyThai <b>Mini</b></span>
          </Link>
          <span className="header-tag">เดโม · ไม่มีการชำระเงินจริง</span>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer" data-testid="site-footer">
          SkyThai Mini เป็นโปรเจกต์ตัวอย่าง ข้อมูลเที่ยวบินเป็นข้อมูลจำลองจากภาพรวมราคาที่เก็บไว้ ไม่ใช่ราคาขายจริง
        </footer>
      </body>
    </html>
  );
}

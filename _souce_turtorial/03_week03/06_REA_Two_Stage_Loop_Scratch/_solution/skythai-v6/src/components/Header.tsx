'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';

// แถบบน (B1 · B66): ชื่อแอปของเราเอง · ข้ามไปเนื้อหาหลัก · เปลี่ยนธีม · (หน้าจอง) ย้อนกลับ
export default function Header({ backHref }: { backHref?: string }) {
  const router = useRouter();
  const toggleTheme = () => {
    const el = document.documentElement;
    el.dataset.theme = el.dataset.theme === 'dark' ? 'light' : 'dark';
  };
  return (
    <header className="header">
      {backHref && (
        <button type="button" className="icon-btn" aria-label="ย้อนกลับ" onClick={() => router.push(backHref)}><Icon name="back" /></button>
      )}
      <Link href="/" className="brand"><Icon name="plane" className="brand-icon" />SkyThai</Link>
      <button type="button" className="skip-link" onClick={() => document.getElementById('main')?.focus()}>ข้ามไปที่เนื้อหาหลัก</button>
      <span className="header-spacer" />
      <button type="button" className="icon-btn" aria-label="เปลี่ยนธีมเว็บไซต์" onClick={toggleTheme}><Icon name="theme" /></button>
    </header>
  );
}

import type { Metadata } from 'next';
import '../styles/tokens.css';
import './globals.css';

export const metadata: Metadata = { title: 'SkyThai Zero (v6) — ค้นหาเที่ยวบิน' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

import type { ReactNode } from "react";
import { SmartImage } from "./SmartImage";

export function AuthShell({
  title,
  subtitle,
  emoji,
  image,
  children,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  image: string;
  children: ReactNode;
}) {
  return (
    <div className="container page auth-page">
      <div className="auth-card">
        <aside className="auth-art" aria-hidden="true">
          <span className="auth-blob" />
          <SmartImage src={image} alt="" emoji={emoji} tone="brand" className="auth-img" eager />
          <p className="auth-art-title">PawPantry Club</p>
          <ul>
            <li>✓ ติดตามคำสั่งซื้อได้ทุกเมื่อ</li>
            <li>✓ รับโค้ดส่วนลดสมาชิก</li>
            <li>✓ แนะนำอาหารที่ใช่สำหรับน้อง</li>
          </ul>
          <span className="auth-paw p1">🐾</span>
          <span className="auth-paw p2">🐾</span>
        </aside>
        <div className="auth-body">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

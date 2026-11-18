import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container" style={{ padding: "60px 20px", textAlign: "center" }} data-testid="not-found">
      <h1 style={{ color: "var(--navy)" }}>ไม่พบหน้าที่ต้องการ</h1>
      <Link href="/" className="btn-secondary">กลับหน้าแรก</Link>
    </div>
  );
}

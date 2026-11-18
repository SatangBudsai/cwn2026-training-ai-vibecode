import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel" data-testid="not-found">
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <Link href="/" className="btn">กลับหน้าแรก</Link>
    </section>
  );
}

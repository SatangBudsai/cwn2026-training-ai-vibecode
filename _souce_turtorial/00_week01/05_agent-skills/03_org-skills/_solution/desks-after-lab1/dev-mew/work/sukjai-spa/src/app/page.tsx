import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>SukJai Spa Member</h1>
      <p>
        <Link href="/login">เข้าสู่ระบบ</Link> · <Link href="/checkout">ซื้อแพ็กเกจ</Link>
      </p>
    </main>
  );
}

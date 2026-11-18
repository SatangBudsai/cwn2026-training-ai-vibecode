export default function HomePage() {
  return (
    <main>
      <h1>ระบบสมาชิก + ชำระเงิน</h1>
      <p>โครงเริ่มต้น: auth · member · payment · notification · audit</p>
      <p>
        ตรวจสถานะ: <a href="/api/healthz">/api/healthz</a> · <a href="/api/readyz">/api/readyz</a>
      </p>
    </main>
  );
}

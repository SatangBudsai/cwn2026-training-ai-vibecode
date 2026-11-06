// ล้างข้อมูลเว็บก่อนรันทุกครั้ง (ตามแผน หัวข้อ 7)
// ตั้ง SKIP_RESET=1 เมื่อมีหลายตัวรันพร้อมกัน เพื่อไม่ให้ reset ทับกัน
module.exports = async () => {
  if (process.env.SKIP_RESET) return;
  const res = await fetch('http://localhost:3000/api/test/reset', { method: 'POST' });
  if (!res.ok) throw new Error(`reset failed: ${res.status}`);
};

// เก็บกวาดหลังเปิดบริษัทเสร็จ: ลบ container ที่รันครั้งเดียวแล้วจบ (init, seed) และตัวเอง
// ให้ docker compose ps เหลือแค่ตัวที่ทำงานตลอด (gitea, runner) · คุยกับ Docker ผ่าน /var/run/docker.sock
import { request } from 'node:http';
import { hostname } from 'node:os';

const remove = (name) => new Promise((resolve) => {
  const req = request({ socketPath: '/var/run/docker.sock', method: 'DELETE', path: `/containers/${name}?force=true` },
    (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  req.on('error', () => resolve(0));
  req.end();
});

for (const name of ['novatech-init', 'novatech-seed']) {
  const code = await remove(name);
  console.log(`${name}: ${code === 204 ? 'ลบแล้ว' : code === 404 ? 'ไม่มีอยู่แล้ว' : `ลบไม่ได้ (${code})`}`);
}
console.log('เหลือ novatech-gitea + novatech-runner');
await remove(hostname());   // ลบตัวเองเป็นขั้นสุดท้าย

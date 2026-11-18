const fs = require('node:fs/promises');
const path = require('node:path');
function concise(reason) {
  const s = reason.replace(/\u001b\[[0-9;]*m/g, '');
  if (s.startsWith('ยืนยันไม่ได้')) return s.split('\n')[0];
  const mismatch = s.match(/(\d+) !== (\d+)/);
  if (mismatch) {
    const lead = s.split('\n')[0];
    return (lead.startsWith('Expected') ? 'จำนวนหรือค่าที่แสดงไม่ตรงเกณฑ์' : lead) + ` (พบ ${mismatch[1]}, คาด ${mismatch[2]})`;
  }
  const pattern = s.match(/regular expression (\/.*\/)[.]?\s*Input:/);
  if (pattern) return `ไม่พบข้อความตามเกณฑ์ ${pattern[1]}`;
  if (s.includes('Timeout')) {
    const target = s.match(/name: ('[^']*'|\/.*?\/)/);
    return `ไม่พบหรือกดองค์ประกอบ ${target ? target[1] : 'ที่ระบุ'} ไม่ได้ภายในเวลารอ`;
  }
  if (s.includes('assert(a.some')) return 'ไม่พบตารางบิน 14:15 ที่มีราคาทั้ง ฿32,050 และ ฿32,132';
  return s.split('\n')[0].slice(0,250);
}
async function writeReport({root, report, baseURL, results}) {
  const pass = results.filter(r=>r.status==='PASS').length;
  const escape = s=>s.replace(/\|/g,'\\|').replace(/\n/g,' ');
  const unverified = results.filter(r=>r.status==='FAIL' && r.reason.startsWith('ยืนยันไม่ได้')).length;
  const lines = [
    `# ${report==='BASELINE.md'?'Baseline — SkyThai Plus v2':'Acceptance report'}`, '',
    `URL: ${baseURL}`, `รันเมื่อ: ${new Date().toISOString()}`, '',
    '| ทั้งหมด | ผ่าน | ไม่ผ่าน |', '|---:|---:|---:|', `| ${results.length} | ${pass} | ${results.length-pass} |`, '',
    `ในกลุ่มไม่ผ่าน มี ${unverified} ข้อที่ยังยืนยันไม่ได้ในขอบเขตการทดสอบ จึงไม่ใช่ข้อสรุปว่าแอปผิดทั้งหมด`, '',
    'เกณฑ์: EXPLORATION.md ส่วน B (35 ฟีเจอร์), C (31 กฎ), F1 (16 ข้อค้นพบ) รวม 82 test; F2 เป็นคำตอบซ้ำจาก F1 จึงไม่เพิ่ม test ซ้ำ C28–C30 เป็นสมมติฐาน [R] ตามเอกสาร', '',
    'ทุกข้อค้นหาจากข้อความ/role/label ไม่อ่านโค้ดแอป ไม่ใช้ data-testid ไม่เรียก API ภายใน ไม่ล็อกอิน ไม่ชำระเงิน และไม่กดดำเนินการต่อไปผู้ขาย ตั้งคำค้นกรุงเทพมหานคร → เมืองโตเกียว 15 พฤศจิกายน 2026 ผ่านฟอร์มบนจอ', '',
    'F08/F14/F16 ยืนยันด้วย UI รอบเดียวไม่ได้จึงนับเป็นไม่ผ่านการยืนยัน ข้อ F ที่เหลือตรวจเฉพาะผลที่ผู้ใช้เห็น ไม่ได้อ้างว่ายืนยันโครงสร้าง RPC การฝัง HTML หรือการกรองฝั่ง server ข้อมูลราคาบางข้อเป็น snapshot ในเอกสารซึ่งอาจเปลี่ยนได้', '',
    '| test | ผ่าน/ไม่ผ่าน | เหตุผลสั้น ๆ |', '|---|---|---|',
    ...results.map(r=>`| [${r.id} ${r.title}](gif/${r.id}.gif) | ${r.status==='PASS'?'ผ่าน':'ไม่ผ่าน'} | ${escape(concise(r.reason))}${r.artifactError?' · สร้าง GIF ไม่สำเร็จ':''} |`), '',
    'หลักฐานทุกข้อ: `video/<id>.webm`, `gif/<id>.gif`, `screenshots/<id>.png`, `evidence/<id>.txt` ข้อผิดพลาดฉบับเต็มอยู่ใน `results.json` ค้างภาพสุดท้าย 3 วินาทีก่อนจบทั้งข้อผ่านและไม่ผ่าน วิธีรันอยู่ใน [README.md](README.md)', ''
  ];
  await fs.writeFile(path.join(root,report),lines.join('\n'));
  return {total:results.length,pass,fail:results.length-pass,unverified};
}
module.exports={writeReport};
if(require.main===module) (async()=>{
  const data=JSON.parse(await fs.readFile(path.join(__dirname,'results.json'),'utf8'));
  console.log(await writeReport({root:__dirname,report:process.env.ACCEPT_REPORT||'REPORT.md',...data}));
})().catch(e=>{console.error(e);process.exitCode=2;});

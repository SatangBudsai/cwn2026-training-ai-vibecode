// เขียน DIFF-REPORT.md จากผลของ diff/run.mjs
import fs from 'node:fs';

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const icon = { 'ตรง': '✅ ตรง', 'ไม่ตรง': '❌ ไม่ตรง', 'ไม่มีฟีเจอร์': '⛔ ไม่มีฟีเจอร์', 'ข้าม': '— ข้าม' };

export function writeReport(results, scenarios, file) {
  const vs = Object.keys(results.versions);
  const L = [];
  L.push('# DIFF-REPORT — differential testing: ต้นฉบับแช่แข็ง vs โคลน v1 · v2 · v3', '');
  L.push(`รันเมื่อ ${results.ranAt} · ตัวรัน \`node diff/run.mjs\` · ผลดิบ \`diff/results/diff-results.json\` · GIF เคียงข้าง (ซ้ายต้นฉบับ | ขวา v3) ใน \`diff/gif/\``, '');
  L.push('เฉลยทุกช่องดึงจากต้นฉบับแช่แข็ง (`frozen/open-original.mjs`, offline จาก HAR) ใหม่ทุกครั้งที่รัน ไม่มีตัวเลขคาดหวังเขียนไว้ในโค้ด เทียบ: จำนวนเที่ยวบิน · ลำดับราคา · ลำดับสายการบิน · ลำดับเวลาออก (ทุกตำแหน่ง)', '');
  L.push(`| สถานการณ์ | ต้นฉบับได้ | ${vs.join(' | ')} |`);
  L.push(`|---|---|${vs.map(() => '---').join('|')}|`);
  for (const s of scenarios) {
    const O = results.original[s.id];
    const orig = O.error ? `ERROR ${O.error}` : s.summary(O.data);
    const cols = vs.map((v) => {
      const r = results.versions[v][s.id];
      const body = `${icon[r.verdict] ?? r.verdict} — ${r.detail.replace(/^(ตรง|ไม่ตรง):?\s*/, '')}`;
      return cell(r.gif ? `${body} [GIF](${r.gif})` : body);
    });
    L.push(`| ${s.id} ${s.title} | ${cell(orig)} | ${cols.join(' | ')} |`);
  }
  L.push(`| **รวม (ตรง/ทั้งหมด)** | ${scenarios.length} สถานการณ์ | ${vs.map((v) => `**${scenarios.filter((s) => results.versions[v][s.id].verdict === 'ตรง').length}/${scenarios.length}**`).join(' | ')} |`, '');

  const s4 = results.original.S4?.data?.methodCheck;
  L.push('## ที่มาของเฉลย', '');
  L.push('| สถานการณ์ | เฉลยมาจาก | เหตุผล |', '|---|---|---|');
  for (const s of scenarios) {
    const d = results.original[s.id].data;
    const src = !d ? '—' : d.source === 'derived' ? `กรองรายการ ${d.from} ใบของต้นฉบับ (หลัง "ดูเที่ยวบินเพิ่มเติม") ด้วยเงื่อนไขเดียวกัน · ตัดสินจากจำนวน + ชุดเที่ยวบิน (ลำดับไม่ใช้ตัดสิน)`
      : d.source === 'label' ? 'ป้ายแท็บ "ถูกที่สุด เริ่มต้น ฿x" ของต้นฉบับ + ราคาต่ำสุดในรายการ' : 'ผลสดของต้นฉบับ (HAR มี response)';
    const why = !d ? '' : d.source ? 'HAR อัดไว้แค่ 3 ครั้งของ GetShoppingResults (ค้นหา · ดูเพิ่มเติม · บินตรง) ตัวกรอง/แท็บนี้จึงไม่มีคำตอบให้เล่นซ้ำ' : '—';
    L.push(`| ${s.id} ${s.title} | ${src} | ${why} |`);
  }
  if (s4) L.push('', `ตรวจวิธีอนุมาน: กรองรายการ 300 ใบของต้นฉบับด้วย "บินตรง" เทียบกับผลบินตรงสดจาก HAR → ${s4.ok ? '✅' : '⚠️'} ${s4.detail} — สรุป: วิธีอนุมานให้ "จำนวน + ชุดเที่ยวบิน" ถูกต้อง แต่ลำดับหลังกรองของ Google เปลี่ยนได้ จึงใช้ตัดสิน S5–S7 แค่จำนวน + ชุด`);
  L.push('', 'แท็บถูกที่สุด: เกณฑ์ "ใบแรก = ราคาเริ่มต้นบนป้าย" และ "ราคาเรียงจากน้อยไปมาก" เป็นข้อสันนิษฐานจากชื่อแท็บ เพราะไม่มีรายการจริงของแท็บนี้ใน HAR จำนวนใบของแท็บจึงไม่ได้เทียบ (แสดงไว้เป็นข้อมูล)');
  fs.writeFileSync(file, L.join('\n') + '\n');
}

'use strict';
// ที่เก็บข้อมูล: SQLite (node:sqlite) เฉพาะ users · ที่เหลือเป็นหน่วยความจำ (store.mem)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, dept TEXT NOT NULL DEFAULT '',
  pw_salt TEXT, pw_hash TEXT,
  id_enc TEXT, id_idx TEXT, mobile_enc TEXT, email_enc TEXT, registered INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS users_id_idx ON users(id_idx);`);

let ctx = null; // ผูกโดย server.js (ใช้ ctx.vault แบบ lazy เพื่อให้ B06 เขียนทับได้)
const vault = () => ctx.vault;

const STAFF = [
  ['off.reg1', 'เจ้าหน้าที่ทะเบียน 1', 'officer', 'registry'],
  ['off.reg2', 'เจ้าหน้าที่ทะเบียน 2', 'officer', 'registry'],
  ['off.works1', 'เจ้าหน้าที่โยธา 1', 'officer', 'works'],
  ['head1', 'หัวหน้าฝ่าย', 'head', ''],
  ['exec1', 'ผู้บริหาร', 'executive', ''],
  ['audit1', 'ผู้ตรวจสอบภายใน', 'auditor', ''],
  ['admin1', 'ผู้ดูแลระบบ', 'admin', ''],
];
const CITIZENS = [
  ['สมชาย ใจดี', '1101700123456', '0812345678', 1],
  ['สมหญิง รักไทย', '3100600987659', '0823456789', 1],
  ['มานะ ตั้งใจ', '5500400111221', '', 0],
  ['ปิติ มีสุข', '1909900555015', '0834567890', 1],
];

function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32, { N: 1024 }).toString('hex'); }

const mem = {}; // เติมใน resetMem()
function resetMem() {
  for (const k of Object.keys(mem)) delete mem[k];
  Object.assign(mem, {
    cases: new Map(),        // caseNo -> case (B05)
    drafts: new Map(),       // draftId -> draft (B03)
    payments: new Map(),     // ref -> payment (B03)
    files: new Map(),        // fileId -> {meta, buffer} (B03)
    documents: new Map(),    // docNo -> document (B05)
    audit: [],               // append-only (ctx.audit.add)
    notifications: [],       // (ctx.notify.emit)
    counters: {},            // ชื่อ -> เลขล่าสุด (store.nextId)
    services: {
      'SV-01': { id: 'SV-01', fee: 20, feePerSqm: 0, feeBase: 0, sla: 3 },
      'SV-02': { id: 'SV-02', fee: 500, feePerSqm: 0, feeBase: 0, sla: 10 },
      'SV-03': { id: 'SV-03', fee: 0, feeBase: 1000, feePerSqm: 10, sla: 15 },
    },
    holidays: [
      { date: '2026-12-07', name: 'ชดเชยวันหยุดทดสอบ (สมมติ)' },
      { date: '2026-12-10', name: 'วันรัฐธรรมนูญทดสอบ (สมมติ)' },
      { date: '2026-12-31', name: 'วันสิ้นปีทดสอบ (สมมติ)' },
      { date: '2027-01-01', name: 'วันขึ้นปีใหม่ทดสอบ (สมมติ)' },
    ],
    otp: new Map(),          // ตัวนับ OTP ผิด/ล็อก (B02)
  });
}
resetMem();

// เลขรันนิ่ง: store.nextId('case', start) -> เลขถัดไป (start = ค่าเริ่มเมื่อยังไม่มี ผู้ seed ตั้งด้วย setCounter)
const store = {
  db, mem, DB_PATH,
  bind(c) { ctx = c; },
  nextId(name) { mem.counters[name] = (mem.counters[name] || 0) + 1; return mem.counters[name]; },
  setCounter(name, n) { mem.counters[name] = n; },
  peekCounter(name) { return mem.counters[name] || 0; },

  users: {
    list() { return db.prepare('SELECT * FROM users ORDER BY rowid').all().map(pub); },
    get(username) { const r = db.prepare('SELECT * FROM users WHERE username=?').get(username); return r ? pub(r) : null; },
    // ค้นหาประชาชนด้วยเลขบัตร (ผ่าน blind index)
    findByIdNo(idNo) { const r = db.prepare('SELECT * FROM users WHERE id_idx=?').get(vault().blindIndex(idNo)); return r ? pub(r) : null; },
    // ข้อมูลเต็ม (ถอดรหัสแล้ว) ของประชาชน: {idNo, mobile, email}
    pii(username) {
      const r = db.prepare('SELECT * FROM users WHERE username=?').get(username);
      if (!r) return null;
      const dec = (v) => (v ? vault().decrypt(v) : '');
      return { idNo: dec(r.id_enc), mobile: dec(r.mobile_enc), email: dec(r.email_enc) };
    },
    verifyPassword(username, password) {
      const r = db.prepare('SELECT pw_salt, pw_hash FROM users WHERE username=?').get(username);
      if (!r || !r.pw_hash) return false;
      const a = Buffer.from(hashPw(String(password), r.pw_salt), 'hex');
      return crypto.timingSafeEqual(a, Buffer.from(r.pw_hash, 'hex'));
    },
    // สร้างประชาชน: คืน user
    createCitizen({ name, idNo, mobile = '', email = '', registered = 0 }) {
      const idx = vault().blindIndex(idNo);
      const username = 'cit-' + idx.slice(0, 12);
      db.prepare('INSERT OR REPLACE INTO users(username,name,role,dept,id_enc,id_idx,mobile_enc,email_enc,registered) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(username, name, 'citizen', '', vault().encrypt(idNo), idx, mobile ? vault().encrypt(mobile) : '', email ? vault().encrypt(email) : '', registered ? 1 : 0);
      return store.users.get(username);
    },
    register(username, { mobile, email = '' }) {
      db.prepare('UPDATE users SET mobile_enc=?, email_enc=?, registered=1 WHERE username=?')
        .run(vault().encrypt(mobile), email ? vault().encrypt(email) : '', username);
      return store.users.get(username);
    },
    // เปลี่ยนบทบาท/แผนก (B07 admin)
    setRole(username, role, dept = '') {
      db.prepare('UPDATE users SET role=?, dept=? WHERE username=?').run(role, dept, username);
      return store.users.get(username);
    },
  },

  // ล้างทุกอย่างแล้ว seed users + services + holidays ใหม่ (ผู้ใช้ hook onReset ของโมดูลอื่นถูกเรียกโดย server.js หลังจากนี้)
  reset() {
    resetMem();
    db.exec('DELETE FROM users');
    for (const [username, name, role, dept] of STAFF) {
      const salt = crypto.randomBytes(8).toString('hex');
      db.prepare('INSERT INTO users(username,name,role,dept,pw_salt,pw_hash,registered) VALUES(?,?,?,?,?,?,1)')
        .run(username, name, role, dept, salt, hashPw('Test@1234', salt));
    }
    for (const [name, idNo, mobile, reg] of CITIZENS) store.users.createCitizen({ name, idNo, mobile, registered: reg });
  },
};
function pub(r) {
  return { username: r.username, name: r.name, role: r.role, dept: r.dept || '', registered: !!r.registered };
}

module.exports = store;

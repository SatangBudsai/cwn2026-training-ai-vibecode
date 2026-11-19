'use strict';
// B06: PDPA (NFR-04, FR-21, BR-24) · AES-256-GCM ที่เก็บ · blind index HMAC-SHA256 · ปิดบังเลขบัตร · API "แสดงเลขเต็ม"
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// กุญแจหลัก: VAULT_KEY (env) > ไฟล์ data/vault.key (สร้างครั้งแรก, อยู่ข้างไฟล์ฐานข้อมูล) > (สำรอง) สุ่มในหน่วยความจำ
function loadMasterKey() {
  const env = process.env.VAULT_KEY;
  if (env) return crypto.createHash('sha256').update(env).digest();
  try {
    const dbPath = process.env.DB_PATH;
    const dir = dbPath && dbPath !== ':memory:' ? path.dirname(path.resolve(dbPath)) : path.join(__dirname, '..', 'data');
    const file = path.join(dir, 'vault.key');
    if (fs.existsSync(file)) {
      const hex = fs.readFileSync(file, 'utf8').trim();
      if (/^[0-9a-f]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
    }
    const k = crypto.randomBytes(32);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, k.toString('hex'), { mode: 0o600 });
    return k;
  } catch (e) {
    return crypto.randomBytes(32);
  }
}

const master = loadMasterKey();
// แยกกุญแจเข้ารหัสกับกุญแจ blind index (HKDF)
const ENC_KEY = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'rerun-vault-enc', 32));
const IDX_KEY = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'rerun-vault-idx', 32));
const PREFIX = 'v1:';

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64'); // iv(12)|tag(16)|cipher
}
function decrypt(token) {
  const s = String(token);
  if (!s.startsWith(PREFIX)) throw new Error('VAULT_BAD_TOKEN');
  const b = Buffer.from(s.slice(PREFIX.length), 'base64');
  if (b.length < 28) throw new Error('VAULT_BAD_TOKEN');
  const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); // authTag ผิด -> throw
}
const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
// '3100600987659' -> 'X-XXXX-XXXXX-65-9'
function mask(idNo) {
  const s = digits(idNo);
  if (s.length !== 13) return 'X-XXXX-XXXXX-XX-X';
  return `X-XXXX-XXXXX-${s.slice(10, 12)}-${s[12]}`;
}
// '3100600987659' -> '3-1006-00987-65-9'
function format(idNo) {
  const s = digits(idNo);
  if (s.length !== 13) return String(idNo);
  return `${s[0]}-${s.slice(1, 5)}-${s.slice(5, 10)}-${s.slice(10, 12)}-${s[12]}`;
}
// ข้อความที่เป็นเลข (มี - หรือช่องว่างได้) normalise เป็นตัวเลขล้วนก่อน แล้ว HMAC-SHA256 -> hex
function blindIndex(plain) {
  const raw = String(plain == null ? '' : plain).trim();
  const norm = /^[\d\s-]+$/.test(raw) ? digits(raw) : raw;
  return crypto.createHmac('sha256', IDX_KEY).update(norm).digest('hex');
}

exports.register = function register(router, ctx) {
  const { store } = ctx;
  ctx.vault = { encrypt, decrypt, mask, format, blindIndex };

  // POST /api/officer/cases/:caseNo/unmask  {reason} -> {idNo} + Audit UNMASK (BR-24, A-32)
  router.add('POST', '/api/officer/cases/:caseNo/unmask', (req, res) => {
    const u = ctx.requireRole(req, res, ['officer', 'head']);
    if (!u) return;
    const caseNo = req.params.caseNo;
    const c = store.mem.cases.get(caseNo);
    if (!c) return ctx.err(res, 404, 'NOT_FOUND', 'ไม่พบคำขอ');
    const reason = typeof (req.body || {}).reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return ctx.err(res, 400, 'REASON_REQUIRED', 'กรุณากรอกเหตุผล');
    // หาเลขบัตรของผู้ยื่นจาก user (ถอดรหัสจากที่เก็บ) ; รองรับ case ที่เก็บเลขเข้ารหัสไว้เอง
    let idNo = '';
    const owner = c.citizen || c.citizenUsername || c.applicantUsername || c.applicant || c.username;
    try {
      if (owner && store.users.get(owner)) idNo = store.users.pii(owner).idNo;
      else if (c.idEnc) idNo = decrypt(c.idEnc);
    } catch (e) { idNo = ''; }
    if (!idNo) return ctx.err(res, 404, 'NOT_FOUND', 'ไม่พบคำขอ');
    if (!ctx.bug('B11')) ctx.audit.add({ username: u.username, role: u.role, event: 'UNMASK', caseNo, fromStatus: '', toStatus: '', detail: reason });
    ctx.json(res, 200, { idNo });
  });
};

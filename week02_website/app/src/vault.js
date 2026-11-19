// SQLite user store at DB_PATH. idNo + mobile are AES-256-GCM encrypted; lookup via HMAC blind index.
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SECRET = process.env.DATA_KEY || 'cwn2026-demo-data-key';
const KEY = crypto.createHash('sha256').update('enc|' + SECRET).digest();
const BIDX = crypto.createHash('sha256').update('idx|' + SECRET).digest();
export const SIGN_KEY = crypto.createHash('sha256').update('sig|test-key').digest();

export const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'egov.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
for (const ext of ['', '-journal', '-wal', '-shm']) { try { fs.unlinkSync(DB_PATH + ext); } catch {} }
const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users(
  username TEXT PRIMARY KEY, name TEXT, role TEXT, dept TEXT, pw TEXT,
  idno_enc TEXT, idno_idx TEXT, mobile_enc TEXT, email TEXT, registered INTEGER)`);

export function enc(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}
export function dec(s) {
  if (!s) return null;
  const b = Buffer.from(s, 'base64url');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
export const blind = idNo => crypto.createHmac('sha256', BIDX).update(idNo).digest('base64url');
export const pwHash = pw => crypto.createHash('sha256').update('pw|' + pw).digest('base64url');
export const hmacSign = s => crypto.createHmac('sha256', SIGN_KEY).update(s).digest('hex');

export function resetUsers() { db.exec('DELETE FROM users'); }
export function putUser(u) {
  db.prepare(`INSERT OR REPLACE INTO users(username,name,role,dept,pw,idno_enc,idno_idx,mobile_enc,email,registered)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(u.username, u.name, u.role, u.dept || null, u.pw || null,
    u.idno_enc || null, u.idno_idx || null, u.mobile_enc || null, u.email || '', u.registered ? 1 : 0);
}
const row = r => r && { ...r, registered: !!r.registered };
export const getUser = username => row(db.prepare('SELECT * FROM users WHERE username=?').get(username));
export const getUserByIdx = idx => row(db.prepare('SELECT * FROM users WHERE idno_idx=?').get(idx));
export const allUsers = () => db.prepare('SELECT * FROM users ORDER BY rowid').all().map(row);
export function citizenUsername(idNo) { return 'c' + blind(idNo).replace(/[^A-Za-z]/g, '').slice(0, 10).toLowerCase(); }
export function makeCitizen({ idNo, name, mobile, registered }) {
  const u = { username: citizenUsername(idNo), name, role: 'citizen', dept: null, idno_enc: enc(idNo), idno_idx: blind(idNo), mobile_enc: enc(mobile), registered };
  putUser(u); return u;
}
export const idNoOf = u => dec(u.idno_enc);

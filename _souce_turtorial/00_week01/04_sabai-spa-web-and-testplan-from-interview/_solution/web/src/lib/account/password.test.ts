import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

// รหัสตาม TEST-DATA ข้อ 2 · ไฟล์ seed อยู่นอกโฟลเดอร์ web
const SEED_PATH = fileURLToPath(new URL('../../../../db/init/02-seed.sql', import.meta.url));
const SEED_PASSWORDS: Record<string, string> = {
  'nida@sabai.test': 'Nida#2026',
  'ton@sabai.test': 'Ton#2026',
  'fon@sabai.test': 'Fon#2026',
  'may@sabai.test': 'May#2026',
  'prae@sabai.test': 'Prae#2026',
  'liwei@sabai.test': 'LiWei#2026',
  'owner@sabai.test': 'Owner#2026',
  'kan@sabai.test': 'Kan#2026',
  'win@sabai.test': 'Win#2026',
  'bee@sabai.test': 'Bee#2026',
  'por@sabai.test': 'Por#2026',
  'muk@sabai.test': 'Muk#2026',
};

describe('hashPassword', () => {
  it('ได้ Argon2id ค่าเดียวกับ seed และไม่มีรหัสเดิมในผลลัพธ์', async () => {
    const hashed = await hashPassword('Sup3rSecret!');
    expect(hashed.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
    expect(hashed).not.toContain('Sup3rSecret!');
  });

  it('รหัสเดียวกันได้ค่าไม่ซ้ำกันเพราะมี salt', async () => {
    expect(await hashPassword('Sup3rSecret!')).not.toBe(await hashPassword('Sup3rSecret!'));
  });

  it('ตรวจรหัสถูกผ่าน รหัสผิดไม่ผ่าน และแยกตัวเล็กตัวใหญ่', async () => {
    const hashed = await hashPassword('Sup3rSecret!');
    expect(await verifyPassword(hashed, 'Sup3rSecret!')).toBe(true);
    expect(await verifyPassword(hashed, 'sup3rsecret!')).toBe(false);
  });
});

describe.skipIf(!existsSync(SEED_PATH))('บัญชีทดสอบใน seed', () => {
  const seed = existsSync(SEED_PATH) ? readFileSync(SEED_PATH, 'utf8') : '';
  const hashes = new Map(
    [...seed.matchAll(/'([a-z]+@sabai\.test)', '(\$argon2id\$[^']+)'/g)].map((m) => [m[1], m[2]] as const),
  );

  it('มีครบ 12 บัญชี', () => {
    expect([...hashes.keys()].sort()).toEqual(Object.keys(SEED_PASSWORDS).sort());
  });

  it.each(Object.entries(SEED_PASSWORDS))('%s ตรวจผ่านด้วยรหัสในตาราง', async (email, password) => {
    expect(await verifyPassword(hashes.get(email) as string, password)).toBe(true);
  });
});

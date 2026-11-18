// รหัสผ่าน Argon2id ค่าเดียวกับ seed (NFR-13, D-27) · ห้าม log รหัสผ่านไม่ว่ากรณีใด
import { hash, verify } from '@node-rs/argon2';

// Algorithm ของไลบรารีเป็น const enum ใช้ชื่อไม่ได้ภายใต้ isolatedModules · 2 = Argon2id
const ARGON2ID = 2;

export function hashPassword(password: string): Promise<string> {
  return hash(password, { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

import { request, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** เงื่อนไขเริ่มทดสอบตามแผนหัวข้อ 6 และเก็บ data-bug-mode ไว้ทำป้ายในรายงาน */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';
  const api = await request.newContext({ baseURL });
  try {
    const res = await api.get('/api/health');
    const body = await res.json().catch(() => ({}));
    if (res.status() !== 200 || body.ok !== true || body.db !== true) {
      throw new Error(`เว็บยังไม่พร้อม ${baseURL}/api/health: ${res.status()} ${JSON.stringify(body)}`);
    }
    const html = await (await api.get('/th')).text();
    const bugMode = /data-bug-mode="([^"]*)"/.exec(html)?.[1] ?? 'ไม่พบ';
    const dir = path.resolve('test-report');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'bug-mode.json'), JSON.stringify({ bugMode, baseURL }, null, 2));
  } finally {
    await api.dispose();
  }
}

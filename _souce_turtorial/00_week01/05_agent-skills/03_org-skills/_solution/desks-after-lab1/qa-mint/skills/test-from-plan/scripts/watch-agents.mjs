#!/usr/bin/env node
// ดูจอ agents.html ด้วย Chromium headless (แทนการเปิดใน Chrome ของผู้ใช้) ถ่ายภาพทุก 5 วินาที จนมี test-report/agents.done
// ใช้: node watch-agents.mjs   → test-report/agents-shots/HHMMSS.png และภาพสุดท้าย test-report/agents-final.png
import fs from 'node:fs';
import { playwright, fileUrl } from './_lib.mjs';

const dir = 'test-report/agents-shots';
fs.mkdirSync(dir, { recursive: true });
const { chromium } = playwright();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 560 } });
while (!fs.existsSync('test-report/agents.html')) await new Promise(r => setTimeout(r, 1000));
await p.goto(fileUrl('test-report/agents.html'));
for (;;) {
  await p.reload().catch(() => {});
  await p.screenshot({ path: `${dir}/${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.png` });
  if (fs.existsSync('test-report/agents.done')) break;
  await new Promise(r => setTimeout(r, 5000));
}
await new Promise(r => setTimeout(r, 1500));
await p.reload().catch(() => {});
await p.screenshot({ path: 'test-report/agents-final.png' });
await b.close();

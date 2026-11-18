// สร้างเสียงสปาชั่วคราว (FR-62, D-19): คอร์ดนุ่ม ๆ เบา ๆ วนได้ · รันซ้ำแล้วได้ไฟล์เดิมทุกไบต์
// node scripts/gen-spa-audio.mjs
import { writeFileSync } from 'node:fs';

const RATE = 22050;
const SECONDS = 48;
const N = RATE * SECONDS;
const out = new Float64Array(N);

// คอร์ด pentatonic ต่อเนื่องกัน ไม่มีเครื่องเคาะ
const chords = [
  [146.83, 220.0, 293.66, 369.99],
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 277.18],
  [123.47, 185.0, 246.94, 293.66],
];
const chordLen = SECONDS / chords.length;

for (let c = 0; c < chords.length; c++) {
  const startSec = c * chordLen;
  for (const [i, f] of chords[c].entries()) {
    const phase = i * 0.7;
    // ทับกันช่วงเปลี่ยนคอร์ด และวนรอบไฟล์ได้เนียน
    for (let n = 0; n < chordLen * 1.5 * RATE; n++) {
      const t = n / RATE;
      const env = Math.sin((Math.PI * t) / (chordLen * 1.5)) ** 2;
      const slow = 1 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t + phase);
      const s =
        Math.sin(2 * Math.PI * f * t + phase) * 0.6 +
        Math.sin(2 * Math.PI * f * 2 * t + phase) * 0.12 +
        Math.sin(2 * Math.PI * (f + 0.4) * t) * 0.28;
      const idx = (Math.floor(startSec * RATE) + n) % N;
      out[idx] += s * env * slow * 0.09;
    }
  }
}

let peak = 0;
for (const v of out) peak = Math.max(peak, Math.abs(v));
const gain = 0.5 / peak;

const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(out[i] * gain * 32767), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(new URL('../public/audio/spa-ambient-placeholder.wav', import.meta.url), Buffer.concat([header, data]));
console.log('spa-ambient-placeholder.wav', ((44 + data.length) / 1048576).toFixed(1), 'MB');

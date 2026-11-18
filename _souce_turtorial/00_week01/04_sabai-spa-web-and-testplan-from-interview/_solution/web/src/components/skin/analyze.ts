// อ่านภาพในเบราว์เซอร์เท่านั้น (FR-74, NFR-09)
// ไม่มี fetch ไม่มีการเขียนลง storage · canvas, bitmap และ ObjectURL ถูกล้างทันทีหลังคำนวณ
import { brightnessFromPixels } from '@/lib/rules/skin';

const SAMPLE_SIZE = 64;

function measure(source: CanvasImageSource): number {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas-unavailable');
  try {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const image = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const brightness = brightnessFromPixels(image.data);
    image.data.fill(0);
    return brightness;
  } finally {
    ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    canvas.width = 0;
    canvas.height = 0;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-unreadable'));
    img.src = src;
  });
}

async function measureFromUrl(url: string): Promise<number> {
  const img = await loadImage(url);
  try {
    return measure(img);
  } finally {
    img.removeAttribute('src');
  }
}

/** รูปของลูกค้า: ถอดรหัสในเครื่องผ่าน createImageBitmap หรือ Image + ObjectURL */
export async function brightnessFromFile(file: File): Promise<number> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return measure(bitmap);
      } finally {
        bitmap.close();
      }
    } catch {
      // บางเบราว์เซอร์ถอดรหัสบางชนิดไฟล์ด้วย bitmap ไม่ได้ ลองทางถัดไป
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await measureFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** ภาพตัวอย่างของร้าน */
export function brightnessFromSample(url: string): Promise<number> {
  return measureFromUrl(url);
}

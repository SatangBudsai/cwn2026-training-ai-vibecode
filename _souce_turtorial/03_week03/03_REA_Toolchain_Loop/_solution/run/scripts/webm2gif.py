"""แปลง video/journey.webm → gif/journey.gif
ffmpeg ของ Playwright (/ms-playwright/ffmpeg-*/ffmpeg-linux) ถอด VP8 และเขียน PNG ได้ แต่ไม่มี GIF encoder และ filter fps/scale
จึงแตกเป็นภาพ PNG (fps/ขนาดลดลง) แล้วให้ Pillow ประกอบเป็น GIF
ใช้: python3 -I scripts/webm2gif.py video/journey.webm gif/journey.gif [fps] [width]"""
import glob, subprocess, sys, tempfile, os
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
fps = int(sys.argv[3]) if len(sys.argv) > 3 else 4
width = int(sys.argv[4]) if len(sys.argv) > 4 else 800
ffmpeg = sorted(glob.glob('/ms-playwright/ffmpeg-*/ffmpeg-linux'))[-1]
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run([ffmpeg, '-loglevel', 'error', '-i', src, '-r', str(fps),
                    os.path.join(tmp, 'f%04d.png')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, 'f*.png')))
    def load(f):
        im = Image.open(f).convert('RGB')
        return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    frames = [load(f).quantize(colors=128, method=Image.Quantize.MEDIANCUT) for f in files]
    frames[0].save(dst, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, optimize=True)
    print(f'{dst}: {len(frames)} frames @ {fps} fps, {width}px, {os.path.getsize(dst)/1e6:.1f} MB')

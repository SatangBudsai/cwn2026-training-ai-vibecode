#!/usr/bin/env bash
# วัด SkyThai Mini (v1) ด้วยไม้บรรทัด 5 อัน (acceptance · differential · โครงสร้างหน้า · visual diff · เที่ยวบิน)
# ใช้:  measure/run-all.sh            (ค่าเริ่มต้น BASE_URL=http://localhost:5081)
#       BASE_URL=http://localhost:5081 measure/run-all.sh
# ผล:   measure/results/<เวลา>/ · measure/results/latest → รอบล่าสุด · measure/results/SUMMARY.md
# ไม่แก้เกณฑ์ test ไม่แก้แอป ไม่เปิดต้นฉบับ Google (differential ใช้เฉลยใน diff/diff-results.json)
set -uo pipefail
M="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$M"
BASE_URL="${BASE_URL:-http://localhost:5081}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"

# ---------- เครื่องมือ (ติดตั้งครั้งแรกครั้งเดียว ใน measure/.tools) ----------
# playwright ตรึงรุ่นที่ใช้ Chromium r1247 ที่มีอยู่ใน /ms-playwright จึงไม่ต้องดาวน์โหลดเบราว์เซอร์
T="$M/.tools"
mkdir -p "$T/bin"
if [ ! -f "$T/package.json" ]; then
  cat > "$T/package.json" <<'EOF'
{ "name": "measure-tools", "private": true,
  "dependencies": { "playwright": "1.64.0-alpha-1790635538000", "pixelmatch": "7.1.0", "pngjs": "7.0.0" } }
EOF
fi
[ -d "$T/node_modules/playwright" ] || (cd "$T" && npm install --no-audit --no-fund >/dev/null) || { echo "ติดตั้ง playwright/pixelmatch ไม่สำเร็จ" >&2; exit 2; }
ln -sfn .tools/node_modules "$M/node_modules"
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -x "$T/bin/ffmpeg" ]; then
  python3 -m venv "$T/py" && "$T/py/bin/pip" install -q imageio-ffmpeg \
    && ln -sfn "$("$T/py/bin/python" -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" "$T/bin/ffmpeg" \
    || { echo "ติดตั้ง ffmpeg ไม่สำเร็จ" >&2; exit 2; }
fi
export PATH="$T/bin:$PATH"

curl -fsS -o /dev/null "$BASE_URL/" || { echo "เปิด $BASE_URL ไม่ได้ — เปิดแอปก่อน (cd skythai-mini && docker compose up -d)" >&2; exit 2; }

STAMP="$(date +%Y%m%d-%H%M%S)"
R="$M/results/$STAMP"
mkdir -p "$R"
printf '{"ranAt":"%s","baseURL":"%s"}\n' "$(date -Iseconds)" "$BASE_URL" > "$R/meta.json"
echo "== ผลเก็บที่ $R"

step() { local name="$1"; shift; echo "== $name"; "$@" 2>&1 | tee "$R/$name.log"; echo "   (exit ${PIPESTATUS[0]})"; }

# 1) acceptance 82 ข้อ — ตัวรันเดิม เขียนหลักฐานลง accept/ แล้วคัดลอกมาเก็บในรอบนี้ (exit 1 = มีข้อไม่ผ่าน เป็นเรื่องปกติ)
step accept env BASE_URL="$BASE_URL" node accept/run.cjs
mkdir -p "$R/accept"
cp -r accept/results.json accept/REPORT.md accept/screenshots accept/evidence accept/gif "$R/accept/" 2>/dev/null

# 2) differential 8 สถานการณ์ — เฉลยแช่แข็ง + scenarios.mjs/compare เดิม
step diff node --import ./runner/stub-frozen.mjs runner/diff-v1.mjs "$R" "$BASE_URL"

# 3) โครงสร้างหน้า — ariaSnapshot หน้าแรก + structure/compare.mjs (Jaccard + 38 องค์ประกอบสำคัญ)
step structure node runner/structure-v1.mjs "$R" "$BASE_URL"

# 4) visual diff 1366×900 เทียบ visual/reference.png (pixelmatch threshold 0.1)
step visual node runner/visual-v1.cjs "$R" "$BASE_URL"

# 5) เที่ยวบินทั้งหมดที่แอปแสดงได้
step flights node runner/flights-v1.mjs "$R" "$BASE_URL"

[ -f "$M/runner/NOTES.md" ] && cp "$M/runner/NOTES.md" "$R/NOTES.md"
echo "== สรุป"
node runner/summary.mjs "$R"
ln -sfn "$STAMP" "$M/results/latest"
cp "$R/SUMMARY.md" "$M/results/SUMMARY.md"
echo "== เสร็จ: $M/results/SUMMARY.md"

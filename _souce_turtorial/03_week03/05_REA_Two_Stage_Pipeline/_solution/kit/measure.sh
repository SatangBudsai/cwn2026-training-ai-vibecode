#!/usr/bin/env bash
# ชุดวัดกลาง: วัดแอปเวอร์ชันไหนก็ได้ (ที่มีฟอร์มค้นหา) ด้วยไม้บรรทัด 5 อัน → <โฟลเดอร์ผล>/report.json
# ใช้: kit/measure.sh <BASE_URL> <โฟลเดอร์ผล>      เช่น kit/measure.sh http://localhost:5084 out/v4
# ไม่ต่ออินเทอร์เน็ต: differential ใช้เฉลยแช่แข็ง (src/diff/diff-results.json) และ frozen/open-original.mjs ถูกแทนด้วย stub
# ตัวแปรเสริม: ACCEPT_WORKERS (3) · DIFF_PARALLEL (4) · MEASURE_VIDEO=1 (อัดวิดีโอ acceptance) · ACCEPT_HOLD_MS (0)
set -uo pipefail
if [ $# -lt 2 ]; then echo "ใช้: $0 <BASE_URL> <โฟลเดอร์ผล>" >&2; exit 2; fi
BASE="${1%/}"; OUT="$2"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# ติดตั้งเครื่องมือครั้งแรก (kit/.tools) — Playwright รุ่นที่ใช้ Chromium r1247 ใน /ms-playwright
if [ ! -d "$KIT/.tools/node_modules/playwright" ] || [ ! -d "$KIT/.tools/node_modules/pixelmatch" ] || [ ! -d "$KIT/.tools/node_modules/pngjs" ]; then
  echo "== ติดตั้งเครื่องมือใน $KIT/.tools"
  (cd "$KIT/.tools" && npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund) || { echo "ติดตั้งไม่สำเร็จ" >&2; exit 2; }
fi
if ! curl -fsS -o /dev/null --max-time 10 "$BASE/"; then echo "เปิด $BASE ไม่ได้" >&2; exit 2; fi

rm -rf "$OUT/accept" "$OUT/structure" "$OUT/visual" "$OUT"/{accept,diff,structure,visual,flights,report}.json "$OUT/summary.md"
T0=$(date +%s)
run() { # run <ชื่อ> <สคริปต์>
  local t=$(date +%s)
  echo "== $1"
  (cd "$KIT" && node --import ./lib/hooks.mjs "lib/$2" "$BASE" "$OUT") >"$OUT/$1.log" 2>&1
  local rc=$?
  tail -n 1 "$OUT/$1.log"; [ $rc -eq 0 ] || { echo "   ($1 จบด้วย exit $rc — ดู $OUT/$1.log)"; tail -n 5 "$OUT/$1.log"; }
  echo "   ($(( $(date +%s) - t )) วินาที)"
}
# visual/structure/flights ก่อน (เครื่องว่าง ภาพนิ่ง) แล้ว acceptance กับ differential
run visual visual.mjs
run structure structure.mjs
run flights flights.mjs
run accept accept.mjs
run diff diff.mjs
SECS=$(( $(date +%s) - T0 ))
echo
node "$KIT/lib/report.mjs" "$BASE" "$OUT" "$SECS"
node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1])).gate.pass?0:1)' "$OUT/report.json"

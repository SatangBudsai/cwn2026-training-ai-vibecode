#!/usr/bin/env bash
# kit/measure.sh <BASE_URL> <โฟลเดอร์ผล>
# ชุดวัดกลาง: เรียกไม้บรรทัด 5 อันใน rulers/ (ใช้อย่างเดียว ไม่แก้) ตามลำดับ visual → structure → flights → accept → diff
# แล้วรวมเป็น <โฟลเดอร์ผล>/report.json (scores · Score · gate · issues · timings)
# exit 0 = gate ผ่าน · 1 = gate ไม่ผ่าน · 2 = วัดไม่ได้ (เปิด BASE_URL ไม่ได้ / URL เป็น Google / เก็บภาพหน้าแอปไม่ได้)
set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$KIT")"
R="$ROOT/rulers"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"

BASE="${1:-}"; OUT="${2:-}"
if [[ -z "$BASE" || -z "$OUT" ]]; then echo "ใช้: kit/measure.sh <BASE_URL> <โฟลเดอร์ผล>" >&2; exit 2; fi
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
rm -rf "$OUT"/{visual,structure,flights,accept,diff,capture,.shadow} "$OUT"/report.json "$OUT"/timings.tsv
mkdir -p "$OUT"/{visual,structure,flights,accept,diff,capture}
: > "$OUT/timings.tsv"

fail2() {  # วัดไม่ได้ → report.json แบบสั้น + exit 2
  node -e 'const [o,b,r]=process.argv.slice(1);require("fs").writeFileSync(o+"/report.json",JSON.stringify({base:b,at:new Date().toISOString(),status:"unmeasurable",exit:2,reason:r},null,2))' "$OUT" "$BASE" "$1"
  echo "วัดไม่ได้: $1" >&2; exit 2
}

# ---- ไม่ต่อ Google: ไม้บรรทัดจะวิ่งไป Google เมื่อ BASE ว่างหรือเป็น google.com (rulers/lib.mjs isGoogle) ----
if [[ "$BASE" =~ google\. ]]; then fail2 "BASE_URL เป็น Google — ชุดวัดนี้วัดเฉพาะโคลน"; fi

# ---- preflight: เปิด BASE_URL ได้หรือไม่ ----
if ! node -e 'fetch(process.argv[1],{signal:AbortSignal.timeout(10000)}).then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))' "$BASE"; then
  fail2 "เปิด BASE_URL ไม่ได้ ($BASE)"
fi

# ---- ลายนิ้วมือของ rulers/ ก่อนวัด (ยืนยันว่าไม่ได้แก้) ----
sum_rulers() { (cd "$R" && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-16); }
RSUM_BEFORE="$(sum_rulers)"

t() { date +%s%3N; }
timed() {  # timed <ชื่อ> <คำสั่ง...> → บันทึก ชื่อ<TAB>ms<TAB>exit
  local name="$1"; shift; local s e rc; s=$(t); "$@"; rc=$?; e=$(t)
  printf '%s\t%s\t%s\n' "$name" "$((e - s))" "$rc" >> "$OUT/timings.tsv"
  echo "[measure] $name: $(( (e - s) / 1000 ))s exit=$rc" >&2
  return 0
}

# ---- 0. เก็บภาพ + ariaSnapshot หน้าผลค้นหา (วัตถุดิบของ visual/structure) ----
timed capture node "$KIT/capture.mjs" "$BASE" "$OUT/capture" > "$OUT/capture/stdout.json" 2> "$OUT/capture/stderr.log"
[[ -s "$OUT/capture/app.png" ]] || fail2 "เก็บภาพหน้าแอปไม่ได้ (ดู capture/stderr.log)"

# ---- 1. visual ----
timed visual node "$R/visual/diff.mjs" "$OUT/capture/app.png" "$R/visual/reference.png" "$OUT/visual/diff.png" \
  > "$OUT/visual/result.json" 2> "$OUT/visual/stderr.log"
# ---- 2. structure ----
timed structure node "$R/structure/compare.mjs" "$OUT/capture/app.yml" \
  > "$OUT/structure/result.json" 2> "$OUT/structure/stderr.log"
# ---- 3. flights ----
timed flights node "$R/flights/count.mjs" "$BASE" > "$OUT/flights/result.json" 2> "$OUT/flights/stderr.log"
# ---- 4. accept (กรรมการ: ข้อ invalid ก็รัน แต่ไม่นับใน gate) ----
timed accept node "$R/accept/run.mjs" "$BASE" "$OUT/accept" > "$OUT/accept/stdout.log" 2> "$OUT/accept/stderr.log"
# ---- 5. diff ----
# diff/run.mjs เขียน last-run.json ข้างตัวเอง → รันจากสำเนาเงา (.shadow) เพื่อไม่ให้แตะไฟล์ใน rulers/
SH="$OUT/.shadow"; mkdir -p "$SH/rulers/diff"
ln -s "$ROOT/spec" "$SH/spec"; ln -s "$R/lib.mjs" "$SH/rulers/lib.mjs"
cp "$R"/diff/{run.mjs,scenarios.mjs,expected.json,META.json} "$SH/rulers/diff/"
timed diff node "$SH/rulers/diff/run.mjs" "$BASE" > "$OUT/diff/table.md" 2> "$OUT/diff/stderr.log"
[[ -f "$SH/rulers/diff/last-run.json" ]] && cp "$SH/rulers/diff/last-run.json" "$OUT/diff/last-run.json"
rm -rf "$SH"

RSUM_AFTER="$(sum_rulers)"

# ---- รวมผล ----
node "$KIT/report.mjs" "$OUT" "$BASE" "$RSUM_BEFORE" "$RSUM_AFTER"
exit $?

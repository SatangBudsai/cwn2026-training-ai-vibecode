#!/usr/bin/env bash
# loop/scope-check.sh <stage1|stage2> <commit ฐาน>
# ตรวจขอบเขตการแก้จาก git diff <ฐาน>..HEAD ใน repo ของแอป (APP_DIR · ค่าเริ่มต้น <arena>/app)
#   stage1: ห้ามแตะ src/styles/tokens.css · บรรทัดที่เพิ่มในไฟล์ .css/.tsx/.ts อื่น ห้ามมีเลข px หรือสี (#hex rgb() hsl()) ตรง ๆ
#           ต้องใช้ var(--…) หรือ calc() ของตัวแปร · ยกเว้น 0 / 0px และ 1px
#   stage2: แตะได้แค่ src/styles/tokens.css และชุดชื่อตัวแปร (--ชื่อ:) ต้องเท่าเดิม (ห้ามเพิ่ม/ลบ)
# exit 0 = อยู่ในขอบเขต · 1 = ละเมิด (แสดงรายการ) · 2 = ใช้ผิด / หา commit ไม่เจอ
set -uo pipefail
STAGE="${1:-}"; BASE="${2:-}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/app}"
TOKENS="src/styles/tokens.css"
if [[ ! "$STAGE" =~ ^stage[12]$ || -z "$BASE" ]]; then echo "ใช้: [APP_DIR=…] loop/scope-check.sh <stage1|stage2> <commit ฐาน>" >&2; exit 2; fi
cd "$APP_DIR" 2>/dev/null || { echo "ไม่พบ APP_DIR=$APP_DIR" >&2; exit 2; }
git rev-parse --verify -q "$BASE^{commit}" >/dev/null || { echo "ไม่พบ commit ฐาน: $BASE" >&2; exit 2; }

V=()   # รายการละเมิด
mapfile -t CHANGED < <(git diff --name-only --no-renames "$BASE" HEAD)

if [[ "$STAGE" == stage1 ]]; then
  for f in "${CHANGED[@]}"; do [[ "$f" == "$TOKENS" ]] && V+=("$f: stage1 ห้ามแตะ tokens.css"); done
  # บรรทัดที่เพิ่ม (+) ในไฟล์ .css/.tsx/.ts ที่ไม่ใช่ tokens.css
  while IFS=$'\t' read -r file line text; do
    # px: ตัดค่า 0px / 1px ที่อนุญาตออกก่อน แล้วหาเลข px ที่เหลือ
    t="$(sed -E 's/(^|[^0-9.])-?(0+(\.0+)?|1)px\b/\1/g' <<<"$text")"
    if grep -qE '(^|[^a-zA-Z0-9_-])-?[0-9]*\.?[0-9]+px\b' <<<"$t"; then V+=("$file:$line: เลข px ตรง ๆ → ${text:0:120}"); fi
    if grep -qE '(^|[^&a-zA-Z0-9_])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b' <<<"$text"; then V+=("$file:$line: สี #hex ตรง ๆ → ${text:0:120}"); fi
    if grep -qiE '\b(rgba?|hsla?)\(' <<<"$text"; then V+=("$file:$line: สี rgb()/hsl() ตรง ๆ → ${text:0:120}"); fi
  done < <(git diff -U0 --no-renames "$BASE" HEAD -- '*.css' '*.tsx' '*.ts' ":(exclude)$TOKENS" | awk '
    /^\+\+\+ /{ f=substr($0,7); next }
    /^@@/{ split($3,a,/[+,]/); n=a[2]; next }
    /^\+/{ print f "\t" n "\t" substr($0,2); n++ }')
else
  for f in "${CHANGED[@]}"; do [[ "$f" != "$TOKENS" ]] && V+=("$f: stage2 แตะได้แค่ $TOKENS"); done
  names() { git show "$1:$TOKENS" 2>/dev/null | sed 's#/\*.*\*/##g' | grep -oE '(^|[;{[:space:]])--[A-Za-z0-9_-]+[[:space:]]*:' | grep -oE -- '--[A-Za-z0-9_-]+' | sort -u; }
  if ! git cat-file -e "$BASE:$TOKENS" 2>/dev/null; then V+=("$TOKENS ไม่มีใน commit ฐาน"); fi
  while read -r n; do [[ -n "$n" ]] && V+=("$TOKENS: เพิ่มตัวแปร $n"); done < <(comm -13 <(names "$BASE") <(names HEAD))
  while read -r n; do [[ -n "$n" ]] && V+=("$TOKENS: ลบตัวแปร $n"); done < <(comm -23 <(names "$BASE") <(names HEAD))
fi

echo "scope-check $STAGE ฐาน $(git rev-parse --short "$BASE")..$(git rev-parse --short HEAD) · ไฟล์ที่เปลี่ยน ${#CHANGED[@]}"
if (( ${#V[@]} )); then printf '  ✗ %s\n' "${V[@]}"; echo "ไม่ผ่าน (${#V[@]} ข้อ)"; exit 1; fi
echo "ผ่าน"; exit 0

#!/usr/bin/env bash
# kit/selftest.sh — ตรวจไม้บรรทัดด้วยเฉลยเทียบตัวเอง (ไม่เปิดเบราว์เซอร์): structure original.yml = 100% · visual reference.png = 0%
set -uo pipefail
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/rulers"
t() { date +%s%3N; }
s=$(t); S=$(node "$R/structure/compare.mjs" "$R/structure/original.yml" | node -pe 'const j=JSON.parse(require("fs").readFileSync(0));`${j.pct}% jaccard=${j.jaccard} key=${j.keyFound}/${j.keyTotal}`'); e=$(t)
echo "structure original.yml vs itself: $S ($((e-s)) ms)"
s=$(t); V=$(node "$R/visual/diff.mjs" "$R/visual/reference.png" | node -pe 'const j=JSON.parse(require("fs").readFileSync(0));`${j.diffPct}% pixels=${j.pixels}`'); e=$(t)
echo "visual reference.png vs itself: $V ($((e-s)) ms)"
[[ "$S" == 100%* && "$V" == 0%* ]]

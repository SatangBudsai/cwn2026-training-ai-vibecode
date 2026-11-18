#!/usr/bin/env bash
# รัน project เดียว เก็บผลแยกไฟล์ (รันซ้ำได้โดยไม่ทับผลของ project อื่น)
# ใช้: bash run-project.sh <project> [ตัวกรองอื่นของ playwright เช่น -g "TC-CPN-003"] ; ตั้ง TAG=rerun1 เพื่อเก็บเป็นรอบแก้
cd "$(dirname "$0")"
P="$1"; shift
T="${TAG:-main}"
export PP_STAMP="${PP_STAMP:-$(date -u +%Y%m%dT%H%M)}"
export PP_JSON="test-report/raw/$T-$P.json" PP_OUT="test-results/$T-$P" PP_HTML="test-report/playwright-html/$T-$P"
npx playwright test --project="$P" "$@"

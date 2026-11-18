#!/usr/bin/env bash
# รันหลาย project พร้อมกัน แต่ละ project เป็นคำสั่งแยก (workers: 1) บนเว็บของตัวเอง แล้วรอให้ครบ
# ใช้: bash run-parallel.sh chromium mobile-chrome   (ตั้ง TAG=rerun1 เพื่อเก็บเป็นรอบแก้ · ส่งตัวกรองเพิ่มผ่าน PP_ARGS เช่น PP_ARGS='-g "TC-CART-004"')
cd "$(dirname "$0")"
export PP_STAMP="${PP_STAMP:-$(cat test-report/stamp.txt 2>/dev/null || date -u +%Y%m%dT%H%M)}"
pids=()
for p in "$@"; do
  eval "bash run-project.sh $p ${PP_ARGS:-}" > "test-report/raw/${TAG:-main}-$p.log" 2>&1 &
  pids+=($!)
  echo "เริ่ม $p (pid $!)"
done
rc=0; for pid in "${pids[@]}"; do wait "$pid" || rc=1; done
for p in "$@"; do echo "== $p"; tail -3 "test-report/raw/${TAG:-main}-$p.log"; done
exit $rc

#!/bin/bash
# รัน Playwright กับ e2e/*.spec.js · ส่ง argument ต่อให้ playwright ได้ เช่น -g "TC-CPN-01"
R=$(cd "$(dirname "$0")/.." && pwd); cd "$R" || exit 2
[ -f .web-url ] || { echo "ยังไม่ได้เปิดเว็บ: รัน tools/start-web.sh ก่อน"; exit 2; }
BASE_URL=$(cat .web-url) NODE_PATH=/workspace/pw/node_modules /workspace/pw/bin/playwright test -c e2e/playwright.config.js "$@"

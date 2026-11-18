#!/bin/bash
# build + เปิดเว็บ ./petshop (production) บนพอร์ตว่าง · URL อยู่ใน ./.web-url · รันซ้ำได้หลังแก้โค้ด
R=$(cd "$(dirname "$0")/.." && pwd); W=$R/petshop
[ -f "$R/.web-pid" ] && kill "$(cat "$R/.web-pid")" 2>/dev/null; sleep 0.3
P=$(python3 -c "import socket;s=socket.socket();s.bind((\"127.0.0.1\",0));print(s.getsockname()[1])")
cd "$W" || exit 2
[ -e node_modules ] || ln -s /workspace/nm/node_modules node_modules
NEXT_TELEMETRY_DISABLED=1 npm run build > "$R/.web-build.log" 2>&1 || { echo "BUILD FAILED"; tail -25 "$R/.web-build.log"; exit 1; }
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null; cp -r .next/static .next/standalone/.next/static
PORT=$P HOSTNAME=127.0.0.1 ALLOW_TEST_RESET=1 NODE_ENV=production nohup node .next/standalone/server.js > "$R/.web.log" 2>&1 &
echo $! > "$R/.web-pid"; echo "http://127.0.0.1:$P" > "$R/.web-url"
for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$P/api/health" >/dev/null && { echo "READY $(cat "$R/.web-url")"; exit 0; }; sleep 0.5; done
echo "NOT READY"; tail -20 "$R/.web.log"; exit 1

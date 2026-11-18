#!/bin/bash
# serve.sh <webdir> <port> [logfile] : build + start (production) ; exits 0 when /api/health is ok
W=$(cd "$1" && pwd); P=$2; L=${3:-$W/.serve.log}
cd "$W" || exit 2
[ -e node_modules ] || ln -s /workspace/nm/node_modules node_modules
NEXT_TELEMETRY_DISABLED=1 npm run build > "$L" 2>&1 || { echo "BUILD FAILED (see $L)"; tail -20 "$L"; exit 1; }
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null; cp -r .next/static .next/standalone/.next/static
PORT=$P HOSTNAME=127.0.0.1 ALLOW_TEST_RESET=1 NODE_ENV=production nohup node .next/standalone/server.js >> "$L" 2>&1 &
echo $! > "$W/.serve.pid"
for i in $(seq 1 60); do curl -sf http://127.0.0.1:$P/api/health >/dev/null && { echo "READY http://127.0.0.1:$P pid $(cat $W/.serve.pid)"; exit 0; }; sleep 0.5; done
echo "NOT READY"; tail -20 "$L"; exit 1

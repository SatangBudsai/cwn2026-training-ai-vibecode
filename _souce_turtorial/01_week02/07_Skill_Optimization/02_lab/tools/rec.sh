#!/bin/bash
# rec.sh <webdir> <TC-ID> <name> : serve <webdir>, run the hidden test of <TC-ID> with video, save /workspace/rec/<name>.webm + .txt (verdict)
W=$1; TC=$2; NAME=$3; R=/workspace/rec; S=/workspace/suite/web-fixer
mkdir -p $R/tmp-$NAME
T=$R/tmp-$NAME/web; rm -rf $T
python3 - "$W" "$T" <<'EOF'
import shutil, sys, os
shutil.copytree(sys.argv[1], sys.argv[2], symlinks=True, ignore=shutil.ignore_patterns(".next", "node_modules", ".serve.*", ".web*"))
os.symlink("/workspace/nm/node_modules", sys.argv[2] + "/node_modules")
EOF
P=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])")
$S/serve.sh $T $P $R/tmp-$NAME/serve.log >/dev/null || { echo "$NAME BUILD FAILED" | tee $R/$NAME.txt; exit 1; }
cd $S/oracle
cat > /tmp/video-$NAME.config.js <<EOF
const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "$S/oracle/tests", outputDir: "$R/tmp-$NAME/out", timeout: 60000, workers: 1,
  globalSetup: require.resolve("$S/oracle/oracle-setup"),
  reporter: [["json", { outputFile: "$R/tmp-$NAME/result.json" }]],
  use: { baseURL: "http://127.0.0.1:$P", video: { mode: "on", size: { width: 1280, height: 720 } }, launchOptions: { slowMo: 350 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
});
EOF
BASE_URL=http://127.0.0.1:$P HOLD_MS=2500 NODE_PATH=/workspace/pw/node_modules /workspace/pw/bin/playwright test -c /tmp/video-$NAME.config.js -g "$TC" >/dev/null 2>&1
kill $(cat $T/.serve.pid) 2>/dev/null
cp "$(find $R/tmp-$NAME/out -name '*.webm' | head -1)" $R/$NAME.webm
python3 - $R/tmp-$NAME/result.json $NAME > $R/$NAME.txt <<'EOF'
import json, sys, re
d = json.load(open(sys.argv[1]))
def walk(s):
    for sp in s.get("specs", []):
        r = sp["tests"][0]["results"][-1]
        msg = re.sub(r"\x1b\[[0-9;]*m", "", (r.get("error") or {}).get("message", ""))
        e = re.search(r"Expected[^:]*:\s*(.+)", msg); g = re.search(r"Received[^:]*:\s*(.+)", msg)
        print(sys.argv[2], "PASS" if sp["ok"] else "FAIL", "|", ("expected %s received %s" % (e.group(1), g.group(1))) if e and g else msg.split("\n")[0][:120])
    for x in s.get("suites", []): walk(x)
for s in d["suites"]: walk(s)
EOF
cat $R/$NAME.txt; rm -rf $R/tmp-$NAME /tmp/video-$NAME.config.js

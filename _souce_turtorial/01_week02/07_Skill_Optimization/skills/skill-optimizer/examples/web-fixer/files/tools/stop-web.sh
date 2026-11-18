#!/bin/bash
R=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$R/.web-pid" ] && kill "$(cat "$R/.web-pid")" 2>/dev/null; rm -f "$R/.web-pid"; echo stopped

# -*- coding: utf-8 -*-
"""mkgif.py <spec.json> <outdir> : webm from the container -> GIF with a header strip (rendered in the container's Chromium)
spec: [{"name": "t4-v1-AUTH03", "who": "สกิล v1", "tc": "TC-AUTH-03", "what": "...", "verdict": "PASS", "note": "..."}]"""
import io, json, os, subprocess, sys

spec = json.load(io.open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
work = os.path.join(here, "work")
os.makedirs(work + "/html", exist_ok=True)
os.makedirs(out, exist_ok=True)
env = dict(os.environ, MSYS_NO_PATHCONV="1")
CSS = """<style>
@font-face{font-family:P;font-weight:400;src:url(file:///workspace/nm/node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-thai-400-normal.woff2)}
@font-face{font-family:P;font-weight:700;src:url(file:///workspace/nm/node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-thai-700-normal.woff2)}
@font-face{font-family:L;font-weight:400;src:url(file:///workspace/nm/node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-latin-400-normal.woff2)}
@font-face{font-family:L;font-weight:700;src:url(file:///workspace/nm/node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-latin-700-normal.woff2)}
body{margin:0}#d{width:1280px;box-sizing:border-box;padding:14px 24px;font-family:L,P,sans-serif;color:#fff;display:flex;align-items:center;gap:18px;background:%s}
.w{font-size:30px;font-weight:700;white-space:nowrap}.t{font-size:22px;line-height:1.3;flex:1}.v{font-size:30px;font-weight:700;background:#fff;color:%s;border-radius:10px;padding:4px 18px;white-space:nowrap}
</style>"""
for s in spec:
    ok = s["verdict"] == "PASS"
    col = "#15803d" if ok else "#b91c1c"
    html = '<!doctype html><meta charset="utf-8">' + CSS % (col, col) + \
        '<div id="d"><div class="w">%s</div><div class="t"><b>%s</b> · %s<br>%s</div><div class="v">%s</div></div>' % (
            s["who"], s["tc"], s["what"], s["note"], "ผ่าน (PASS)" if ok else "ไม่ผ่าน (FAIL)")
    io.open("%s/html/%s.html" % (work, s["name"]), "w", encoding="utf-8").write(html)
subprocess.run(["docker", "exec", "multi-account", "rm", "-rf", "/workspace/rec/h"], env=env)
subprocess.run(["docker", "cp", work + "/html/.", "multi-account:/workspace/rec/h/"], check=True, env=env)
subprocess.run(["docker", "exec", "multi-account", "bash", "-c",
                "cd /workspace/rec && NODE_PATH=/workspace/pw/node_modules node /workspace/diag/render.cjs h hp >/dev/null"], check=True, env=env)
for s in spec:
    n = s["name"]
    subprocess.run(["docker", "cp", "multi-account:/workspace/rec/hp/%s.png" % n, "%s/%s.png" % (work, n)], check=True, env=env)
    subprocess.run(["docker", "cp", "multi-account:/workspace/rec/%s.webm" % n, "%s/%s.webm" % (work, n)], check=True, env=env)
    fc = ("[0:v]fps=6,scale=900:-2[v];[1:v]scale=900:-2[h];[h][v]vstack=inputs=2,split[a][b];"
          "[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4")
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "%s/%s.webm" % (work, n), "-i", "%s/%s.png" % (work, n),
                        "-filter_complex", fc, "%s/%s.gif" % (out, n)], capture_output=True, text=True)
    print(n, r.returncode, os.path.getsize("%s/%s.gif" % (out, n)) if r.returncode == 0 else r.stderr[-300:])

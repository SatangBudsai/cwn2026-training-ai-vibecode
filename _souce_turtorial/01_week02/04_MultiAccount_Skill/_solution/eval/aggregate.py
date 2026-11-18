"""aggregate.py <โฟลเดอร์ runs> : รวมผลทุกรอบเป็น results.json
token ของ 3 บัญชี: รอบที่เรียกผ่านสกิลอ่านจาก ledger ของสกิล · รอบที่เรียก CLI ตรง ๆ อ่านจาก transcript ของแต่ละบัญชี"""
import sys, os, json, glob, tarfile, tempfile
from datetime import datetime
ACC = ["yolo1", "yolo2", "cyolo1"]
def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
def blank():
    return {a: {"calls": 0, "secs": 0.0, "in": 0, "out": 0, "models": []} for a in ACC}
def add(d, a, secs, i, o, model):
    if a not in d:
        d[a] = {"calls": 0, "secs": 0.0, "in": 0, "out": 0, "models": []}
    d[a]["calls"] += 1; d[a]["secs"] += secs; d[a]["in"] += i; d[a]["out"] += o
    if model and model not in d[a]["models"]:
        d[a]["models"].append(model)
def from_ledger(path, d):
    seen = set()
    for l in open(path, encoding="utf-8"):
        r = json.loads(l)
        k = (r.get("ts_start"), r.get("account"), r.get("node"), r.get("run_id"))
        if k in seen:
            continue
        seen.add(k)
        i = sum(r.get(x) or 0 for x in ("input_tokens", "cached_input_tokens", "cache_write_tokens"))
        if r.get("cli") == "codex":   # Codex นับ cache รวมอยู่ใน input แล้ว
            i = r.get("input_tokens") or 0
        add(d, r["account"], r.get("duration_s") or 0, i, r.get("output_tokens") or 0,
            "%s/%s" % (r.get("model"), r.get("effort")))
def from_transcripts(tar, d):
    with tempfile.TemporaryDirectory() as t:
        tarfile.open(tar).extractall(t)
        for f in glob.glob(t + "/.Claude/*/projects/**/*.jsonl", recursive=True):
            a = f.split("/.Claude/")[1].split("/")[0]
            use, times, model = {}, [], None
            for l in open(f, encoding="utf-8", errors="replace"):
                try: e = json.loads(l)
                except ValueError: continue
                if e.get("timestamp"): times.append(ts(e["timestamp"]))
                if e.get("type") == "assistant":
                    m = e["message"]; u = m.get("usage") or {}
                    use[m.get("id")] = u; model = m.get("model") or model
            if not use: continue
            i = sum((u.get("input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0) for u in use.values())
            o = sum(u.get("output_tokens") or 0 for u in use.values())
            add(d, a, max(times) - min(times) if times else 0, i, o, model)
        for f in glob.glob(t + "/.Codex/*/sessions/**/*.jsonl", recursive=True):
            a = f.split("/.Codex/")[1].split("/")[0]
            last, times, model = None, [], None
            for l in open(f, encoding="utf-8", errors="replace"):
                try: e = json.loads(l)
                except ValueError: continue
                if e.get("timestamp"): times.append(ts(e["timestamp"]))
                p = e.get("payload") or {}
                if p.get("type") == "token_count" and p.get("info"): last = p["info"]["total_token_usage"]
                if p.get("model"): model = p["model"]
            if last:
                add(d, a, max(times) - min(times), last["input_tokens"], last["output_tokens"], model)
out = []
for r in sorted(glob.glob(sys.argv[1] + "/*-r[0-9]")):
    arm, rnd = os.path.basename(r).rsplit("-r", 1)
    m = json.load(open(r + "/metrics.json"))
    d = blank()
    for led in glob.glob(r + "/agent-team/ledger.jsonl"):
        from_ledger(led, d)
    if os.path.exists(r + "/transcripts.tar"):
        from_transcripts(r + "/transcripts.tar", d)
    cmds = m["commands"]
    files = {}
    for f in ("clean_time.py", "clean_order.py", "clean_code.py", "clean.py"):
        p = r + "/team-demo/" + f
        files[f] = len(open(p, encoding="utf-8").read().splitlines()) if os.path.exists(p) else None
    out.append({"arm": arm, "round": int(rnd), "wall_s": m["wall_s"], "commands": m["tool_calls"], "failed": m["tool_errors"],
                "cost_usd": m["cost_usd"], "credential_touch": len(m["credential_touch"]),
                "hidden": json.load(open(r + "/score-hidden.json")), "train": json.load(open(r + "/score-train.json")),
                "used_team_run": any("team.py" in c and " run " in c for c in cmds),
                "other_accounts": sorted(a for a in d if a not in ACC),
                "accounts": {a: {**v, "secs": round(v["secs"], 1)} for a, v in d.items()}, "lines": files})
json.dump(out, open(sys.argv[1] + "/results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for o in out:
    print(o["arm"], o["round"], o["hidden"]["total"], o["wall_s"], o["commands"], o["failed"], o["cost_usd"], "cred", o["credential_touch"],
          "run" if o["used_team_run"] else "-", o["other_accounts"],
          {a: (v["calls"], v["secs"], v["in"], v["out"], v["models"]) for a, v in o["accounts"].items()})

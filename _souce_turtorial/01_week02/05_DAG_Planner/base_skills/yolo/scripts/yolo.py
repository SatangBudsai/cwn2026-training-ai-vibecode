#!/usr/bin/env python3
"""yolo.py - Claude Code accounts (yolo1..N): one-shot calls, readiness, quota, stats.

  python3 yolo.py run "prompt" [-a yolo2|yolo] [-d 1..6 | -m MODEL -e EFFORT] [--json]
  python3 yolo.py check [yolo1 ...]      real minimal call per account
  python3 yolo.py quota [yolo1 ...]      /usage (no model call)
  python3 yolo.py stats [--run ID] [--account A]
  python3 yolo.py models                  aliases, efforts, difficulty table
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import ma_common as mc  # noqa: E402


def pick_account(spec):
    """'yolo3' -> itself; 'yolo' / None -> ready account with lowest known usage."""
    if spec and spec != "yolo":
        if mc.cli_of(spec) != "claude":
            sys.exit("บัญชี %s ไม่ใช่ Claude (yoloN)" % spec)
        return spec
    accs = mc.list_accounts("yolo")
    cached = mc.cached_check()
    known = [a for a in accs if a in cached]
    if len(known) < len(accs):
        for r in mc.check_accounts([a for a in accs if a not in cached]):
            cached[r["account"]] = r
    ready = [a for a in accs if cached.get(a, {}).get("status") == "ready"]
    if not ready:
        sys.exit("ไม่มีบัญชี Claude ที่พร้อม (รัน: yolo.py check)")
    qc = mc.quota_cache_load()
    ready.sort(key=lambda a: (mc.quota_used_pct(qc.get(a)) if mc.quota_used_pct(qc.get(a)) is not None else 50))
    return ready[0]


def cmd_run(a):
    prompt = sys.stdin.read() if a.prompt == "-" else a.prompt
    model, effort, _ = mc.DIFFICULTY[a.difficulty]
    model = a.model or model
    effort = a.effort or effort
    acc = pick_account(a.account)
    extra = []
    if a.allowed_tools:
        extra += ["--allowedTools"] + a.allowed_tools
    if a.add_dir:
        extra += ["--add-dir"] + a.add_dir
    res = mc.call_claude(acc, prompt, model, effort, cwd=a.cwd, timeout=a.timeout, json_schema=a.schema,
                         extra_args=extra, node=a.node or "yolo.run", run_id=a.run_id)
    mc.print_result(res, a.json)
    return 0 if res["ok"] else 1


def cmd_check(a):
    accs = a.accounts or mc.list_accounts("yolo")
    res = mc.check_accounts(accs)
    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        print(mc.check_table(res))
    return 0


def cmd_quota(a):
    accs = a.accounts or mc.list_accounts("yolo")
    txt, data = mc.quota_table(accs)
    print(json.dumps(data, ensure_ascii=False, indent=1) if a.json else txt)
    return 0


def cmd_stats(a):
    rows = [r for r in mc.read_ledger() if r.get("cli") == "claude"]
    if a.run:
        rows = [r for r in rows if r.get("run_id") == a.run]
    if a.account:
        rows = [r for r in rows if r.get("account") == a.account]
    if not rows:
        print("ยังไม่มีสถิติของ Claude ใน %s" % mc.GLOBAL_LEDGER)
        return 0
    print(mc.stats_tables(rows))
    return 0


def cmd_models(a):
    print("รุ่น (alias): " + ", ".join(mc.CLAUDE_MODELS) + "\neffort: " + ", ".join(mc.CLAUDE_EFFORTS) + "\n")
    print(mc.table(["difficulty", "Claude รุ่น/effort"],
                   [[d, "%s/%s" % (v[0], v[1])] for d, v in sorted(mc.DIFFICULTY.items())]))
    print("\nบัญชี: " + ", ".join(mc.list_accounts("yolo")))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Claude Code multi-account helper")
    sp = ap.add_subparsers(dest="cmd")
    r = sp.add_parser("run", help="one non-interactive call")
    r.add_argument("prompt", help='prompt text, or "-" to read stdin')
    r.add_argument("-a", "--account", help="yoloN, or 'yolo' = pick the ready account with most quota")
    r.add_argument("-d", "--difficulty", type=int, default=2, choices=range(1, 7))
    r.add_argument("-m", "--model", choices=mc.CLAUDE_MODELS)
    r.add_argument("-e", "--effort", choices=mc.CLAUDE_EFFORTS)
    r.add_argument("--cwd")
    r.add_argument("--timeout", type=int, default=900)
    r.add_argument("--schema", help="JSON schema string -> structured_output")
    r.add_argument("--allowed-tools", nargs="+")
    r.add_argument("--add-dir", nargs="+")
    r.add_argument("--node")
    r.add_argument("--run-id")
    r.add_argument("--json", action="store_true")
    for name in ("check", "quota"):
        c = sp.add_parser(name)
        c.add_argument("accounts", nargs="*")
        c.add_argument("--json", action="store_true")
    s = sp.add_parser("stats")
    s.add_argument("--run")
    s.add_argument("--account")
    sp.add_parser("models")
    a = ap.parse_args(argv)
    if not a.cmd:
        ap.print_help()
        return 0
    return {"run": cmd_run, "check": cmd_check, "quota": cmd_quota, "stats": cmd_stats,
            "models": cmd_models}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())

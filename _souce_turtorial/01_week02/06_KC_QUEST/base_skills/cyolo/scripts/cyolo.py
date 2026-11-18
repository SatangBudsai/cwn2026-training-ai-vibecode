#!/usr/bin/env python3
"""cyolo.py - Codex CLI accounts (cyolo1..N): one-shot calls, images, readiness, quota, stats.

  python3 cyolo.py run "prompt" [-a cyolo2|cyolo] [-d 1..6 | -m MODEL -e EFFORT] [--json]
  python3 cyolo.py image "description" --out /abs/path.png [-a cyolo1]
  python3 cyolo.py check [cyolo1 ...]     login status + real minimal call
  python3 cyolo.py quota [cyolo1 ...] [--refresh]
  python3 cyolo.py models [-a cyolo1]     models_cache.json: slugs + supported efforts
  python3 cyolo.py stats [--run ID] [--account A]
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import ma_common as mc  # noqa: E402


def pick_account(spec):
    if spec and spec != "cyolo":
        if mc.cli_of(spec) != "codex":
            sys.exit("บัญชี %s ไม่ใช่ Codex (cyoloN)" % spec)
        return spec
    accs = mc.list_accounts("cyolo")
    cached = mc.cached_check()
    missing = [a for a in accs if a not in cached]
    if missing:
        for r in mc.check_accounts(missing):
            cached[r["account"]] = r
    ready = [a for a in accs if cached.get(a, {}).get("status") == "ready"]
    if not ready:
        sys.exit("ไม่มีบัญชี Codex ที่พร้อม (รัน: cyolo.py check)")

    def used(a):
        v = mc.quota_used_pct(mc.codex_quota(a))
        return v if v is not None else 50
    ready.sort(key=used)
    return ready[0]


def cmd_run(a):
    prompt = sys.stdin.read() if a.prompt == "-" else a.prompt
    effort = a.effort or mc.DIFFICULTY[a.difficulty][2]
    acc = pick_account(a.account)
    res = mc.call_codex(acc, prompt, a.model, effort, cwd=a.cwd, timeout=a.timeout,
                        ephemeral=not a.keep_session, images=a.image, output_schema=a.output_schema,
                        node=a.node or "cyolo.run", run_id=a.run_id)
    mc.print_result(res, a.json)
    return 0 if res["ok"] else 1


def image(account, desc, out, model=None, timeout=600, run_dir=None, run_id=None, node="cyolo.image"):
    out = "/" + os.path.normpath(os.path.abspath(out)).lstrip("/")
    mc.ensure_dir(os.path.dirname(out))
    prompt = ("สร้างภาพ (image generation) ตามคำอธิบายนี้: %s\nบันทึกเป็นไฟล์ PNG ที่ %s "
              "(absolute path) แล้วตอบเฉพาะ path ของไฟล์" % (desc, out))
    res = mc.call_codex(account, prompt, model, "low", cwd=os.path.dirname(out), timeout=timeout,
                        run_dir=run_dir, run_id=run_id, node=node)
    res["image"] = out
    res["png_ok"] = mc.is_png(out)
    if res["ok"] and not res["png_ok"]:
        res["ok"] = False
        res["status"] = "bad_output"
        res["error"] = "ไม่พบไฟล์ PNG ที่ %s" % out
    return res


def cmd_image(a):
    acc = pick_account(a.account)
    res = image(acc, a.description, a.out, a.model, a.timeout)
    mc.print_result(res, a.json)
    if not a.json:
        print("PNG: %s (%s)" % (res["image"], "ตรวจ signature ผ่าน" if res["png_ok"] else "ไม่ผ่าน"),
              file=sys.stderr)
    return 0 if res["ok"] else 1


def cmd_check(a):
    res = mc.check_accounts(a.accounts or mc.list_accounts("cyolo"))
    print(json.dumps(res, ensure_ascii=False, indent=1) if a.json else mc.check_table(res))
    return 0


def cmd_quota(a):
    txt, data = mc.quota_table(a.accounts or mc.list_accounts("cyolo"), refresh=a.refresh)
    print(json.dumps(data, ensure_ascii=False, indent=1) if a.json else txt)
    return 0


def cmd_models(a):
    models, fetched = mc.codex_models(a.account)
    if not models:
        print("ไม่พบ models_cache.json")
        return 0
    print("จาก models_cache.json (fetched_at %s) · ค่าเริ่มต้นของสกิล = %s\n" % (fetched, mc.codex_default_model(a.account)))
    print(mc.table(["slug", "แสดง", "default effort", "efforts ที่รองรับ"],
                   [[m["slug"], m["visibility"], m["default"], " ".join(m["efforts"])] for m in models]))
    print("\n" + mc.table(["difficulty", "Codex effort"], [[d, v[2]] for d, v in sorted(mc.DIFFICULTY.items())]))
    return 0


def cmd_stats(a):
    rows = [r for r in mc.read_ledger() if r.get("cli") == "codex"]
    if a.run:
        rows = [r for r in rows if r.get("run_id") == a.run]
    if a.account:
        rows = [r for r in rows if r.get("account") == a.account]
    if not rows:
        print("ยังไม่มีสถิติของ Codex ใน %s" % mc.GLOBAL_LEDGER)
        return 0
    print(mc.stats_tables(rows))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Codex CLI multi-account helper")
    sp = ap.add_subparsers(dest="cmd")
    r = sp.add_parser("run")
    r.add_argument("prompt", help='prompt text, or "-" for stdin')
    r.add_argument("-a", "--account", help="cyoloN, or 'cyolo' = ready account with most quota")
    r.add_argument("-d", "--difficulty", type=int, default=2, choices=range(1, 7))
    r.add_argument("-m", "--model", help="slug from models_cache.json (default: first listed)")
    r.add_argument("-e", "--effort")
    r.add_argument("--cwd")
    r.add_argument("--timeout", type=int, default=900)
    r.add_argument("--image", nargs="+", help="attach image files")
    r.add_argument("--output-schema", help="JSON schema file for the final answer")
    r.add_argument("--keep-session", action="store_true", help="no --ephemeral (updates quota data)")
    r.add_argument("--node")
    r.add_argument("--run-id")
    r.add_argument("--json", action="store_true")
    im = sp.add_parser("image")
    im.add_argument("description")
    im.add_argument("--out", required=True, help="absolute .png path")
    im.add_argument("-a", "--account")
    im.add_argument("-m", "--model")
    im.add_argument("--timeout", type=int, default=600)
    im.add_argument("--json", action="store_true")
    for name in ("check", "quota"):
        c = sp.add_parser(name)
        c.add_argument("accounts", nargs="*")
        c.add_argument("--json", action="store_true")
        if name == "quota":
            c.add_argument("--refresh", action="store_true",
                           help="tiny non-ephemeral call first so rate_limits are fresh (uses tokens)")
    m = sp.add_parser("models")
    m.add_argument("-a", "--account")
    s = sp.add_parser("stats")
    s.add_argument("--run")
    s.add_argument("--account")
    a = ap.parse_args(argv)
    if not a.cmd:
        ap.print_help()
        return 0
    return {"run": cmd_run, "image": cmd_image, "check": cmd_check, "quota": cmd_quota,
            "models": cmd_models, "stats": cmd_stats}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())

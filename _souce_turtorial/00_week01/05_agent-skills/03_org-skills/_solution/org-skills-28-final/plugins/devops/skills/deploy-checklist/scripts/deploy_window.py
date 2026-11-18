#!/usr/bin/env python3
"""เช็กวัน deploy ตามกติกา runbook: อังคาร-พฤหัส, ห้ามศุกร์/ก่อนวันหยุดยาว,
ห้ามวันที่ 25-สิ้นเดือนสำหรับลูกค้าธนาคาร, แจ้งลูกค้าล่วงหน้า >= 3 วันทำการ, ช่วงเฝ้าหลัง deploy

ใช้: python deploy_window.py 2026-11-10 [--bank] [--today 2026-11-03] [--holiday 2026-12-07 ...] [--hotfix-sev1]
ไม่มี dependency นอกจาก Python 3.8+
"""
import argparse, datetime as dt, sys
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

TH_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]

def d(s): return dt.date.fromisoformat(s)
def fmt(x): return f"{TH_DAYS[x.weekday()]} {x.isoformat()}"

def is_workday(x, hol): return x.weekday() < 5 and x not in hol

def notice_deadline(deploy, hol, n=3):
    """วันสุดท้ายที่ต้องส่งประกาศ: ต้องมีวันทำการเต็ม n วันระหว่างวันส่ง(ไม่นับ) กับวัน deploy(ไม่นับ)"""
    x, count = deploy, 0
    while count < n:
        x -= dt.timedelta(days=1)
        if is_workday(x, hol): count += 1
    x -= dt.timedelta(days=1)
    while not is_workday(x, hol): x -= dt.timedelta(days=1)
    return x

def check(deploy, bank, hol, hotfix):
    problems = []
    if deploy.weekday() not in (1, 2, 3): problems.append("ไม่ใช่ อังคาร–พฤหัส (ช่วงปกติ 21:00–23:00)")
    if deploy.weekday() == 4: problems.append("วันศุกร์ ห้าม deploy")
    nxt = deploy + dt.timedelta(days=1)
    if nxt in hol or (nxt.weekday() == 4 and (nxt + dt.timedelta(days=1)) in hol):
        problems.append("ก่อนวันหยุดยาว ห้าม deploy")
    if bank and deploy.day >= 25: problems.append("ลูกค้าธนาคาร: ช่วงวันที่ 25–สิ้นเดือน (เงินเดือนออก) ห้าม deploy")
    if deploy in hol: problems.append("ตรงวันหยุด")
    if hotfix: problems = [p + " — แต่เป็น hotfix Sev 1 ยกเว้นได้" for p in problems]
    return problems, (not problems) or hotfix

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("date"); ap.add_argument("--bank", action="store_true")
    ap.add_argument("--today", default=dt.date.today().isoformat())
    ap.add_argument("--holiday", nargs="*", default=[])
    ap.add_argument("--hotfix-sev1", action="store_true")
    ap.add_argument("--alternatives", type=int, default=5)
    a = ap.parse_args()
    deploy, today, hol = d(a.date), d(a.today), {d(h) for h in a.holiday}
    problems, ok = check(deploy, a.bank, hol, a.hotfix_sev1)
    nd = notice_deadline(deploy, hol)
    print(f"วัน deploy      : {fmt(deploy)} 21:00–23:00 {'(ลูกค้าธนาคาร)' if a.bank else ''}")
    print(f"กติกาวัน        : {'ผ่าน' if not problems else 'ไม่ผ่าน'}")
    for p in problems: print(f"  - {p}")
    late = today > nd
    print(f"แจ้งลูกค้าภายใน : {fmt(nd)} (ล่วงหน้า ≥ 3 วันทำการ){'  ⚠️ เลยกำหนดแล้ว' if late else ''}")
    print(f"เตรียม T−3..T−1 : {fmt(deploy - dt.timedelta(days=3))} ถึง {fmt(deploy - dt.timedelta(days=1))}")
    print(f"on-call เฝ้า     : {fmt(deploy)} ถึงประมาณ 01:00 + {fmt(nxt_workday(deploy, hol))} 08:00–10:00")
    if not ok or late:
        print("วันสำรองที่ผ่านกติกา (และยังแจ้งลูกค้าทัน):")
        x, found = max(deploy, today) + dt.timedelta(days=1), 0
        while found < a.alternatives:
            p, okx = check(x, a.bank, hol, False)
            if okx and notice_deadline(x, hol) >= today:
                print(f"  - {fmt(x)}  (แจ้งลูกค้าภายใน {fmt(notice_deadline(x, hol))})"); found += 1
            x += dt.timedelta(days=1)
    sys.exit(0 if ok and not late else 1)

def nxt_workday(x, hol):
    x += dt.timedelta(days=1)
    while not is_workday(x, hol): x += dt.timedelta(days=1)
    return x

if __name__ == "__main__": main()

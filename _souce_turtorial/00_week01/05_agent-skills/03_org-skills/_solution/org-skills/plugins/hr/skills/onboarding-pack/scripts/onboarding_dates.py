"""คำนวณวันสำคัญของชุดต้อนรับพนักงานใหม่ (stdlib เท่านั้น)

ใช้:  python onboarding_dates.py <วันเริ่มงาน YYYY-MM-DD> [วันนี้ YYYY-MM-DD]

กติกา (references/onboarding-rules.md):
- D-5 / D-1 นับเป็น "วันทำการ" (จ.-ศ.) ย้อนจากวันเริ่มงาน
- D1 = วันเริ่มงาน, Dn = D1 + (n-1) วันปฏิทิน
- ถ้า Dn ตกเสาร์/อาทิตย์ เลื่อนนัดมาเป็นศุกร์ก่อนหน้า
- ไม่รู้วันหยุดนักขัตฤกษ์ -> ผู้ใช้ต้องตรวจเอง
"""
import sys
from datetime import date, timedelta

TH_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]


def back_workdays(d: date, n: int) -> date:
    while n:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def to_weekday(d: date) -> date:
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


def fmt(d: date) -> str:
    return f"{d.isoformat()} ({TH_DAYS[d.weekday()]})"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    start = date.fromisoformat(sys.argv[1])
    today = date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else date.today()
    if start.weekday() >= 5:
        print(f"! วันเริ่มงาน {fmt(start)} ตรงวันหยุดสุดสัปดาห์ — ตรวจกับหัวหน้าแผนก")

    rows = [("D-5 ส่งคำขอทุกแผนก", back_workdays(start, 5)),
            ("D-1 ทดสอบบัญชี/เครื่อง/แพ็ก", back_workdays(start, 1)),
            ("D1 วันแรก", start)]
    for n, label in [(5, "D5 หัวหน้าคุย 15 นาที"), (30, "D30 คุยกับหัวหน้า"),
                     (60, "D60 คุยกับหัวหน้า"), (90, "D90 คุยกับหัวหน้า"),
                     (119, "D119 ประเมินผ่านทดลองงาน")]:
        raw = start + timedelta(days=n - 1)
        moved = to_weekday(raw)
        note = "" if moved == raw else f"  (ตามสูตร {fmt(raw)} เลื่อนเป็นวันทำการ)"
        rows.append((label, moved, note) if note else (label, moved))

    print(f"วันนี้ {fmt(today)} · เริ่มงาน {fmt(start)}")
    for r in rows:
        print(f"- {r[0]}: {fmt(r[1])}{r[2] if len(r) > 2 else ''}")

    d5 = rows[0][1]
    if today > d5:
        late = sum(1 for i in range((today - d5).days)
                   if (d5 + timedelta(days=i + 1)).weekday() < 5)
        print(f"! เลยกำหนด D-5 มาแล้ว {late} วันทำการ -> ส่งคำขอวันนี้ ทำเครื่องหมายด่วน "
              "และโทรตาม Gitea/บัญชีกับทีมกลางโดยตรง")
    print("! ตรวจวันหยุดนักขัตฤกษ์เอง (สคริปต์ไม่รู้)")


if __name__ == "__main__":
    main()

"""ให้คะแนน: python3 grade.py <ผลของ clean.py เป็น JSON> <truth.json>  → 90 คะแนน (คอลัมน์ละ 30)
time, order_id = สัดส่วนใบที่ตรงเฉลยทุกตัวอักษร · error_code = ใบที่ตรง / ใบที่เฉลยหรือคำตอบมีรหัส (ไม่นับใบที่ว่างตรงกัน)"""
import sys, json
def grade(pred, truth):
    n = len(truth)
    get = lambda i, k: (pred.get(i) or {}).get(k) if isinstance(pred.get(i), dict) else None
    s = {}
    for k in ("time", "order_id"):
        s[k] = round(30 * sum(get(i, k) == truth[i][k] for i in truth) / n, 2)
    u = [i for i in truth if truth[i]["error_code"] or get(i, "error_code")]
    s["error_code"] = round(30 * sum(get(i, "error_code") == truth[i]["error_code"] for i in u) / max(len(u), 1), 2)
    s["total"] = round(sum(s.values()), 2)
    s["missing_ids"] = sum(i not in pred for i in truth)
    return s
if __name__ == "__main__":
    try:
        pred = json.load(open(sys.argv[1], encoding="utf-8"))
    except Exception as e:
        pred = {}
        print("อ่านผลไม่ได้:", e, file=sys.stderr)
    print(json.dumps(grade(pred, json.load(open(sys.argv[2], encoding="utf-8"))), ensure_ascii=False))

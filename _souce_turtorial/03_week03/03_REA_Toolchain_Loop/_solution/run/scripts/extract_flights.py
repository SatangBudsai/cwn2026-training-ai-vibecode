"""ถอดข้อมูลเที่ยวบินทั้งหมดที่โหลดผ่านเครือข่าย → flights-all.json
แหล่งข้อมูล: REA inspect_web_network_capture ของ har/flights.clean.har (อ่านจาก rea/evidence-bundle.json ไม่อ่าน HAR เอง)
- GetShoppingResults ×3 (ผลแรก / ดูเที่ยวบินเพิ่มเติม / บินตรง) — โครงสร้างเดียวกับ ds:1 ใน LAB 2: [2][0]=ยอดนิยม, [3][0]=อื่นๆ
- GetBookingResults ×1 (หน้าตัวเลือกการจอง)
ไม่เก็บ token ยาว (ราคา/คลิกไปผู้ขาย) แบบเต็ม เก็บแค่ว่ามีอยู่ และไม่ตาม URL ไปเว็บสายการบิน
ใช้: python3 -I scripts/extract_flights.py flights-all.json"""
import base64, json, re, sys
from urllib.parse import unquote
sys.path.insert(0, 'scripts')
from rea_records import load_capture, parse_stream


def g(a, *idx):
    for i in idx:
        try:
            a = a[i]
        except (IndexError, TypeError, KeyError):
            return None
    return a


def hm(t): return None if t is None else f"{(t[0] or 0):02d}:{(g(t, 1) or 0):02d}"
def dt(x): return None if not x else f"{x[0]:04d}-{x[1]:02d}-{x[2]:02d}"


def token_iso(tok):
    try:
        raw = base64.b64decode(json.loads(tok)[0] + '==')
        return ([s.decode() for s in re.findall(rb'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d', raw)],
                [s.decode() for s in re.findall(rb'R\x03([0-9A-Z]{3})', raw)])
    except Exception:
        return [], []


def leg(l, iso, ac):
    return {"flight_number": f"{g(l, 22, 0)} {g(l, 22, 1)}" if g(l, 22) else None,
            "marketing_carrier_code": g(l, 22, 0), "carrier_name": g(l, 22, 3), "operated_by": l[2],
            "from_code": l[3], "from_name": l[4], "to_code": l[6], "to_name": l[5],
            "depart_date": dt(l[20]), "depart_time": hm(l[8]), "arrive_date": dt(l[21]), "arrive_time": hm(l[10]),
            "depart_iso_with_tz": g(iso, 0), "arrive_iso_with_tz": g(iso, 1),
            "duration_min": l[11], "aircraft": l[17], "aircraft_code_in_token": ac,
            "legroom": l[14], "legroom_long": g(l, 30), "co2_grams_inferred": g(l, 31)}


def flight(item):
    f = item[0]
    iso, acs = token_iso(item[8]) if g(item, 8) else ([], [])
    em = g(f, 22) or []
    sal = f[-1] if isinstance(f[-1], list) and f[-1] and isinstance(f[-1][0], list) and len(f[-1][0]) == 3 else []
    return {"airline_codes": [f[0]] if isinstance(f[0], str) else f[0], "airlines": f[1],
            "price_thb": g(item, 1, 0, 1), "price_token_present": bool(g(item, 1, 1)),
            "origin": f[3], "destination": f[6],
            "depart_date": dt(f[4]), "depart_time": hm(f[5]), "arrive_date": dt(f[7]), "arrive_time": hm(f[8]),
            "total_duration_min": f[9], "stops": len(f[2]) - 1,
            "layovers": [{"duration_min": x[0], "airport_code": x[1], "airport_name": x[4], "city": x[5],
                          "change_airport_to": x[2] if x[2] != x[1] else None} for x in (f[13] or [])],
            "legs": [leg(l, iso[2 * i:2 * i + 2], g(acs, i)) for i, l in enumerate(f[2])],
            "emissions": {"this_flight_g": g(em, 7), "typical_for_route_g": g(em, 8), "lowest_g_inferred": g(em, 10),
                          "pct_vs_typical": g(em, 3), "level_code": g(em, 2),
                          "level_label": {1: "ต่ำกว่าเฉลี่ย", 2: "โดยเฉลี่ย", 3: "สูงกว่าเฉลี่ย"}.get(g(em, 2))},
            "special_assistance_links": [{"code": x[0], "name": x[1], "url": x[2]} for x in sal]}


def key(fl):
    return '|'.join([fl['depart_date'], fl['depart_time'], fl['origin'], fl['destination']] +
                    [l['flight_number'] or '?' for l in fl['legs']])


def price_insights(pi):
    if not pi:
        return None
    return {"level_code_inferred": pi[0], "this_price_thb": g(pi, 1, 1), "reference_price_thb": g(pi, 2, 1),
            "reference_minus_this_thb": g(pi, 3, 1),
            "check_reference_minus_this": g(pi, 2, 1) - g(pi, 1, 1) == g(pi, 3, 1) if g(pi, 3, 1) is not None else None,
            "typical_range_thb": [g(pi, 4, 1), g(pi, 5, 1)], "raw_6": g(pi, 6),
            "history_points": len(g(pi, 10, 0) or []),
            "history_first_last": [(g(pi, 10, 0) or [None])[0], (g(pi, 10, 0) or [None])[-1]]}


def filters(ds7):
    if not ds7:
        return None
    return {"price_range_thb": {"min": g(ds7, 0, 0, 1), "max": g(ds7, 0, 1, 1)},
            "alliances": [{"code": a, "name": b} for a, b in (g(ds7, 1, 0) or [])],
            "airlines": [{"code": a, "name": b} for a, b in (g(ds7, 1, 1) or [])],
            "connecting_airports": [{"code": a, "city": b} for a, b in (g(ds7, 2, 0) or [])],
            "layover_duration_range_min": {"min": g(ds7, 2, 1), "max": g(ds7, 2, 2)},
            "total_duration_range_min": {"min": g(ds7, 3, 0), "max": g(ds7, 3, 1)},
            "raw_4": g(ds7, 4), "raw_5": g(ds7, 5)}


def freq(record):
    """f.req ที่ส่งไป (ถอด URL encoding) และค่าที่อ่านได้: จำนวนจุดแวะ (ช่อง [13][0][3]) + flag ท้าย"""
    body = unquote((g(record, 'reported', 'request', 'postData', 'text') or '').replace('+', ' '))
    m = re.match(r'f\.req=(.*?)&?$', body, re.S)
    try:
        inner = json.loads(json.loads(m.group(1))[1])
    except Exception:
        return {"raw": body[:300]}
    return {"stops_filter_raw": g(inner, 1, 13, 0, 3), "date": g(inner, 1, 13, 0, 6),
            "from": g(inner, 1, 13, 0, 0), "to": g(inner, 1, 13, 0, 1),
            "selected_leg": g(inner, 1, 13, 0, 8), "trailing_flags": inner[2:]}


cap = load_capture()
recs = cap['normalized_result']['records']
shop = [r for r in recs if 'GetShoppingResults' in r['reported']['request']['url']]
book = [r for r in recs if 'GetBookingResults' in r['reported']['request']['url']]
STEP = ['initial', 'more_flights', 'nonstop_filter']

responses, flights = [], {}
for step, r in zip(STEP, shop):
    p = parse_stream(r['reported']['response']['content']['text'])[0][1]
    best, other = g(p, 2, 0) or [], g(p, 3, 0) or []
    responses.append({"step": step, "har_ordinal": r['ordinal'], "request": freq(r),
                      "best_count": len(best), "other_count": len(other), "not_loaded_count": g(p, 3, 1),
                      "response_text_chars": len(r['reported']['response']['content']['text']),
                      "price_insights": price_insights(g(p, 5)),
                      "cheaper_dates": [{"date": x[0], "price_thb": g(x, 2, 0, 1)} for x in (g(p, 6, 0) or []) if isinstance(x, list) and isinstance(x[0], str)],
                      "filters": filters(g(p, 7)),
                      "airline_baggage_links": len(g(p, 11) or []),
                      "airline_special_assistance_links": len(g(p, 26) or [])})
    for grp, items in (("best", best), ("other", other)):
        for i, it in enumerate(items):
            fl = flight(it)
            k, n = key(fl), 1
            # ตารางบินเดียวกันอาจมาซ้ำในคำขอเดียว (ราคา/ตั๋วต่างกัน เช่น GA 867+874) → แยกเป็นคนละรายการ
            while any(s["step"] == step for s in flights.get(k, {}).get("seen_in", [])):
                n += 1
                k = f"{key(fl)}#{n}"
            cur = flights.setdefault(k, {"key": k, **fl, "seen_in": []})
            cur["seen_in"].append({"step": step, "group": grp, "rank_in_group": i + 1, "price_thb": fl["price_thb"]})

booking = None
if book:
    r = book[0]
    chunks = parse_stream(r['reported']['response']['content']['text'])
    head, opts = chunks[0][1][1], chunks[1][1][1]
    sel = flight([g(head, 5, 0, 0)])  # ไม่มีราคา/token ในส่วนหัว (ราคาอยู่ใน options)
    booking = {"har_ordinal": r['ordinal'], "request": freq(r),
               "selected_flight": sel, "selected_key": key(sel),
               "baggage_links": [{"code": a, "name": b, "url": c} for a, b, c in (g(head, 9) or [])],
               "price_insights_for_selected": price_insights(g(opts, 12)),
               "options": [{"seller_code": g(o, 1, 0, 0), "seller_name": g(o, 1, 0, 1),
                            "is_airline": bool(g(o, 1, 0, 3)), "flights": [" ".join(x) for x in (g(o, 3) or [])],
                            "price_thb": g(o, 7, 0, 1), "extra_fee_thb": g(o, 13, 1, 0, 1),
                            "display_domain": g(o, 5, 0), "clickout_token_present": bool(g(o, 5, 2))}
                           for o in (g(opts, 0) or [])],
               "note": "body ของคำขอนี้เติมจาก CDP Network.streamResourceContent (ดู _comment ใน HAR) เพราะเบราว์เซอร์ abort stream"}

allf = list(flights.values())
steps_of = lambda f: {s["step"] for s in f["seen_in"]}
out = {"meta": {
    "route": "กรุงเทพ (BKK/DMK) → โตเกียว (NRT/HND) เที่ยวเดียว 15 พ.ย. 2026 ผู้ใหญ่ 1 ชั้นประหยัด (th, THB)",
    "source": "response ของ FlightsFrontendService ใน HAR — อ่านผ่าน REA inspect_web_network_capture",
    "har": cap['subject']['local_path'], "har_sha256": cap['subject']['digest']['sha256'],
    "rea_evidence_id": cap['evidence_id'],
    "unique_flights": len(allf),
    "counts_by_step": {s: sum(1 for f in allf if s in steps_of(f)) for s in STEP},
    "initial_is_subset_of_more": all('more_flights' in steps_of(f) for f in allf if 'initial' in steps_of(f)),
    "nonstop_is_subset_of_more": all('more_flights' in steps_of(f) for f in allf if 'nonstop_filter' in steps_of(f)),
    "nonstop_in_more_flights": sum(1 for f in allf if f["stops"] == 0 and 'more_flights' in steps_of(f)),
    "note": "price_thb ระดับบนสุดคือราคาจากคำขอแรกที่เห็นเที่ยวบินนั้น ราคาของแต่ละคำขออยู่ใน seen_in"},
    "responses": responses, "booking": booking, "flights": allf}
json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(json.dumps(out["meta"], ensure_ascii=False, indent=1))
for x in responses:
    print(x["step"], x["har_ordinal"], x["best_count"], x["other_count"], x["not_loaded_count"], x["request"])
if booking:
    print('booking', booking["selected_key"], [(o["seller_name"], o["price_thb"], o["extra_fee_thb"]) for o in booking["options"]])

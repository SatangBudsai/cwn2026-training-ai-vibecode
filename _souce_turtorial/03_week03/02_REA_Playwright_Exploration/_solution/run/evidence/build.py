import json,base64,re,sys,hashlib
ev=sys.argv[1]
ds=json.load(open(f'{ev}/embedded-ds.json'))['ds:1']
insp=json.load(open(f'{ev}/rea-inspect_web_page.json'))
scen=json.load(open(f'{ev}/rea-capture_browser_scenario.json'))
def hm(t): return None if t is None else f"{(t[0] or 0):02d}:{(t[1] if len(t)>1 and t[1] else 0):02d}"
def dt(x): return None if not x else f"{x[0]:04d}-{x[1]:02d}-{x[2]:02d}"
def g(a,i):
    try: return a[i]
    except (IndexError,TypeError): return None
def token_iso(tokstr):
    try:
        raw=base64.b64decode(json.loads(tokstr)[0]+'==')
        return [s.decode() for s in re.findall(rb'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d',raw)], \
               [s.decode() for s in re.findall(rb'R\x03([0-9A-Z]{3})',raw)]
    except Exception: return [],[]
def leg(l,iso,ac):
    return {"flight_number": f"{g(l[22],0)} {g(l[22],1)}" if l[22] else None,
      "marketing_carrier_code": g(l[22],0),"carrier_name": g(l[22],3),"operated_by": l[2],
      "from_code": l[3],"from_name": l[4],"to_code": l[6],"to_name": l[5],
      "depart_date": dt(l[20]),"depart_time": hm(l[8]),"arrive_date": dt(l[21]),"arrive_time": hm(l[10]),
      "depart_iso_with_tz": iso[0] if iso else None,"arrive_iso_with_tz": iso[1] if len(iso)>1 else None,
      "duration_min": l[11],"aircraft": l[17],"aircraft_code_in_token": ac,
      "legroom": l[14],"legroom_long": g(l,30),"co2_grams_inferred": g(l,31),
      "raw_amenity_flags": l[12]}
def flight(item,group,rank):
    f=item[0]; iso,acs=token_iso(item[8]) if g(item,8) else ([],[])
    legs=[leg(l,iso[2*i:2*i+2],g(acs,i)) for i,l in enumerate(f[2])]
    lays=[{"duration_min":x[0],"airport_code":x[1],"airport_name":x[4],"city":x[5],
           "change_airport_to": x[2] if x[2]!=x[1] else None} for x in (f[13] or [])]
    em=g(f,22) or []
    return {"group":group,"rank_in_group":rank,
      "airline_codes":[f[0]] if isinstance(f[0],str) else f[0],"airlines":f[1],
      "price_thb": g(item[1][0],1),"price_token_present": bool(g(item[1],1)),
      "origin":f[3],"destination":f[6],
      "depart_date":dt(f[4]),"depart_time":hm(f[5]),"arrive_date":dt(f[7]),"arrive_time":hm(f[8]),
      "total_duration_min":f[9],"stops":len(f[2])-1,"layovers":lays,"legs":legs,
      "emissions":{"this_flight_g":g(em,7),"typical_for_route_g":g(em,8),"lowest_g_inferred":g(em,10),
                   "pct_vs_typical":g(em,3),"level_code":g(em,2),"level_label":{1:"ต่ำกว่าเฉลี่ย",2:"โดยเฉลี่ย",3:"สูงกว่าเฉลี่ย"}.get(g(em,2))},
      "special_assistance_links":[{"code":x[0],"name":x[1],"url":x[2]} for x in (f[-1] if isinstance(f[-1],list) and f[-1] and isinstance(f[-1][0],list) and len(f[-1][0])==3 else [])]}
flights=[flight(it,"best",i+1) for i,it in enumerate(ds[2][0])]+[flight(it,"other",i+1) for i,it in enumerate(ds[3][0])]
filt=ds[7]
pi=ds[5]
out={"meta":{
  "route":"กรุงเทพ (BKK/DMK) → โตเกียว (NRT/HND) เที่ยวเดียว 15 พ.ย. 2026 ผู้ใหญ่ 1 ชั้นประหยัด",
  "source":"AF_initDataCallback key 'ds:1' ฝังใน HTML ของหน้า (ไม่ใช่ข้อความบนจอ)",
  "captured_by":"REA capture_browser_scenario (connect, CDP 127.0.0.1:9222) — at_end dom",
  "inspect_captured_at":insp['normalized_result']['capture_window']['ended_at'],
  "scenario_evidence_id":scen['evidence_id'],"inspect_evidence_id":insp['evidence_id'],
  "dom_sha256":scen['normalized_result']['steps'][1]['artifacts']['dom']['value']['sha256'],
  "caveat":"scenario แบบ connect ทำ goto_start (โหลด URL ค้นหาเดิมซ้ำ 1 ครั้ง) ก่อนเก็บ DOM ข้อมูลนี้จึงมาจากหน้าที่โหลดใหม่ ไม่ใช่หน้าเดิมก่อนแนบ",
  "embedded_flight_count":len(flights),"best_count":len(ds[2][0]),"other_count":len(ds[3][0]),
  "not_embedded_more_flights_count_inferred":ds[3][1],
  "note":"เที่ยวบินที่เหลือ (278) ไม่ได้ฝังในหน้า ต้องกด 'ดูเที่ยวบินเพิ่มเติม' ซึ่งต้องคลิก จึงไม่ได้ดึงเพราะทำงานแบบอ่านอย่างเดียว"},
 "filters":{
  "price_range_thb":{"min":g(filt[0][0],1),"max":g(filt[0][1],1)},
  "alliances":[{"code":a,"name":b} for a,b in filt[1][0]],
  "airlines":[{"code":a,"name":b} for a,b in filt[1][1]],
  "connecting_airports":[{"code":a,"city":b} for a,b in filt[2][0]],
  "layover_duration_range_min":{"min":filt[2][1],"max":filt[2][2]},
  "total_duration_range_min":{"min":filt[3][0],"max":filt[3][1]},
  "raw_stop_options":filt[4],"raw_bag_or_flags":filt[5]},
 "price_insights":{"lowest_now_thb":g(pi[1],1),"raw_5_2_thb":g(pi[2],1),"raw_5_3_diff_thb":g(pi[3],1),
  "typical_range_thb":[g(pi[4],1),g(pi[5],1)],"level_code_inferred":pi[6],
  "history":[{"date_utc_ms":t,"price_thb":p} for t,p in pi[10][0]]},
 "cheaper_dates":[{"date":x[0],"price_thb":g(x[2][0],1)} for x in ds[6][0][0:1]] if ds[6] else [],
 "airline_baggage_links":[{"code":a,"name":b,"url":c} for a,b,c in ds[11]],
 "airline_special_assistance_links":[{"code":a,"name":b,"url":c} for a,b,c in ds[26]],
 "raw_15_english_airline_list_unknown_purpose":ds[15][1],
 "flights":flights}
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=2)
print(len(flights), out['filters']['price_range_thb'], len(out['filters']['airlines']))
for f in flights: print(f['group'],f['rank_in_group'],f['airlines'],f['price_thb'],f['origin'],f['depart_time'],'→',f['destination'],f['arrive_time'],f['arrive_date'],f['total_duration_min'],f['stops'],[ (l['airport_code'],l['duration_min']) for l in f['layovers']],[l['flight_number'] for l in f['legs']])

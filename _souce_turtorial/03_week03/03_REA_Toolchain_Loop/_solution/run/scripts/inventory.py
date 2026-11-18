"""สรุปคำขอเครือข่ายจากผล REA (api-surface view + capture records ใน rea/evidence-bundle.json) → rea/inventory.json
ขนาด: req_body = request.bodySize, resp_decoded = response.content.size (หลังถอดบีบอัด), resp_transfer = response.bodySize (บนสาย)
ค่า -1 = เบราว์เซอร์ไม่รายงาน"""
import json, sys
sys.path.insert(0, 'scripts')
from rea_records import load_capture

b = json.load(open('rea/evidence-bundle.json', encoding='utf-8'))
cap = load_capture()
api = [r for r in b['records'] if r['operation'] == 'inspect_analysis_view'
       and r['parameters']['view'].get('kind') == 'api-surface'
       and r['parameters']['parent_evidence_id'] == cap['evidence_id']][0]
R = {r['ordinal']: r['reported'] for r in cap['normalized_result']['records']}
rows = []
for gr in api['normalized_result']['groups']:
    o = gr['record_ordinals']
    sz = lambda f: sum(max(f(R[i]) or 0, 0) for i in o)
    rows.append({"method": gr['method'], "origin": gr['origin'], "path": gr['path_template'], "ordinals": o,
                 "count": len(o), "statuses": gr['statuses'], "types": gr['content_types'],
                 "query_names": [q['name'] for q in gr.get('query_parameter_names', [])],
                 "req_body": sz(lambda r: r['request'].get('bodySize')),
                 "resp_decoded": sz(lambda r: r['response']['content'].get('size')),
                 "resp_transfer": sz(lambda r: r['response'].get('bodySize')),
                 "resource_types": sorted({R[i].get('_resourceType') for i in o} - {None}),
                 "comment": [R[i].get('_comment') for i in o if R[i].get('_comment')]})
json.dump({"capture_evidence_id": cap['evidence_id'], "api_surface_evidence_id": api['evidence_id'],
           "har_sha256": cap['subject']['digest']['sha256'], "total_records": len(R), "groups": rows},
          open('rea/inventory.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

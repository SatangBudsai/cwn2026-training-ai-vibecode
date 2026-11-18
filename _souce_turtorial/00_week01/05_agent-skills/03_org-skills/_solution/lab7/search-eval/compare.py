# เทียบวิธีหา skill 5 แบบ กับคำค้นชุดเดียวกัน (queries-heldout.json 60 ข้อ · การ์ดหัวไฟล์ cards-header.json 23 ใบ)
#  1 BM25        = ค้นด้วยคำ (character trigram) จาก search.mjs (ผลอันดับดึงมาจาก bm25.json)
#  2 Embedding   = ค้นด้วยความหมาย BAAI/bge-m3 (รองรับภาษาไทย) · cosine similarity
#  3 Hybrid      = รวมอันดับ BM25 + Embedding ด้วย Reciprocal Rank Fusion (k=60)
#  4 + Reranker  = เอา 10 อันดับแรกของ Hybrid ให้ BAAI/bge-reranker-v2-m3 อ่านคำถามคู่กับการ์ดทีละใบแล้วจัดอันดับใหม่
#  5 LLM         = Claude อ่านการ์ดครบทุกใบแล้วเลือก 5 ตัว (แบบที่ core:skill-finder ทำจริง) · ผลจาก llm.json
# ใช้: python compare.py <bm25.json> <llm.json> <out.json>
import json, sys, time
from sentence_transformers import SentenceTransformer, CrossEncoder

D = __file__.rsplit('/', 1)[0] if '/' in __file__ else __file__.rsplit('\\', 1)[0]
cards = json.load(open(f'{D}/cards-header.json', encoding='utf-8'))
ids = [f"{c['plugin']}:{c['name']}" for c in cards]
text = [f"{c['name']} ({c['plugin']}): {c['description']}" for c in cards]
bm25_all = json.load(open(sys.argv[1], encoding='utf-8'))
llm = json.load(open(sys.argv[2], encoding='utf-8'))
ok = lambda r, q: r == q['expect'] or (q['who'] == 'plat-may' and r == 'core:brand-guide')   # เหมือน score.mjs

emb = SentenceTransformer('BAAI/bge-m3', device='cuda')
rer = CrossEncoder('BAAI/bge-reranker-v2-m3', device='cuda')
C = emb.encode(text, normalize_embeddings=True)

def rrf(*ranks, k=60):
    s = {}
    for r in ranks:
        for i, x in enumerate(r): s[x] = s.get(x, 0) + 1 / (k + i + 1)
    return sorted(s, key=lambda x: -s[x])

out = {}
for set_name in ['queries.json', 'queries-heldout.json']:
    qs = json.load(open(f'{D}/{set_name}', encoding='utf-8'))
    Q = emb.encode([q['q'] for q in qs], normalize_embeddings=True)
    res = {m: [] for m in ['BM25', 'Embedding', 'Hybrid', 'Hybrid + Reranker', 'LLM (Claude)']}
    t_rr = 0
    for i, q in enumerate(qs):
        bm = bm25_all[set_name][i]
        sims = (C @ Q[i]); em = [ids[j] for j in sims.argsort()[::-1]]
        hy = rrf(bm, em)
        t0 = time.time(); top = hy[:10]
        sc = rer.predict([(q['q'], text[ids.index(x)]) for x in top]); t_rr += time.time() - t0
        rr = [x for _, x in sorted(zip(sc, top), key=lambda z: -z[0])]
        res['BM25'].append(bm[:5]); res['Embedding'].append(em[:5]); res['Hybrid'].append(hy[:5]); res['Hybrid + Reranker'].append(rr[:5])
        if set_name in llm: res['LLM (Claude)'].append(llm[set_name][i][:5])
    out[set_name] = {}
    for m, tops in res.items():
        if not tops: continue
        h1 = sum(ok(t[0], q) for t, q in zip(tops, qs) if t); h5 = sum(any(ok(x, q) for x in t) for t, q in zip(tops, qs))
        miss = [{'q': q['q'], 'expect': q['expect'], 'got': t[:3]} for t, q in zip(tops, qs) if not any(ok(x, q) for x in t)]
        out[set_name][m] = {'n': len(qs), 'hit1': round(100 * h1 / len(qs), 1), 'hit5': round(100 * h5 / len(qs), 1), 'miss': miss}
        print(set_name, f'{m:20s}', out[set_name][m]['hit1'], out[set_name][m]['hit5'])
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

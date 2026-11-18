I captured the structure of the results page from all four sources and compared them. **Comparing structure shows completeness better than visual diff.** It ranks v3 > v2 > v1, the same order as acceptance. Visual diff gets that order wrong: it puts v2 slightly ahead of v3.

**The state compared:** the first results page (Bangkok → Tokyo, one way, 15 Nov 2026, Best tab), before clicking "ดูเที่ยวบินเพิ่มเติม". The original shows 22 flights, v1 shows 22, v2 shows 10 and v3 shows 22. The clones were opened at the same URLs as LAB 3's visual diff.

**What I removed before comparing:** the whole top bar of every version (Google logo, Google's menu, sign-in, the SkyThai brand and the clones' own menus). Also removed: the bottom links that go to Google (privacy, terms, help center and so on), anything named Google or SkyThai, the clones' "ข้อมูลจำลอง" notes, and one empty alert. That removed 18 elements from the original and 3/5/5 from v1/v2/v3.

**Similarity score:** the average of two numbers:
- Jaccard of role + name.
- How many of 38 key elements are present. I chose the 38 from the original, and the original has all of them.

| Version | Structure similarity % | Key elements missing |
|---|---:|---|
| v1 SkyThai Mini | **3.8%** (Jaccard 5.0% · 1/38 present) | 37 of 38 missing: the whole search form, all 9 filter buttons, both tabs, the result count, section headings, sorting, flight-detail buttons, price insights, price history, price tracking, date grid, price graph, cheaper-date card, "ดูเที่ยวบินเพิ่มเติม", and language/country/currency. It only has the flight list. |
| v2 SkyThai Plus | **55.8%** (Jaccard 45.9% · 25/38) | 13 missing: search landmark · tab panel · "เที่ยวบินยอดนิยม" and "เที่ยวบินอื่นๆ" headings · baggage-fee button · flights not in a list · only 10 flights shown first (original 22) and 10 detail buttons · emissions shown as text, not a button · price-insights heading · price-history, date-grid and price-graph buttons |
| v3 SkyThai Pro | **70.5%** (Jaccard 54.1% · 33/38) | 5 missing: search landmark (the form sits in `main`) · tab panel · baggage-fee button · flights not in a list · emissions per flight shown as text, not a button |

Acceptance means LAB 3's 82 tests:

| Measure | v1 | v2 | v3 | Same order as acceptance? (Spearman) | Correlation with acceptance (Pearson) |
|---|---:|---:|---:|---:|---:|
| Acceptance, 82 tests | 0% | 62.2% | 90.2% | — | — |
| Visual diff, LAB 3 (lower = closer) | 27.88% | **8.19%** | 8.32% | 0.5 (puts v2 first: wrong) | 0.951 |
| Visual similarity (100 − diff) | 72.1% | 91.8% | 91.7% | | |
| **Structure similarity** | 3.8% | 55.8% | **70.5%** | **1.0 (v3 > v2 > v1: correct)** | **0.995** |

Why structure works better:
- **Correct order:** v3 passes 23 more acceptance tests than v2, but visual diff still scores v2 slightly better.
- **Not fooled by white space and colours:** v1 has no search form, filters or tabs, yet it still gets 72% visual similarity. Its structure score is 3.8%.
- **It names what to fix:** the 5 items v3 is missing are exactly the next fixes. Visual diff only shows red pixels.
- **Covers the whole page:** visual diff only looks at the first 1366×900 screen.

Visual diff is still needed for layout, spacing and sizes, which structure can't see. The two work best together.

Limitations:
- With only 3 versions, the correlation numbers show direction only and aren't statistically meaningful.
- I picked the 38 key elements myself, and they make up half the score. The plain Jaccard numbers are listed separately in STRUCTURE.md.
- Only one page state was measured. "See more", filters and flight details aren't covered here; those belong to the differential test.

Files are in `/workspace/rea-flight-v4`:
- `STRUCTURE.md` — the report (the tables above, the detailed metrics, method and limitations)
- `structure/capture.mjs` — captures the four pages; outputs are in `structure/snapshots/{original,v1,v2,v3}.yml`
- `structure/compare.mjs` — does the comparison and writes `structure/metrics.json`

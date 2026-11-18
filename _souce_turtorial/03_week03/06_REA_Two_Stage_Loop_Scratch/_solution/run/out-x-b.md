I've finished Part B and written `PART.md` in Thai with all four sections (A, B, C, E). I saw everything between 17:06 and 17:55 on 2026-11-01 (Bangkok time). I hit no CAPTCHA, never logged in, and never clicked "เลือกเที่ยวบิน" (select flight) or anything that continues to an airline or agent.

**Flight counts for comparing with Part D** (full table with times is at the top of `PART.md`):
- **No filter:** 21 flights at first (18 nonstop, 3 with one stop). After "ดูเที่ยวบินเพิ่มเติม" (show more flights) there are exactly 300.
- **Nonstop only:** 18. Of these, 5 are Thai Airways, 5 ANA, 3 JAL, 2 Thai VietJet, 2 AirAsia and 1 ZIPAIR.
- **"การบินไทย เท่านั้น" (Thai Airways only):** 5 flights, all nonstop. Itineraries that mix Thai Airways with another airline (32 in the unfiltered list) are excluded.
- **Other filters:** at most 1 stop gives 235; at most 2 stops gives 288; Star Alliance gives 66; low emissions gives 73; max ฿30,000 gives 185. There are two no-results cases: duration under 5 hours, and "กาตาร์แอร์เวย์ เท่านั้น" (Qatar Airways only).

**Findings to note:**
- **Probable 300-flight cap.** The unfiltered list stops at exactly 300 and its most expensive flight is ฿77,520. The "at most 2 stops" filter shows 288 flights, including one at ฿197,520 that isn't in the unfiltered list. So the unfiltered list seems to be cut off; Part D should check this in the network data.
- **The "ถูกที่สุด" (cheapest) tab shows the same order as "ดีที่สุด" (best)** when sorting is left at the default. It stayed that way in 3 checks, including after a reload. Once sorted by price, the list is in true ascending order.
- **Sort and filters are stored in the URL** and survive a tab switch, a filter change and a reload.
- **Filter panels close themselves** as soon as a value changes, because the active chip jumps to the front of the filter bar. Every change applies immediately, with no confirm button.
- **Intermittent error page.** About 6 of roughly 40 actions showed "อ๊ะ มีบางอย่างผิดพลาด" ("Oops, something went wrong"). Pressing "โหลดซ้ำ" (reload) recovers. I can't tell yet whether this is caused by the four accounts running at the same time.
- **Price insights:** as of 17:51 the page said "ขณะนี้เที่ยวบินมีราคาสูง" (prices are currently high), with ฿7,635 against a usual range of ฿4,950–7,200. It also has a 60-day price history.
- **Date grid:** one row of 8 days; 12 Nov was cheapest at ฿5,255. Pressing "ตกลง" (OK) changes the search date.
- **Price tracking** opens a sign-in dialog, so I stopped there.

**Not finished:** setting the price slider to ฿10,000 failed both times on the error page. The results for 12 Nov after picking it from the date grid also ended on the error page. Both are listed as open questions in section E.

Everything is in `/workspace/arena6/explore/b-results`:
- `PART.md`
- `shots/` (88 screenshots)
- `snapshots/` (38 aria snapshots)
- `logs/` (timestamped log and raw row data)
- `scripts/`

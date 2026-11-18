Score went from **73.56 to 91.07** in 5 rounds. All five rounds were kept and the gate passed every time. Total time was about 35 minutes.

| | v4 (r0) | pipe1 (r5) |
|---|---:|---:|
| Structure % | 78.6 (key Jaccard 57.1 · 38/38) | **96.3** (key Jaccard 92.6 · 38/38) |
| Visual diff % | 5.04 | 5.23 |
| acceptance | 74/82 | 74/82 |
| differential | 8/8 | 8/8 |
| Flights | 300 | 300 |
| **Score** | 73.56 | **91.07** |
| Tokens missing / extra | 16 / 11 | 2 / 2 |

| Round | What changed | Structure % | Visual % | Score | Kept? |
|---|---|---:|---:|---:|---|
| r1 | Renamed 7 groups to match the original (search area, "ดีที่สุด" tab and its panel, sorter, price-tracking switches, the "ขณะนี้เที่ยวบินมีราคาสูง" heading, top heading); removed the "ค้นหาใหม่" link | 89.8 | 5.03 | 84.77 | Kept |
| r2 | Added a "ความช่วยเหลือสำหรับผู้โดยสาร" button with its dialog, plus a "ติดตามราคา" heading with an ⓘ button | 92.6 | 5.09 | 87.51 | Kept |
| r3 | Added a "หาราคาที่ดีที่สุด" section and a "ข้อมูลเชิงลึกด้านราคา" heading | 94.4 | 5.19 | 89.21 | Kept |
| r4 | Added visible "ตัวกรอง" and "ผลการค้นหา" headings in the empty left margin | 96.3 | 5.24 | 91.06 | Kept |
| r5 | Fixed a style that r4 broke on the "ตัวกรองทั้งหมด" chip | 96.3 | 5.23 | 91.07 | Kept |

**What's still missing:**
- **Row links "ราคาเริ่มต้นที่…" and the extra "เที่ยวบิน…":** the rules require row links to start with "เที่ยวบิน", so these can't change.
- **The "ค้นหาเที่ยวบิน" button:** the test presses it, so it has to stay.
- **The "ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม" link:** I skipped it. It would add only about 0.07 to structure, and a visible link that long would probably cost more than that in visual diff.

**Two judgement calls, explained in REPORT.md:**
- **Price-tracking switches:** their names now read "ติดตามราคาเที่ยวบินจาก <ต้นทาง> ไป <ปลายทาง>…". That includes the visible label ("15 พ.ย." / "วันใดก็ได้"), but it is longer than the text right next to the switch. Under a strict reading of "names must match what's on screen", stage 2 should show the route next to the switches.
- **New headings:** "ตัวกรอง" and "ผลการค้นหา" are visible on screen, whereas the original hides them. Nothing is hidden for screen readers only.

⚠️ **A mistake I made, now fixed:** during setup a `cd` failed, so a port-replacement command ran in `/workspace/arena` instead of `pipe1`. It changed 5084→5091 in about 20 files outside pipe1, including 4 files in `kit/`, `base-v4`, `docs/FINAL.md`, `k0.txt`, `s2.txt` and the files under `out/v4`. I found them by modification time and changed them back right away, before any measurement. The `kit/` changes were all in comments or a default port value, not in scoring logic. Only `s1.txt` still contains 5091, which is correct since it is your original brief. There's no git in `kit/` to compare against, so it's worth checking against your own copy if you have one. The files' modification times also changed.

Everything is in `/workspace/arena/pipe1`. Each round's measurement is in `out/pipe1-r0` to `r5`. `scripts/round.sh <N>` rebuilds the app and measures one round.

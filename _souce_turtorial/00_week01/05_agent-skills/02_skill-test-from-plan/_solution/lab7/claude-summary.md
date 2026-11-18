I recorded both lessons in the skill and rebuilt the report from this run's results without re-running any tests. **2 questions remain (down from 13), and the verdict now reads "⛔ ยังไม่ปล่อย (เด็ดขาด — ไม่ว่าจะตอบคำถามในหัวข้อ 6 แบบไหน)".** The script wrote that line itself; I didn't edit the report by hand.

## Questions left in the report

| test | ระดับ | คำถาม | ใช้แบบ → ผล | อีกแบบ → ผล |
|---|---|---|---|---|
| TC-CHK-02 | P1 | ตั้งใจให้ทดสอบเบอร์โทร 9 หลักใช่ไหม | เบอร์ 9 หลัก → ❌ ล้ม | เบอร์ว่าง → ✅ ผ่าน |
| TC-AUTH-06 | P1 | ลิงก์ที่หน้าตาเหมือนปุ่ม นับเป็น "ปุ่มเข้าสู่ระบบ" ได้ไหม | นับได้ → ✅ ผ่าน | ต้องเป็นปุ่มจริง → ❌ ล้ม |

The other 11 points now sit in a short appendix at the end of the report, called "ภาคผนวก: จุดกำกวมที่ตีความเอง", one line each with no question. TC-REC-01 was in the earlier 13 but doesn't show up as a question here, because the plan owner had already answered it.

Below the verdict the report also says "ข้อที่ล้มและไม่มีการตีความใดช่วยให้ผ่านได้: TC-CPN-01". Even if every reading went the passing way, the run reaches 38/40 = 95.0%, but P1 still fails because PAW10 gives ฿7 off instead of ฿79.

## What changed in the skill

1. **Fewer questions** (`scripts/build-report.mjs`, `SKILL.md`, `references/decisions.md` item 18.1): the report only asks about a point if the answer could flip the verdict, or if it would change the result of a P1 test (or the alternative is still untested). Everything else uses the most literal reading and goes in the appendix. Every interpretation is still recorded and tried against the real site, because the script needs those results to decide what to ask.
2. **The script now works out whether the verdict can really flip.** The old version applied every alternative reading at once and marked the verdict "not final" whenever any alternative was untested. This run's untested one was TC-CPN-03, a P2 test, which is why it said "ยังไม่เด็ดขาด". Now it tests only the scenario most likely to flip the verdict: if the build is currently "don't release", it assumes every alternative that could pass does pass, and if it's "release", it assumes every alternative that could fail does fail. `SKILL.md` and decisions item 35 now say that if the verdict looks wrong, fix the script, not `TEST-REPORT.md`.

I checked the flip case on a copy of the data in the scratchpad: with TC-CPN-01 changed to pass, the script correctly says "ยังไม่เด็ดขาด" and asks 5 questions. The real results were not touched.

Report: `C:\t\skill05\01_petshop\e2e\test-report\TEST-REPORT.md`. The 3 skill files are modified but not committed.
# Run summary: team-demo (cleaning Support tickets)

Accounts used: **yolo1, yolo2 and cyolo1 only**. Every run went through `docker exec multi-account`.
All numbers below come from the account logs in `logs/`:
- Time: `date +%s.%N` before and after each command (`logs/timing.txt`)
- Claude tokens and model: the `result` event of `--output-format stream-json`
- Codex tokens: `turn.completed`; model: the `turn_context` in the session rollout file
- Times are container time, UTC+7

## Per run

| Account | Task | Model | Time (s) | input tokens | output tokens | Result |
|---|---|---|---:|---:|---:|---|
| yolo1 | Stage 1: clean_time.py | claude-opus-5-5 | 55.75 | 168,393 (uncached 10 + cache write 23,128 + cache read 145,255) | 6,067 | Succeeded |
| yolo2 | Stage 1: clean_order.py | claude-opus-5-5 | 62.03 | 177,629 (uncached 10 + cache write 27,900 + cache read 149,719) | 6,024 | Succeeded |
| cyolo1 | Stage 1: clean_code.py | gpt-6.1-sol | 66.58 | 176,056 (uncached 16,440 + cached 159,616) | 2,634 (reasoning 160) | Succeeded |
| yolo2 | Stage 1 fix: fallback for a bare 6-digit order number in text | claude-opus-5-5 | 50.66 | 123,711 (uncached 8 + cache write 20,745 + cache read 102,958) | 4,923 | Succeeded |
| cyolo1 | Stage 1 fix: support "error code: 500" / "error no." | gpt-6.1-sol | 36.35 | 95,092 (uncached 9,588 + cached 85,504) | 1,340 (reasoning 28) | Succeeded |
| yolo1 | Stage 2: clean.py + out/tickets.json + report.md | claude-opus-5-5 | 65.16 | 323,184 (uncached 16 + cache write 32,113 + cache read 291,055) | 6,191 | Succeeded |

## Per account totals

| Account | Task | Model | Time (s) | input tokens | output tokens | Result |
|---|---|---|---:|---:|---:|---|
| yolo1 | clean_time.py, clean.py, report.md | claude-opus-5-5 | 120.91 | 491,577 | 12,258 | Succeeded |
| yolo2 | clean_order.py (2 runs) | claude-opus-5-5 | 112.69 | 301,340 | 10,947 | Succeeded |
| cyolo1 | clean_code.py (2 runs) | gpt-6.1-sol | 102.93 | 271,148 | 3,974 | Succeeded |

Stage 1 ran all 3 accounts in parallel, 06:52:43 to 06:53:50 (wall clock about 67 s).

## Remaining quota

| Account | Remaining quota | Reset | Data as of |
|---|---|---|---|
| yolo1 | 7-day window: 29% used, **71% left** (the event reported only the 7-day window) | 2026-11-12 06:00 | rate_limit_event from the Stage 2 run, 2026-11-10 06:56:00 to 06:57:05 |
| yolo2 | 5-hour window: 23% used, **77% left**; 7-day window: 6% used, **94% left** | 5h: 2026-11-10 07:40; 7d: 2026-11-16 13:00 | rate_limit_event from the fix run, 2026-11-10 06:54:51 to 06:55:41 |
| cyolo1 | Weekly window (10,080 min): 6% used, **94% left**; credits balance 62,500 (plan prolite) | 2026-11-14 12:21:42 | token_count in the session rollout, 2026-11-10 06:55:26 |

## Results and independent checks (done by the orchestrator)
- `python3 clean.py data/tickets.csv` prints JSON for all 1,000 ids. It also works when run from another cwd.
- Results were compared with a separate reference written from the task's rules: time, order_id and error_code match on **all 1,000 rows** (0 mismatches).
- report.md: tickets per day are 07 Nov = 505, 08 Nov = 472, 09 Nov = 21, 10 Nov = 2. Error codes: E402 = 14, E405 = 12, none = 974. The `order_id` column is empty in 112 tickets, and the order number was pulled from the text for all 112.
- Edge cases were added that this dataset doesn't contain: Thai digits, NBSP, ZWSP, year rollover, a bare 6-digit order number in the text, `error code: 500`, `อีก 300 บาท`, `LINE 402`. All pass.
- Scan for this dataset's values in the code: the unit tests under `__main__` in clean_order.py had sample values from this dataset. The orchestrator replaced them with made-up numbers through docker exec (the logic is unchanged, the tests still pass, and the clean.py output is byte-identical). Rescan result: none left.

The frozen copy works offline. All 3 rounds passed with identical results, and the script exits with 0.

| What was tested | Round 1 | Round 2 | Round 3 | Problem found and fix |
|---|---|---|---|---|
| Initial page (expected 22) | 22 ✅ | 22 ✅ | 22 ✅ | 12 Google JS files didn't match the HAR, because the file URLs group modules differently on every load. **Fix:** I wrote my own route that rebuilds those files from the recorded copies. |
| First 5 prices, initial page | ฿7,635 · ฿8,432 · ฿11,580 · ฿9,062 · ฿9,335 | same | same | — |
| "ดูเที่ยวบินเพิ่มเติม" (expected 300) | 300 ✅ | 300 ✅ | 300 ✅ | The `GetShoppingResults` POST has a random `_reqid` in its URL, so it never matches the HAR. **Fix:** a custom route matches on the `f.req` in the request body and returns the recorded response. |
| First 5 prices, after more | ฿7,635 · ฿8,432 · ฿11,580 · ฿8,835 · ฿9,062 | same | same | — |
| Nonstop filter (expected 18) | 18 ✅ | 18 ✅ | 18 ✅ | **Problem 1:** `_.QH is not a function`, because later JS files need code from earlier ones. **Fix:** send files in the order they were recorded, never twice on the same page. **Problem 2:** while the filter dialog is open the rows can't be counted, so the script read 300. **Fix:** wait for the response, close the dialog, then wait until the row count stops changing. |
| First 5 prices, nonstop | ฿8,432 · ฿9,062 · ฿11,580 · ฿12,660 · ฿15,320 | same | same | — |
| Same result every round | ✅ | ✅ | ✅ | The page clock is fixed to the recording time (2026-10-31T17:03:15Z), so text based on "today" doesn't change with the run date. I checked that the page really reads that time. |
| No internet | HAR 48 · custom JS 20 · custom POST 3 · blocked 18 | same | same | Requests that match nothing are blocked; nothing is ever passed through to the network. The browser also points at a proxy on a port where nothing listens, as a second guard. |
| Blocked requests | `gen_204`, `/log`, `browserinfo` | same | same | These are only logging/telemetry. Blocking them doesn't change what the page shows. |
| JS errors on the page | 0 | 0 | 0 | — |
| Time per round | 9.8 s | 9.3 s | 9.3 s | — |
| GIF | ✅ 9.6 s, 800 px, 1.5 MB | (round 1 only) | (round 1 only) | The system ffmpeg can write GIFs directly. |

Files are in `/workspace/rea-flight-v4`:

| File | Contents |
|---|---|
| `frozen/open-original.mjs` | The script. Run `node frozen/open-original.mjs 3`. It can also be imported by the next lab (`newFrozenContext`, `runScenario`, `SEARCH_URL`). |
| `frozen/results.json` | Raw results for all 3 rounds |
| `gif/frozen-original.gif` | Recording of round 1 |
| `FROZEN.md` | The report table |

The HAR file is read from its original path and was not copied or sent anywhere. To run Playwright here I copied `node_modules` from `rea-flight-v3` into this folder.

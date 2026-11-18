# Acceptance tests

Run from this directory:

```sh
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node run.mjs <BASE_URL> <output-folder>
```

Requires Node.js and `playwright`. Uses Chromium, 1366×900, th-TH, fresh anonymous context per test, sequential execution and zero retries. Each test enters through BASE_URL and performs the standard route via the visible form: one way, Bangkok city → Tokyo city, 15 November 2026, one adult, economy. No direct internal navigation. Never clicks login, payment, CAPTCHA or seller continuation.

`results.json` is an array of `{id,status,reason,...}` (`ผ่าน` / `ไม่ผ่าน`). Each test has a screenshot and accessibility snapshot. `timing.json` records the complete run. When META.json exists, `gate.json` counts only valid IDs and the runner exits 1 if any of those fail. Optional ACCEPT_IDS=B2,C32 selects individual cases for a permitted correction run; the default always runs all cases. `META.json` records the baseline validity; only its `valid` IDs should gate an implementation. A failing valid test remains a failure: do not regenerate META against the implementation.

Reference inputs are read only from `../../spec/data/`. Dynamic prices/counts are compared to those fixtures, never values copied from the current Google session. Baseline mismatch is recorded as invalid rather than changing fixtures to match Google.

A Google error page still permits independent form/filter assertions. Tests requiring flight results fail and are excluded from the gate when the original cannot supply those results. No automatic reload is used. `probe*.mjs` were preliminary read-only route diagnostics, not baseline test runs.

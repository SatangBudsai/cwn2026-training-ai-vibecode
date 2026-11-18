# Visual comparison

Run `node results/visual/compare.cjs` from `/workspace/rea-flight-v3` (requires Playwright, pixelmatch, pngjs).

Reference: `/workspace/rea-flight-v2/exploration/results.png`, copied unchanged to `reference.png`, 1366×900. Chromium, th-TH, Asia/Bangkok, device scale default 1. Compare viewport screenshots at scroll position 0, not full page. Search Bangkok → Tokyo, one way, 15 November 2026, one adult, economy, best tab. v1 has a fixed results page; v2/v3 are set through their visible form and searched again after choosing one way. No CSS, branding, colors or page content are altered for comparison. Screenshots are taken after fonts load and a 1 second settling interval.

Pixelmatch threshold 0.1, includeAA false, denominator 1,229,400 pixels. `vN-diff.png` marks differing pixels red with the reference faded behind them. `metrics.json` records raw counts and percentages. `vN.txt` captures accessible page content; flight counts are checked separately after the screenshot, including loading more in v2/v3.

This is a raw pixel comparison, not a structural similarity metric. It includes text, colors, layout, whitespace and banners; equal white background can lower the difference even where content is missing. Custom branding is expected. Lower diff does not establish greater feature coverage. Dates/prices come from different captured snapshots. Dynamic reference elements (including its date suggestion) are retained.

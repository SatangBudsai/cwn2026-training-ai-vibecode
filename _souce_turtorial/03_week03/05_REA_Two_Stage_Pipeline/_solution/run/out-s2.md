Stage 2 is done. pipe2 runs on port 5092 with the same structure as stage 1, and visual diff dropped from 5.23% to **4.12%**. Score went from 91.07 to **92.18**, and the gate passed in every round.

| | Stage 1 (pipe1 / r0) | Stage 2 final (r3) |
|---|---:|---:|
| Structure % | 96.3 | **96.3** (ariaSnapshot identical byte for byte) |
| Visual diff % | 5.23 (64321 px) | **4.12** (50655 px) |
| Acceptance | 74/82 | 74/82 |
| Differential | 8/8 | 8/8 |
| Flights | 300 | 300 |
| **Score** | 91.07 | **92.18** |

| Round | What changed | Visual % | Score | Kept/reverted |
|---|---|---:|---:|---|
| r0 | Copied pipe1 to port 5092 (confirms structure 96.3 = stage 1) | 5.23 | 91.07 | baseline |
| r1 | Fixed the legibility guard: 10 spots had text under 12 px and 35 had contrast below 4.5:1 | 5.24 | 91.06 | kept |
| r2 | Search pass A (695 values tried): Tlwg Typo font plus 26 size, weight and line-height values | 4.33 | 91.97 | kept |
| r3 | Search pass B (309 values tried): selected-tab underline color, no border on airline badges, 8 letter-spacing values | 4.12 | 92.18 | kept |

- **r1 Score dropped by 0.01.** I kept r1 even though it lowered Score, because rule 4 requires the app to pass the legibility guard before the search starts.
- **Fast meter:** it gave exactly the same pixel counts as the kit at r0, r2 and r3. In r2 alone the fast-meter prediction was 1,295 px better than the built app scored. That came from how the self-hosted font file maps font weights, so I started pass B from the built app.
- **Values the guard threw away:** 8 values that lowered the diff were rejected. All of them were text that came out under 75% of its size in v4: the "Max" brand, the results-count line, the insight heading and the price. No value changed the ariaSnapshot.
- **Final app guard check:** all checks pass. Structure is locked, text is ≥ 12 px, contrast is ≥ 4.5:1 (including ::before/::after), text opacity is 1, sizes are ≥ 75% of v4 (297 elements compared), and no line breaks mid-word (Intl.Segmenter('th')).

Things you might want to change:
- **The chosen font looks like a typewriter.** The search picked "Tlwg Typo" because it gave the lowest diff, but it's monospaced. It's open-licensed (GPL-2+ with font exception) and is served from the app with its license file. If you want a more ordinary font, Loma or Waree are the next options, at a higher diff.
- **The tab underline is now blue (#1a73e8).** It's only a color value, not a Google logo, font or code.
- **What's left in the diff:** the header/logo (about 4.3k px), the toast (2.5k px) and the tab border. Shrinking those means changing the layout or the brand, so I stopped after r3 because of the time limit.

Every round is its own commit. Everything is in `/workspace/arena/pipe2`; open `REPORT.md` first. The tuned values are in `src/components/results-tuned.css`, and the optimizer with every value it tried is in `scripts/opt/`.

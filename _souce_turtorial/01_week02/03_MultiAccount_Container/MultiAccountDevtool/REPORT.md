# Report: image multi-account:1.0

Build: `docker build -t multi-account:1.0 ./MultiAccountDevtool` (361 s, cold cache) | Image size: 3.2 GB (disk usage)

## setup-report
**Structure.** `MultiAccountDevtool/` is a copy of `00_Devtool_Container` with these changes: `Dockerfile` (AI CLIs, Playwright MCP, Chromium, Thai fonts, `VOLUME /root/ai-accounts`), new `ai-accounts-install`, `start.sh` (runs installer before dockerd/Jupyter), `docker-compose.yml` (image `multi-account:1.0`, volume `ai-accounts`).

**In the image (pinned):** Claude Code 2.1.322, Codex CLI 0.167.1, @playwright/mcp 0.0.85, Chromium at `/opt/ms-playwright` (installed with the playwright bundled in @playwright/mcp), fonts-thai-tlwg + fonts-noto-core, Docker-in-Docker, JupyterLab :8888. No login data in the image.

**Accounts (volume `/root/ai-accounts`).** `.Claude/yolo1..5` (CLAUDE_CONFIG_DIR), `.Codex/cyolo1..5` (CODEX_HOME), `.Claude/shared` and `.Codex/shared` each with `skills/` and `mcp/`.

**Commands** `yolo1..5`, `cyolo1..5` are symlinks in `/usr/local/bin` to wrappers in `/usr/local/lib/ai-accounts`. They work in JupyterLab Terminal and `docker exec`. They pass `"$@"`, set `IS_SANDBOX=1`, and print an error if the account folder is missing. `$HOME` is never changed.

**Where each CLI reads skill / MCP**
- Claude: `$CLAUDE_CONFIG_DIR/skills` is a symlink to `.Claude/shared/skills`; MCP via `--mcp-config=<file>` for each `.Claude/shared/mcp/*.json` (check with `/mcp`; `.claude.json` is never linked).
- Codex: per-skill symlinks in `$CODEX_HOME/skills/` (refreshed by the wrapper at each launch; `.system` stays real); MCP via `-c mcp_servers.<name>={...}` from `.Codex/shared/mcp/*.inline` (check with `cyoloN mcp list`). Each account uses `cli_auth_credentials_store = "file"`; no credential is in `shared`.

**Installer.** `ai-accounts-install --system` at build (wrappers/links only); `ai-accounts-install` at every container start (creates only missing files, never overwrites).

**Limitations.** Anything needing login is SKIP. `claude mcp list` does not show the `--mcp-config` server. Tested only with the pinned versions. The Chromium layers make the image large. Data in `/root/ai-accounts` survives only if a volume is mounted.

## login-guide
1. Run the container with a volume: `docker run -d --name multi-account --privileged -p 8888:8888 -v ai-accounts:/root/ai-accounts multi-account:1.0`.
2. Open http://localhost:8888/lab -> New Terminal.
3. Claude: `yolo1`, then `/login` (repeat yolo2..5). Codex: `cyolo1 login` or `cyolo1 login --device-auth`, check with `cyolo1 login status` (repeat cyolo2..5).
4. Do not copy credential files between accounts or into `shared`.

## checklist
| Item | Evidence | Result |
|---|---|---|
| 10 `--version` commands | claude 2.1.322, codex-cli 0.167.1 for all five of each | PASS |
| Config roots are separate | 10 account folders, plus 2 `shared` | PASS |
| shared-check skill: one file in shared | `readlink -f` of all 5 Claude and 5 Codex accounts resolves to a single file in each `shared` | PASS |
| `cyolo1 mcp list` shows playwright | playwright enabled | PASS |
| Playwright MCP over stdio: open https://example.com + screenshot | navigate OK, screenshot OK (83 KB PNG) | PASS |
| Installer round 2 keeps existing data | marker, extra config line, skill checksum unchanged | PASS |
| Delete container, recreate with same volume | marker, config line, skill checksum still present | PASS |
| JupyterLab `/lab` returns 200 | 200 (also after recreate) | PASS |
| Docker-in-Docker | `docker info` OK inside container | PASS |
| Logged-in items (skill reply, `/mcp` in Claude, concurrent sessions) | not logged in (`loggedIn: false`) | SKIP |
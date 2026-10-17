# Roby Barber — Build & Test Commands

Repo layout: `apps-desktop/` (Electron main + React renderer + SQLite), `demo/` (old browser prototype, not for production), `tools/license-generator/` (owner-only key tooling), `docs/` (user manual + `DEVELOPER_NOTES.md` — full English tech notes). Docs: `PROJECT_PLAN.md`, `DESIGN_SYSTEM_AND_MAPPING.md`, `number_of_hours_by_phase.md`.

## Local build

```powershell
cd apps-desktop
npm install
npm run build        # renderer + main process + smoke tests (single gate)
```

Renderer lives in `apps-desktop/src-renderer`, main process in `apps-desktop/src-main`.

## First-time local setup gotcha (Windows + restricted npm)

This machine's npm blocks native install scripts. Before `npm install` inside `apps-desktop`, approve the native deps once:

```powershell
cd apps-desktop
npm install
npm install-scripts approve better-sqlite3 electron
npm rebuild better-sqlite3
npm run rebuild:native        # better-sqlite3 -> Electron ABI (REQUIRED, see below)
```

## The ABI rule (important)

`better-sqlite3` must match **Electron's** ABI, not Node's — otherwise every DB call in the packaged app fails. So:

* Native module stays built for Electron (`npm run rebuild:native` after any `npm install`).
* Tests/seed/inspect run through the Electron binary, not plain Node: `npm run smoke`, `npm run seed`, `npm run inspect-db` (each self-heals the ABI by running `rebuild:native` first).
* The build gate (`npm run build`) runs renderer → main → smoke. `electron-builder` re-rebuilds the native module for packaging automatically.

## Tests

```powershell
cd apps-desktop
npm run smoke      # queue + money + payroll/stock + license + whatsapp + backup tests against real SQLite (no GUI)
npm run seed       # one-time data migration check, prints table counts
```

Current status: `smoke` = 220/220 PASS (gate: queue 13, money 45, payroll/stock 62, license 42, whatsapp 32, backup 26).

Headless UI self-check (verifies the renderer actually boots with live DB data — or shows the license lock screen):

```powershell
cd apps-desktop
$env:ROBY_UI_CHECK="1"; npx electron .   # exit 0 + "ui check" line in %APPDATA%\roby-barber-desktop\logs\app.log
```

## Run the app

```powershell
cd apps-desktop
npm run dev        # builds main process, opens Electron window
```

Production renderer path: `apps-desktop/src-renderer/dist/index.html`

## Release

Push a `v*` tag — GitHub Actions builds and attaches the Windows `.exe`:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

Workflow: `.github/workflows/release-windows.yml`. It runs renderer build → main build → **smoke gate** (phases 2–7) → seed check → NSIS installer.

NOTE: pushing changes under `.github/workflows/` requires a token with the **workflow** scope. The `github_pat_...` deploy token lacks it — use the `gh` CLI token instead (`gh auth token`, which carries `repo`+`workflow`).

## Windows-only

NSIS installer targets Windows 10/11 x64. Unsigned builds show a SmartScreen warning on first install (documented, expected until a code-signing cert is purchased).

## Money rules

All money math lives in pure functions (`subtotal - discount + tip`). UI never computes totals. DB is SQLite in `%APPDATA%\roby-barber-desktop\roby.db` (WAL mode), backups every 10 minutes.

## Licensing (Phase 5)

Offline, MID-bound RSA-2048 keys. Fresh PC = 7-day trial → lock screen (MID + wa.me button). Owner tooling in `tools/license-generator/` (`keygen.cjs` once, `sign.cjs --mid MID-XXXX-XXXX` per customer, plus double-click `.bat` helpers and an Arabic README for the owner). The private key lives OUTSIDE the repo (`%USERPROFILE%\RobyBarber-License-Keys\private.pem`) — never commit `*.pem`/`*.key`. Only the public key ships, embedded in `src-main/packages/license/publicKey.ts`. No network involved; disputed machines are blocked by adding their MID to `BLOCKED_MIDS` (ship an update). Clock rollback (last_seen in the future >2h) = sticky tamper lock; a valid owner key clears it.

## WhatsApp (Phase 6)

`wa.me` click-to-chat only — no API, no network keys. Templates are DB rows (`templates` table, 4 kinds: ticket/receipt/reminder/campaign) editable in Settings; `{placeholders}` are filled in main (`packages/whatsapp/`), unknown ones stay visible. All sends go through `wa-share` IPC (composes + logs to the activity feed); the renderer only opens the returned URL (main's `setWindowOpenHandler` sends http(s) links to the system browser). Customer phones are normalized to `20…` international format; invalid numbers throw Arabic errors.

## Backup (Phase 7)

`src-main/packages/backup.ts` + timers in `main.ts` + handlers in `ipc/index.ts`. Snapshots use SQLite `VACUUM INTO` (transactional, safe while the app runs) then gzip → `%APPDATA%\roby-barber-desktop\backups\roby-YYYYMMDD-HHmmss.db.gz` (gzip, not zip — zero extra deps). Auto-run: every 10 min, once ~90s after boot, and on `before-quit`. Retention: keeps newest + hourly for 24h + first-of-day for 30 days, hard cap 2 GB. Restore validates the archive (gzip magic → SQLite header → `integrity_check` → core tables), makes a safety snapshot, closes/swaps the DB file and `app.relaunch()`s. Export/import go through native save/open dialogs (USB stick workflow); Settings page has the backup card. Windows note: close a better-sqlite3 handle *before* unlinking its file (EBUSY) and pass `Date` objects to `fs.utimesSync` (raw ms numbers → EINVAL under Electron here).

## Handover assets (Phase 7)

* `apps-desktop/build/icon.ico` + `icon.png` — brand mark (dark navy + gold ring + serif "R"). Regenerate: `npx electron scripts/make-icon.cjs` (from `apps-desktop`). Wired into `electron-builder` (`win.icon`, NSIS installer/uninstaller icons) and the dev window icon; packaged exe gets it automatically.
* Splash screen: inline HTML in `main.ts`, shown until the main window's first paint (skipped under `ROBY_UI_CHECK`).
* `docs/manual.html` → `docs/RobyBarber-User-Manual-AR.pdf` — full Arabic user manual. Regenerate after editing the HTML: `npx electron scripts/make-manual.cjs` (from `apps-desktop`).
* `demo/` — the original browser prototype for reference/demos only (localStorage, no DB). Launcher: `demo/تشغيل_الصالون.bat`.
* License generator handover kit: `tools/license-generator/` with Arabic README + `1-Generate-Keys.bat` / `2-Sign-License.bat` (owner needs Node.js LTS installed once).

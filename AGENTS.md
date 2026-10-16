# Roby Barber — Build & Test Commands

Repo layout: `apps-desktop/` (Electron main + React renderer + SQLite). Docs: `PROJECT_PLAN.md`, `DESIGN_SYSTEM_AND_MAPPING.md`, `number_of_hours_by_phase.md`.

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
npm run smoke      # queue + money + payroll/stock + license + whatsapp tests against real SQLite (no GUI)
npm run seed       # one-time data migration check, prints table counts
```

Current status: `smoke` = 194/194 PASS (gate: queue 13, money 45, payroll/stock 62, license 42, whatsapp 32).

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

Workflow: `.github/workflows/release-windows.yml`. It runs renderer build → main build → **smoke gate** → seed check → NSIS installer.

NOTE: the in-repo workflow file is stale (points at the old `apps-prototype` path). The updated version is ready locally but was blocked by the PAT missing the **Workflows** scope — push it before the first release tag (see "The ABI rule": smoke/seed now self-rebuild the native module, so CI stays correct either way).

## Windows-only

NSIS installer targets Windows 10/11 x64. Unsigned builds show a SmartScreen warning on first install (documented, expected until a code-signing cert is purchased).

## Money rules

All money math lives in pure functions (`subtotal - discount + tip`). UI never computes totals. DB is SQLite in `%APPDATA%\roby-barber-desktop\roby.db` (WAL mode), backups every 10 minutes.

## Licensing (Phase 5)

Offline, MID-bound RSA-2048 keys. Fresh PC = 7-day trial → lock screen (MID + wa.me button). Owner tooling in `tools/license-gen/` (`keygen.cjs` once, `sign.cjs --mid MID-XXXX-XXXX` per customer). The private key lives OUTSIDE the repo (`%USERPROFILE%\RobyBarber-License-Keys\private.pem`) — never commit `*.pem`/`*.key`. Only the public key ships, embedded in `src-main/packages/license/publicKey.ts`. No network involved; disputed machines are blocked by adding their MID to `BLOCKED_MIDS` (ship an update). Clock rollback (last_seen in the future >2h) = sticky tamper lock; a valid owner key clears it.

## WhatsApp (Phase 6)

`wa.me` click-to-chat only — no API, no network keys. Templates are DB rows (`templates` table, 4 kinds: ticket/receipt/reminder/campaign) editable in Settings; `{placeholders}` are filled in main (`packages/whatsapp/`), unknown ones stay visible. All sends go through `wa-share` IPC (composes + logs to the activity feed); the renderer only opens the returned URL (main's `setWindowOpenHandler` sends http(s) links to the system browser). Customer phones are normalized to `20…` international format; invalid numbers throw Arabic errors.

# Roby Barber — Developer / Technical Notes

English technical documentation for the developers maintaining this project.
User-facing documentation is Arabic: `docs/manual.html` → `docs/RobyBarber-User-Manual-AR.pdf`.
Planning/billing docs: `PROJECT_PLAN.md`, `number_of_hours_by_phase.md`, `DESIGN_SYSTEM_AND_MAPPING.md`.

---

## 1. What the product is

A Windows-only Electron desktop app that replaces a paper-based barber shop workflow:
queue/chair tracking, POS checkout, cashbox + Z-report, staff payroll, inventory,
customers/loyalty, WhatsApp click-to-chat templates, and automatic SQLite backups.
Fully offline. Licensed with offline, machine-bound RSA keys (7-day trial → lock screen).

All 7 planned phases are delivered (queue, money, payroll/stock, licensing, WhatsApp,
backups, handover polish). Current version: `0.1.0`.

## 2. Stack & versions

| Layer | Choice |
|---|---|
| Shell | Electron `^33.2.1` (native ABI target for rebuilds: `33.4.11`) |
| Main process | TypeScript → `apps-desktop/dist-main` (tsc, CommonJS) |
| Renderer | React `19.2` + Vite `8.3` + TypeScript `6.0` (in `src-renderer`), lint via `oxlint` |
| DB | SQLite via `better-sqlite3 ^11.10` + `drizzle-orm ^0.36` (WAL mode) |
| Packaging | `electron-builder` → NSIS installer (Windows x64) |
| Tests | Custom smoke runner (`scripts/run-tests.cjs` + `smoke-phase*.ts`), runs on real SQLite through the Electron binary |

No runtime network access anywhere. The only "online" feature is opening `wa.me`
URLs in the system browser.

## 3. Repo layout

```
apps-desktop/
  src-main/            Electron main process (TypeScript)
    main.ts            Boot: DB → migrations → IPC → license → timers → window + splash
    preload.ts         contextBridge allowlist (channel must be listed here!)
    ipc/index.ts       All ipcMain handlers (54 channels)
    logger.ts          JSON lines → %APPDATA%\roby-barber-desktop\logs\app.log
    db/                client.ts (singleton + migrations), schema.ts, tables.ts (DDL), seed.ts
    packages/          Pure/domain logic: queue, money, payroll, stock, license/, whatsapp/, backup.ts, reports.ts
  src-renderer/        React app (Vite). src/App.tsx = shell + overview/chairs/customers pages;
                       src/pages/ = pos, cashbox, staff, stock, settings; src/components/ = LockScreen,
                       WhatsAppModal, Receipt80, PaySlip, Toast; useApi.ts = electron bridge or in-memory preview
  scripts/             run-tests.cjs, smoke-phase2..7.ts, run-seed.cjs, inspect-db.cjs,
                       make-icon.cjs, make-manual.cjs
  build/               icon.ico / icon.png (used by electron-builder + dev window)
demo/                  Original browser prototype (localStorage) — reference only, never ship
tools/license-generator/  Owner-only keygen + signer + .bat helpers + Arabic README
docs/                  manual.html → RobyBarber-User-Manual-AR.pdf
.github/workflows/     release-windows.yml (tag → build → smoke gate → NSIS)
```

## 4. Build, test, run

```powershell
cd apps-desktop
npm install                  # once per machine (see ABI rule below)
npm run build                # THE gate: renderer build → main build → smoke (220 checks)
npm run dev                  # tsc main + electron . (dev window)
npm run smoke                # smoke only (self-heals native ABI first)
npm run seed                 # seed/migration check, prints table counts
```

**The ABI rule (critical):** `better-sqlite3` must be compiled for Electron's ABI, not
Node's. `npm run rebuild:native` does it. The `smoke`/`seed`/`inspect-db` scripts run it
automatically first; after any `npm install` run it manually. Tests and tooling execute
through the Electron binary with `ELECTRON_RUN_AS_NODE=1` (plain `node` cannot load the
native module).

**Headless UI self-check** (renderer boots with live DB data, or shows the lock screen):

```powershell
$env:ROBY_UI_CHECK="1"; npx electron .
# exit 0 + 'ui check' line in %APPDATA%\roby-barber-desktop\logs\app.log
# probe = {shell, nav, ready, lock}; OK if (shell && nav>0 && ready) || lock
```

Environment knobs: `ROBY_UI_CHECK` (headless check), `VITE_DEV_URL` (load renderer from
vite dev server in dev), `ROBY_LOG_DIR` (log directory override, used by CI).

## 5. Architecture

### Main process

Boot order in `main.ts`: `getDb()` (singleton, WAL) → `runMigrations()` → `setupIpc()` →
`licenseState()` → license revalidation every 24h (pushes `roby:license-changed` to the
renderer when state changes) → backup timers (every 10 min, once ~90s after boot,
`before-quit`) → splash + main window. Single-instance lock is enforced.

### IPC contract

* Channel naming: handlers are registered per-entry in `ipc/index.ts` and exposed as
  `roby:<channel>`; the **preload allowlist** (`preload.ts`) must contain every channel —
  an unlisted channel throws in the renderer (`api.<fn> is not a function`-class errors).
* Preload also exposes `onLicenseChanged(cb)` and a static `{version, phase}` descriptor.
* All handlers run through a wrapper that logs + rethrows Arabic error messages.
* Domain logic lives in `src-main/packages/*` as pure functions where possible — the IPC
  layer is only a thin adapter over the DB handle.

### Renderer

* `useApi.ts` returns either the **electron bridge** (`window.roby`) or an **in-memory
  preview fallback** when running in a plain browser (useful for UI work without Electron;
  mutations don't persist).
* `App.tsx` owns nav + cross-page state (queue, license, toast); pages are dumb-ish views.
* Money is always formatted via `format.ts` (`egp`), never computed in the renderer.
* UI must keep 44px+ touch targets for primary controls (DESIGN doc §1).

### Data layer

* Singleton in `db/client.ts`. `runMigrations()` executes `TABLES` DDL (`tables.ts`,
  all `CREATE ... IF NOT EXISTS`), then applies `PRAGMA table_info`-guarded column
  migrations (e.g. `expenses.at`, `licenses.tampered_at`) and backfills.
* `rawClient()` returns the raw better-sqlite3 handle (backup uses `exec`, VACUUM INTO).
  `closeDb()` closes the singleton so the file can be swapped during restore.
* 16 tables: `salon`, `staff`, `services`, `chairs`, `appointments`, `inventory`,
  `staff_advances`, `staff_payments`, `customers`, `expenses`, `sales`, `licenses`,
  `templates`, `offers`, `activity_log`, `app_settings` (key-value runtime settings,
  e.g. `contact_whatsapp`).
* Seed: 5 staff, ~7 inventory items, services, 4 WhatsApp templates
  (`tpl_ticket/tpl_receipt/tpl_reminder/tpl_campaign`), salon row, no sales.
  ID conventions: receipts `RB-1001+`, expenses `EXP-101+`, advances `ADV-101+`,
  payments `pay_<Date.now()>`.

## 6. Money rules (never break these)

* All money math lives in pure functions in `src-main/packages/` — UI never computes totals.
* Totals are INTEGER EGP. Sale total = `subtotal − discount + tip`.
* `sales` and `staff_payments` are **append-only**; no edits, no deletes.
* Payroll per staff: `net = salary + round(revenue × commission%) + tips − advances`;
  `payStaff` recomputes `net` inside main and guards double-payment per period.
* Loyalty: 1 point / 10 EGP, computed on checkout only; 100 points ⇒ VIP.
* Electronic payments (InstaPay/Vodafone Cash) require a manual reference number —
  payment insert must fail without it (enforced in main, covered by smoke P3-2).

## 7. Licensing

* Key format: `RB1-<base64url(payloadJson)>.<base64url(RSA-SHA256 signature)>`.
  Payload: `{v:1, mid, kind:'lifetime', issued}` — **field order is part of the signed
  bytes**; keep `key.ts` and `tools/license-generator/sign.cjs` in lockstep.
* MID: `sha256(MachineGuid + "|" + hostname.lower + "|roby-barber")` → first 8 hex chars →
  `MID-XXXX-XXXX` (`machineId.ts`, reads MachineGuid from registry).
* State machine (`packages/license/index.ts`): no row → start 7-day trial;
  trial → `expired` at day 7; valid key → `active`; failures → `locked` with reasons:
  `trial-expired`, `key-invalid`, `blocked`, `transferred` (DB rows bound to another MID),
  `clock-rollback` (`last_seen` > now+2h; sticky until a valid owner key).
* Key storage: `licenses.key` holds `enc:<safeStorage cyphertext>` or `plain:<key>`
  fallback. `tampered_at` marks sticky tamper locks; activation clears it.
* Revocation is offline: add MID to `BLOCKED_MIDS` and ship an update.
* Owner tooling: `tools/license-generator/` (`keygen.cjs` once; `sign.cjs --mid ...`
  per customer; logs to `issued_keys.csv`; `.bat` double-click helpers; Arabic README).
* **The private key never enters the repo** (`%USERPROFILE%\RobyBarber-License-Keys\`),
  only the public key is embedded (`packages/license/publicKey.ts`).
* Vendor contact on the lock screen (the number the MID is sent to) is stored in
  `app_settings.contact_whatsapp`, editable anytime in **Settings → التفعيل والدعم**
  (empty = unset; the lock screen then hides the wa.me button and shows copy-MID
  guidance instead). Handover: set it once from Settings or pre-seed the DB.

## 8. WhatsApp (Phase 6)

`packages/whatsapp/` — `compose.ts` (phone normalization to `20…` intl, `{placeholder}`
filling, wa.me link builder) and `index.ts` (`waShare`: loads template from DB, injects
`{salon}`, logs to activity feed, returns URL). The renderer only opens the returned URL;
`main.ts`'s `setWindowOpenHandler` sends all `http(s)` links to the system browser.
Templates are DB rows, editable in Settings. Unknown placeholders stay visible.

## 9. Backup & restore (Phase 7)

* `packages/backup.ts`: snapshot = SQLite `VACUUM INTO` (transactional, works while the
  app is running) → gzip → `%APPDATA%\roby-barber-desktop\backups\roby-YYYYMMDD-HHmmss.db.gz`
  (same-second collisions get a `-1` suffix). Gzip chosen over zip: zero extra deps.
* Retention (`pruneBackups`): always keep newest; keep hourly for 24h (144); keep
  first-of-day for 30 days; hard cap 2 GB (oldest dropped first).
* Validation (`validateBackup`): gzip magic → `SQLite format 3` header → `integrity_check`
  → required core tables present. **Close the probe DB before unlinking** (Windows EBUSY).
* Restore (`ipc/index.ts restoreFrom`): validate → safety snapshot → `closeDb()` → copy
  file over `roby.db` (+ remove `-wal`/`-shm`) → `app.relaunch()` + exit.
* Timers in `main.ts` (10 min / boot+90s / before-quit) and the Settings backup card are
  the whole surface; `reports.overview(db, backupsDir)` surfaces the last backup on the
  dashboard.

## 10. Handover assets

* **Icon:** `apps-desktop/build/icon.ico` (multi-size 256→16, PNG entries) + `icon.png`.
  Generated by `scripts/make-icon.cjs` (renders an HTML mark via `capturePage`, then
  assembles the ICO manually). Wired: `win.icon`, NSIS installer/uninstaller icons, dev
  window icon. Regenerate: `npx electron scripts/make-icon.cjs` from `apps-desktop`.
* **Splash:** inline HTML in `main.ts`, closes on the main window's `ready-to-show`
  (8s safety timer), skipped under `ROBY_UI_CHECK`.
* **Manual:** edit `docs/manual.html`, regenerate `npx electron scripts/make-manual.cjs`
  (Electron `printToPDF`, A4, Arabic footer with page numbers).
* **Demo:** `demo/` = old prototype; launcher `demo/تشغيل_الصالون.bat` opens
  `index.html` directly (localStorage only — never use for real data).
* **License kit:** `tools/license-generator/` (see §7).

## 11. Release process

* Push a `v*` tag → `.github/workflows/release-windows.yml` on `windows-latest`:
  renderer build → desktop deps + `rebuild:native` → main build → **`npm run smoke`
  gate (220 checks)** → seed check → `electron-builder --win nsis --x64` → artifact
  `RobyBarber-Setup-<version>.exe`.
* Pushing workflow files requires the token to carry the **workflow** scope. The
  `github_pat_...` deploy token does NOT have it; the `gh` CLI token does:
  `$tok = gh auth token; git -c credential.helper= push "https://x-access-token:$tok@github.com/...git" main`.
* Unsigned installer → SmartScreen warning on first install (expected until a code
  signing certificate is purchased; documented in the manual).

## 12. Windows dev gotchas (learned the hard way)

* `npx` under PowerShell is blocked (execution policy) — always `npx.cmd`.
* Native module ABI: see §4. Never run DB code with plain `node`.
* `fs.utimesSync` rejects raw ms numbers under this Electron (EINVAL) — pass `Date` objects.
* Unlinking an open SQLite file → EBUSY: always `close`/`closeDb()` first.
* `electron-builder` local packaging needs symlink privileges to extract its winCodeSign
  cache (enable Windows Developer Mode once, or rely on CI).
* PowerShell 5.1 `Add-Content` writes ANSI and corrupts UTF-8 files with Arabic/em-dashes —
  use proper UTF-8 writes. Inline `npx.cmd electron -e` scripts: PowerShell interpolates
  `$` inside double-quoted JS — use script files in `%TEMP%` instead.
* DB wipe for testing: `Get-ChildItem "$env:APPDATA\roby-barber-desktop\roby.db*" | Remove-Item -Force`
  (a bare `Remove-Item roby.db*` path is a no-op).

## 13. Test inventory (smoke = 226 checks)

| File | Checks | Covers |
|---|---|---|
| `smoke-phase2.ts` | 13 | queue state machine (waiting → in_chair → done/cancelled) |
| `smoke-phase3.ts` | 45 | money math, checkout, ref# guard, expenses, Z-report |
| `smoke-phase4.ts` | 62 | payroll (advances, net recompute, double-pay guard), stock restock/soft-delete |
| `smoke-phase5.ts` | 48 | license encode/verify (ephemeral test keypair), trial expiry, tamper/rollback/transfer locks, editable vendor contact |
| `smoke-phase6.ts` | 32 | phone normalization, template filling, waShare logging, Arabic errors |
| `smoke-phase7.ts` | 26 | snapshot content/naming, retention pruning, validation guards, restore swap, overview wiring |

Smoke runs against real SQLite (temp dirs), never the user DB.

## 14. Security notes

* Private key: outside the repo, never committed (`*.pem`/`*.key` gitignored).
* DevTools disabled + app menu removed in packaged builds; contextIsolation on;
  renderer talks only through the preload allowlist.
* External links are always handed to the system browser; nothing loads remotely in-app.
* `safeStorage` (OS-backed) is preferred for the stored license key; plain fallback is
  documented in the threat model (PROJECT_PLAN §8).

## 15. Known limitations / follow-ups

* Code signing certificate still pending (SmartScreen warning until then).
* `demo/` is reference-only; do not port fixes backwards into it.

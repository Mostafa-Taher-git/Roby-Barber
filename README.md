# Roby Barber — روبي باربر

Arabic-first Windows desktop app that runs a barber shop end-to-end: queue & chairs,
POS checkout with thermal receipts, cashbox + daily Z-report, staff payroll, inventory,
customers & loyalty points, WhatsApp templates, and automatic local backups.
Fully **offline** — no server, no cloud, no subscriptions. Licensed per machine with
offline RSA keys (7-day trial → activation key).

Existing ready-to-use Arabic docs: [user manual (PDF)](docs/RobyBarber-User-Manual-AR.pdf) ·
[developer notes](docs/DEVELOPER_NOTES.md)

---

## Highlights

* **Queue & chairs** — waiting → in chair → awaiting payment, live counts in the nav.
* **POS** — services grid, discount, tip, cash / InstaPay / Vodafone Cash (manual
  reference number), 80 mm thermal receipt printout, WhatsApp receipt send.
* **Cashbox** — expenses with auto numbering (`EXP-101…`), per-method revenue, Z-report.
* **Staff** — salary + revenue commission + tips − advances, double-payment guard,
  printable payslip.
* **Inventory** — stock levels, min-qty alerts, restock with purchase cost, soft delete.
* **Customers** — visit history, totals, loyalty points (1 pt / 10 EGP, 100 pts → VIP).
* **WhatsApp** — DB-stored templates (ticket / receipt / reminder / campaign) with
  `{placeholders}`, sent via `wa.me` in the system browser, every click logged.
* **Backups** — automatic every 10 min + on quit (`VACUUM INTO` → gzip), hourly/daily
  retention (2 GB cap), one-click restore with safety snapshot, USB export/import.
* **Licensing** — offline, MID-bound RSA-2048 keys, safeStorage-encrypted at rest,
  clock-rollback & transfer detection, vendor WhatsApp contact editable in Settings.

## Tech stack

Electron 33 · React 19 · TypeScript · Vite · Drizzle ORM · better-sqlite3 (WAL) ·
electron-builder (NSIS, Windows x64) · custom Electron-run smoke suite (226 checks).

## Getting started (development)

```powershell
cd apps-desktop
npm install
npm install-scripts approve better-sqlite3 electron   # first time on this machine only
npm rebuild better-sqlite3
npm run rebuild:native     # REQUIRED: compiles better-sqlite3 for the Electron ABI
npm run dev                # builds main process, opens the app window
```

`better-sqlite3` must match Electron's ABI, not Node's — after any `npm install` run
`npm run rebuild:native` (the `smoke`/`seed` scripts do it automatically).

## Tests & gates

```powershell
npm run build     # THE gate: renderer build → main build → smoke (226 checks)
npm run smoke     # queue, money, payroll/stock, licensing, WhatsApp, backup — real SQLite
npm run seed      # seed/migration check, prints table counts
```

Headless UI self-check (proves the renderer boots with live data, or shows the lock screen):

```powershell
$env:ROBY_UI_CHECK="1"; npx electron .    # exit 0 + "ui check" in %APPDATA%\roby-barber-desktop\logs\app.log
```

## Packaging & release

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions (`.github/workflows/release-windows.yml`) runs renderer → main → smoke
gate → seed check → NSIS installer and attaches `RobyBarber-Setup-<version>.exe`.
The installer is unsigned for now (SmartScreen warning on first install is expected).
Pushing changes under `.github/workflows/` requires a token with the `workflow` scope.

## Repository layout

```
apps-desktop/            Electron app (main process + renderer + SQLite + smoke tests)
  src-main/              main process: db/, ipc/, packages/ (queue, money, license, backup…)
  src-renderer/          React UI (Vite): pages, components, electron bridge / browser preview
  scripts/               smoke-phase2..7, run-tests, seed, inspect-db, make-icon, make-manual
  build/                 app icon (icon.ico / icon.png)
demo/                    original browser prototype (reference only — never ship)
tools/license-generator/ owner-only keygen + signer + .bat helpers + Arabic README
docs/                    Arabic user manual (HTML + PDF) + English developer notes
.github/workflows/       release pipeline
```

## Licensing (vendor flow)

1. Fresh PC: 7-day full trial. The app shows a trial chip; after expiry a lock screen
   shows the machine id `MID-XXXX-XXXX` and a WhatsApp button.
2. The shop sends the MID to the vendor (number editable anytime in
   **Settings → التفعيل والدعم**; if unset, the MID can be copied and sent manually).
3. The vendor issues a key with `tools/license-generator/` (`1-Generate-Keys.bat` once,
   then `2-Sign-License.bat`) and sends back the `RB1-…` key.
4. The shop pastes the key once → lifetime activation on that PC only. No internet used.

The private key never lives in this repo; only the public key is embedded in the app.

## Documentation

| File | Audience |
|---|---|
| [docs/RobyBarber-User-Manual-AR.pdf](docs/RobyBarber-User-Manual-AR.pdf) | shop owner (Arabic, 15 sections) |
| [docs/DEVELOPER_NOTES.md](docs/DEVELOPER_NOTES.md) | developers (English, full tech notes) |
| [tools/license-generator/README.md](tools/license-generator/README.md) | vendor (Arabic key issuance guide) |
| [PROJECT_PLAN.md](PROJECT_PLAN.md) · [DESIGN_SYSTEM_AND_MAPPING.md](DESIGN_SYSTEM_AND_MAPPING.md) | planning + design system |

## Status

All 7 planned phases delivered (queue, money, payroll & stock, licensing, WhatsApp,
backups, handover polish). **226/226** smoke checks passing against real SQLite.

---

## بالعربي — نظرة سريعة

برنامج ويندوز لإدارة صالون الحلاقة بالكامل: الكراسي والحجوزات، الكاشير والإيصالات،
الخزينة والتقرير اليومي، المرتبات، المخزن، الزبائن ونقاط الولاء، رسائل واتساب جاهزة،
ونسخ احتياطي تلقائي. يعمل **بدون إنترنت** وبياناته محفوظة على جهازك فقط.
أول 7 أيام تجربة كاملة، وبعدها يتم التفعيل بمفتاح يُطلب عبر الواتساب من شاشة القفل.

* دليل الاستخدام الكامل بالعربي: [`docs/RobyBarber-User-Manual-AR.pdf`](docs/RobyBarber-User-Manual-AR.pdf)
* رقم واتساب التفعيل يمكن ضبطه/تغييره من: **الإعدادات ← التفعيل والدعم (واتساب)**

# Design System + Full System Mapping — Roby Barber Rebuild

> Single source of truth for the React rebuild. If something breaks or looks wrong, find it here first: every screen, component, table, flow, and old-code mapping has an owner module and a debug pointer.
> Locked scope: Electron + React + SQLite, single user, Arabic RTL dark+light, 80mm thermal, offline signed lifetime key + 7-day trial, instant save + 10-min backup, wa.me WhatsApp, NO cameras, editable everything incl. logo. See `PROJECT_PLAN.md` + `number_of_hours_by_phase.md`.

---
## 0. How to Use This Doc When Something Goes Wrong

1. Find the symptom in §9 Troubleshooting Map (e.g. "POS total wrong").
2. It points to exactly one layer + module + DB table (e.g. `packages/pos/totals.ts` + `sales`).
3. Fix there only — do not patch the UI to hide a data bug.
4. Add the case to the phase acceptance checklist (§8) so it never regresses.

Rule: UI never computes money. All money math lives in `packages/*` pure functions with unit tests. UI only displays.

---
## 1. Design Principles (Non-Tech Barber)

1. One primary action per screen (`حاسب واطبع`, `إجلاس على الكرسي`, `حفظ`).
2. Big targets: min 44px height, 18px+ base font, full-Arabic labels with tiny English hints.
3. Destructive = confirm + soft-delete (trash 30 days), never hard-delete.
4. Empty states guide, never blank tables ("لا يوجد زبائن — أضف زبون").
5. Offline-first: fonts/icons bundled, no CDN at runtime. Old Unsplash URLs replaced by local uploads or generated SVG fallback.
6. Print = what you see: 80mm receipt preview is pixel-exact to paper.

## 2. Design Tokens (Dark + Light)

CSS variables live in `packages/ui/tokens.css`. Old `styles.css:7-47` values become tokens below. Light mode flips surfaces/text only — gold stays.

| Token | Dark (default) | Light | Usage |
|---|---|---|---|
| `--bg-app` | `#0f141f` | `#f4f1ea` | app background |
| `--bg-card` | `#1c2436` | `#ffffff` | cards, cart, dialogs |
| `--bg-input` | `#232c40` | `#eef0f4` | inputs, search |
| `--gold` | `#f5b842` | `#b97a0f` | primary, prices, active |
| `--ok` | `#10b981` | `#047857` | free chair, income |
| `--danger` | `#ef4444` | `#b91c1c` | critical stock, delete |
| `--info` | `#38bdf8` | `#0369a1` | links, staff on duty |
| `--text` | `#f8fafc` | `#131824` | main text |
| `--muted` | `#94a3b8` | `#5b6472` | subtitles |
| radius | `6/10/14/20px` | same | sm/md/lg/xl |
| font | `Cairo` (AR) + `Outfit` (EN digits) | same | bundled offline |

Type scale: title 24/800, section 18/700, body 16/400, small 13/muted, numbers `Outfit` tabular. Spacing scale 4/8/12/16/24. Shadows: card `0 4px 20px rgba(0,0,0,.35)`, gold glow only on primary CTA.

## 3. Component Catalog (Reusable — Build Once in Phase 0/1)

| Component | Props / States | Old Reference | Notes |
|---|---|---|---|
| `BtnPrimary / BtnSecondary / BtnDanger` | `label, icon, loading, disabled` | `.btn-primary`, `.checkout-submit-btn` | 44px+, gold gradient primary only |
| `TextInput, NumberInput, SearchInput, Select, TextArea` | `value, error, hint` | `.form-group input` | Number inputs use Arabic-Indic-safe parsing, LTR for phone |
| `DataTable` | `columns, rows, emptyState, rowAction` | `.styled-table` | sticky header, zebra-hover, empty illustration |
| `BadgeStatus` | `waiting \| in_chair \| done \| free \| busy \| critical \| vip` | `.badge-status`, `.chair-badge` | color map fixed, never ad-hoc |
| `Modal` | `title, size, onClose` | `.modal-overlay` ×6 | sizes: sm (confirm), md (forms), lg (receipt/payslip) |
| `Toast` | `success \| error \| info` | `#toastContainer` | 3.5s, queue max 3 |
| `StatGauge` | `label, value, tone` | `.gauge-box` ×4 | sales, bookings, stock, staff |
| `ChairCard` | `num, barber, status, customer, remMins` | `.chair-card` | busy=gold border, free=green |
| `ServiceCard` | `title, price, duration, onAdd` | `.pos-card-item` | POS + booking share style |
| `CartRow` | `title, qty, lineTotal, onRemove` | `.cart-row-item` | qty stepper lives here |
| `PayMethodPicker` | `cash \| instapay \| vodafone \| visa + ref#` | `.pay-options-grid` | ref# required unless cash |
| `Receipt80` | order data only | `#receiptPaper` | 72mm printable width, QR placeholder |
| `PaySlip` | staff + computed pay | `#paySlipContent` | formula in §6, never in component |
| `LogoUpload` | `preview, upload, reset` | NEW (Settings) | png/jpg ≤2MB, stored `userdata/logos/`, fallback to bundled default |
| `BackupPill` | `lastBackupAt, onRestore` | NEW | "آخر نسخة 10:20" + restore picker |
| `LockScreen` | `machineId, trialLeft, keyInput` | NEW (Phase 5) | shows MID + WhatsApp-send + key field |

Icons: bundled offline set (no Font-Awesome CDN). Keep old icon meanings (chair, receipt, cash-register, users, wallet, gear).

## 4. Screen Map (Single-User Shell — No Admin/Customer Split)

Old dual mode (`#adminInterface` / `#customerInterface`) is DELETED. One shell: `TopBar + SideNav + Page`. Old customer 4-step wizard becomes in-shop `New Booking` flow (staff creates booking for walk-in), not a separate app.

| # | Screen (Route) | Old `tab-*` / Modal | Components | DB Tables | Phase |
|---|---|---|---|---|---|
| S0 | Lock / Trial (`/lock`) | NEW | `LockScreen` | `licenses` | 5 |
| S1 | Overview (`/`) | `tab-overview` | `StatGauge`×4, staff table, activity feed, inventory bars, offers | `sales, appointments, inventory, staff, activity_log` | 2 |
| S2 | Chairs & Queue (`/chairs`) | `tab-appointments` | `ChairCard`×5, bookings table + filters, waiting queue | `chairs, appointments` | 2 |
| S3 | POS (`/pos`) | `tab-pos` + `receiptModal` | `ServiceCard` grid, `CartRow`, `PayMethodPicker`, `Receipt80` | `services, sales` | 3 |
| S4 | Cashbox (`/cashbox`) | `tab-accounts` + `addExpenseModal` + `shiftCloseModal` | stat cards, expenses table, Z-report | `sales, expenses` | 3 |
| S5 | Staff & Payroll (`/staff`) | `tab-staff` + `paySlipModal` | staff cards, payroll table, `PaySlip` | `staff` | 4 |
| S6 | Stock (`/stock`) | `tab-products` | KPI cards, inventory table | `inventory` | 4 |
| S7 | Customers (`/customers`) | `tab-customers` + `whatsAppModal` | customers table, wa.me button | `customers` | 2 |
| S8 | Settings (`/settings`) | `tab-settings` | salon form, pricing editor, `LogoUpload`, templates, backup/restore | `salon, services, templates` | 3+7 |
| — | New Booking (dialog, anywhere) | `newBookingModal` + old wizard steps merged | form (customer+service+barber+time) | `appointments` | 2 |
| — | CCTV pages | `tab-cctv` + preview | DELETED (out of scope) | — | — |

Nav order for barber: Overview → Chairs → POS → Cashbox → Staff → Stock → Customers → Settings. Counts/badges: bookings-today on Chairs, critical-stock on Stock.

## 5. Data Model (SQLite — `userdata/roby.db`, WAL)

Full field list (types). All money = INTEGER EGP (no floats). All deletes = `deleted_at` soft-delete except append-only `sales/activity_log`.

* `salon(id TEXT PK, name_ar, address, phone, instapay, vodafone, logo_path)` — 1 row, editable in S8.
* `staff(id, name_ar, role, comm_pct INT, salary INT, photo_path, deleted_at)` — seed 5.
* `services(id, title, cat hair|beard|skin|packages|retail, price INT, duration, desc, deleted_at)` — seed 9.
* `chairs(id INT PK, num, barber_id FK→staff, status free|busy, customer, service, rem_mins)` — 5 rows.
* `appointments(id TEXT PK e.g. RB-1082, customer_name, phone, service, barber, time, status waiting|in_chair|done, payment, price INT)` — seed 6.
* `inventory(id, name, type salon|retail, cost INT, price INT, qty INT, min_qty INT)` — seed 7. Critical = `qty <= min_qty`.
* `customers(code TEXT PK CUST-xxx, name, phone UNIQUE, visits INT, points INT, fav_barber, last_visit, vip INT)` — seed 5.
* `expenses(no TEXT PK EXP-xxx, time, title, cat, person, method, amount INT)` — seed 3.
* `sales(id, receipt_no UNIQUE, items_json, subtotal INT, discount INT, tip INT, total INT, pay_method, ref, barber, customer, at)` — append-only, source of S1/S4 totals.
* `licenses(machine_id, key, activated_at, trial_started_at, last_seen)` — 1 row.
* `templates(id, kind ticket|receipt|reminder|campaign, body_ar)` — wa.me texts, editable S8.
* `backups(path, created_at)` + `activity_log(at, text)` — append-only.

Seed = current `defaultState` migrated once in Phase 1. Photos/logos = files in `userdata/`, DB stores paths only.

## 6. Logic Mapping (Old → New — Where Each Function Lives)

| Old `app.js` Function | New Module.Function | Rule |
|---|---|---|
| `renderOverviewGauges` | `packages/reports/overviewStats()` | SUM(sales.today), COUNT(appointments), COUNT(critical) — no hardcoded 7500 |
| `renderStaffOverviewTable` | `S1 + packages/payroll/staffSummary()` | reads `staff` |
| `renderActivityFeed` | `packages/activity/log() + list()` | real inserts on sale/seat/finish, not 4 hardcoded rows |
| `renderInventoryBars` | `S1 + packages/stock/levels()` | derived from `inventory` |
| `renderOffersList` | `S1/S8 + packages/offers` | CRUD, was static array |
| `renderChairsGrid, finishChairSession, seatWaitingCustomerOnChair, seatCustomerBooking` | `packages/queue/*` (`seatNext, finishSession`) + S2 | state machine `waiting→in_chair→done` enforced in one place |
| `renderBookingsTable + filter` | `S2 bookingsTable` | filter = query, not in-memory only |
| `renderWaitingQueue, callNextCustomer` | `packages/queue` | queue order = creation order |
| `renderPOSCatalog, handlePOSSearch, filterPOSCatalog` | `S3 + packages/catalog/search()` | category + text search over `services` |
| `renderCart, calcCartTotal` | `packages/pos/totals(subtotal, discount, tip)` | `total = subtotal − discount + tip`, pure + tested |
| `processPOSCheckout, checkoutBookingToPOS, viewReceiptDirect` | `packages/pos/checkout()` → writes `sales` + updates drawer | drawer split: cash→cash, else→online; booking marked done atomically |
| `renderStaffRoster, renderDetailedPayroll, openPaySlipModal, finalizeStaffPayment` | `packages/payroll/*` | `net = salary + round(revenue×comm%) + tips − advances`; revenue tracked per staff from `sales` |
| `renderInventoryTable, filterStockTable, restockItem` | `packages/stock/*` | restock = `qty+=n` + log |
| `renderCustomersTable, handleCustomerSearch, sendCustomerWhatsApp` | `packages/customers/*` + `packages/whatsapp/link()` | wa.me URL builder, no API |
| `renderExpensesTable, calcFinancials, handleAddExpenseSubmit, deleteExpense` | `packages/cashbox/*` | `net = sales − expenses − round(sales×20%)` shown live; expense reduces cash drawer if cash |
| `openShiftCloseModal, confirmShiftClose` | `packages/cashbox/zReport()` | snapshot totals + actual-count input |
| `renderSettingsPricing, saveSettingsNotification` | `S8 settingsForm` | validates phone/price/logo before save |
| `confirmCustomerBooking` (wizard) | `packages/queue/createBooking()` (dialog) | same fields, staff-driven, no separate customer app |
| `openModal/closeModal, showToast` | `ui/Modal, ui/Toast` | — |
| `handleGlobalSearch` | `packages/search/global()` | searches appointments+staff+customers |
| `saveLocalDB/loadLocalDB/resetDemoData` | `packages/db/*` + backup scheduler | SQLite + 10-min zip, reset behind PIN |
| `initCCTVClock, toggleCCTVGrid` | DELETED | cameras out of scope |
| `getSvgAvatar/Service/Offer, handleImgError` | `ui/FallbackImg` | local fallback, no Unsplash at runtime |

## 7. Key Flows (State Machines)

* Queue: `waiting →(seat)→ in_chair →(finish/checkout)→ done`. No skips. Chair `busy` mirrors `in_chair`; freeing chair requires finished sale or explicit release + log.
* POS checkout (atomic DB transaction): validate cart non-empty + ref# if non-cash → insert `sales` → if booking-linked mark done → update drawer → log activity → render `Receipt80` → clear cart. Failure rolls back all.
* Payroll: per-staff revenue = SUM(sales by barber, month). `net = salary + comm + tips − advances`. Pay-slip prints computed rows; "صرف" logs payment, never edits history.
* Backup: every sale writes instantly (WAL). Every 10 min: checkpoint → copy → zip `backups/roby-YYYYMMDD-HHMM.zip` → prune (keep 144 + 30 daily, cap 2GB). Restore = pick zip → verify → replace DB → re-validate license (same PC keeps activation, new PC locks).
* Activation: first run writes `trial_started_at` → 7-day countdown with rollback detection → lock shows `MID` → owner generates `RB1-…` offline → verify RSA → store via safeStorage. See `PROJECT_PLAN.md §7`.
* Settings/logo: upload png/jpg ≤2MB → save `userdata/logos/logo-<ts>.png` → update `salon.logo_path` → all headers/receipts use it; reset restores bundled default.
* WhatsApp: `link(phone, template, vars)` → `https://wa.me/<phone-intl>?text=<encoded>` (Egypt: strip leading `0`, prefix `20`, e.g. `01012345678` → `201012345678`) → log to activity. Templates editable in S8.

## 8. File Map (Where to Build / Where to Debug)

```
apps/desktop/          Electron main, windows, printer, safeStorage, auto-update
  src/main/            windows.ts, license-guard.ts, backup-scheduler.ts, printing.ts
  src/renderer/        React routes S0–S8, one shell layout
packages/ui/           tokens.css + components in §3 (no business logic)
packages/db/           schema.ts, migrations/, seed.ts (from defaultState), repo per table
packages/queue/        state machine + seat/finish/createBooking
packages/pos/          totals.ts, checkout.ts (transactional)
packages/cashbox/      expenses.ts, zReport.ts, financials.ts
packages/payroll/      compute.ts (formula + tests)
packages/stock/        levels.ts, restock.ts
packages/customers/    crud.ts, loyalty.ts
packages/whatsapp/     templates.ts, link.ts
packages/licensing/    machineId.ts, verify.ts (public key only)
tools/license-generator/  owner-only CLI (private key, NEVER shipped)
.github/workflows/release-windows.yml   tag → .exe + update manifest
userdata/ (runtime, never in git)  roby.db, backups/, logos/, photos/
```

## 9. Troubleshooting Map (Symptom → Check)

| Symptom | Check first | Table / Log |
|---|---|---|
| Totals/receipt wrong | `packages/pos/totals.ts` + `checkout.ts` | `sales` row vs receipt; unit test `totals.test.ts` |
| Drawer cash/online mismatch | `packages/cashbox/financials.ts`, pay_method mapping | `sales(pay_method)` + `expenses(method)` |
| Chair stuck busy | `packages/queue/finishSession`, chair↔appointment link | `chairs.status` + `appointments.status` |
| Booking lost / queue order wrong | `packages/queue/createBooking` ordering | `appointments(rowid)` + `activity_log` |
| Payroll number off | `packages/payroll/compute.ts` | `sales by barber` month filter |
| Low-stock alert missing/wrong | `packages/stock/levels.ts` (`qty<=min_qty`) | `inventory` |
| Settings/logo not saving | S8 form validation + `salon` repo + file perms | `salon.logo_path` + `userdata/logos/` |
| WhatsApp opens with bad text | `packages/whatsapp/link.ts` + template vars | `templates` |
| Backup missing / restore fails | main `backup-scheduler.ts`, disk space, zip integrity | `backups/` folder + app log |
| Lock shows on activated PC | `packages/licensing/verify.ts`, safeStorage, MID change (new disk?) | `licenses` + `issued_keys.csv` (owner side) |
| Trial ended early / reinstall resets | `trial_started_at/last_seen` + rollback detection | protected file + `licenses` |
| .exe won't install / SmartScreen | unsigned build — expected; docs cover bypass | release workflow log |
| Print cut off / wrong width | `Receipt80` 72mm CSS + printer driver paper size | printer prefs (80mm) |
| Light mode looks broken | `packages/ui/tokens.css` light block | contrast check §2 |

Logs: app log `userdata/logs/app.log` (rotating). Every money mutation writes `activity_log` row — follow it before guessing.

## 10. Traceability (Phase → Screens → Done-When)

* P0: tokens + all §3 components storybook + shell + S1/S2/S3 prototype → barber clicks Dashboard→Chairs→POS→Receipt and approves.
* P1: file map `apps/desktop + packages/db` + seed + release workflow → fresh Win10/11 `.exe` persists DB after reboot.
* P2: S1+S2+S7 + `queue/customers/search` → booking→seat→finish→customer history works.
* P3: S3+S4+S8 + `pos/cashbox` + `Receipt80` → 10 mixed-payment sales balance + Z-report exact.
* P4: S5+S6 + `payroll/stock` → add barber/product, payroll print, low-stock fires.
* P5: S0 + `licensing` + generator CLI → key from owner unlocks 1 PC only; same key fails on 2nd PC; reinstall same-PC keeps trial state.
* P6: wa.me in S7/S3/S8 `templates` → real phone opens prefilled Arabic text.
* P7: scheduler + restore + manual PDF → factory-reset→install→activate→restore returns all data.

---
*Build order: tokens → components → db/seed → queue → pos/cashbox → payroll/stock → licensing → whatsapp → backup/polish. Never build screens before their §6 module exists and its math has a test.*

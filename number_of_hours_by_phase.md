# Number of Hours by Phase — Roby Barber (Billing Sheet)

> Fill your rate once, totals calculate automatically.
> **Formula: `Phase cost = logged hours × HOURLY_RATE`**
> **Your `HOURLY_RATE` = ______ EGP / hour** (fill in, then multiply)

* All hours below are **estimates (min–max)**. You pay **actual logged hours** per phase after acceptance.
* Locked scope: Electron+React+SQLite, offline signed lifetime key + 7-day trial, instant save + 10-min backup, wa.me WhatsApp, cameras postponed to V2, Arabic dark+light, 80mm, editable everything incl. logo.
* Detail source: `PROJECT_PLAN.md §5`.

---
## Summary Table (fill Rate to quote customer)

| Phase | Title | Min h | Max h | Min cost (× Rate) | Max cost (× Rate) |
|---|---|---|---|---|---|
| 0 | Discovery + UX Prototype (dark+light) | 10 | 14 | 10 × Rate | 14 × Rate |
| 1 | Foundation + Windows Release Pipeline | 18 | 24 | 18 × Rate | 24 × Rate |
| 2 | Dashboard + Chairs + Appointments + Customers | 20 | 26 | 20 × Rate | 26 × Rate |
| 3 | POS + Cashbox + Receipts + Editable Everything (incl. logo) | 22 | 28 | 22 × Rate | 28 × Rate |
| 4 | Staff/Payroll + Inventory | 18 | 24 | 18 × Rate | 24 × Rate |
| 5 | Activation (offline signed, lifetime + 7-day trial) | 14 | 20 | 14 × Rate | 20 × Rate |
| 6 | WhatsApp wa.me Connector (cameras deferred) | 6 | 8 | 6 × Rate | 8 × Rate |
| 7 | Auto-Backup + Polish + Manual + Handover | 14 | 18 | 14 × Rate | 18 × Rate |
| **Total V1** | | **122** | **162** | **122 × Rate** | **162 × Rate** |
| V2-ADDON-CAM | Cameras (deferred, optional) | 10 | 16 | 10 × Rate | 16 × Rate |

Example: if Rate = 500 EGP/h → V1 = 61,000–81,000 EGP. (Replace 500 with your rate.)

---
## Breakdown by Phase (task-level, sums match table)

### PHASE 0 — 10–14h
* Info architecture for non-tech barber + scope freeze: 2–3h
* Clickable React prototype (Dashboard→Chairs→POS→Receipt, dark+light tokens): 5–7h
* Arabic copy + 80mm receipt check + logo default (current logo, changeable later): 1–2h
* WhatsApp numbers + printer confirmation: 1–1h
* Demo + acceptance: 1–1h

### PHASE 1 — 18–24h
* Vite+React+TS+Electron scaffold + Tailwind RTL + offline Cairo font: 4–5h
* SQLite schema + migrations + seed from old `defaultState`: 4–6h
* GitHub Actions `release-windows.yml` (NSIS exe, icon, version, auto-update): 5–7h
* Logging + crash handling + single-user safety (confirm/soft-delete/log): 3–4h
* Test on fresh Win10/11 + reboot persistence: 2–2h

### PHASE 2 — 20–26h
* Overview gauges (real queries) + activity feed: 4–5h
* Chairs live map (5) + status actions: 4–5h
* Bookings table + filters + waiting queue + call-next + new-booking modal: 5–7h
* Customers CRUD + loyalty + search + WhatsApp button stub: 4–5h
* Global search Ctrl+K + notifications: 2–3h
* Demo + fixes: 1–1h

### PHASE 3 — 22–28h
* Catalog + categories + search: 3–4h
* Cart + tip/discount + 4 payments + manual Ref# + pending flag: 4–5h
* 80mm thermal receipt layout + print: 3–4h
* Cashbox (income/cash/online), expenses CRUD, Z-report: 5–6h
* Settings editor (salon info, prices, payment numbers, offers, **logo upload/change**): 5–6h
* Money-balance test (10 sales across methods): 2–3h

### PHASE 4 — 18–24h
* Staff CRUD + photo upload + commission/tips/advances: 5–7h
* Pay-slip print + monthly summary: 3–4h
* Inventory CRUD + min-qty alerts + restock + totals: 5–7h
* Kill all remaining stub buttons + validation: 4–5h
* Demo + fixes: 1–1h

### PHASE 5 — 14–20h
* Stable Machine-ID (CPU+MB+disk hash): 2–3h
* Lock screen + 7-day trial countdown + lifetime verify: 3–4h
* RSA-2048 sign/verify (public in app, private stays with you): 3–4h
* `license-generator` CLI for you + key format `RB1-XXXX`: 2–3h
* Anti-copy (key bound to MID) + revoke list + 3-PC test: 3–4h
* Docs (how you issue keys via WhatsApp): 1–2h

### PHASE 6 — 6–8h (WhatsApp only)
* Template editor (AR) for ticket/receipt/reminder/campaign: 2–3h
* wa.me deep-link wiring + click-to-chat log: 2–3h
* Test with real shop number: 1–1h
* Docs: 1–1h

### PHASE 7 — 14–18h
* 10-min zip backup + retention (144) + daily + Restore + USB export/import: 4–5h
* Light/dark polish + 44px targets + empty states + AR proofread: 3–4h
* Installer branding (current logo default), splash, icon: 2–3h
* Arabic PDF manual + screenshots + training recording: 4–5h
* Factory-reset → install → activate → restore test: 1–1h

### V2-ADDON-CAM — 10–16h (NOT in V1 total, quoted separately)
* Camera settings (RTSP/HTTP/USB), 2/4 grid, snapshot, reconnect help (Hikvision/Dahua examples): 10–16h. ONVIF scan if wanted: +10–14h extra.

---
## How to Use This Sheet With Customer

1. Set `HOURLY_RATE` at top.
2. Customer approves V1 range: **122–162h**.
3. Start Phase 0 only (10–14h). Log real hours daily.
4. End of phase: show logged hours × Rate = invoice + demo + acceptance signature.
5. Next phase starts only after payment. Scope changes → re-estimate in writing.

*V1 excludes: cloud hosting fees (none needed — offline-first), Meta WhatsApp fees (none for wa.me), code-signing cert (~optional, at cost), ONVIF/cameras (V2).*

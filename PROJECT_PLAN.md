# Roby Barber — Rebuild Project Plan (React + Real DB + Windows Desktop)

> **Purpose:** Billable, phased execution plan for customer approval.
> **Billing model:** Pay by work-hours, checkpoint after EACH phase. No next phase starts without acceptance + payment of previous phase.
> **Current source:** `index.html` + `app.js` + `styles.css` (vanilla JS + localStorage demo).
> **Target:** React + Electron (Windows-only `.exe`), SQLite real local DB, clean Arabic RTL UI for non-tech barber, Windows-style activation, auto-backup, easy camera + WhatsApp connectors, GitHub Actions release pipeline.
> **Single-user rule:** No admin vs customer split. One local user can do/edit everything (with safety confirmations).

---
## 0. LOCKED DECISIONS (customer approved — do not change without written approval)

* Stack: **Electron + React + SQLite** (Windows-only).
* Activation: **A — Offline signed license** (Machine ID + RSA key from your generator, no server).
* DB: **Instant save + 10-min zip backup + restore/USB**.
* Cameras V1: **POSTPONED** — deferred to paid V2 add-on. V1 ships without camera page (placeholder note only).
* WhatsApp V1: **A — wa.me templates** (zero setup, no ban risk).
* UI: **Arabic RTL dark gold + light mode toggle**.
* Payments: **Manual Ref# only** (no auto-verify — impossible).
* Billing: **Approve phased hourly**, 7 phases, pay after each acceptance.
* License term: **Lifetime key + 7-day trial** (locked).
* Logo: **User can change logo anytime** — default ships with current Roby logo, Settings → change/upload any image.
* Printer: **80mm thermal**.
* Seed: **Reuse demo data as editable starter**.
* Kickoff: **Start Phase 0 now**.

> Impact: PHASE 6 shrinks to WhatsApp-only (~6-8h). Cameras move to `V2-ADDON` backlog. Total drops from 132–176h to ~120–160h. PHASE 0 UI must include light-mode tokens (+3-4h already in Phase 0/7).

---
## 1. Goals (Agreed)

1. Rebuild in **React** with **real DB**, everything working (no mock buttons).
2. **Windows-only desktop** release via **GitHub workflow** (build `.exe` installer + auto-update).
3. **Single local user**, full edit rights, super simple UI for Egyptian barber (non-tech).
4. **Activation like Windows:** app locked after install until activation key entered. Machine-locked so it can't be copied/stolen.
5. **Auto-save DB every 10 min** (+ instant save + backups).
6. **User can edit almost everything:** services, prices, staff, salaries, inventory, customers, offers, salon info, payment numbers, **logo**.
7. **WhatsApp via wa.me templates in V1. Cameras POSTPONED to V2 (your choice).**
8. **Trial 7 days, then lock until lifetime key entered. Logo changeable in Settings.**

## 2. Current App Audit (What We Keep / Throw)

Kept logic: 5 chairs live map, appointments `waiting/in_chair/done`, POS cart + tip + 4 Egyptian payment methods, payroll formula, inventory critical levels, loyalty points, expenses + Z-report, 4-step booking wizard, thermal receipt layout.

Throw away: dual admin/customer mode (per your rule), all `showToast`-only stub buttons (`openAddStaffModal`, `openNewOfferModal`...), fake CCTV images, hardcoded Unsplash URLs, `localStorage` as DB, inline `onclick` globals.

## 3. Target Architecture (Proposed)

```
RobyBarber/
  apps/desktop (Electron + Vite + React + TypeScript)
  packages/ui (RTL Arabic design system)
  packages/db (SQLite via better-sqlite3 + Prisma/Drizzle + migrations)
  packages/licensing (machine-id + signed license verify)
  tools/license-generator (CLI you run to create keys)
  .github/workflows/release-windows.yml (build + sign + release .exe)
```

* Frontend: `React + Vite + TypeScript + Tailwind`, RTL first, big touch targets, Cairo font offline-bundled.
* Desktop: `Electron + electron-builder (NSIS)` for Windows 10/11 x64. Auto-update via `electron-updater`.
* DB: `SQLite` file in `%APPDATA%/RobyBarber/roby.db` (WAL mode). Instant write on every change. Backup scheduler copies + zips every 10 min.
* No cloud required for daily use (offline-first). Internet only needed once for activation (or never if we pick offline-signed keys).

---
## 4. GAPS / WRONG / IMPOSSIBLE — READ THIS FIRST

These are things in the initial idea that are fundamentally broken or need a decision. Each has a recommended fix.

### GAP-1: "Send Machine ID to my GitHub and get a code in GitHub" — FUNDAMENTALLY WRONG
**Why:** GitHub is not a license server. If the app embeds a GitHub token to create issues/gists, anyone can extract it and forge keys, spam your repo, or steal all customer MachineIDs (public leak). No secrecy, no revocation, violates GitHub ToS for commercial licensing, and requires manual copy-paste for every customer.
**Choices:**
* **A [RECOMMENDED]: Offline signed license (like Windows/IDM).** App shows `Machine ID = hash(CPU+MB+Disk)`. Customer sends it to you via WhatsApp. You run `license-generator.exe <machine-id> <expiry>` on YOUR PC (private RSA key stays with you). You send back `XXXX-XXXX-XXXX` key. App verifies signature offline with public key. No internet needed after install, cannot be reused on another PC, cannot be forged.
* **B: Tiny online activation server.** Supabase/Firebase table `licenses(machine_id, key, active)`. App sends ID on first run, you approve in a web dashboard. Needs hosting (~$0-25/mo), needs internet at activation, more work (+8-12h).
* **C: Literal GitHub Issues flow as you described.** Possible to hack in 4-6h but INSECURE, manual, public, not recommended. I will only do this if you explicitly accept the risk in writing.

### GAP-2: "Real DB + save every 10 min" — MISUNDERSTOOD
SQLite saves **instantly** on every sale/edit. "Every 10 min" should be **automatic backup**, not save.
**Choices:**
* **A [RECOMMENDED]:** Instant save + backup zip every 10 min (keep last 144) + daily backup + one-click Restore + USB export.
* **B:** Instant save only, manual backup button. Cheaper (-4h) but risky if Windows crashes.

### GAP-3: "Easy camera connect" — CANNOT AUTO-MAGICALLY WORK WITH ALL CAMERAS
Browsers/Electron cannot auto-detect DVRs. We need RTSP/HTTP URL + username/password. Each brand (Hikvision, Dahua, TP-Link) is different.
**Choices:**
* **A [RECOMMENDED V1]:** Settings → Cameras → `+ Add` → paste RTSP/HTTP URL or pick USB webcam → live preview grid (2/4) + snapshot button. No recording in app (DVR already records). 1-click test + save.
* **B:** + ONVIF auto-scan for IP cams on same WiFi (+10-14h, flaky).
* **C:** Full in-app recording to disk — NOT recommended (100GB+/week, kills laptop, needs NVR anyway).

### GAP-4: "Easy WhatsApp connect" — NO FREE OFFICIAL DESKTOP API
Options all have tradeoffs:
* **A [RECOMMENDED V1]:** `wa.me` deep-links + pre-filled Arabic templates (booking confirm, reminder, loyalty). Zero setup, zero ban risk, works today.
* **B:** WhatsApp Business Cloud API (official). Needs Meta Business account + phone number + message templates approval. Good for bulk campaigns, +14-20h + Meta fees.
* **C:** QR-pairing via Baileys/WWebJS (send directly from shop number). Powerful but against WhatsApp ToS, number can be banned, breaks on updates, +18-26h maintenance hell.

### GAP-5: "One user edits everything" — DANGEROUS WITHOUT SAFETY
If barber can delete services/history with one click, one mistake wipes a day's sales.
**Fix (included, non-negotiable):** Delete confirm + soft-delete (trash 30 days) + `Reset demo data` hidden behind PIN + activity log. Still single user, just safe.

### GAP-6: "InstaPay / Vodafone auto-verify" — IMPOSSIBLE
No public API for InstaPay/Vodafone Cash to auto-confirm payments. All Egyptian salons do manual ref-number entry.
**Fix:** Keep manual `Ref #` field + `Pending verification` flag on receipt. No automation promised.

### GAP-7: "GitHub CLI to handle release" — CLARIFICATION
`gh CLI` is manual. What you want is **GitHub Actions**: push tag `v1.0.0` → cloud builds Windows `.exe` → attaches to GitHub Release → app auto-updates. I will build that. `gh` only used locally to trigger.

---
## 5. Phases (Billable) — Hours Are Estimates, Clocked Real

> Rule: Each phase ends with installer + demo video + acceptance checklist. You pay hours logged for that phase, then we start next.

### PHASE 0 — Discovery + Clickable UX Prototype (10–14h)
* Tasks: Finalize scope, redesign information architecture for non-tech user, Figma-like React prototype (no DB), Arabic copy review, printer/paper size check (80mm?), decide camera models + WhatsApp numbers.
* Deliverable: Prototype `.exe` or web link + scope freeze doc.
* Acceptance: You click through Dashboard→Chairs→POS→Receipt and say "barber can use this".
* Billing checkpoint: Yes.

### PHASE 1 — Foundation + Windows Release Pipeline (18–24h)
* Tasks: Vite+React+TS+Electron scaffold, SQLite + migrations, seed from old `defaultState`, GitHub Actions `release-windows.yml` (NSIS installer, icon, versioning, auto-update), logging + crash reports, offline fonts.
* Deliverable: Installable `RobyBarber-Setup-0.1.0.exe` from GitHub Release that opens empty shell + DB file created.
* Acceptance: Fresh Windows 10/11 installs, opens, DB persists after reboot.
* Billing checkpoint: Yes.

### PHASE 2 — Dashboard + Chairs + Appointments + Customers (20–26h)
* Tasks: Overview gauges (real queries), 5 chairs live, bookings table + filters + waiting queue + call-next, customers CRUD + loyalty + search, global search `Ctrl+K`, notifications, activity feed (real, not hardcoded).
* Deliverable: Day-to-day queue flow works end-to-end.
* Acceptance: Create booking → seat → finish → appears in customers/history.
* Billing checkpoint: Yes.

### PHASE 3 — POS + Cashbox + Receipts + Editable Everything (22–28h)
* Tasks: Service catalog + search + categories, cart + tip + discount + 4 payment methods + ref#, 80mm thermal receipt + `Print`, daily income/cash/online split, expenses CRUD, Z-report close-shift, Settings editor (salon info, prices, payment numbers, offers) with validation.
* Deliverable: Money flow correct: sale → drawer totals → expense → net profit → Z-report.
* Acceptance: 10 test sales with cash/InstaPay/Vodafone/visa balance to the pound.
* Billing checkpoint: Yes.

### PHASE 4 — Staff/Payroll + Inventory (18–24h)
* Tasks: Staff CRUD + photo, commission %, tips, advances/deductions, pay-slip print, payroll summary; inventory CRUD + min-qty alerts + restock + value totals.
* Deliverable: No stub buttons remain.
* Acceptance: Add new barber/product, run payroll, trigger low-stock alert.
* Billing checkpoint: Yes.

### PHASE 5 — Activation / Licensing System (14–20h, depends on GAP-1 choice)
* Tasks (for Option A): Machine-ID generator (stable HW hash), lock screen on first run, RSA-2048 sign/verify, `license-generator` CLI for YOU, lifetime key + 7-day trial countdown, anti-copy (key bound to Machine ID), offline verify, revoke list.
* Deliverable: Unactivated `.exe` shows lock → enter key → unlocks permanently on that PC. Copied to another PC → locked again.
* Acceptance: 3 test PCs, same key fails on 2nd PC, new key works.
* Billing checkpoint: Yes.

### PHASE 6 — WhatsApp Connector Only (6–8h, cameras deferred to V2)
* Tasks WhatsApp-A: Template editor, `wa.me` share for ticket/receipt/reminder/campaign, click-to-chat log.
* Cameras: NOT in V1 per your choice. Backlog `V2-ADDON-CAM (10-16h)`: manual RTSP/HTTP+USB, 2/4 grid, snapshot. Build only when you share camera brand/model.
* Deliverable: Barber clicks WhatsApp icon on customer → chat opens with ready message.
* Acceptance: With YOUR actual phone number.
* Billing checkpoint: Yes.

### PHASE 7 — Auto-Backup + Polish + Handover (14–18h)
* Tasks: 10-min zip backup + retention + Restore + USB export/import, keyboard shortcuts, touch targets ≥44px, empty-states, Arabic proofread, installer icon/splash, user manual PDF (Arabic, screenshots), 1 training session recording.
* Deliverable: Final `v1.0.0` Release + manual + source handover.
* Acceptance: Factory-reset PC → install → activate → restore backup → everything back.
* Billing checkpoint: Final payment.

**Estimated total: ~120–160h** (cameras postponed saves ~10-14h; light-mode adds ~3-4h already absorbed in Phase 0/7).

---
## 6. DB Draft (SQLite)

`salon(id,name_ar,address,phone,instapay,vodafone)`, `staff(id,name_ar,role,comm_pct,salary,photo_path)`, `services(id,title,cat,price,duration,desc)`, `chairs(id,num,barber_id,status,customer,service,rem_mins)`, `appointments(id,customer_name,phone,service,barber,time,status,payment,price)`, `inventory(id,name,type,cost,price,qty,min_qty)`, `customers(code,name,phone,visits,points,fav_barber)`, `expenses(no,time,title,cat,person,method,amount)`, `sales(id,receipt_no,items_json,subtotal,tip,total,pay_method,ref)`, `licenses(machine_id,key,activated_at)`, `backups(path,created_at)`, `activity_log(at,text)`.

## 7. Activation Flow (Option A)

1. Install → app generates `MID-7F3A-...` from HW hash → shows LOCK screen + WhatsApp-send button.
2. Customer sends MID to YOU.
3. YOU run: `license-gen.exe --mid MID-... --months 12` → get `RB1-XXXX-XXXX-XXXX`.
4. Customer types key (or pastes file) → app verifies RSA signature with embedded public key → unlocks. Key stores `mid+expiry` signed. Copy to other PC fails signature.

## 8. Backup Every 10 Min

`setInterval 10min → VACUUM → copy roby.db → zip with timestamp → keep last 144 (24h) + last 30 daily → status pill "Last backup 10:20" → Restore picker → Export to USB`.

## 9. Release Workflow

`.github/workflows/release-windows.yml`: on `git tag v*` → `npm ci` → `prisma migrate` → `electron-builder --win nsis` → upload `.exe` + `.yml` update manifest to GitHub Release. App checks on start, prompts `Update available → Restart to update`. Windows-only (`--win`), x64, NSIS Arabic-capable installer.

## 10. UI/UX Rules (Non-Tech Barber)

RTL Arabic first, 18px+ base, gold-on-dark high contrast + light mode toggle, one primary button per screen (`حاسب واطبع`, `إجلاس على الكرسي`), confirm on destructive, large numeric keypad for cash, thermal preview exactly like paper, offline icons bundled (no CDN at runtime).

## 11. What I Need From You Before PHASE 0

Machine-ID sample PC, camera brand/model + DVR photo, WhatsApp sender number, printer model + paper width, salon price list Excel (if any), logo file, trial days + license duration (lifetime/yearly?), hourly rate agreement.

---
*End of plan — awaiting your choices on GAPS + stack below before coding.*

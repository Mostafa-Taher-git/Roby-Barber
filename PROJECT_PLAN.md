# Roby Barber — Rebuild Project Plan (React + Real DB + Windows Desktop)

> **Purpose:** Billable, phased execution plan for customer approval.
> **Billing model:** Pay by work-hours, checkpoint after EACH phase. No next phase starts without acceptance + payment of previous phase.
> **Current source:** `index.html` + `app.js` + `styles.css` (vanilla JS + localStorage demo).
> **Target:** React + Electron (Windows-only `.exe`), SQLite real local DB, clean Arabic RTL UI for non-tech barber, Windows-style activation, auto-backup, easy WhatsApp connector, GitHub Actions release pipeline. No cameras.
> **Single-user rule:** No admin vs customer split. One local user can do/edit everything (with safety confirmations).

---
## 0. LOCKED DECISIONS (customer approved — do not change without written approval)

* Stack: **Electron + React + SQLite** (Windows-only).
* Activation: **Owner-only offline signed license (LOCKED).** RSA-2048. Private key NEVER in app/repo — only on your offline USB + generator CLI. App holds public key only. No generic/shared keys. Key bound to Machine ID, unguessable, single-PC only.
* DB: **Instant save + 10-min zip backup + restore/USB**.
* Cameras: **REMOVED entirely per customer request (no camera page, no V2 backlog).**
* WhatsApp V1: **A — wa.me templates** (zero setup, no ban risk).
* UI: **Arabic RTL dark gold + light mode toggle**.
* Payments: **Manual Ref# only** (no auto-verify — impossible).
* Billing: **Approve phased hourly**, 7 phases, pay after each acceptance.
* License term: **Lifetime key + 7-day trial** (locked).
* Logo: **User can change logo anytime** — default ships with current Roby logo, Settings → change/upload any image.
* Printer: **80mm thermal**.
* Seed: **Reuse demo data as editable starter**.
* Kickoff: **Start Phase 0 now**.

> Impact: PHASE 6 is WhatsApp-only (~6-8h). Cameras fully removed from scope — no placeholder, no backlog. Total V1: 122–162h. PHASE 0 UI must include light-mode tokens (+3-4h already in Phase 0/7).

---
## 1. Goals (Agreed)

1. Rebuild in **React** with **real DB**, everything working (no mock buttons).
2. **Windows-only desktop** release via **GitHub workflow** (build `.exe` installer + auto-update).
3. **Single local user**, full edit rights, super simple UI for Egyptian barber (non-tech).
4. **Activation like Windows:** app locked after install until activation key entered. Machine-locked so it can't be copied/stolen.
5. **Auto-save DB every 10 min** (+ instant save + backups).
6. **User can edit almost everything:** services, prices, staff, salaries, inventory, customers, offers, salon info, payment numbers, **logo**.
7. **WhatsApp via wa.me templates. Cameras REMOVED (customer does not need it).**
8. **Trial 7 days, then lock until lifetime key entered. Logo changeable in Settings.**

## 2. Current App Audit (What We Keep / Throw)

Kept logic: 5 chairs live map, appointments `waiting/in_chair/done`, POS cart + tip + 4 Egyptian payment methods, payroll formula, inventory critical levels, loyalty points, expenses + Z-report, 4-step booking wizard, thermal receipt layout.

Throw away: dual admin/customer mode (per your rule), all `showToast`-only stub buttons (`openAddStaffModal`, `openNewOfferModal`...), fake CCTV images, hardcoded Unsplash URLs, `localStorage` as DB, inline `onclick` globals.

## 3. Target Architecture (Proposed)

```
RobyBarber/
  apps/desktop (Electron + Vite + React + TypeScript)
  packages/ui (RTL Arabic design system)
  packages/db (SQLite via better-sqlite3 + Drizzle + migrations — LOCKED, no Prisma)
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

### GAP-1: Licensing — LOCKED to owner-only offline signed keys (no generic keys, no GitHub server)
**Rejected:** GitHub Issues-as-server (public leak, token theft, ToS violation) and any shared/generic key (one leak unlocks everyone). There is intentionally NO generic key in the system.
**Locked design (hack-resistant, not hack-proof — nothing local is 100%):**
* Key math: `license = sign_RSA2048(machine_id + lifetime_flag)` with your private key. Format `RB1-XXXX-XXXX-XXXX` (~100+ bits entropy, unguessable, non-sequential). No two PCs share a key.
* Owner-only generation: `license-generator` CLI runs ONLY on your PC + private key on encrypted USB stick. Private key is never committed, never shipped, never in the installer. You keep a local log `issued_keys.csv (mid, date, shop name)`.
* App side holds PUBLIC key only — verifying a key is possible, forging one without the private key is computationally infeasible.
* Machine ID = stable hash of CPU ID + motherboard UUID + disk serial (survives Windows reinstall, changes on new PC/clone). Shown as `MID-XXXX-XXXX` on lock screen with WhatsApp-send button.
* Storage: license stored via Electron `safeStorage` (Windows DPAPI) + validated on every launch and every 24h. Tampered/deleted license → instant lock.
* Trial: 7 days from first run. Stored install timestamp + `lastSeen` counter in 2 places (DB + protected file). Clock rollback (`now < lastSeen`) → trial ends immediately. Reinstall on same PC keeps same MID so trial does NOT reset; new PC gets fresh trial but needs its own key anyway.
* Build hardening (included in Phase 5 hours): production DevTools disabled, license-check code obfuscated, no `isActivated=true` flag to flip, checksum on public key.
* Honest limits you must accept: (1) a determined reverser with weeks of time CAN patch any local app — goal is cracking costs far more than buying; (2) offline lifetime keys cannot be remotely revoked — mitigation is MID-binding (stolen key is useless elsewhere) + you simply never issue a second key for a disputed MID; (3) stolen laptop keeps running — mitigation is Windows login password + shop physical security, optional DB encryption (SQLCipher, +6-10h if you want it later).
**Flow:** install → trial 7 days → lock screen with MID → customer sends MID to YOU → you run generator offline → send back key → customer enters key once → unlocked on that PC only. Same key on another PC fails. Backup restore on SAME PC keeps activation; restore on NEW PC requires new key.

### GAP-2: "Real DB + save every 10 min" — MISUNDERSTOOD
SQLite saves **instantly** on every sale/edit. "Every 10 min" should be **automatic backup**, not save.
**Choices:**
* **A [RECOMMENDED]:** Instant save + backup zip every 10 min (keep last 144) + daily backup + one-click Restore + USB export.
* **B:** Instant save only, manual backup button. Cheaper (-4h) but risky if Windows crashes.

### GAP-3: Cameras — REMOVED FROM SCOPE (customer decision)
No camera integration will be built. Section kept for history only — original concern (browsers/Electron can't auto-detect DVRs, need RTSP/HTTP per brand) no longer applies.

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
* Tasks: Finalize scope, redesign information architecture for non-tech user, Figma-like React prototype (no DB), Arabic copy review, printer/paper size check (80mm), WhatsApp numbers.
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

### PHASE 5 — Activation / Licensing System, owner-only hardened (14–20h)
* Tasks: Stable HW Machine-ID, lock screen + 7-day trial with rollback detection, RSA-2048 sign/verify (private stays with you, public in app), offline `license-generator` CLI for YOU + issuance log, MID-bound lifetime verify, safeStorage encrypted license, re-verify on launch/24h, prod hardening (no DevTools, obfuscation, no bypass flag), local blocklist for disputed MIDs (no remote revoke possible offline — documented limit).
* Deliverable: Unactivated `.exe` shows lock → enter key → unlocks permanently on that PC. Copied to another PC → locked again. Only keys from YOUR generator work.
* Deliverable: Unactivated `.exe` shows lock → enter key → unlocks permanently on that PC. Copied to another PC → locked again.
* Acceptance: 3 test PCs, same key fails on 2nd PC, new key works.
* Billing checkpoint: Yes.

### PHASE 6 — WhatsApp Connector Only (6–8h)
* Tasks WhatsApp-A: Template editor, `wa.me` share for ticket/receipt/reminder/campaign, click-to-chat log.
* Cameras: REMOVED from scope — nothing to build.
* Deliverable: Barber clicks WhatsApp icon on customer → chat opens with ready message.
* Acceptance: With YOUR actual phone number.
* Billing checkpoint: Yes.

### PHASE 7 — Auto-Backup + Polish + Handover (14–18h)
* Tasks: 10-min zip backup + retention + Restore + USB export/import, keyboard shortcuts, touch targets ≥44px, empty-states, Arabic proofread, installer icon/splash, user manual PDF (Arabic, screenshots), 1 training session recording.
* Deliverable: Final `v1.0.0` Release + manual + source handover.
* Acceptance: Factory-reset PC → install → activate → restore backup → everything back.
* Billing checkpoint: Final payment.

**Estimated total: 122–162h** (light-mode +3-4h absorbed in Phase 0/7).

---
## 6. DB Draft (SQLite)

`salon(id,name_ar,address,phone,instapay,vodafone,logo_path)`, `staff(id,name_ar,role,comm_pct,salary,photo_path)`, `services(id,title,cat,price,duration,desc)`, `chairs(id,num,barber_id,status,customer,service,rem_mins)`, `appointments(id,customer_name,phone,service,barber,time,status,payment,price)`, `inventory(id,name,type,cost,price,qty,min_qty)`, `customers(code,name,phone,visits,points,fav_barber)`, `expenses(no,time,title,cat,person,method,amount)`, `sales(id,receipt_no,items_json,subtotal,tip,total,pay_method,ref)`, `licenses(machine_id,key,activated_at,trial_started_at,last_seen)`, `templates(id,kind,body_ar)`, `backups(path,created_at)`, `activity_log(at,text)`.

## 7. Activation Flow (owner-only, offline)

1. Install → app generates `MID-XXXX-XXXX` from HW hash → 7-day trial counts down → then LOCK screen + WhatsApp-send button.
2. Customer sends MID to YOU (and only you can issue keys).
3. YOU run offline: `license-gen.exe --mid MID-XXXX-XXXX --lifetime` → get `RB1-XXXX-XXXX-XXXX`. Log it in `issued_keys.csv`.
4. Customer enters key once → app verifies RSA signature with embedded public key → unlocks lifetime on that PC. Same key on another MID fails. No internet needed. No generic master key exists anywhere.

## 8. Backup Every 10 Min

`setInterval 10min → VACUUM → copy roby.db → zip with timestamp → keep last 144 (24h) + last 30 daily, cap folder at 2GB → status pill "Last backup 10:20" → Restore picker → Export to USB`. Backup restores DATA on the same PC (activation kept); on a NEW PC the app still locks until its own key is entered — backup never transfers a license.

## 9. Release Workflow

`.github/workflows/release-windows.yml`: on `git tag v*` → `npm ci` → `drizzle migrate` → `electron-builder --win nsis` → upload `.exe` + `.yml` update manifest to GitHub Release. App checks on start, prompts `Update available → Restart to update`. Windows 10/11 x64 only (no Win7/8, no Mac). Note: without a paid code-signing cert Windows SmartScreen will show "Unknown publisher" on first install — expected, documented in manual; cert can be bought later at cost.

## 10. UI/UX Rules (Non-Tech Barber)

RTL Arabic first, 18px+ base, gold-on-dark high contrast + light mode toggle, one primary button per screen (`حاسب واطبع`, `إجلاس على الكرسي`), confirm on destructive, large numeric keypad for cash, thermal preview exactly like paper, offline icons bundled (no CDN at runtime).

## 11. What I Still Need Before PHASE 0

WhatsApp sender number, 80mm printer model, salon price list Excel (if any), high-res logo file (default = current logo), your HOURLY_RATE for the billing sheet.

---
*End of plan — all scope LOCKED. Ready for Phase 0 kickoff. Private key handling: generated once on your PC, backed up on encrypted USB, never emailed unencrypted.*

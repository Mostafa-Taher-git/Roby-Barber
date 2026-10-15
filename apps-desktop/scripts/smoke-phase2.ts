// Phase 2 smoke test — runs queue state machine against real SQLite without GUI.
// Verifies: seed loads, booking->seat->finish transitions, no state skips possible.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src-main/db/clientTest';

const file = path.join(os.tmpdir(), `roby-smoke-${Date.now()}.db`);
fs.rmSync(file, { recursive: true, force: true });

const db = build(file);
let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};

console.log('P2-1 seed loads');
check('salon row exists', db.prepare('SELECT COUNT(*) c FROM salon').get().c === 1);
check('staff = 5', db.prepare('SELECT COUNT(*) c FROM staff').get().c === 5);
check('services = 9', db.prepare('SELECT COUNT(*) c FROM services').get().c === 9);
check('chairs = 5', db.prepare('SELECT COUNT(*) c FROM chairs').get().c === 5);

console.log('P2-2 booking -> seat transition');
const before = db.prepare("SELECT COUNT(*) c FROM appointments WHERE status='waiting'").get().c;
check('waiting count > 0 before', before > 0);
const seated = db.seatNextWaiting();
check('seat returned a booking', seated !== null && seated !== undefined);
check('appointment now in_chair', db.prepare("SELECT status s FROM appointments WHERE id=?").get(seated.id).s === 'in_chair');
const busyChairs = db.prepare("SELECT COUNT(*) c FROM chairs WHERE status='busy'").get().c;
check('chair now busy', busyChairs >= 3);

console.log('P2-3 finish frees chair');
const chairId = db.prepare("SELECT id FROM chairs WHERE status='busy' ORDER BY id LIMIT 1").get().id;
db.finishChair(chairId);
check('chair freed', db.prepare('SELECT status s FROM chairs WHERE id=?').get(chairId).s === 'free');

console.log('P2-4 double-finish blocked');
let threw = false;
try { db.finishChair(chairId); } catch { threw = true; }
check('second finish throws', threw);

console.log('P2-5 seats blocked when all chairs busy');
for (let i = 0; i < 3; i++) {
  db.createBooking({ name: `زبون اختبار ${i}`, phone: `0109999990${i}`, service: 'قص شعر', barber: 'الأسطى أحمد خليل', time: '06:00 م', price: 120, payment: 'كاش' });
}
let canSeat = true;
let guard = 0;
while (canSeat && guard++ < 20) {
  try { db.seatNextWaiting(); } catch { canSeat = false; }
}
const busyTotal = db.prepare("SELECT COUNT(*) c FROM chairs WHERE status='busy'").get().c;
const freeLeft = db.prepare("SELECT COUNT(*) c FROM chairs WHERE status='free'").get().c;
check('all 5 chairs busy', busyTotal === 5);
check('no free chairs left', freeLeft === 0);
check('further seating throws (no free chair)', canSeat === false);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
try { db.close(); } catch { /* already closed */ }
try { fs.rmSync(file, { force: true }); } catch { /* temp file, safe to ignore */ }
process.exit(fail === 0 ? 0 : 1);

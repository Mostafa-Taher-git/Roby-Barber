// Phase 7 smoke test — auto-backup: VACUUM snapshot → gzip, retention/pruning, validation guards,
// restore file-swap, USB export. Real SQLite, throwaway temp folders.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { build } from '../src-main/db/clientTest';

const baseTmp = path.join(os.tmpdir(), `roby-smoke7-${Date.now()}`);
fs.mkdirSync(baseTmp, { recursive: true });
const file = path.join(baseTmp, 'live.db');
const db = build(file);

let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};
const mkDir = (n: string) => { const d = path.join(baseTmp, n); fs.mkdirSync(d, { recursive: true }); return d; };

console.log('P7-1 snapshot → gzip archive with real content');
db.checkout({ items: [{ id: 'srv_1', title: 'قص شعر', qty: 1 }], payMethod: 'cash', barber: 'الأسطى أحمد خليل', customer: 'زبون نسخة' });
const dir = mkDir('backups');
const b1 = db.createBackup(dir);
check('file created with timestamped name', /^roby-\d{8}-\d{6}\.db\.gz$/.test(b1.name) && fs.existsSync(b1.path));
check('size > 0', b1.size > 0);
const gzBytes = fs.readFileSync(b1.path);
check('gzip magic bytes', gzBytes[0] === 0x1f && gzBytes[1] === 0x8b);
const inner = zlib.gunzipSync(gzBytes);
check('inner is SQLite db', inner.subarray(0, 15).toString('latin1') === 'SQLite format 3');
const extracted = path.join(baseTmp, 'extracted.db');
fs.writeFileSync(extracted, inner);
const extractedDb = build(extracted);
check('snapshot contains the sale (not a stale copy)', extractedDb.sales().length === 1 && extractedDb.sales()[0].customer === 'زبون نسخة');
check('no snapshot temp files left behind', fs.readdirSync(dir).every((n) => n.endsWith('.db.gz')));
extractedDb.close();

console.log('P7-2 listing + same-second collision naming');
const t = new Date('2026-10-16T12:00:00');
const b2 = db.createBackup(dir, t);
const b3 = db.createBackup(dir, t);
check('same-second backups get unique names', b2.path !== b3.path && b3.name.includes('-1.db.gz'));
const listed = db.listBackups(dir);
check('listing newest-first with sizes/ISO dates', listed.length === 3 && listed[0].name === b3.name && listed.every((f) => f.size > 0 && /^\d{4}-/.test(f.at)));
check('backupName format helper', /^roby-20261016-120000\.db\.gz$/.test(db.backupName(t)));

console.log('P7-3 retention rules (daily + latest + folder cap)');
const pr = mkDir('prune');
for (let d = 0; d < 8; d++) {
  for (let h = 0; h < 5; h++) {
    const f = path.join(pr, `roby-2026100${d}-0${h}0000.db.gz`);
    fs.writeFileSync(f, Buffer.alloc(120));
    const ts = new Date(2026, 9, 1 + d, 10 + h);
    fs.utimesSync(f, ts, ts);
  }
}
const removed = db.pruneBackups(pr, { keepLatest: 3, dailyKeep: 2, maxBytes: 1024 * 1024 });
const kept = db.listBackups(pr).map((f) => f.name);
check('prune removed the excess', removed === 35);
check('kept = 2 daily + 3 latest hourly = 5', kept.length === 5);
check('newest hour of newest two days survived (daily picks)', kept.includes('roby-20261007-040000.db.gz') && kept.includes('roby-20261006-040000.db.gz'));
check('oldest day fully removed', !kept.some((n) => n.startsWith('roby-20261000')));
const capDir = mkDir('cap');
for (let i = 0; i < 6; i++) {
  const f = path.join(capDir, `roby-2026100${i}-120000.db.gz`);
  fs.writeFileSync(f, Buffer.alloc(1000));
  const ts = new Date(2026, 9, 1 + i, 12);
  fs.utimesSync(f, ts, ts);
}
db.pruneBackups(capDir, { keepLatest: 99, dailyKeep: 99, maxBytes: 2500 });
const capKept = db.listBackups(capDir);
check('folder cap enforced (oldest deleted first)', capKept.length === 2 && capKept.every((f) => !f.name.startsWith('roby-20261000')));

console.log('P7-4 validation guards (wrong/corrupt/incomplete files)');
const goodDir = mkDir('validate');
const good = db.createBackup(goodDir);
const vGood = db.validateBackup(good.path, db.coreTables);
check('good file validates', vGood.ok === true);
if (vGood.ok) fs.rmSync(vGood.dbFile, { force: true });
const garbage = path.join(baseTmp, 'garbage.db.gz');
fs.writeFileSync(garbage, Buffer.from('not a backup at all'));
check('plain garbage rejected', db.validateBackup(garbage, db.coreTables).ok === false);
const notDb = path.join(baseTmp, 'notdb.db.gz');
fs.writeFileSync(notDb, zlib.gzipSync(Buffer.from('hello text, not sqlite at all')));
const rNotDb = db.validateBackup(notDb, db.coreTables);
check('gzip of non-sqlite rejected', !rNotDb.ok && rNotDb.error.includes('قاعدة بيانات'));
const partial = path.join(baseTmp, 'partial.db.gz');
const Database = require('better-sqlite3');
const tiny = new Database(path.join(baseTmp, 'tiny.db'));
tiny.exec('CREATE TABLE salon (id TEXT)');
tiny.close();
fs.writeFileSync(partial, zlib.gzipSync(fs.readFileSync(path.join(baseTmp, 'tiny.db'))));
const rPartial = db.validateBackup(partial, db.coreTables);
check('db missing core tables rejected', !rPartial.ok && rPartial.error.includes('ناقصة'));
const corrupted = path.join(baseTmp, 'corrupt.db.gz');
const corrupt = Buffer.from(fs.readFileSync(good.path));
corrupt[40] = corrupt[40] ^ 0xff;
fs.writeFileSync(corrupted, corrupt);
check('byte-corrupted archive rejected', db.validateBackup(corrupted, db.coreTables).ok === false);
check('no .validate temp leftovers', fs.readdirSync(goodDir).every((n) => n.endsWith('.db.gz')));

console.log('P7-5 restore (file swap) + USB export + overview wiring');
db.checkout({ items: [{ id: 'srv_2', title: 'حلاقة دقن', qty: 1 }], payMethod: 'cash', barber: 'الأسطى أنور عسران', customer: 'زبون بعد النسخة' });
const good2 = db.createBackup(goodDir);
check('two sales now (snapshot has both)', db.sales().length === 2);
const target = path.join(baseTmp, 'restored-live.db');
const check2 = db.validateBackup(good2.path, db.coreTables);
if (check2.ok) {
  db.applyDbFile(check2.dbFile, target);
  const restored = build(target);
  check('restored db keeps data', restored.sales().length === 2);
  check('validate temp file consumed by apply', !fs.existsSync(check2.dbFile));
  restored.close();
}
const usb = path.join(baseTmp, 'usb', 'backup.db.gz');
fs.mkdirSync(path.dirname(usb), { recursive: true });
db.exportBackup(good2.path, usb);
check('export copies identical bytes (USB)', fs.readFileSync(usb).equals(fs.readFileSync(good2.path)));
check('overview exposes real lastBackup from folder', db.overviewWithBackups(goodDir).lastBackup === db.listBackups(goodDir)[0].at);
check('overview without folder → null (pure tests unaffected)', db.overview().lastBackup === null);

console.log(`\nPhase 7 smoke: ${pass} passed, ${fail} failed`);
db.close();
fs.rmSync(baseTmp, { recursive: true, force: true });
process.exit(fail === 0 ? 0 : 1);

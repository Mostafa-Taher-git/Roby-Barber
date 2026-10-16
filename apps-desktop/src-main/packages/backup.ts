// Phase 7 — auto-backup: 10-min snapshot of roby.db → gzip archive, retention, restore + USB export/import.
// Deviation from plan's "zip": gzip (node:zlib) gives the same single-file archive with ZERO new
// dependencies (smaller installer, no native modules) — restore/export UX identical.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import Database from 'better-sqlite3';
import { log } from '../logger';

export const BACKUP_EXT = '.db.gz';
export const KEEP_LATEST = 144;      // ~24h at one backup / 10 min
export const DAILY_KEEP = 30;        // one per day for a month
export const MAX_DIR_BYTES = 2 * 1024 * 1024 * 1024; // 2GB cap

export interface BackupInfo { name: string; path: string; size: number; at: string; }

const pad = (n: number) => String(n).padStart(2, '0');
export function backupName(d = new Date()): string {
  return `roby-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${BACKUP_EXT}`;
}

/** Newest-first listing of backup archives in a folder (missing folder = empty). */
export function listBackups(dir: string): BackupInfo[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(BACKUP_EXT));
  } catch { return []; }
  return names
    .map((name) => {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      return { name, path: full, size: st.size, at: new Date(st.mtimeMs).toISOString() };
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

/**
 * Create one backup of a live SQLite handle: VACUUM INTO snapshot → gzip → prune.
 * VACUUM INTO is transactional (safe while the app keeps using the DB) and compacts at the same time.
 */
export function createBackup(raw: { exec: (sql: string) => unknown }, dir: string, now = new Date()): BackupInfo {
  fs.mkdirSync(dir, { recursive: true });
  const name = backupName(now);
  let finalName = name;
  let n = 1;
  while (fs.existsSync(path.join(dir, finalName))) finalName = name.replace(BACKUP_EXT, `-${n++}${BACKUP_EXT}`);
  const snapshot = path.join(dir, `.snapshot-${Date.now()}.db`);
  const quoted = snapshot.replace(/'/g, "''");
  raw.exec(`VACUUM INTO '${quoted}'`);
  const gz = zlib.gzipSync(fs.readFileSync(snapshot), { level: 6 });
  fs.rmSync(snapshot, { force: true });
  const dest = path.join(dir, finalName);
  fs.writeFileSync(dest, gz);
  const st = fs.statSync(dest);
  pruneBackups(dir);
  log.info('backup created', { file: finalName, bytes: st.size });
  return { name: finalName, path: dest, size: st.size, at: new Date(st.mtimeMs).toISOString() };
}

/**
 * Retention: keep the latest KEEP_LATEST archives + the last DAILY_KEEP first-of-day archives,
 * then enforce the 2GB folder cap (oldest first). Returns how many files were removed.
 */
export function pruneBackups(dir: string, opts: { keepLatest?: number; dailyKeep?: number; maxBytes?: number } = {}): number {
  const keepLatest = opts.keepLatest ?? KEEP_LATEST;
  const dailyKeep = opts.dailyKeep ?? DAILY_KEEP;
  const maxBytes = opts.maxBytes ?? MAX_DIR_BYTES;
  const all = listBackups(dir); // newest first
  const dailySeen = new Set<string>();
  const daily: BackupInfo[] = [];
  const hourly: BackupInfo[] = [];
  for (const f of all) {
    const day = f.at.slice(0, 10);
    if (!dailySeen.has(day)) { dailySeen.add(day); daily.push(f); } else hourly.push(f);
  }
  const keep = new Set<string>();
  daily.slice(0, dailyKeep).forEach((f) => keep.add(f.path));
  hourly.slice(0, keepLatest).forEach((f) => keep.add(f.path));
  // daily files count against nothing when few; always keep at least the newest one
  if (all[0]) keep.add(all[0].path);
  let removed = 0;
  for (const f of all) {
    if (!keep.has(f.path)) { fs.rmSync(f.path, { force: true }); removed++; }
  }
  // folder cap: drop oldest survivors until under the cap
  let total = listBackups(dir).reduce((s, f) => s + f.size, 0);
  const survivors = listBackups(dir);
  for (let i = survivors.length - 1; i >= 0 && total > maxBytes; i--) {
    fs.rmSync(survivors[i].path, { force: true });
    total -= survivors[i].size;
    removed++;
  }
  if (removed > 0) log.info('backup prune', { removed, kept: listBackups(dir).length });
  return removed;
}

/** Validate a .db.gz: gunzip → SQLite header + integrity_check + required tables. Returns the temp .db path. */
export function validateBackup(file: string, requiredTables: string[]): { ok: true; dbFile: string } | { ok: false; error: string } {
  const tmp = path.join(path.dirname(file), `.validate-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const fail = (error: string) => {
    fs.rmSync(tmp, { force: true });
    return { ok: false as const, error };
  };
  try {
    const gz = fs.readFileSync(file);
    if (gz.length < 2 || gz[0] !== 0x1f || gz[1] !== 0x8b) return fail('الملف ليس نسخة احتياطية صالحة (ليست gzip)');
    const bytes = zlib.gunzipSync(gz);
    if (bytes.length < 16 || bytes.subarray(0, 15).toString('latin1') !== 'SQLite format 3') {
      return fail('الملف ليس قاعدة بيانات صالحة');
    }
    fs.writeFileSync(tmp, bytes);
    let problem: string | null = null;
    const probe = new Database(tmp, { readonly: true });
    try {
      const check = probe.prepare('PRAGMA integrity_check').get() as { integrity_check?: string };
      if ((check.integrity_check ?? '').toLowerCase() !== 'ok') {
        problem = 'ملف النسخة الاحتياطية تالف';
      } else {
        for (const t of requiredTables) {
          const row = probe.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(t);
          if (!row) { problem = `النسخة الاحتياطية ناقصة (جدول ${t} غير موجود)`; break; }
        }
      }
    } finally {
      probe.close(); // Windows: must close before unlink, or EBUSY
    }
    if (problem) return fail(problem);
    return { ok: true, dbFile: tmp };
  } catch (e) {
    return fail(`تعذر قراءة النسخة الاحتياطية: ${(e as Error).message}`);
  }
}

/** Tables a valid restore must contain (spot check — cheap guard against wrong files). */
export const CORE_TABLES = ['salon', 'staff', 'services', 'customers', 'sales', 'expenses', 'inventory', 'licenses', 'activity_log', 'templates', 'offers'];

/** Swap a validated backup db file into place (caller must have closed the live DB handle). */
export function applyDbFile(dbFile: string, targetDbPath: string): void {
  fs.copyFileSync(dbFile, targetDbPath);
  fs.rmSync(`${targetDbPath}-wal`, { force: true });
  fs.rmSync(`${targetDbPath}-shm`, { force: true });
  fs.rmSync(dbFile, { force: true });
}

/** Copy a backup archive to an external destination (USB stick etc.). */
export function exportBackup(file: string, dest: string): void {
  fs.copyFileSync(file, dest);
}

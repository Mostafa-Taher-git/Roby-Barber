// Inspects the real app DB (created by a live Electron run) — read-only.
// Usage: npx electron -r tsx/cjs scripts/inspect-db.cjs [path]
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import Database from 'better-sqlite3';

// Electron's argv layout differs from plain node — accept the path from any trailing arg.
const arg = process.argv.slice(2).find((a) => /\.db$/i.test(a) || a.includes('roby-barber-desktop'));
const file = arg ?? path.join(os.homedir(), 'AppData', 'Roaming', 'roby-barber-desktop', 'roby.db');
console.log('db file:', file);
const db = new Database(file, { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all().map((t) => (t as { name: string }).name);
console.log('tables:', tables.join(', '));
for (const t of ['salon', 'staff', 'services', 'chairs', 'appointments', 'inventory', 'customers', 'expenses']) {
  const row = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number } | undefined;
  console.log(`${t}: ${row?.c ?? 'missing'}`);
}
const chairs = db.prepare("SELECT num, status FROM chairs ORDER BY num").all() as { num: number; status: string }[];
console.log('chairs:', chairs.map((c) => `${c.num}=${c.status}`).join(' '));
for (const t of ['templates', 'offers', 'sales']) {
  const row = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number } | undefined;
  console.log(`${t}: ${row?.c ?? 'missing'}`);
}
const expAt = db.prepare("SELECT COUNT(*) c FROM expenses WHERE at <> ''").get() as { c: number };
console.log(`expenses with at: ${expAt.c}`);

db.close();
process.exit(0);

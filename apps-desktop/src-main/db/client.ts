import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let db: BetterSQLite3Database | null = null;

export function dbPath() {
  return path.join(app.getPath('userData'), 'roby.db');
}

export function getDb() {
  if (db) return db;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL'); // instant-save + crash-safe
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  return db;
}

// Phase 1: raw-SQL table bootstrap (Drizzle Kit migrations land in Phase 1 polish).
// Keeps tables exactly matching schema.ts without extra tooling.
export function runMigrations(database: BetterSQLite3Database) {
  database.run(`CREATE TABLE IF NOT EXISTS salon (id TEXT PRIMARY KEY, name_ar TEXT NOT NULL, address TEXT NOT NULL, phone TEXT NOT NULL, instapay TEXT NOT NULL, vodafone TEXT NOT NULL, logo_path TEXT)`);
  database.run(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name_ar TEXT NOT NULL, role TEXT NOT NULL, comm_pct INTEGER NOT NULL, salary INTEGER NOT NULL, photo_path TEXT, deleted_at TEXT)`);
  database.run(`CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, title TEXT NOT NULL, cat TEXT NOT NULL, price INTEGER NOT NULL, duration TEXT NOT NULL, desc TEXT, deleted_at TEXT)`);
  database.run(`CREATE TABLE IF NOT EXISTS chairs (id INTEGER PRIMARY KEY, num INTEGER NOT NULL, barber_id TEXT, status TEXT NOT NULL, customer TEXT NOT NULL, service TEXT NOT NULL, rem_mins INTEGER NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL, service TEXT NOT NULL, barber TEXT NOT NULL, time TEXT NOT NULL, status TEXT NOT NULL, payment TEXT NOT NULL, price INTEGER NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, cost INTEGER NOT NULL, price INTEGER NOT NULL, qty INTEGER NOT NULL, min_qty INTEGER NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS customers (code TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, visits INTEGER NOT NULL, points INTEGER NOT NULL, fav_barber TEXT NOT NULL, last_visit TEXT NOT NULL, vip INTEGER NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS expenses (no TEXT PRIMARY KEY, time TEXT NOT NULL, title TEXT NOT NULL, cat TEXT NOT NULL, person TEXT NOT NULL, method TEXT NOT NULL, amount INTEGER NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, receipt_no TEXT NOT NULL UNIQUE, items_json TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, tip INTEGER NOT NULL, total INTEGER NOT NULL, pay_method TEXT NOT NULL, ref TEXT, barber TEXT NOT NULL, customer TEXT NOT NULL, at TEXT NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS licenses (machine_id TEXT PRIMARY KEY, key TEXT NOT NULL, activated_at TEXT, trial_started_at TEXT NOT NULL, last_seen TEXT NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, kind TEXT NOT NULL, body_ar TEXT NOT NULL)`);
  database.run(`CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, text TEXT NOT NULL)`);
}

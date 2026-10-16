import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { TABLES } from './tables';
import { applySeed, isFreshDb, seedTableIfEmpty } from './seedRows';
import { log } from '../logger';

let db: BetterSQLite3Database<Record<string, never>> | null = null;

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

  runMigrations(db);
  // db.$client is the raw better-sqlite3 instance drizzle wraps.
  const raw = (db as unknown as { $client: unknown }).$client;
  if (isFreshDb(raw)) {
    const counts = applySeed(raw);
    log.info('fresh db auto-seeded', counts);
  } else {
    // Existing DB from an older version: fill in tables added later, only if empty.
    for (const table of ['templates', 'offers']) {
      if (seedTableIfEmpty(raw, table)) log.info('seed backfilled', table);
    }
  }
  return db;
}

export function runMigrations(database: BetterSQLite3Database) {
  for (const sqlDef of TABLES) database.run(sqlDef);
  // Phase 3 v2: expenses gained `at` (ISO). Old DBs: add + backfill so today's financials see them.
  const cols = database.all('PRAGMA table_info(expenses)') as { name: string }[];
  if (!cols.some((c) => c.name === 'at')) {
    database.run(`ALTER TABLE expenses ADD COLUMN at TEXT NOT NULL DEFAULT ''`);
    database.run(sql`UPDATE expenses SET at = ${new Date().toISOString()} WHERE at = ''`);
    log.info('migration: expenses.at added and backfilled');
  }
  // Phase 4: inventory gained `deleted_at` (soft delete, per DESIGN §5 "all deletes are soft").
  const invCols = database.all('PRAGMA table_info(inventory)') as { name: string }[];
  if (!invCols.some((c) => c.name === 'deleted_at')) {
    database.run(`ALTER TABLE inventory ADD COLUMN deleted_at TEXT`);
    log.info('migration: inventory.deleted_at added');
  }
}

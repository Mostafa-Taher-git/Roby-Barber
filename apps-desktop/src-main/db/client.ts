import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { TABLES } from './tables';
import { applySeed, isFreshDb } from './seedRows';
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
  }
  return db;
}

export function runMigrations(database: BetterSQLite3Database) {
  for (const sql of TABLES) database.run(sql);
}
